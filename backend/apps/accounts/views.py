"""Views for user accounts: register, profile, list users (admin)."""
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from django.utils import timezone
from .models import UserSubject, Friendship
from .serializers import (
    UserSerializer, PublicUserSerializer,
    UserRegistrationSerializer, UserUpdateSerializer,
    UserSubjectSerializer,
)
from .permissions import IsAdminRole

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Public endpoint: create a new account."""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class CurrentUserView(APIView):
    """GET / PATCH the authenticated user's own profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class UserDetailView(generics.RetrieveAPIView):
    """Public read-only user info."""
    queryset = User.objects.all()
    serializer_class = PublicUserSerializer
    permission_classes = [permissions.AllowAny]


class PublicProfileView(APIView):
    """
    GET /api/accounts/users/<id>/profile/
    Returns user info + stats + badges + quizzes + subjects + friends + materials.
    Public — no auth needed.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        from apps.analytics.models import UserStats
        from apps.analytics.badges import calculate_badges
        from apps.analytics.serializers import UserStatsSerializer
        from apps.quizzes.models import Quiz, SavedQuiz
        from apps.quizzes.serializers import QuizListSerializer
        from apps.materials.models import Subject, Material, SavedMaterial
        from apps.materials.serializers import SubjectSerializer, MaterialSerializer

        user = get_object_or_404(User, pk=pk)

        # 1. Basic user info
        user_data = PublicUserSerializer(user, context={'request': request}).data

        # 2. Stats
        stats, _ = UserStats.objects.get_or_create(user=user)
        stats_data = UserStatsSerializer(stats).data

        # 3. Rank
        rank = (UserStats.objects
                .filter(total_points__gt=stats.total_points,
                        user__role__in=([user.role] if user.role == 'student'
                                        else ['instructor', 'admin']))
                .count()) + 1
        stats_data['rank'] = rank

        # 4. Badges
        badges = [b.to_dict() for b in calculate_badges(stats, user)]

        # 5. Created quizzes (published only)
        created_qs = (Quiz.objects
                      .filter(author=user, status='published', visibility='public')
                      .annotate(questions_count=Count('questions'))
                      .order_by('-likes_count', '-created_at')[:12])
        created_quizzes = QuizListSerializer(
            created_qs, many=True, context={'request': request}
        ).data

        # 6. Saved quizzes (only show on user's own profile or always public)
        saved_quiz_ids = SavedQuiz.objects.filter(user=user).values_list('quiz_id', flat=True)
        saved_qs = (Quiz.objects
                    .filter(id__in=saved_quiz_ids, status='published', visibility='public')
                    .annotate(questions_count=Count('questions'))
                    .order_by('-likes_count')[:12])
        saved_quizzes = QuizListSerializer(
            saved_qs, many=True, context={'request': request}
        ).data

        # 7. Uploaded materials (public only)
        uploaded_materials_qs = Material.objects.filter(
            uploaded_by=user, visibility='public', status='ready'
        ).order_by('-likes_count', '-created_at')[:12]
        uploaded_materials = MaterialSerializer(
            uploaded_materials_qs, many=True, context={'request': request}
        ).data

        # 8. Saved materials (only show public ones the user saved)
        saved_mat_ids = SavedMaterial.objects.filter(user=user).values_list('material_id', flat=True)
        saved_materials_qs = Material.objects.filter(
            id__in=saved_mat_ids, visibility='public', status='ready'
        ).order_by('-created_at')[:12]
        saved_materials = MaterialSerializer(
            saved_materials_qs, many=True, context={'request': request}
        ).data

        # 9. Taken subjects
        taken_subjects = (UserSubject.objects
                          .filter(user=user)
                          .select_related('subject')
                          .order_by('subject__year', 'subject__semester'))
        taken_data = UserSubjectSerializer(taken_subjects, many=True).data

        # 10. Suggested subjects
        suggested = []
        if user.current_year:
            suggested_qs = Subject.objects.filter(
                year=user.current_year, subject_type='mandatory',
            ).order_by('semester')
            suggested = SubjectSerializer(suggested_qs, many=True).data

        # 11. Friends
        friends_qs = Friendship.friends_of(user).order_by('username')
        friends_count = friends_qs.count()
        friends_preview = PublicUserSerializer(
            friends_qs[:12], many=True, context={'request': request}
        ).data

        # 12. Friendship status (from current viewer's perspective)
        friendship_status = 'self'
        if request.user.is_authenticated and request.user != user:
            status_key, _ = Friendship.get_status_between(request.user, user)
            friendship_status = status_key

        return Response({
            'user': user_data,
            'stats': stats_data,
            'badges': badges,
            'created_quizzes': created_quizzes,
            'created_count': Quiz.objects.filter(author=user, status='published').count(),
            'saved_quizzes': saved_quizzes,
            'saved_quizzes_count': len(saved_quiz_ids),
            'uploaded_materials': uploaded_materials,
            'uploaded_materials_count': Material.objects.filter(
                uploaded_by=user, visibility='public', status='ready'
            ).count(),
            'saved_materials': saved_materials,
            'saved_materials_count': len(saved_mat_ids),
            'taken_subjects': taken_data,
            'taken_count': taken_subjects.count(),
            'suggested_subjects': suggested,
            'friends': friends_preview,
            'friends_count': friends_count,
            'friendship_status': friendship_status,
        })


# ============================================
#   User Subject management (own user only)
# ============================================

class UserSubjectListCreateView(generics.ListCreateAPIView):
    """
    GET /api/accounts/me/subjects/  — list my taken subjects
    POST                            — add a subject to my list
    """
    serializer_class = UserSubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSubject.objects.filter(
            user=self.request.user
        ).select_related('subject').order_by('subject__year', 'subject__semester')

    def perform_create(self, serializer):
        # Prevent duplicates - update existing instead
        subject = serializer.validated_data['subject']
        status_val = serializer.validated_data.get('status', 'current')
        grade = serializer.validated_data.get('grade', '')
        obj, _ = UserSubject.objects.update_or_create(
            user=self.request.user,
            subject=subject,
            defaults={'status': status_val, 'grade': grade},
        )
        serializer.instance = obj


class UserSubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/accounts/me/subjects/<id>/
    For removing or updating status (current/completed).
    """
    serializer_class = UserSubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserSubject.objects.filter(user=self.request.user)


