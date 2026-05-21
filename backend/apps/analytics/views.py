"""
Endpoints:
- GET /api/analytics/leaderboard/?period=all|month|week
- GET /api/analytics/me/
- GET /api/analytics/quiz/<id>/  (author-only)
- GET /api/analytics/platform/  (admin-only)
"""
from collections import Counter
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, F, Q, Sum
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminRole
from apps.quizzes.models import Quiz, QuizAttempt, Question, Choice
from apps.materials.models import Material
from apps.moderation.models import Report
from .models import UserStats
from .serializers import (
    LeaderboardEntrySerializer,
    UserStatsSerializer,
    QuizAnalyticsSerializer,
    PlatformStatsSerializer,
)

User = get_user_model()


# =========================
#   Leaderboard
# =========================

class LeaderboardView(generics.ListAPIView):
    """
    Top-100 users by total points. Optionally scoped to a time window
    via ?period=week|month (defaults to all-time).
    """
    serializer_class = LeaderboardEntrySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        period = self.request.query_params.get('period', 'all')
        role_filter = self.request.query_params.get('role')  # student|instructor
        try:
            limit = max(1, min(100, int(self.request.query_params.get('limit', 10))))
        except (TypeError, ValueError):
            limit = 10

        if period in ('week', 'month'):
            # Time-windowed: aggregate attempts directly
            days = 7 if period == 'week' else 30
            since = timezone.now() - timedelta(days=days)

            qs = User.objects.filter(
                attempts__finished_at__gte=since,
                attempts__finished_at__isnull=False,
            )
            if role_filter == 'student':
                qs = qs.filter(role='student')
            elif role_filter == 'instructor':
                qs = qs.filter(role__in=['instructor', 'admin'])

            qs = (qs.annotate(
                      total_points=Sum('attempts__points_earned'),
                      total_attempts=Count('attempts'),
                      average_score=Avg('attempts__score'),
                  )
                  .filter(total_points__gt=0)
                  .order_by('-total_points')[:limit])

            # Transform User queryset into pseudo-UserStats for the serializer
            entries = []
            for rank, u in enumerate(qs, start=1):
                entry = UserStats(
                    user=u,
                    total_points=u.total_points or 0,
                    total_attempts=u.total_attempts or 0,
                    average_score=u.average_score or 0,
                    best_score=0,
                )
                entry.rank = rank
                entries.append(entry)
            return entries

        # All-time: just sort UserStats
        qs = (UserStats.objects
              .select_related('user')
              .filter(total_attempts__gt=0))

        if role_filter == 'student':
            qs = qs.filter(user__role='student')
        elif role_filter == 'instructor':
            qs = qs.filter(user__role__in=['instructor', 'admin'])

        qs = qs.order_by('-total_points')[:limit]
        for rank, s in enumerate(qs, start=1):
            s.rank = rank
        return list(qs)


