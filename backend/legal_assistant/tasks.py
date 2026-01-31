"""
Celery tasks for asynchronous processing in the AI Legal Assistant.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_document(self, document_id: str):
    """
    Extract text from a PDF document and vectorize it for RAG search.

    Args:
        document_id: UUID of the Document to process.
    """
    from .models import Document

    try:
        doc = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return {"error": "Document not found"}

    # Extract text from PDF
    if doc.file.name.lower().endswith('.pdf') and not doc.content_text:
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
            logger.info(f"Extracted {len(doc.content_text)} chars from: {doc.title}")
        except Exception as e:
            logger.error(f"PDF extraction failed for {doc.title}: {e}")
            raise self.retry(exc=e)

    # Vectorize the document
    if doc.content_text and not doc.is_vectorized:
        try:
            from .agents.rag import initialize_rag_with_documents

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

            logger.info(
                f"Vectorized document '{doc.title}' with {len(vector_ids)} chunks"
            )
            return {
                "status": "success",
                "document_id": str(doc.id),
                "chunks": len(vector_ids),
            }
        except Exception as e:
            logger.error(f"Vectorization failed for {doc.title}: {e}")
            raise self.retry(exc=e)

    return {
        "status": "skipped",
        "document_id": str(doc.id),
        "reason": "No text to vectorize or already vectorized",
    }


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def run_analysis_async(self, case_id: str, analysis_type: str, user_id: str):
    """
    Run AI legal analysis asynchronously.

    Args:
        case_id: UUID of the Case to analyze.
        analysis_type: Type of analysis to perform.
        user_id: UUID of the User who requested the analysis.
    """
    from .models import Case, AnalysisResult, User

    try:
        case = Case.objects.get(id=case_id)
        user = User.objects.get(id=user_id)
    except (Case.DoesNotExist, User.DoesNotExist) as e:
        logger.error(f"Case or User not found: {e}")
        return {"error": str(e)}

    if not case.case_text:
        return {"error": "Case has no text content for analysis"}

    try:
        from .agents.graph import run_analysis
        result = run_analysis(
            case_text=case.case_text,
            analysis_type=analysis_type,
        )

        from .agents.evaluation import run_full_evaluation
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
            created_by=user,
        )

        case.ai_analysis = {"latest": str(analysis.id), "type": analysis_type}
        case.save()

        logger.info(
            f"Analysis completed for case {case.case_number}: "
            f"{analysis_type} in {result['processing_time']:.2f}s"
        )

        return {
            "status": "success",
            "analysis_id": str(analysis.id),
            "processing_time": result['processing_time'],
        }
    except Exception as e:
        logger.error(f"Async analysis failed for case {case_id}: {e}")
        raise self.retry(exc=e)


@shared_task
def cleanup_old_sessions(days: int = 90):
    """
    Clean up inactive chat sessions older than the specified number of days.

    Args:
        days: Number of days after which inactive sessions are cleaned up.
    """
    from .models import ChatSession

    cutoff = timezone.now() - timezone.timedelta(days=days)
    old_sessions = ChatSession.objects.filter(
        updated_at__lt=cutoff,
        is_active=False,
    )

    count = old_sessions.count()
    old_sessions.delete()

    logger.info(f"Cleaned up {count} inactive chat sessions older than {days} days")
    return {"deleted_sessions": count}


@shared_task
def generate_billing_report(case_id: str):
    """
    Generate a billing report for a specific case.

    Args:
        case_id: UUID of the Case.
    """
    from .models import Case, BillingEntry

    try:
        case = Case.objects.get(id=case_id)
    except Case.DoesNotExist:
        return {"error": "Case not found"}

    entries = BillingEntry.objects.filter(case=case).order_by('date')
    total_hours = sum(e.hours for e in entries)
    total_amount = sum(e.amount for e in entries)
    billed_amount = sum(e.amount for e in entries if e.is_billed)
    unbilled_amount = sum(e.amount for e in entries if not e.is_billed)

    return {
        "case_number": case.case_number,
        "total_entries": entries.count(),
        "total_hours": float(total_hours),
        "total_amount": float(total_amount),
        "billed_amount": float(billed_amount),
        "unbilled_amount": float(unbilled_amount),
    }
