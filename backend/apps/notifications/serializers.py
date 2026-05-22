"""Notification serializers."""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source='actor.username', read_only=True)
    actor_id = serializers.IntegerField(source='actor.id', read_only=True)
    actor_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ['id', 'type', 'message', 'url',
                  'actor_id', 'actor_username', 'actor_avatar',
                  'related_object_type', 'related_object_id',
                  'is_read', 'created_at']
        read_only_fields = fields

    def get_actor_avatar(self, obj):
        if obj.actor and obj.actor.avatar:
            request = self.context.get('request')
            url = obj.actor.avatar.url
            return request.build_absolute_uri(url) if request else url
        return None
