"""
Quiz views: list/create/edit/publish, generate from material via AI, play & score.
"""
from django.db import transaction, models
from django.db.models import Q, Count, F
from django.utils import timezone
from rest_framework import generics, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsInstructor, IsOwnerOrModerator
from apps.materials.models import Material
from apps.ai_service.services import (
    get_quiz_generator, GenerationRequest,
)
from .models import Quiz, Question, Choice, Like, QuizAttempt, SavedQuiz
from .serializers import (
    QuizListSerializer, QuizDetailSerializer, QuizPlaySerializer,
    QuizWriteSerializer, AttemptSubmitSerializer, AttemptResultSerializer,
)


# =========================
#   Listing & search
# =========================

class QuizListView(generics.ListAPIView):
    """Public list of published quizzes, with search/filter."""
    serializer_class = QuizListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'author__username', 'subject__name']
    ordering_fields = ['created_at', 'likes_count', 'plays_count']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Quiz.objects.filter(
            status='published', visibility='public'
        ).annotate(questions_count=Count('questions'))

        subject = self.request.query_params.get('subject')
        if subject:
            qs = qs.filter(subject_id=subject)

        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)

        semester = self.request.query_params.get('semester')
        if semester:
            qs = qs.filter(semester=semester)

        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            qs = qs.filter(difficulty=difficulty)

        tag = self.request.query_params.get('tag')
        if tag:
            qs = qs.filter(tags__icontains=tag)

        return qs


class MyQuizzesView(generics.ListAPIView):
    """Authenticated: my own quizzes (any status), with filters."""
    serializer_class = QuizListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'subject__name']
    ordering_fields = ['created_at', 'likes_count', 'plays_count']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = Quiz.objects.filter(
            author=self.request.user
        ).annotate(questions_count=Count('questions'))

        subject = self.request.query_params.get('subject')
        if subject:
            qs = qs.filter(subject_id=subject)
        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
        semester = self.request.query_params.get('semester')
        if semester:
            qs = qs.filter(semester=semester)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs


class SavedQuizzesView(generics.ListAPIView):
    """Quizzes that the user has saved/bookmarked, with filters."""
    serializer_class = QuizListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'description', 'subject__name', 'author__username']
    ordering_fields = ['created_at', 'likes_count', 'plays_count']
    ordering = ['-likes_count']

    def get_queryset(self):
        saved_ids = SavedQuiz.objects.filter(
            user=self.request.user
        ).values_list('quiz_id', flat=True)

        qs = Quiz.objects.filter(
            id__in=saved_ids
        ).annotate(questions_count=Count('questions'))

        subject = self.request.query_params.get('subject')
        if subject:
            qs = qs.filter(subject_id=subject)
        year = self.request.query_params.get('year')
        if year:
            qs = qs.filter(year=year)
        semester = self.request.query_params.get('semester')
        if semester:
            qs = qs.filter(semester=semester)

        return qs


class ToggleSaveView(APIView):
    """Save or unsave a quiz (bookmark)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            quiz = Quiz.objects.get(pk=pk, status='published')
        except Quiz.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        saved, created = SavedQuiz.objects.get_or_create(
            user=request.user, quiz=quiz
        )
        if not created:
            saved.delete()
            Quiz.objects.filter(pk=quiz.pk).update(
                saves_count=models.F('saves_count') - 1
            )
            return Response({'saved': False})
        Quiz.objects.filter(pk=quiz.pk).update(
            saves_count=models.F('saves_count') + 1
        )
        return Response({'saved': True})


# =========================
#   CRUD
# =========================

class QuizDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: returns play-safe view for outsiders, full view for author/moderator.
    PATCH/PUT: only author/admin.
    DELETE: author/moderator/admin.
    """
    queryset = Quiz.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrModerator]

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return QuizWriteSerializer
        user = self.request.user
        obj = self.get_object()
        is_author = user.is_authenticated and (obj.author_id == user.id
                                               or user.is_moderator)
        return QuizDetailSerializer if is_author else QuizPlaySerializer


