import django_filters
from ..models import Case, Document, AnalysisResult, BillingEntry, AuditLog


class CaseFilter(django_filters.FilterSet):
    status = django_filters.ChoiceFilter(choices=Case.STATUS_CHOICES)
    priority = django_filters.ChoiceFilter(choices=Case.PRIORITY_CHOICES)
    case_type = django_filters.ChoiceFilter(choices=Case.CASE_TYPE_CHOICES)
    assigned_to = django_filters.UUIDFilter(field_name='assigned_to__id')
    client = django_filters.UUIDFilter(field_name='client__id')
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    filing_date_after = django_filters.DateFilter(field_name='filing_date', lookup_expr='gte')
    filing_date_before = django_filters.DateFilter(field_name='filing_date', lookup_expr='lte')

    class Meta:
        model = Case
        fields = [
            'status', 'priority', 'case_type', 'assigned_to',
            'client', 'court',
        ]


class DocumentFilter(django_filters.FilterSet):
    document_type = django_filters.ChoiceFilter(choices=Document.DOC_TYPE_CHOICES)
    case = django_filters.UUIDFilter(field_name='case__id')
    is_vectorized = django_filters.BooleanFilter()
    uploaded_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    uploaded_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Document
        fields = ['document_type', 'case', 'is_vectorized']


class AnalysisResultFilter(django_filters.FilterSet):
    analysis_type = django_filters.ChoiceFilter(choices=AnalysisResult.ANALYSIS_TYPES)
    case = django_filters.UUIDFilter(field_name='case__id')
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    min_score = django_filters.NumberFilter(field_name='risk_score', lookup_expr='gte')
    max_score = django_filters.NumberFilter(field_name='risk_score', lookup_expr='lte')

    class Meta:
        model = AnalysisResult
        fields = ['analysis_type', 'case']


class BillingEntryFilter(django_filters.FilterSet):
    case = django_filters.UUIDFilter(field_name='case__id')
    is_billed = django_filters.BooleanFilter()
    date_after = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_before = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    billed_by = django_filters.UUIDFilter(field_name='billed_by__id')

    class Meta:
        model = BillingEntry
        fields = ['case', 'is_billed', 'billed_by']


class AuditLogFilter(django_filters.FilterSet):
    action = django_filters.CharFilter()
    resource_type = django_filters.CharFilter()
    user = django_filters.UUIDFilter(field_name='user__id')
    created_after = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = AuditLog
        fields = ['action', 'resource_type', 'user']
