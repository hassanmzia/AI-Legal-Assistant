import os
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ServiceKeyUser:
    """A pseudo-user object for service-to-service requests."""

    def __init__(self):
        self.pk = None
        self.id = None
        self.username = 'service-account'
        self.is_authenticated = True
        self.role = 'admin'

    def __str__(self):
        return 'service-account'


class ServiceKeyAuthentication(BaseAuthentication):
    """Authenticate internal service-to-service requests via X-Service-Key header."""

    def authenticate(self, request):
        service_key = request.headers.get('X-Service-Key', '')
        if not service_key:
            return None  # Not a service request, let other authenticators try

        expected_key = os.environ.get('SERVICE_API_KEY', '')
        if not expected_key:
            return None

        if service_key != expected_key:
            raise AuthenticationFailed('Invalid service key')

        return (ServiceKeyUser(), None)
