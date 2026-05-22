"""
ASGI config for Fink.io — supports both HTTP (Django) and WebSocket (Channels).
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fink_io.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

# Import routing AFTER django.setup()
from apps.chat.routing import websocket_urlpatterns
from apps.chat.middleware import JwtAuthMiddleware

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AllowedHostsOriginValidator(
        JwtAuthMiddleware(URLRouter(websocket_urlpatterns))
    ),
})
