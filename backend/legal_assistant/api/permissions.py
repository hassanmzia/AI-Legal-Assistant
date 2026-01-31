import os
from rest_framework.permissions import BasePermission


class IsServiceRequest(BasePermission):
    """Allow internal service-to-service requests using a shared API key."""

    def has_permission(self, request, view):
        service_key = request.headers.get('X-Service-Key', '')
        expected_key = os.environ.get('SERVICE_API_KEY', '')
        return bool(service_key and expected_key and service_key == expected_key)


class IsAttorneyOrService(BasePermission):
    """Allow attorney/admin users OR internal service requests."""

    def has_permission(self, request, view):
        # Check service key first
        service_key = request.headers.get('X-Service-Key', '')
        expected_key = os.environ.get('SERVICE_API_KEY', '')
        if service_key and expected_key and service_key == expected_key:
            return True
        # Fall back to user auth
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('admin', 'attorney')
        )


class IsAdmin(BasePermission):
    """Only allow admin users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsAttorneyOrAbove(BasePermission):
    """Allow admin and attorney users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('admin', 'attorney')
        )


class IsParalegalOrAbove(BasePermission):
    """Allow admin, attorney, and paralegal users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('admin', 'attorney', 'paralegal')
        )


class IsOwnerOrAdmin(BasePermission):
    """Allow resource owners or admin users."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        # Check common ownership fields
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        if hasattr(obj, 'assigned_to'):
            return obj.assigned_to == request.user
        if hasattr(obj, 'uploaded_by'):
            return obj.uploaded_by == request.user
        if hasattr(obj, 'billed_by'):
            return obj.billed_by == request.user
        return False


class IsClientReadOnly(BasePermission):
    """Client users can only read, not modify."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == 'client':
            return request.method in ('GET', 'HEAD', 'OPTIONS')
        return True
