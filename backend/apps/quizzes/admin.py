from django.contrib import admin
from .models import Quiz, Question, Choice, Like, QuizAttempt


class ChoiceInline(admin.TabularInline):
    model = Choice
    extra = 0


class QuestionInline(admin.StackedInline):
    model = Question
    extra = 0
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'subject', 'status', 'ai_generated',
                    'likes_count', 'plays_count', 'created_at')
    list_filter = ('status', 'visibility', 'ai_generated', 'difficulty')
    search_fields = ('title', 'author__email')
    inlines = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'text', 'type', 'difficulty')
    list_filter = ('type', 'difficulty')
    inlines = [ChoiceInline]


@admin.register(QuizAttempt)
class AttemptAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'user', 'score', 'started_at', 'finished_at')
    list_filter = ('finished_at',)


admin.site.register(Like)
