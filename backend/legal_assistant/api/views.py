import logging
from django.db.models import Count, Sum, Q, Avg
from django.utils import timezone
from rest_framework import viewsets, generics, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from ..models import (
    User, Client, Case, Document, ChatSession, ChatMessage,
    AnalysisResult, CaseTimeline, BillingEntry, AuditLog
)
from .serializers import (
    UserSerializer, RegisterSerializer, ClientSerializer,
    CaseListSerializer, CaseDetailSerializer, CaseCreateUpdateSerializer,
    DocumentSerializer, DocumentUploadSerializer,
    ChatSessionSerializer, ChatSessionDetailSerializer, ChatMessageSerializer,
    AnalysisResultSerializer, AnalysisRequestSerializer,
    CaseTimelineSerializer, BillingEntrySerializer, AuditLogSerializer,
)
from .permissions import IsAdmin, IsAttorneyOrAbove, IsParalegalOrAbove, IsOwnerOrAdmin, IsServiceRequest
from .filters import (
    CaseFilter, DocumentFilter, AnalysisResultFilter,
    BillingEntryFilter, AuditLogFilter,
)

logger = logging.getLogger(__name__)


def log_audit(user, action_name, resource_type, resource_id, details=None, request=None):
    """Helper to create audit log entries."""
    ip_address = None
    if request:
        ip_address = request.META.get(
            'HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '')
        )
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
    AuditLog.objects.create(
        user=user,
        action=action_name,
        resource_type=resource_type,
        resource_id=str(resource_id),
        details=details or {},
        ip_address=ip_address,
    )


# ─── Health Check ─────────────────────────────────────────────────────────────

class HealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            "status": "healthy",
            "timestamp": timezone.now().isoformat(),
            "service": "AI Legal Assistant API",
            "version": "1.0.0",
        })


# ─── Registration ─────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


# ─── User ViewSet ─────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    search_fields = ['username', 'email', 'first_name', 'last_name', 'organization']
    ordering_fields = ['username', 'date_joined', 'role']

    def get_permissions(self):
        if self.action == 'me':
            return [permissions.IsAuthenticated()]
        if self.action in ('list', 'retrieve'):
            return [IsParalegalOrAbove()]
        return [IsAdmin()]

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """Get or update the current authenticated user."""
        if request.method == 'GET':
            return Response(UserSerializer(request.user).data)
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ─── Client ViewSet ───────────────────────────────────────────────────────────

class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.select_related('created_by').all()
    serializer_class = ClientSerializer
    permission_classes = [IsParalegalOrAbove]
    search_fields = ['name', 'email', 'organization']
    ordering_fields = ['name', 'created_at']

    def perform_create(self, serializer):
        client = serializer.save(created_by=self.request.user)
        log_audit(
            self.request.user, 'create', 'client', client.id,
            {'name': client.name}, self.request,
        )

    def perform_update(self, serializer):
        client = serializer.save()
        log_audit(
            self.request.user, 'update', 'client', client.id,
            {'name': client.name}, self.request,
        )


# ─── Case ViewSet ─────────────────────────────────────────────────────────────

