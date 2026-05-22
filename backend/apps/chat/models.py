"""
Chat models — 1-on-1 conversations between users.

- A Conversation is between exactly 2 users (we use a canonical key to dedup).
- Messages have a sender, body, timestamp.
- last_read tracking lets us show unread badges.
"""
from django.db import models
from django.conf import settings


def conversation_key(user_a_id, user_b_id):
    """Canonical key: smaller_id:larger_id - ensures dedup."""
    a, b = sorted([int(user_a_id), int(user_b_id)])
    return f"{a}:{b}"


class Conversation(models.Model):
    """A 1-on-1 conversation between two users."""
    # canonical key like "12:45" (smaller_id:larger_id)
    key = models.CharField(max_length=40, unique=True, db_index=True)

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='conversations',
    )

    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_message_preview = models.CharField(max_length=120, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-last_message_at', '-created_at']

    def __str__(self):
        return f"Conversation {self.key}"

    @classmethod
    def get_or_create_between(cls, user_a, user_b):
        if user_a == user_b:
            raise ValueError("Cannot chat with yourself.")
        key = conversation_key(user_a.id, user_b.id)
        try:
            conv = cls.objects.get(key=key)
            created = False
        except cls.DoesNotExist:
            conv = cls.objects.create(key=key)
            conv.participants.set([user_a, user_b])
            created = True
        return conv, created

    def other_user(self, user):
        """Return the participant that isn't `user`."""
        return self.participants.exclude(id=user.id).first()


class Message(models.Model):
    """A chat message in a conversation."""
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE,
        related_name='messages',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='sent_messages',
    )
    body = models.TextField(max_length=4000)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', '-created_at']),
        ]

    def __str__(self):
        return f"{self.sender.username}: {self.body[:30]}"


class ReadReceipt(models.Model):
    """Tracks the last message each user has read in each conversation."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='read_receipts',
    )
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE,
        related_name='read_receipts',
    )
    last_read_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['user', 'conversation']]
