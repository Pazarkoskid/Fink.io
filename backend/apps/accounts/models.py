"""User model with role-based access (Guest, Student, Instructor, Moderator, Admin)."""
from django.contrib.auth.models import AbstractUser
from django.db import models


class Role(models.TextChoices):
    STUDENT = 'student', 'Студент'
    INSTRUCTOR = 'instructor', 'Инструктор'
    MODERATOR = 'moderator', 'Модератор'
    ADMIN = 'admin', 'Администратор'


class User(AbstractUser):
    """
    Custom user. Guest is implicit (unauthenticated requests).
    Authenticated users always have one of: student, instructor, moderator, admin.
    """
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.STUDENT,
    )
    bio = models.TextField(blank=True, max_length=500)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    preferred_language = models.CharField(max_length=10, default='mk')

    # Academic info (optional, user-editable)
    current_year = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text='Тековна година на студии (1-4)'
    )
    study_program = models.CharField(
        max_length=100, blank=True,
        help_text='На пр. „Софтверско инженерство и информациски системи"'
    )
    status_label = models.CharField(
        max_length=50, blank=True,
        help_text='Кратки статус-зборови — chilling, study, sleeping...'
    )
    status_emoji = models.CharField(
        max_length=10, blank=True,
        help_text='Опционален emoji за статусот'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def is_instructor(self):
        return self.role in (Role.INSTRUCTOR, Role.ADMIN)

    @property
    def is_moderator(self):
        return self.role in (Role.MODERATOR, Role.ADMIN)

    @property
    def is_admin_role(self):
        return self.role == Role.ADMIN


class UserSubject(models.Model):
    """Subjects a user has taken or is currently taking. User-managed."""
    STATUS_CHOICES = [
        ('current', 'Тековен'),
        ('completed', 'Завршен'),
    ]

    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE,
        related_name='taken_subjects',
    )
    subject = models.ForeignKey(
        'materials.Subject', on_delete=models.CASCADE,
        related_name='taken_by',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='current')
    grade = models.CharField(max_length=5, blank=True, help_text='Опционална оценка')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [['user', 'subject']]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} → {self.subject.name} ({self.status})"


class Friendship(models.Model):
    """
    Friendship between two users with explicit request flow.
    `requester` sends a request; `addressee` accepts/rejects.
    Status flow: pending -> accepted (or deleted on reject).
    """
    STATUS_CHOICES = [
        ('pending', 'Очекува'),
        ('accepted', 'Прифатено'),
    ]

    requester = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE,
        related_name='sent_friend_requests',
    )
    addressee = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE,
        related_name='received_friend_requests',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [['requester', 'addressee']]
        indexes = [
            models.Index(fields=['addressee', 'status']),
            models.Index(fields=['requester', 'status']),
        ]

    def __str__(self):
        return f"{self.requester.username} → {self.addressee.username} ({self.status})"

    @classmethod
    def get_status_between(cls, user_a, user_b):
        """
        Return ('none' | 'pending_sent' | 'pending_received' | 'friends', friendship_instance_or_None).
        From user_a's perspective.
        """
        if user_a == user_b or not user_a.is_authenticated:
            return ('self', None)
        fr = cls.objects.filter(
            models.Q(requester=user_a, addressee=user_b) |
            models.Q(requester=user_b, addressee=user_a)
        ).first()
        if not fr:
            return ('none', None)
        if fr.status == 'accepted':
            return ('friends', fr)
        if fr.requester == user_a:
            return ('pending_sent', fr)
        return ('pending_received', fr)

    @classmethod
    def friends_of(cls, user):
        """Queryset of User objects that are friends with `user`."""
        from django.db.models import Q
        accepted = cls.objects.filter(
            Q(requester=user) | Q(addressee=user),
            status='accepted',
        )
        friend_ids = set()
        for f in accepted:
            friend_ids.add(f.addressee_id if f.requester_id == user.id else f.requester_id)
        return User.objects.filter(id__in=friend_ids)