class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.select_related(
        'client', 'assigned_to', 'created_by'
    ).all()
    filterset_class = CaseFilter
    search_fields = ['case_number', 'title', 'description', 'court', 'judge']
    ordering_fields = ['case_number', 'created_at', 'priority', 'status']

    def get_serializer_class(self):
        if self.action == 'list':
            return CaseListSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return CaseCreateUpdateSerializer
        return CaseDetailSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsParalegalOrAbove()]
        return [IsAttorneyOrAbove()]

    def perform_create(self, serializer):
        case = serializer.save()
        log_audit(
            self.request.user, 'create', 'case', case.id,
            {'case_number': case.case_number, 'title': case.title},
            self.request,
        )

    def perform_update(self, serializer):
        case = serializer.save()
        log_audit(
            self.request.user, 'update', 'case', case.id,
            {'case_number': case.case_number}, self.request,
        )

    @action(detail=True, methods=['post'])
    def run_analysis(self, request, pk=None):
        """Trigger AI analysis on a case."""
        case = self.get_object()
        analysis_type = request.data.get('analysis_type', 'full_analysis')

        if not case.case_text:
            return Response(
                {"error": "Case has no text content for analysis. Please add case_text first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from ..agents.graph import run_analysis
        result = run_analysis(
            case_text=case.case_text,
            analysis_type=analysis_type,
        )

        from ..agents.evaluation import run_full_evaluation
        eval_result = run_full_evaluation(result['analysis'], result['tools_used'])

        analysis = AnalysisResult.objects.create(
            case=case,
            analysis_type=analysis_type,
            input_text=case.case_text,
            result={"analysis": result['analysis']},
            summary=result['analysis'][:500],
            tools_used=result['tools_used'],
            evaluation_scores=eval_result,
            processing_time=result['processing_time'],
            created_by=request.user,
        )

        case.ai_analysis = {"latest": str(analysis.id), "type": analysis_type}
        case.save()

        log_audit(
            request.user, 'run_analysis', 'case', case.id,
            {'analysis_type': analysis_type, 'analysis_id': str(analysis.id)},
            request,
        )

        return Response(AnalysisResultSerializer(analysis).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """Get the timeline events for a case."""
        case = self.get_object()
        events = case.timeline_events.select_related('created_by').all()
        return Response(CaseTimelineSerializer(events, many=True).data)

    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get all documents for a case."""
        case = self.get_object()
        docs = case.documents.select_related('uploaded_by').all()
        return Response(DocumentSerializer(docs, many=True).data)

    @action(detail=True, methods=['get'])
    def billing(self, request, pk=None):
        """Get billing entries for a case."""
        case = self.get_object()
        entries = case.billing_entries.select_related('billed_by').all()
        return Response(BillingEntrySerializer(entries, many=True).data)


# ─── Document ViewSet ─────────────────────────────────────────────────────────

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.select_related('case', 'uploaded_by').all()
    serializer_class = DocumentSerializer
    filterset_class = DocumentFilter
    parser_classes = [MultiPartParser, FormParser]
    search_fields = ['title', 'content_text']
    ordering_fields = ['title', 'created_at', 'document_type']

    def get_serializer_class(self):
        if self.action == 'create':
            return DocumentUploadSerializer
        return DocumentSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsParalegalOrAbove()]
        return [IsAttorneyOrAbove()]

    def perform_create(self, serializer):
        doc = serializer.save(uploaded_by=self.request.user)
        doc.file_size = doc.file.size
        doc.save()

        # Extract text from PDF
        self._extract_text(doc)

        log_audit(
            self.request.user, 'upload', 'document', doc.id,
            {'title': doc.title, 'type': doc.document_type},
            self.request,
        )

    def _extract_text(self, doc):
        """Extract text content from uploaded PDF files."""
        if doc.file.name.lower().endswith('.pdf'):
            try:
                from pypdf import PdfReader
                import io

                doc.file.seek(0)
                reader = PdfReader(io.BytesIO(doc.file.read()))
                text_parts = []
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)

                doc.content_text = "\n\n".join(text_parts)
                doc.save()
                logger.info(f"Extracted {len(doc.content_text)} chars from PDF: {doc.title}")
            except Exception as e:
                logger.error(f"PDF extraction error for {doc.title}: {e}")

    @action(detail=True, methods=['post'])
    def vectorize(self, request, pk=None):
        """Vectorize a document and add it to the RAG knowledge base."""
        doc = self.get_object()

        if not doc.content_text:
            return Response(
                {"error": "Document has no extracted text. Upload a PDF or add content_text."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from ..agents.rag import initialize_rag_with_documents

            documents = [{
                'content': doc.content_text,
                'metadata': {
                    'source': doc.title,
                    'document_id': str(doc.id),
                    'document_type': doc.document_type,
                    'case_id': str(doc.case_id) if doc.case_id else '',
                },
            }]

            vector_ids = initialize_rag_with_documents(documents)
            doc.is_vectorized = True
            doc.vector_ids = vector_ids
            doc.save()

            log_audit(
                request.user, 'vectorize', 'document', doc.id,
                {'chunks': len(vector_ids)}, request,
            )

            return Response({
                "status": "success",
                "chunks_created": len(vector_ids),
                "vector_ids": vector_ids,
            })
        except Exception as e:
            logger.error(f"Vectorization error: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def perform_destroy(self, instance):
        """Delete document vectors when removing a document."""
        if instance.vector_ids:
            try:
                from ..agents.rag import delete_document_vectors
                delete_document_vectors(instance.vector_ids)
            except Exception as e:
                logger.error(f"Error deleting vectors: {e}")

        log_audit(
            self.request.user, 'delete', 'document', instance.id,
            {'title': instance.title}, self.request,
        )
        instance.delete()


# ─── Chat Session ViewSet ────────────────────────────────────────────────────

class ChatSessionViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSessionSerializer
    search_fields = ['title']
    ordering_fields = ['created_at', 'updated_at']

    def get_queryset(self):
        return ChatSession.objects.filter(
            user=self.request.user
        ).select_related('user', 'case')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChatSessionDetailSerializer
        return ChatSessionSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message to the chat session and get an AI response."""
        session = self.get_object()
        content = request.data.get('content', '')

        if not content:
            return Response(
                {"error": "Message content is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Save user message
        ChatMessage.objects.create(
            session=session,
            role='user',
            content=content,
        )

        # Get case context if attached
        case_text = content
        if session.case and session.case.case_text:
            case_text = session.case.case_text

        # Determine analysis type from message content or default
        analysis_type = request.data.get('analysis_type', 'full_analysis')

        try:
            from ..agents.graph import run_analysis
            result = run_analysis(
                case_text=case_text,
                analysis_type=analysis_type,
                thread_id=str(session.id),
            )

            # Save assistant message
            msg = ChatMessage.objects.create(
                session=session,
                role='assistant',
                content=result['analysis'],
                tool_calls=result['tools_used'],
                metadata={
                    'processing_time': result['processing_time'],
                    'analysis_type': result['analysis_type'],
                },
            )

            # Update session title if it is the first message
            if session.messages.count() <= 2:
                session.title = content[:100]
            session.save()

            log_audit(
                request.user, 'chat_message', 'chat_session', session.id,
                {'analysis_type': analysis_type}, request,
            )

            return Response(ChatMessageSerializer(msg).data)
        except Exception as e:
            logger.error(f"Chat agent error: {e}")
            error_msg = ChatMessage.objects.create(
                session=session,
                role='assistant',
                content=f"I encountered an error processing your request: {str(e)}",
                metadata={'error': True},
            )
            return Response(
                ChatMessageSerializer(error_msg).data,
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get all messages in a chat session."""
        session = self.get_object()
        messages = session.messages.all()
        return Response(ChatMessageSerializer(messages, many=True).data)


# ─── Analysis ViewSet ─────────────────────────────────────────────────────────

class AnalysisViewSet(viewsets.ModelViewSet):
    queryset = AnalysisResult.objects.select_related('case', 'created_by').all()
    serializer_class = AnalysisResultSerializer
    filterset_class = AnalysisResultFilter
    search_fields = ['summary', 'case__case_number']
    ordering_fields = ['created_at', 'processing_time', 'risk_score']
    http_method_names = ['get', 'post', 'head', 'options']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsParalegalOrAbove()]
        if self.action == 'create':
            return [IsAttorneyOrAbove() | IsServiceRequest()]
        return [IsAttorneyOrAbove()]

    def create(self, request):
        """Trigger a new AI analysis. Accepts either case_id or input_text directly."""
        analysis_type = request.data.get('analysis_type', 'full_analysis')
        case_id = request.data.get('case_id')
        input_text = request.data.get('input_text', '')

        case = None
        if case_id:
            try:
                case = Case.objects.get(id=case_id)
            except Case.DoesNotExist:
                return Response(
                    {"error": "Case not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            if not input_text:
                input_text = case.case_text

        if not input_text:
            return Response(
                {"error": "No text available for analysis. Provide input_text or a case_id with case_text."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from ..agents.graph import run_analysis
            result = run_analysis(case_text=input_text, analysis_type=analysis_type)
        except Exception as e:
            logger.error(f"Agent analysis error: {e}")
            return Response(
                {"error": f"Analysis failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        eval_result = {}
        try:
            from ..agents.evaluation import run_full_evaluation
            eval_result = run_full_evaluation(result['analysis'], result['tools_used'])
        except Exception as e:
            logger.warning(f"Evaluation failed (non-fatal): {e}")

        created_by = request.user if request.user.is_authenticated else None

        analysis = AnalysisResult.objects.create(
            case=case,
            analysis_type=analysis_type,
            input_text=input_text,
            result={"analysis": result['analysis']},
            summary=result['analysis'][:500],
            tools_used=result['tools_used'],
            evaluation_scores=eval_result,
            processing_time=result['processing_time'],
            created_by=created_by,
        )

        if case:
            case.ai_analysis = {"latest": str(analysis.id), "type": analysis_type}
            case.save()

        if request.user.is_authenticated:
            log_audit(
                request.user, 'create_analysis', 'analysis', analysis.id,
                {'case_id': str(case_id) if case_id else None, 'analysis_type': analysis_type},
                request,
            )

        return Response(
            AnalysisResultSerializer(analysis).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['post'])
    def evaluate(self, request, pk=None):
        """Re-run evaluation on an existing analysis result."""
        analysis = self.get_object()

        from ..agents.evaluation import run_full_evaluation
        eval_result = run_full_evaluation(
            analysis.summary or analysis.result.get('analysis', ''),
            analysis.tools_used,
        )

        analysis.evaluation_scores = eval_result
        analysis.save()

        return Response({
            "evaluation": eval_result,
            "analysis_id": str(analysis.id),
        })


# ─── Case Timeline ViewSet ───────────────────────────────────────────────────

class CaseTimelineViewSet(viewsets.ModelViewSet):
    queryset = CaseTimeline.objects.select_related('case', 'created_by').all()
    serializer_class = CaseTimelineSerializer
    search_fields = ['title', 'description']
    ordering_fields = ['event_date', 'created_at']

    def get_permissions(self):
        if self.action in ('list', 'retrieve'):
            return [IsParalegalOrAbove()]
        return [IsAttorneyOrAbove()]

    def perform_create(self, serializer):
        event = serializer.save(created_by=self.request.user)
        log_audit(
            self.request.user, 'create', 'timeline_event', event.id,
            {'title': event.title, 'case_id': str(event.case_id)},
            self.request,
        )


# ─── Billing Entry ViewSet ───────────────────────────────────────────────────

class BillingEntryViewSet(viewsets.ModelViewSet):
    queryset = BillingEntry.objects.select_related('case', 'billed_by').all()
    serializer_class = BillingEntrySerializer
    filterset_class = BillingEntryFilter
    search_fields = ['description', 'case__case_number']
    ordering_fields = ['date', 'amount', 'created_at']
    permission_classes = [IsAttorneyOrAbove]

    def perform_create(self, serializer):
        entry = serializer.save(billed_by=self.request.user)
        log_audit(
            self.request.user, 'create', 'billing_entry', entry.id,
            {'amount': str(entry.amount), 'case_id': str(entry.case_id)},
            self.request,
        )


# ─── Audit Log ViewSet (Read Only) ───────────────────────────────────────────

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    filterset_class = AuditLogFilter
    permission_classes = [IsAdmin]
    search_fields = ['action', 'resource_type', 'resource_id']
    ordering_fields = ['created_at']


# ─── Dashboard View ──────────────────────────────────────────────────────────

class DashboardView(APIView):
    permission_classes = [IsParalegalOrAbove]

    def get(self, request):
        """Provide dashboard statistics for the legal assistant."""
        now = timezone.now()
        thirty_days_ago = now - timezone.timedelta(days=30)

        # Case statistics
        total_cases = Case.objects.count()
        cases_by_status = dict(
            Case.objects.values_list('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        cases_by_type = dict(
            Case.objects.values_list('case_type')
            .annotate(count=Count('id'))
            .values_list('case_type', 'count')
        )
        cases_by_priority = dict(
            Case.objects.values_list('priority')
            .annotate(count=Count('id'))
            .values_list('priority', 'count')
        )
        recent_cases = Case.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()

        # Document statistics
        total_documents = Document.objects.count()
        vectorized_documents = Document.objects.filter(is_vectorized=True).count()

        # Analysis statistics
        total_analyses = AnalysisResult.objects.count()
        recent_analyses = AnalysisResult.objects.filter(
            created_at__gte=thirty_days_ago
        ).count()
        avg_processing_time = AnalysisResult.objects.aggregate(
            avg=Avg('processing_time')
        )['avg'] or 0

        # Chat statistics
        total_sessions = ChatSession.objects.count()
        total_messages = ChatMessage.objects.count()

        # Billing statistics
        total_billed = BillingEntry.objects.filter(
            is_billed=True
        ).aggregate(total=Sum('amount'))['total'] or 0
        total_unbilled = BillingEntry.objects.filter(
            is_billed=False
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Client statistics
        total_clients = Client.objects.count()

        # User statistics
        total_users = User.objects.filter(is_active=True).count()
        users_by_role = dict(
            User.objects.filter(is_active=True)
            .values_list('role')
            .annotate(count=Count('id'))
            .values_list('role', 'count')
        )

        return Response({
            "cases": {
                "total": total_cases,
                "by_status": cases_by_status,
                "by_type": cases_by_type,
                "by_priority": cases_by_priority,
                "recent_30_days": recent_cases,
            },
            "documents": {
                "total": total_documents,
                "vectorized": vectorized_documents,
            },
            "analyses": {
                "total": total_analyses,
                "recent_30_days": recent_analyses,
                "avg_processing_time_seconds": round(avg_processing_time, 2),
            },
            "chat": {
                "total_sessions": total_sessions,
                "total_messages": total_messages,
            },
            "billing": {
                "total_billed": float(total_billed),
                "total_unbilled": float(total_unbilled),
            },
            "clients": {
                "total": total_clients,
            },
            "users": {
                "total_active": total_users,
                "by_role": users_by_role,
            },
        })


# ─── RAG Search View ─────────────────────────────────────────────────────────

class RAGSearchView(APIView):
    permission_classes = [IsParalegalOrAbove]

    def post(self, request):
        """Search the legal knowledge base via RAG."""
        query = request.data.get('query', '')
        n_results = request.data.get('n_results', 5)

        if not query:
            return Response(
                {"error": "Search query is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            from ..agents.rag import search_similar, get_collection_stats

            results = search_similar(query=query, n_results=n_results)
            stats = get_collection_stats()

            log_audit(
                request.user, 'rag_search', 'knowledge_base', 'search',
                {'query': query[:200], 'results_count': len(results)},
                request,
            )

            return Response({
                "query": query,
                "results": results,
                "total_documents": stats['count'],
            })
        except Exception as e:
            logger.error(f"RAG search error: {e}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def get(self, request):
        """Get RAG knowledge base statistics."""
        try:
            from ..agents.rag import get_collection_stats
            stats = get_collection_stats()
            return Response(stats)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
