import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
    """Custom user model with legal-specific fields and role-based access."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=20, choices=[
        ('admin', 'Admin'),
        ('attorney', 'Attorney'),
        ('paralegal', 'Paralegal'),
        ('client', 'Client'),
    ], default='attorney')
    organization = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    bar_number = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-date_joined']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"


class Client(models.Model):
    """Client records for legal case management."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    organization = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='clients'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Case(models.Model):
    """Legal case with full lifecycle tracking and AI analysis support."""
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('under_review', 'Under Review'),
        ('closed', 'Closed'),
        ('archived', 'Archived'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    CASE_TYPE_CHOICES = [
        ('contract', 'Contract Dispute'),
        ('criminal', 'Criminal'),
        ('civil', 'Civil'),
        ('corporate', 'Corporate'),
        ('intellectual_property', 'Intellectual Property'),
        ('employment', 'Employment'),
        ('family', 'Family'),
        ('immigration', 'Immigration'),
        ('tax', 'Tax'),
        ('real_estate', 'Real Estate'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_number = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=500)
    description = models.TextField()
    case_type = models.CharField(max_length=30, choices=CASE_TYPE_CHOICES, default='other')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, related_name='cases', null=True, blank=True
    )
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='assigned_cases'
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='created_cases'
    )
    court = models.CharField(max_length=255, blank=True)
    judge = models.CharField(max_length=255, blank=True)
    filing_date = models.DateField(null=True, blank=True)
    next_hearing_date = models.DateTimeField(null=True, blank=True)
    case_text = models.TextField(blank=True, help_text="Full case text for AI analysis")
    ai_analysis = models.JSONField(default=dict, blank=True)
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.case_number}: {self.title}"


class Document(models.Model):
    """Legal documents with PDF processing and vector embedding support."""
    DOC_TYPE_CHOICES = [
        ('contract', 'Contract'),
        ('brief', 'Legal Brief'),
        ('motion', 'Motion'),
        ('evidence', 'Evidence'),
        ('correspondence', 'Correspondence'),
        ('court_order', 'Court Order'),
        ('precedent', 'Precedent Case'),
        ('other', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name='documents', null=True, blank=True
    )
    title = models.CharField(max_length=500)
    document_type = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES, default='other')
    file = models.FileField(upload_to='documents/%Y/%m/')
    file_size = models.IntegerField(default=0)
    content_text = models.TextField(blank=True, help_text="Extracted text content")
    is_vectorized = models.BooleanField(default=False)
    vector_ids = models.JSONField(default=list, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class ChatSession(models.Model):
    """Chat session for conversational AI interactions."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=500, default="New Chat")
    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name='chat_sessions', null=True, blank=True
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions')
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title} - {self.user.username}"


class ChatMessage(models.Model):
    """Individual message within a chat session."""
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
        ('tool', 'Tool'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        ChatSession, on_delete=models.CASCADE, related_name='messages'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    tool_calls = models.JSONField(default=list, blank=True)
    tool_name = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    tokens_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.role}] {self.content[:80]}"


class AnalysisResult(models.Model):
    """Stored results from AI-powered legal analysis runs."""
    ANALYSIS_TYPES = [
        ('full_analysis', 'Full Legal Analysis'),
        ('loophole_detection', 'Loophole Detection'),
        ('precedent_search', 'Precedent Search'),
        ('risk_assessment', 'Risk Assessment'),
        ('contract_review', 'Contract Review'),
        ('compliance_check', 'Compliance Check'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='analyses')
    analysis_type = models.CharField(max_length=30, choices=ANALYSIS_TYPES)
    input_text = models.TextField()
    result = models.JSONField(default=dict)
    summary = models.TextField(blank=True)
    precedents_found = models.JSONField(default=list, blank=True)
    loopholes_identified = models.JSONField(default=list, blank=True)
    risk_score = models.FloatField(null=True, blank=True)
    recommendations = models.JSONField(default=list, blank=True)
    tools_used = models.JSONField(default=list, blank=True)
    evaluation_scores = models.JSONField(default=dict, blank=True)
    processing_time = models.FloatField(default=0)
    tokens_consumed = models.IntegerField(default=0)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.analysis_type} for {self.case.case_number}"


class CaseTimeline(models.Model):
    """Timeline events for tracking case progression."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='timeline_events')
    event_type = models.CharField(max_length=50)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_date = models.DateTimeField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-event_date']

    def __str__(self):
        return f"{self.title} ({self.event_date.strftime('%Y-%m-%d')})"


class BillingEntry(models.Model):
    """Time and billing tracking for legal cases."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='billing_entries')
    description = models.CharField(max_length=500)
    hours = models.DecimalField(max_digits=6, decimal_places=2)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    billed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_billed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        verbose_name_plural = 'Billing entries'

    def __str__(self):
        return f"{self.description} - {self.hours}h @ ${self.rate}"


class AuditLog(models.Model):
    """Audit trail for compliance and security tracking."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)
    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=100)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} - {self.action} {self.resource_type} ({self.created_at})"