class AdminUserListView(generics.ListAPIView):
    """Admin-only: list all users with role filter."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        return qs


class AdminUpdateRoleView(APIView):
    """Admin-only: change a user's role."""
    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        new_role = request.data.get('role')
        valid_roles = ['student', 'instructor', 'moderator', 'admin']
        if new_role not in valid_roles:
            return Response(
                {'error': 'Невалидна улога.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.role = new_role
        user.save()
        return Response(UserSerializer(user).data)


# ============================================
#   Friendship endpoints
# ============================================

class FriendsListView(APIView):
    """
    GET /api/accounts/users/<id>/friends/  — list all friends of a user (public)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        friends = Friendship.friends_of(user).order_by('username')
        return Response(
            PublicUserSerializer(friends, many=True, context={'request': request}).data
        )


class MyFriendRequestsView(APIView):
    """
    GET /api/accounts/me/friend-requests/  — list my pending received requests
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        received = Friendship.objects.filter(
            addressee=request.user, status='pending'
        ).select_related('requester')
        sent = Friendship.objects.filter(
            requester=request.user, status='pending'
        ).select_related('addressee')

        return Response({
            'received': [{
                'id': r.id,
                'user': PublicUserSerializer(r.requester, context={'request': request}).data,
                'created_at': r.created_at,
            } for r in received],
            'sent': [{
                'id': r.id,
                'user': PublicUserSerializer(r.addressee, context={'request': request}).data,
                'created_at': r.created_at,
            } for r in sent],
            'received_count': received.count(),
            'sent_count': sent.count(),
        })


class SendFriendRequestView(APIView):
    """
    POST /api/accounts/users/<id>/friend-request/
    Send a friend request to user <id>.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if target == request.user:
            return Response(
                {'detail': 'Не можеш да испратиш барање на себе.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        existing = Friendship.objects.filter(
            Q(requester=request.user, addressee=target) |
            Q(requester=target, addressee=request.user)
        ).first()

        if existing:
            if existing.status == 'accepted':
                return Response({'detail': 'Веќе сте пријатели.', 'status': 'friends'})
            elif existing.requester == request.user:
                return Response({'detail': 'Барањето е веќе испратено.', 'status': 'pending_sent'})
            else:
                # Other user already sent us a request — auto-accept it
                existing.status = 'accepted'
                existing.accepted_at = timezone.now()
                existing.save()
                return Response({'detail': 'Барањето е прифатено!', 'status': 'friends'})

        Friendship.objects.create(
            requester=request.user, addressee=target, status='pending'
        )
        return Response({'detail': 'Барањето е испратено.', 'status': 'pending_sent'},
                        status=status.HTTP_201_CREATED)


class RespondFriendRequestView(APIView):
    """
    POST /api/accounts/friend-requests/<id>/respond/
    Body: {action: 'accept' | 'reject'}
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            fr = Friendship.objects.get(pk=pk, addressee=request.user, status='pending')
        except Friendship.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action == 'accept':
            fr.status = 'accepted'
            fr.accepted_at = timezone.now()
            fr.save()
            return Response({'status': 'friends'})
        elif action == 'reject':
            fr.delete()
            return Response({'status': 'none'})
        return Response(
            {'detail': 'Невалидна акција.'},
            status=status.HTTP_400_BAD_REQUEST
        )


class RemoveFriendView(APIView):
    """
    DELETE /api/accounts/users/<id>/friend/
    Cancel sent request OR remove existing friend OR delete received pending request.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            target = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        Friendship.objects.filter(
            Q(requester=request.user, addressee=target) |
            Q(requester=target, addressee=request.user)
        ).delete()
        return Response({'status': 'none'})


class UserSearchView(generics.ListAPIView):
    """Search users by username for friend-add autocomplete."""
    serializer_class = PublicUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        q = self.request.query_params.get('q', '').strip()
        if not q or len(q) < 2:
            return User.objects.none()
        return User.objects.filter(
            Q(username__icontains=q) | Q(email__icontains=q)
        ).exclude(id=self.request.user.id)[:20]
