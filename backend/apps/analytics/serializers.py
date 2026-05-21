from rest_framework import serializers
from .models import UserStats


class LeaderboardEntrySerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    avatar = serializers.ImageField(source='user.avatar', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)
    rank = serializers.IntegerField(read_only=True)

    class Meta:
        model = UserStats
        fields = [
            'rank', 'user_id', 'username', 'avatar', 'role',
            'total_points', 'total_attempts', 'average_score', 'best_score',
            'current_streak', 'longest_streak',
            'quizzes_authored', 'likes_received',
        ]


class UserStatsSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserStats
        fields = [
            'username',
            'total_attempts', 'total_questions_answered', 'total_correct',
            'average_score', 'best_score', 'total_points',
            'current_streak', 'longest_streak',
            'quizzes_authored', 'likes_received',
            'updated_at',
        ]


class QuizAnalyticsSerializer(serializers.Serializer):
    """Analytics for a single quiz (instructor view)."""
    quiz_id = serializers.IntegerField()
    quiz_title = serializers.CharField()
    plays_count = serializers.IntegerField()
    unique_players = serializers.IntegerField()
    likes_count = serializers.IntegerField()
    average_score = serializers.FloatField()
    completion_rate = serializers.FloatField()
    hardest_question = serializers.DictField(required=False, allow_null=True)
    easiest_question = serializers.DictField(required=False, allow_null=True)
    score_distribution = serializers.ListField(child=serializers.IntegerField())


class PlatformStatsSerializer(serializers.Serializer):
    """Platform-wide stats (admin view)."""
    total_users = serializers.IntegerField()
    new_users_7d = serializers.IntegerField()
    users_by_role = serializers.DictField()

    total_quizzes = serializers.IntegerField()
    published_quizzes = serializers.IntegerField()
    ai_generated_quizzes = serializers.IntegerField()
    quizzes_created_7d = serializers.IntegerField()

    total_attempts = serializers.IntegerField()
    attempts_7d = serializers.IntegerField()
    average_score = serializers.FloatField()

    total_materials = serializers.IntegerField()
    open_reports = serializers.IntegerField()

    daily_activity = serializers.ListField()  # last 14 days