class QuizCreateView(generics.CreateAPIView):
    """Manual quiz creation - any authenticated user."""
    serializer_class = QuizWriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# =========================
#   AI Generation
# =========================

class GenerateQuizFromMaterialView(APIView):
    """
    POST /api/quizzes/generate/
    Body: {
      material_id: int,
      num_questions: int,
      n_quizzes: int,
      question_types: ["single", "multiple", "essay"],
      difficulty: 1|2|3,
      extra_instructions: str
    }
    Returns: list of newly created Quiz objects (in 'draft' status).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        material_id = request.data.get('material_id')
        try:
            material = Material.objects.get(pk=material_id)
        except (Material.DoesNotExist, TypeError, ValueError):
            return Response(
                {'detail': 'Материјалот не е пронајден.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if material.uploaded_by != request.user and not request.user.is_admin_role:
            return Response(
                {'detail': 'Само сопственикот може да генерира квиз од овој материјал.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not material.has_text:
            return Response(
                {'detail': 'Материјалот сè уште нема извлечен текст. Обиди се повторно.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Parse + validate inputs
        try:
            num_questions = max(1, min(50, int(request.data.get('num_questions', 10))))
            n_quizzes = max(1, min(10, int(request.data.get('n_quizzes', 1))))
            difficulty = int(request.data.get('difficulty', 2))
            difficulty = max(1, min(3, difficulty))
        except (TypeError, ValueError):
            return Response(
                {'detail': 'Невалидни нумерички параметри.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        question_types = request.data.get('question_types') or ['single']
        if isinstance(question_types, str):
            question_types = [question_types]
        valid_types = {'single', 'multiple', 'essay'}
        question_types = [t for t in question_types if t in valid_types] or ['single']

        extra = request.data.get('extra_instructions', '')

        # Call the AI provider
        try:
            generator = get_quiz_generator()
        except ValueError as e:
            return Response(
                {'detail': f'AI услугата не е конфигурирана: {e}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        gen_request = GenerationRequest(
            source_text=material.extracted_text,
            subject=material.subject.name if material.subject else '',
            language='mk',
            num_questions=num_questions,
            question_types=question_types,
            difficulty=difficulty,
            extra_instructions=extra,
        )

        try:
            result = generator.generate(gen_request)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': f'AI генерацијата не успеа: {str(e)[:300]}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not result.questions:
            return Response(
                {'detail': 'AI не врати ниту едно прашање. Обиди се повторно или со подобар материјал.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Split into N quizzes if requested
        parts = generator.split_into_quizzes(result, n_quizzes)
        if not parts:
            return Response(
                {'detail': 'Не е можно да се поделат прашањата.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        created_quizzes = []
        try:
            with transaction.atomic():
                for idx, part in enumerate(parts):
                    title = part.suggested_title or material.title
                    if n_quizzes > 1:
                        title = f"{title} ({idx + 1}/{n_quizzes})"
                    quiz = Quiz.objects.create(
                        title=title[:255],
                        description=f'Автоматски генериран од материјалот: {material.title}',
                        author=request.user,
                        subject=material.subject,
                        source_material=material,
                        difficulty=difficulty,
                        tags=part.suggested_tags[:10],
                        estimated_minutes=max(3, len(part.questions) * 1),
                        status='draft',
                        ai_generated=True,
                        ai_provider=part.provider,
                    )
                    for q_idx, gq in enumerate(part.questions):
                        q = Question.objects.create(
                            quiz=quiz,
                            text=gq.text,
                            type=gq.type,
                            explanation=gq.explanation,
                            difficulty=gq.difficulty,
                            order=q_idx,
                        )
                        for c_idx, gc in enumerate(gq.choices):
                            Choice.objects.create(
                                question=q,
                                text=gc.text,
                                is_correct=gc.is_correct,
                                order=c_idx,
                            )
                    created_quizzes.append(quiz)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': f'Не успеа зачувување на квизот: {str(e)[:300]}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            QuizDetailSerializer(created_quizzes, many=True,
                                 context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


# =========================
#   Publish / status
# =========================

class PublishQuizView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrModerator]

    def post(self, request, pk):
        try:
            quiz = Quiz.objects.get(pk=pk)
        except Quiz.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        self.check_object_permissions(request, quiz)
        if quiz.questions.count() == 0:
            return Response(
                {'detail': 'Квизот мора да има барем едно прашање.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        quiz.status = 'published'
        quiz.published_at = timezone.now()
        quiz.save()
        return Response(QuizDetailSerializer(quiz, context={'request': request}).data)


# =========================
#   Likes
# =========================

class ToggleLikeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            quiz = Quiz.objects.get(pk=pk, status='published')
        except Quiz.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        like, created = Like.objects.get_or_create(user=request.user, quiz=quiz)
        if not created:
            like.delete()
            quiz.likes_count = max(0, quiz.likes_count - 1)
            quiz.save(update_fields=['likes_count'])
            return Response({'liked': False, 'likes_count': quiz.likes_count})
        quiz.likes_count += 1
        quiz.save(update_fields=['likes_count'])
        return Response({'liked': True, 'likes_count': quiz.likes_count})


# =========================
#   Play & submit
# =========================

class StartPlayView(APIView):
    """Returns the play-safe quiz payload + increments play count."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            quiz = Quiz.objects.get(pk=pk, status='published')
        except Quiz.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        Quiz.objects.filter(pk=quiz.pk).update(plays_count=quiz.plays_count + 1)
        return Response(QuizPlaySerializer(quiz, context={'request': request}).data)


