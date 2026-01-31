from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView

from .views import (
    UserViewSet, ClientViewSet, CaseViewSet, DocumentViewSet,
    ChatSessionViewSet, AnalysisViewSet, CaseTimelineViewSet,
    BillingEntryViewSet, AuditLogViewSet,
    DashboardView, HealthCheckView, RegisterView, RAGSearchView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'cases', CaseViewSet, basename='case')
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'chat-sessions', ChatSessionViewSet, basename='chat-session')
router.register(r'analyses', AnalysisViewSet, basename='analysis')
router.register(r'timeline-events', CaseTimelineViewSet, basename='timeline-event')
router.register(r'billing', BillingEntryViewSet, basename='billing')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),

    # Authentication
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/token/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token-verify'),

    # Dashboard
    path('dashboard/', DashboardView.as_view(), name='dashboard'),

    # Health check
    path('health/', HealthCheckView.as_view(), name='health-check'),

    # RAG search
    path('rag/search/', RAGSearchView.as_view(), name='rag-search'),

    # MCP endpoints
    path('mcp/', include('legal_assistant.mcp.urls')),
]
