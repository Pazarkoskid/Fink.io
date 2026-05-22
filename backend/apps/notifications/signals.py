"""Signals that create notifications when various events happen."""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Notification


def _create(user, actor, type_, message, url='', obj=None):
    """Safely create a notification, skipping if recipient == actor."""
    if not user or (actor and actor == user):
        return
    Notification.objects.create(
        user=user,
        actor=actor,
        type=type_,
        message=message,
        url=url,
        related_object_type=obj.__class__.__name__.lower() if obj else '',
        related_object_id=obj.id if obj else None,
    )


# === Friendship signals ===

@receiver(post_save, sender='accounts.Friendship')
def friendship_notification(sender, instance, created, **kwargs):
    if created and instance.status == 'pending':
        # New friend request
        _create(
            user=instance.addressee,
            actor=instance.requester,
            type_='friend_request',
            message=f'{instance.requester.username} ти прати барање за пријател.',
            url='/friends',
            obj=instance,
        )
    elif not created and instance.status == 'accepted':
        # Friend request was accepted → notify the requester
        _create(
            user=instance.requester,
            actor=instance.addressee,
            type_='friend_accepted',
            message=f'{instance.addressee.username} го прифати твоето барање за пријател.',
            url=f'/users/{instance.addressee.id}',
            obj=instance,
        )


@receiver(post_delete, sender='accounts.Friendship')
def friendship_deleted(sender, instance, **kwargs):
    """When a request is rejected/cancelled, remove pending notification."""
    Notification.objects.filter(
        related_object_type='friendship',
        related_object_id=instance.id,
        type='friend_request',
    ).delete()


# === SavedQuiz signals ===

@receiver(post_save, sender='quizzes.SavedQuiz')
def quiz_saved_notification(sender, instance, created, **kwargs):
    if not created:
        return
    quiz = instance.quiz
    if not quiz.author or quiz.author == instance.user:
        return
    _create(
        user=quiz.author,
        actor=instance.user,
        type_='quiz_saved',
        message=f'{instance.user.username} го зачува твојот квиз „{quiz.title[:40]}".',
        url=f'/quiz/{quiz.id}',
        obj=quiz,
    )


# === SavedMaterial signals ===

@receiver(post_save, sender='materials.SavedMaterial')
def material_saved_notification(sender, instance, created, **kwargs):
    if not created:
        return
    material = instance.material
    if not material.uploaded_by or material.uploaded_by == instance.user:
        return
    _create(
        user=material.uploaded_by,
        actor=instance.user,
        type_='material_saved',
        message=f'{instance.user.username} ја зачува твојата база „{material.title[:40]}".',
        url='/databases',
        obj=material,
    )


# === Like signals (optional - only fire on first like) ===

@receiver(post_save, sender='quizzes.Like')
def quiz_liked_notification(sender, instance, created, **kwargs):
    if not created:
        return
    quiz = instance.quiz
    if not quiz.author or quiz.author == instance.user:
        return
    # Only notify on every 5th like to avoid spam (1, 5, 10, 25, 50, 100...)
    likes_count = quiz.likes_count
    milestones = {1, 5, 10, 25, 50, 100, 250, 500, 1000}
    if likes_count not in milestones:
        return
    _create(
        user=quiz.author,
        actor=instance.user,
        type_='quiz_liked',
        message=f'Твојот квиз „{quiz.title[:40]}" има {likes_count} лајкови!',
        url=f'/quiz/{quiz.id}',
        obj=quiz,
    )


@receiver(post_save, sender='materials.MaterialLike')
def material_liked_notification(sender, instance, created, **kwargs):
    if not created:
        return
    material = instance.material
    if not material.uploaded_by or material.uploaded_by == instance.user:
        return
    likes_count = material.likes_count
    milestones = {1, 5, 10, 25, 50, 100, 250, 500, 1000}
    if likes_count not in milestones:
        return
    _create(
        user=material.uploaded_by,
        actor=instance.user,
        type_='material_liked',
        message=f'Твојата база „{material.title[:40]}" има {likes_count} лајкови!',
        url='/databases',
        obj=material,
    )
