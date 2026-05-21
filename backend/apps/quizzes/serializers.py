"""Quiz serializers - separate ones for listing, detail-with-answers (author view), and play (no answers)."""
from rest_framework import serializers
from .models import Quiz, Question, Choice, QuizAttempt, Like, SavedQuiz


class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct', 'order']


class ChoicePlaySerializer(serializers.ModelSerializer):
    """For quiz play — hides is_correct."""
    class Meta:
        model = Choice
        fields = ['id', 'text', 'order']


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'type', 'explanation', 'difficulty',
                  'order', 'points', 'choices']


class QuestionPlaySerializer(serializers.ModelSerializer):
    """Question representation for quiz play (no correct answers leaked)."""
    choices = ChoicePlaySerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'text', 'type', 'difficulty', 'order', 'points', 'choices']


class QuizListSerializer(serializers.ModelSerializer):
    author_username = serializers.SerializerMethodField()
    author_role = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()
    subject_code = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    saved = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ['id', 'title', 'slug', 'description', 'author',
                  'author_username', 'author_role',
                  'subject', 'subject_name', 'subject_code',
                  'year', 'semester',
                  'difficulty', 'tags',
                  'estimated_minutes', 'status', 'visibility', 'ai_generated',
                  'likes_count', 'plays_count', 'saves_count', 'questions_count',
                  'liked', 'saved', 'created_at', 'published_at']

    def get_author_username(self, obj):
        try:
            return obj.author.username if obj.author else ''
        except Exception:
            return ''

    def get_author_role(self, obj):
        try:
            return obj.author.role if obj.author else ''
        except Exception:
            return ''

    def get_subject_name(self, obj):
        try:
            return obj.subject.name if obj.subject else ''
        except Exception:
            return ''

    def get_subject_code(self, obj):
        try:
            return obj.subject.code if obj.subject else ''
        except Exception:
            return ''

    def get_questions_count(self, obj):
        # Prefer annotated value (faster), fall back to query
        if hasattr(obj, 'questions_count') and isinstance(getattr(obj, 'questions_count', None), int):
            return obj.questions_count
        try:
            return obj.questions.count()
        except Exception:
            return 0

    def get_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        try:
            return Like.objects.filter(quiz=obj, user=request.user).exists()
        except Exception:
            return False

    def get_saved(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        try:
            return SavedQuiz.objects.filter(quiz=obj, user=request.user).exists()
        except Exception:
            return False


class QuizDetailSerializer(QuizListSerializer):
    """Author / instructor view — includes correct answers."""
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta(QuizListSerializer.Meta):
        fields = QuizListSerializer.Meta.fields + ['questions']


class QuizPlaySerializer(QuizListSerializer):
    """Play view — questions without correct answers."""
    questions = QuestionPlaySerializer(many=True, read_only=True)

    class Meta(QuizListSerializer.Meta):
        fields = QuizListSerializer.Meta.fields + ['questions']


# ---- Write serializers (manual edit) ----

class ChoiceWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct', 'order']


class QuestionWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    choices = ChoiceWriteSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ['id', 'text', 'type', 'explanation', 'difficulty',
                  'order', 'points', 'choices']


class QuizWriteSerializer(serializers.ModelSerializer):
    """For create/edit of a full quiz (with nested questions/choices)."""
    questions = QuestionWriteSerializer(many=True, required=False)

    class Meta:
        model = Quiz
        fields = ['title', 'description', 'subject', 'source_material',
                  'difficulty', 'tags', 'estimated_minutes', 'status',
                  'visibility', 'questions']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        quiz = Quiz.objects.create(**validated_data)
        self._save_questions(quiz, questions_data)
        return quiz

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if questions_data is not None:
            # Wipe and rebuild — simplest correct behavior for nested data
            instance.questions.all().delete()
            self._save_questions(instance, questions_data)
        return instance

    def _save_questions(self, quiz, questions_data):
        for idx, qd in enumerate(questions_data):
            choices_data = qd.pop('choices', [])
            qd.pop('id', None)
            qd.setdefault('order', idx)
            q = Question.objects.create(quiz=quiz, **qd)
            for cidx, cd in enumerate(choices_data):
                cd.pop('id', None)
                cd.setdefault('order', cidx)
                Choice.objects.create(question=q, **cd)


# ---- Attempts ----

class AttemptSubmitSerializer(serializers.Serializer):
    """Payload to submit a quiz play."""
    answers = serializers.DictField(child=serializers.DictField())


class AttemptResultSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)

    class Meta:
        model = QuizAttempt
        fields = ['id', 'quiz', 'quiz_title', 'user', 'score',
                  'points_earned', 'points_total', 'answers',
                  'started_at', 'finished_at']
        read_only_fields = fields