class SubmitAttemptView(APIView):
    """
    POST /api/quizzes/<pk>/submit/
    Body: { answers: { "<question_id>": { "choice_ids": [...], "text": "..." } } }
    Returns: scored attempt with correct answers and explanations.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            quiz = Quiz.objects.prefetch_related(
                'questions__choices'
            ).get(pk=pk, status='published')
        except Quiz.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = AttemptSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        answers = serializer.validated_data['answers']

        points_earned = 0
        points_total = 0
        detailed_results = []

        for q in quiz.questions.all():
            points_total += q.points
            user_answer = answers.get(str(q.id), {})
            user_choices = set(map(int, user_answer.get('choice_ids', []) or []))
            user_text = (user_answer.get('text') or '').strip()

            is_correct = False
            correct_choice_ids = []
            if q.type in ('single', 'multiple'):
                correct_choice_ids = list(
                    q.choices.filter(is_correct=True).values_list('id', flat=True)
                )
                correct_set = set(correct_choice_ids)
                if q.type == 'single':
                    is_correct = (len(user_choices) == 1
                                  and user_choices == correct_set)
                else:
                    is_correct = (user_choices == correct_set
                                  and len(user_choices) > 0)
            else:  # essay — not auto-graded, mark as ungraded
                is_correct = None

            if is_correct is True:
                points_earned += q.points

            detailed_results.append({
                'question_id': q.id,
                'question_text': q.text,
                'type': q.type,
                'user_choice_ids': sorted(user_choices),
                'user_text': user_text,
                'correct_choice_ids': correct_choice_ids,
                'all_choices': [
                    {'id': c.id, 'text': c.text, 'is_correct': c.is_correct}
                    for c in q.choices.all()
                ] if q.type in ('single', 'multiple') else [],
                'is_correct': is_correct,
                'explanation': q.explanation,
                'points': q.points if is_correct else 0,
            })

        score = (points_earned / points_total * 100.0) if points_total else 0.0

        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            user=request.user if request.user.is_authenticated else None,
            score=score,
            points_earned=points_earned,
            points_total=points_total,
            answers=answers,
            finished_at=timezone.now(),
        )

        return Response({
            'attempt': AttemptResultSerializer(attempt).data,
            'results': detailed_results,
        })


class MyAttemptsView(generics.ListAPIView):
    """A user's quiz history."""
    serializer_class = AttemptResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return QuizAttempt.objects.filter(user=self.request.user)
