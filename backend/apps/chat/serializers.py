"""Chat serializers."""
from rest_framework import serializers
from .models import Conversation, Message, ReadReceipt


class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'body', 'sender', 'sender_username',
                  'sender_avatar', 'created_at']
        read_only_fields = ['id', 'sender', 'sender_username', 'sender_avatar', 'created_at']

    def get_sender_avatar(self, obj):
        if obj.sender and obj.sender.avatar:
            request = self.context.get('request')
            url = obj.sender.avatar.url
            return request.build_absolute_uri(url) if request else url
        return None


class ConversationSerializer(serializers.ModelSerializer):
    """For listing my conversations - includes other user info + unread count."""
    other_user = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'key', 'last_message_at', 'last_message_preview',
                  'other_user', 'unread_count', 'created_at']

    def get_other_user(self, obj):
        viewer = self.context['request'].user
        other = obj.other_user(viewer)
        if not other:
            return None
        request = self.context.get('request')
        avatar = None
        if other.avatar:
            url = other.avatar.url
            avatar = request.build_absolute_uri(url) if request else url
        return {
            'id': other.id,
            'username': other.username,
            'avatar': avatar,
            'role': other.role,
            'status_label': other.status_label,
            'status_emoji': other.status_emoji,
        }

    def get_unread_count(self, obj):
        viewer = self.context['request'].user
        receipt = ReadReceipt.objects.filter(user=viewer, conversation=obj).first()
        qs = Message.objects.filter(conversation=obj).exclude(sender=viewer)
        if receipt:
            qs = qs.filter(created_at__gt=receipt.last_read_at)
        return qs.count()
