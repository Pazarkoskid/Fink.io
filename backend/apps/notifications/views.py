"""Notification views."""
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ — list my notifications."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        only_unread = self.request.query_params.get('unread')
        if only_unread:
            qs = qs.filter(is_read=False)
        return qs[:50]

    def get_serializer_context(self):
        return {'request': self.request}


class NotificationCountView(APIView):
    """GET /api/notifications/count/ — unread count."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            user=request.user, is_read=False
        ).count()
        return Response({'count': count})


class MarkReadView(APIView):
    """POST /api/notifications/<id>/read/ — mark one as read."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            n = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        n.is_read = True
        n.save(update_fields=['is_read'])
        return Response({'is_read': True})


class MarkAllReadView(APIView):
    """POST /api/notifications/read-all/ — mark all my notifications as read."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(
            user=request.user, is_read=False
        ).update(is_read=True)
        return Response({'ok': True})
