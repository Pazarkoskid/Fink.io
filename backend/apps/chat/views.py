"""Chat REST views."""
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q

from .models import Conversation, Message, ReadReceipt
from .serializers import ConversationSerializer, MessageSerializer

User = get_user_model()


class MyConversationsView(generics.ListAPIView):
    """GET /api/chat/conversations/ — my conversations sorted by recent."""
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Conversation.objects.filter(
            participants=self.request.user
        ).order_by('-last_message_at', '-created_at')

    def get_serializer_context(self):
        return {'request': self.request}


class StartConversationView(APIView):
    """
    POST /api/chat/conversations/start/  {user_id: X}
    Returns the conversation between current user and user_id (creates if needed).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        other_id = request.data.get('user_id')
        if not other_id:
            return Response({'detail': 'user_id required'}, status=400)
        try:
            other = User.objects.get(pk=other_id)
        except User.DoesNotExist:
            return Response(status=404)
        if other == request.user:
            return Response({'detail': 'Cannot chat with yourself.'}, status=400)

        # Must be friends
        from apps.accounts.models import Friendship
        is_friend = Friendship.objects.filter(
            Q(requester=request.user, addressee=other) |
            Q(requester=other, addressee=request.user),
            status='accepted',
        ).exists()
        if not is_friend:
            return Response(
                {'detail': 'Може да испратиш порака само на пријател.'},
                status=403,
            )

        conv, _ = Conversation.get_or_create_between(request.user, other)
        serializer = ConversationSerializer(conv, context={'request': request})
        return Response(serializer.data)


class ConversationMessagesView(generics.ListAPIView):
    """GET /api/chat/conversations/<id>/messages/  — list messages."""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        conv_id = self.kwargs.get('pk')
        conv = get_object_or_404(Conversation, pk=conv_id)
        if not conv.participants.filter(id=self.request.user.id).exists():
            return Message.objects.none()
        return conv.messages.all().select_related('sender').order_by('created_at')

    def get_serializer_context(self):
        return {'request': self.request}


class MarkReadView(APIView):
    """POST /api/chat/conversations/<id>/read/ — mark messages as read."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        conv = get_object_or_404(Conversation, pk=pk)
        if not conv.participants.filter(id=request.user.id).exists():
            return Response(status=403)
        ReadReceipt.objects.update_or_create(
            user=request.user, conversation=conv,
            defaults={'last_read_at': timezone.now()},
        )
        return Response({'ok': True})


class UnreadCountView(APIView):
    """GET /api/chat/unread-count/ — total unread messages across all my conversations."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        my_convs = Conversation.objects.filter(participants=request.user)
        total = 0
        for conv in my_convs:
            receipt = ReadReceipt.objects.filter(
                user=request.user, conversation=conv,
            ).first()
            qs = Message.objects.filter(conversation=conv).exclude(sender=request.user)
            if receipt:
                qs = qs.filter(created_at__gt=receipt.last_read_at)
            total += qs.count()
        return Response({'count': total})


class OnlineFriendsView(APIView):
    """GET /api/chat/online-friends/ — list of friend user_ids currently online."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.accounts.models import Friendship
        from .presence import presence

        friend_ids = list(Friendship.friends_of(request.user).values_list('id', flat=True))
        online = presence.online_users()
        online_friends = [fid for fid in friend_ids if fid in online]
        return Response({'online': online_friends})
