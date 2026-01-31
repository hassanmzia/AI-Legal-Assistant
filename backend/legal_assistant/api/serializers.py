from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from ..models import (
    User, Client, Case, Document, ChatSession, ChatMessage,
    AnalysisResult, CaseTimeline, BillingEntry, AuditLog
)


# ─── User Serializers ────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'organization', 'phone', 'bar_number',
            'is_active', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserMinimalSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for nested representations."""
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'full_name', 'role']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'role', 'organization',
            'phone', 'bar_number',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ─── Client Serializers ──────────────────────────────────────────────────────

class ClientSerializer(serializers.ModelSerializer):
    created_by = UserMinimalSerializer(read_only=True)
    case_count = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'email', 'phone', 'address', 'organization',
            'notes', 'created_by', 'case_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_case_count(self, obj):
        return obj.cases.count()


# ─── Case Serializers ────────────────────────────────────────────────────────

class CaseListSerializer(serializers.ModelSerializer):
    assigned_to = UserMinimalSerializer(read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True, default='')
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'title', 'case_type', 'status', 'priority',
            'client_name', 'assigned_to', 'court', 'filing_date',
            'next_hearing_date', 'document_count', 'tags',
            'created_at', 'updated_at',
        ]

    def get_document_count(self, obj):
        return obj.documents.count()


class CaseDetailSerializer(serializers.ModelSerializer):
    assigned_to = UserMinimalSerializer(read_only=True)
    created_by = UserMinimalSerializer(read_only=True)
    client = ClientSerializer(read_only=True)
    document_count = serializers.SerializerMethodField()
    analysis_count = serializers.SerializerMethodField()

    class Meta:
        model = Case
        fields = [
            'id', 'case_number', 'title', 'description', 'case_type',
            'status', 'priority', 'client', 'assigned_to', 'created_by',
            'court', 'judge', 'filing_date', 'next_hearing_date',
            'case_text', 'ai_analysis', 'tags', 'document_count',
            'analysis_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_document_count(self, obj):
        return obj.documents.count()

    def get_analysis_count(self, obj):
        return obj.analyses.count()


class CaseCreateUpdateSerializer(serializers.ModelSerializer):
    assigned_to_id = serializers.UUIDField(required=False, allow_null=True)
    client_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Case
        fields = [
            'case_number', 'title', 'description', 'case_type', 'status',
            'priority', 'client_id', 'assigned_to_id', 'court', 'judge',
            'filing_date', 'next_hearing_date', 'case_text', 'tags',
        ]

    def create(self, validated_data):
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        client_id = validated_data.pop('client_id', None)

        if assigned_to_id:
            validated_data['assigned_to'] = User.objects.get(id=assigned_to_id)
        if client_id:
            validated_data['client'] = Client.objects.get(id=client_id)

        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        client_id = validated_data.pop('client_id', None)

        if assigned_to_id is not None:
            instance.assigned_to = User.objects.get(id=assigned_to_id) if assigned_to_id else None
        if client_id is not None:
            instance.client = Client.objects.get(id=client_id) if client_id else None

        return super().update(instance, validated_data)


# ─── Document Serializers ────────────────────────────────────────────────────

class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by = UserMinimalSerializer(read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True, default='')

    class Meta:
        model = Document
        fields = [
            'id', 'case', 'case_number', 'title', 'document_type', 'file',
            'file_size', 'content_text', 'is_vectorized', 'vector_ids',
            'uploaded_by', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'file_size', 'content_text', 'is_vectorized',
            'vector_ids', 'uploaded_by', 'created_at', 'updated_at',
        ]


class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['case', 'title', 'document_type', 'file']


# ─── Chat Serializers ────────────────────────────────────────────────────────

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'session', 'role', 'content', 'tool_calls',
            'tool_name', 'metadata', 'tokens_used', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    message_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = [
            'id', 'title', 'case', 'user', 'is_active', 'metadata',
            'message_count', 'last_message', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_message_count(self, obj):
        return obj.messages.count()

    def get_last_message(self, obj):
        last = obj.messages.last()
        if last:
            return {
                'role': last.role,
                'content': last.content[:200],
                'created_at': last.created_at.isoformat(),
            }
        return None


class ChatSessionDetailSerializer(ChatSessionSerializer):
    messages = ChatMessageSerializer(many=True, read_only=True)

    class Meta(ChatSessionSerializer.Meta):
        fields = ChatSessionSerializer.Meta.fields + ['messages']


# ─── Analysis Serializers ────────────────────────────────────────────────────

class AnalysisResultSerializer(serializers.ModelSerializer):
    created_by = UserMinimalSerializer(read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)

    class Meta:
        model = AnalysisResult
        fields = [
            'id', 'case', 'case_number', 'analysis_type', 'input_text',
            'result', 'summary', 'precedents_found', 'loopholes_identified',
            'risk_score', 'recommendations', 'tools_used',
            'evaluation_scores', 'processing_time', 'tokens_consumed',
            'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'created_by']


class AnalysisRequestSerializer(serializers.Serializer):
    case_id = serializers.UUIDField()
    analysis_type = serializers.ChoiceField(
        choices=[
            'full_analysis', 'loophole_detection', 'precedent_search',
            'risk_assessment', 'contract_review', 'compliance_check',
        ],
        default='full_analysis',
    )
    custom_text = serializers.CharField(required=False, allow_blank=True)


# ─── Timeline Serializers ────────────────────────────────────────────────────

class CaseTimelineSerializer(serializers.ModelSerializer):
    created_by = UserMinimalSerializer(read_only=True)

    class Meta:
        model = CaseTimeline
        fields = [
            'id', 'case', 'event_type', 'title', 'description',
            'event_date', 'created_by', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'created_by']


# ─── Billing Serializers ─────────────────────────────────────────────────────

class BillingEntrySerializer(serializers.ModelSerializer):
    billed_by = UserMinimalSerializer(read_only=True)
    case_number = serializers.CharField(source='case.case_number', read_only=True)

    class Meta:
        model = BillingEntry
        fields = [
            'id', 'case', 'case_number', 'description', 'hours', 'rate',
            'amount', 'date', 'billed_by', 'is_billed', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'billed_by']


# ─── Audit Log Serializers ───────────────────────────────────────────────────

class AuditLogSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'action', 'resource_type', 'resource_id',
            'details', 'ip_address', 'created_at',
        ]
        read_only_fields = fields
