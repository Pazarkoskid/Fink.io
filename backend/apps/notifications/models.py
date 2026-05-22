"""
Notification model — alerts for users about events on the platform.
Types: friend_request, friend_accepted, quiz_saved, material_saved, quiz_liked, material_liked.
"""
from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPE_CHOICES = [
        ('friend_request',   'Барање за пријател'),
        ('friend_accepted',  'Барањето прифатено'),
        ('quiz_saved',       'Зачуван квиз'),
        ('quiz_liked',       'Лајкнат квиз'),
        ('material_saved',   'Зачувана база'),
        ('material_liked',   'Лајкната база'),
    ]

    # Recipient
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notifications',
    )
    # Actor (who caused the notification)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='actor_notifications',
        null=True, blank=True,
    )

    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    message = models.CharField(max_length=200)

    # Optional URL to navigate to when clicked
    url = models.CharField(max_length=255, blank=True)

    # Generic ref to the related object (for grouping/dedup)
    related_object_type = models.CharField(max_length=30, blank=True)
    related_object_id = models.PositiveIntegerField(null=True, blank=True)

    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]

    def __str__(self):
        return f"{self.type} → {self.user.username}"
