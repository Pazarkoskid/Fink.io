"""
ASGI config for Fink.io — supports both HTTP (Django) and WebSocket (Channels).
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'fink_io.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

# Import routing AFTER django.setup()
from apps.chat.routing import websocket_urlpatterns
from apps.chat.middleware import JwtAuthMiddleware

# Note: Authentication is handled by JwtAuthMiddleware (token in query string).
# We skip AllowedHostsOriginValidator because:
#   1. The JWT token already proves the user is legitimate
#   2. Render's proxy may pass through Origin headers that don't match ALLOWED_HOSTS
#   3. WebSocket security relies on token validation in the consumer
application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': JwtAuthMiddleware(URLRouter(websocket_urlpatterns)),
})