class MyStatsView(APIView):
    """Authenticated user's own aggregated stats."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        stats, _ = UserStats.objects.get_or_create(user=request.user)

        # Bonus: my rank
        rank = (UserStats.objects
                .filter(total_points__gt=stats.total_points)
                .count()) + 1
        data = UserStatsSerializer(stats).data
        data['rank'] = rank
        data['total_users'] = UserStats.objects.filter(total_attempts__gt=0).count()
        return Response(data)


# =========================
#   Quiz analytics (author)
# =========================

class QuizAnalyticsView(APIView):
    """Detailed analytics for a single quiz. Only author or moderators."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            quiz = Quiz.objects.get(pk=pk)
        except Quiz.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if quiz.author_id != request.user.id and not request.user.is_moderator:
            return Response(status=status.HTTP_403_FORBIDDEN)

        attempts = QuizAttempt.objects.filter(quiz=quiz, finished_at__isnull=False)
        total_attempts = attempts.count()

        unique_players = attempts.values('user').distinct().count()
        avg_score = attempts.aggregate(a=Avg('score'))['a'] or 0
        # "Completion": attempts where at least 80% of questions were answered
        if total_attempts:
            completed = sum(
                1 for a in attempts
                if a.points_total and (a.points_earned / a.points_total) >= 0
                and len(a.answers or {}) >= max(1, quiz.questions.count() * 0.8)
            )
            completion_rate = completed / total_attempts * 100
        else:
            completion_rate = 0

        # Score distribution in 10-point buckets
        buckets = [0] * 11  # 0-9, 10-19, ..., 90-99, 100
        for a in attempts:
            b = min(int(a.score // 10), 10)
            buckets[b] += 1

        # Per-question analysis
        questions_stats = []
        for q in quiz.questions.all().order_by('order'):
            correct_count = 0
            total_count = 0
            for a in attempts:
                user_ans = (a.answers or {}).get(str(q.id))
                if not user_ans:
                    continue
                total_count += 1
                if q.type == 'essay':
                    continue  # not auto-gradable
                user_choices = set(map(int, user_ans.get('choice_ids', []) or []))
                correct_choices = set(
                    q.choices.filter(is_correct=True).values_list('id', flat=True)
                )
                if user_choices == correct_choices and user_choices:
                    correct_count += 1
            if total_count > 0:
                accuracy = correct_count / total_count * 100
            else:
                accuracy = None
            questions_stats.append({
                'question_id': q.id,
                'text': q.text[:100],
                'type': q.type,
                'accuracy': accuracy,
                'answered_count': total_count,
            })

        scored = [q for q in questions_stats if q['accuracy'] is not None]
        hardest = min(scored, key=lambda x: x['accuracy']) if scored else None
        easiest = max(scored, key=lambda x: x['accuracy']) if scored else None

        return Response({
            'quiz_id': quiz.id,
            'quiz_title': quiz.title,
            'plays_count': quiz.plays_count,
            'unique_players': unique_players,
            'likes_count': quiz.likes_count,
            'average_score': round(avg_score, 1),
            'completion_rate': round(completion_rate, 1),
            'hardest_question': hardest,
            'easiest_question': easiest,
            'score_distribution': buckets,
            'questions_stats': questions_stats,
        })


# =========================
#   Platform stats (admin)
# =========================

class PlatformStatsView(APIView):
    """Site-wide stats for admins."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        fortnight_ago = now - timedelta(days=14)

        # Users
        total_users = User.objects.count()
        new_users_7d = User.objects.filter(date_joined__gte=week_ago).count()
        users_by_role = dict(
            User.objects.values('role').annotate(c=Count('id')).values_list('role', 'c')
        )

        # Quizzes
        total_quizzes = Quiz.objects.count()
        published_quizzes = Quiz.objects.filter(status='published').count()
        ai_quizzes = Quiz.objects.filter(ai_generated=True).count()
        quizzes_7d = Quiz.objects.filter(created_at__gte=week_ago).count()

        # Attempts
        finished = QuizAttempt.objects.filter(finished_at__isnull=False)
        total_attempts = finished.count()
        attempts_7d = finished.filter(finished_at__gte=week_ago).count()
        avg_score = finished.aggregate(a=Avg('score'))['a'] or 0

        # Other
        total_materials = Material.objects.count()
        open_reports = Report.objects.filter(status__in=['open', 'reviewing']).count()

        # Daily activity (last 14 days)
        daily_activity = []
        for i in range(14):
            day = (now - timedelta(days=13 - i)).date()
            day_start = timezone.make_aware(
                timezone.datetime.combine(day, timezone.datetime.min.time())
            )
            day_end = day_start + timedelta(days=1)
            daily_activity.append({
                'date': day.isoformat(),
                'attempts': finished.filter(
                    finished_at__gte=day_start, finished_at__lt=day_end
                ).count(),
                'new_users': User.objects.filter(
                    date_joined__gte=day_start, date_joined__lt=day_end
                ).count(),
                'new_quizzes': Quiz.objects.filter(
                    created_at__gte=day_start, created_at__lt=day_end
                ).count(),
            })

        return Response({
            'total_users': total_users,
            'new_users_7d': new_users_7d,
            'users_by_role': users_by_role,
            'total_quizzes': total_quizzes,
            'published_quizzes': published_quizzes,
            'ai_generated_quizzes': ai_quizzes,
            'quizzes_created_7d': quizzes_7d,
            'total_attempts': total_attempts,
            'attempts_7d': attempts_7d,
            'average_score': round(avg_score, 1),
            'total_materials': total_materials,
            'open_reports': open_reports,
            'daily_activity': daily_activity,
        })
