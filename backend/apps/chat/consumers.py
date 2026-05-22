"""
WebSocket consumer for chat + presence.
"""
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .presence import presence


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """Authenticated user joins their personal channel group."""

    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.user = user
        self.group_name = f'user_{user.id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Track presence + notify friends if this is first connection
        is_first = presence.connect(user.id)
        if is_first:
            await self._broadcast_presence(online=True)

        # Send initial state to this client
        online_friends = await self._get_online_friend_ids()
        await self.send_json({
            'type': 'connected',
            'user_id': user.id,
            'online_friends': online_friends,
        })

    async def disconnect(self, code):
        if not hasattr(self, 'group_name'):
            return

        await self.channel_layer.group_discard(self.group_name, self.channel_name)

        # Track presence + notify friends if last connection
        is_last = presence.disconnect(self.user.id)
        if is_last:
            await self._broadcast_presence(online=False)

    async def receive_json(self, content, **kwargs):
        msg_type = content.get('type')
        if msg_type == 'send_message':
            await self._handle_send(content)
        elif msg_type == 'typing':
            await self._handle_typing(content)

    async def _handle_send(self, content):
        conv_id = content.get('conversation_id')
        body = (content.get('body') or '').strip()
        client_temp_id = content.get('temp_id')  # so the sender's UI can dedupe
        if not conv_id or not body:
            return
        if len(body) > 4000:
            body = body[:4000]

        result = await self._save_message(conv_id, body)
        if not result:
            await self.send_json({'type': 'error', 'message': 'Не може да испратиш порака.'})
            return

        message_data, other_user_id = result
        if client_temp_id:
            message_data['temp_id'] = client_temp_id

        # Notify the recipient (not the sender — sender adds it optimistically)
        if other_user_id and other_user_id != self.user.id:
            await self.channel_layer.group_send(
                f'user_{other_user_id}',
                {'type': 'chat.message', 'message': message_data},
            )

        # Send a confirmation to the sender (so they can replace temp_id with real id)
        await self.send_json({'type': 'message_confirmed', 'message': message_data})

    async def _handle_typing(self, content):
        conv_id = content.get('conversation_id')
        if not conv_id:
            return
        other_id = await self._get_other_user_id(conv_id)
        if not other_id:
            return
        await self.channel_layer.group_send(
            f'user_{other_id}',
            {
                'type': 'chat.typing',
                'conversation_id': conv_id,
                'user_id': self.user.id,
            },
        )

    async def _broadcast_presence(self, online):
        """Tell all my friends that I went online/offline."""
        friend_ids = await self._get_friend_ids()
        for fid in friend_ids:
            await self.channel_layer.group_send(
                f'user_{fid}',
                {
                    'type': 'chat.presence',
                    'user_id': self.user.id,
                    'online': online,
                },
            )

    # ===== Channel layer event handlers =====

    async def chat_message(self, event):
        await self.send_json({'type': 'message', 'message': event['message']})

    async def chat_typing(self, event):
        await self.send_json({
            'type': 'typing',
            'conversation_id': event['conversation_id'],
            'user_id': event['user_id'],
        })

    async def chat_presence(self, event):
        await self.send_json({
            'type': 'presence',
            'user_id': event['user_id'],
            'online': event['online'],
        })

    # ===== Database operations =====

    @database_sync_to_async
    def _save_message(self, conv_id, body):
        from .models import Conversation, Message
        try:
            conv = Conversation.objects.get(pk=conv_id)
        except Conversation.DoesNotExist:
            return None
        if not conv.participants.filter(id=self.user.id).exists():
            return None

        msg = Message.objects.create(
            conversation=conv, sender=self.user, body=body,
        )
        conv.last_message_at = msg.created_at
        conv.last_message_preview = body[:120]
        conv.save(update_fields=['last_message_at', 'last_message_preview'])

        other = conv.other_user(self.user)
        avatar_url = None
        if self.user.avatar:
            avatar_url = self.user.avatar.url

        return ({
            'id': msg.id,
            'conversation': conv.id,
            'body': msg.body,
            'sender': self.user.id,
            'sender_username': self.user.username,
            'sender_avatar': avatar_url,
            'created_at': msg.created_at.isoformat(),
        }, other.id if other else None)

    @database_sync_to_async
    def _get_other_user_id(self, conv_id):
        from .models import Conversation
        try:
            conv = Conversation.objects.get(pk=conv_id)
        except Conversation.DoesNotExist:
            return None
        if not conv.participants.filter(id=self.user.id).exists():
            return None
        other = conv.other_user(self.user)
        return other.id if other else None

    @database_sync_to_async
    def _get_friend_ids(self):
        from apps.accounts.models import Friendship
        return list(Friendship.friends_of(self.user).values_list('id', flat=True))

    @database_sync_to_async
    def _get_online_friend_ids(self):
        from apps.accounts.models import Friendship
        friend_ids = list(Friendship.friends_of(self.user).values_list('id', flat=True))
        online = presence.online_users()
        return [fid for fid in friend_ids if fid in online]
