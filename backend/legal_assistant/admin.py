from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import (
    User, Client, Case, Document, ChatSession, ChatMessage,
    AnalysisResult, CaseTimeline, BillingEntry, AuditLog
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'organization', 'is_active', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'first_name', 'last_name', 'organization')
    ordering = ('-date_joined',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Legal Assistant Fields', {
            'fields': ('role', 'organization', 'phone', 'bar_number'),
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Legal Assistant Fields', {
            'fields': ('role', 'organization', 'phone', 'bar_number'),
        }),
    )


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'organization', 'created_by', 'created_at')
    list_filter = ('organization', 'created_at')
    search_fields = ('name', 'email', 'organization')
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    list_display = (
        'case_number', 'title', 'case_type', 'status', 'priority',
        'assigned_to', 'client', 'created_at'
    )
    list_filter = ('status', 'priority', 'case_type', 'created_at')
    search_fields = ('case_number', 'title', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    raw_id_fields = ('client', 'assigned_to', 'created_by')
    date_hierarchy = 'created_at'


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'document_type', 'case', 'file_size',
        'is_vectorized', 'uploaded_by', 'created_at'
    )
    list_filter = ('document_type', 'is_vectorized', 'created_at')
    search_fields = ('title', 'content_text')
    readonly_fields = ('id', 'created_at', 'updated_at')
    raw_id_fields = ('case', 'uploaded_by')


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'case', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('title', 'user__username')
    readonly_fields = ('id', 'created_at', 'updated_at')
    raw_id_fields = ('user', 'case')


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ('session', 'role', 'short_content', 'tokens_used', 'created_at')
    list_filter = ('role', 'created_at')
    search_fields = ('content',)
    readonly_fields = ('id', 'created_at')
    raw_id_fields = ('session',)

    def short_content(self, obj):
        return obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
    short_content.short_description = 'Content'


@admin.register(AnalysisResult)
class AnalysisResultAdmin(admin.ModelAdmin):
    list_display = (
        'case', 'analysis_type', 'risk_score', 'processing_time',
        'tokens_consumed', 'created_by', 'created_at'
    )
    list_filter = ('analysis_type', 'created_at')
    search_fields = ('case__case_number', 'summary')
    readonly_fields = ('id', 'created_at')
    raw_id_fields = ('case', 'created_by')


@admin.register(CaseTimeline)
class CaseTimelineAdmin(admin.ModelAdmin):
    list_display = ('case', 'event_type', 'title', 'event_date', 'created_by')
    list_filter = ('event_type', 'event_date')
    search_fields = ('title', 'description')
    readonly_fields = ('id', 'created_at')
    raw_id_fields = ('case', 'created_by')


@admin.register(BillingEntry)
class BillingEntryAdmin(admin.ModelAdmin):
    list_display = (
        'case', 'description', 'hours', 'rate', 'amount',
        'date', 'billed_by', 'is_billed'
    )
    list_filter = ('is_billed', 'date')
    search_fields = ('description', 'case__case_number')
    readonly_fields = ('id', 'created_at')
    raw_id_fields = ('case', 'billed_by')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'resource_type', 'resource_id', 'ip_address', 'created_at')
    list_filter = ('action', 'resource_type', 'created_at')
    search_fields = ('user__username', 'resource_id', 'action')
    readonly_fields = ('id', 'created_at', 'user', 'action', 'resource_type', 'resource_id', 'details', 'ip_address')
    date_hierarchy = 'created_at'

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
