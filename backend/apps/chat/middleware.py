"""
Channels middleware: authenticates WebSocket connections using a JWT token
passed via the query string `?token=...`.
"""
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def get_user_from_token(token):
    """Validate a JWT token and return the User, or AnonymousUser on failure."""
    if not token:
        return AnonymousUser()
    try:
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth import get_user_model

        access = AccessToken(token)
        user_id = access['user_id']
        User = get_user_model()
        return User.objects.get(pk=user_id)
    except Exception:
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    """Reads JWT from `?token=` and sets scope['user']."""
    async def __call__(self, scope, receive, send):
        query = parse_qs(scope.get('query_string', b'').decode())
        token = (query.get('token') or [None])[0]
        scope['user'] = await get_user_from_token(token)
        return await super().__call__(scope, receive, send)
