"""
Abstract base class for AI quiz-generation providers.

Today: Anthropic Claude (cloud, API-based).
Tomorrow: swap in your own fine-tuned model by implementing this interface.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Literal, Optional


QuestionType = Literal['single', 'multiple', 'essay']


@dataclass
class GeneratedChoice:
    text: str
    is_correct: bool = False


@dataclass
class GeneratedQuestion:
    text: str
    type: QuestionType
    choices: List[GeneratedChoice] = field(default_factory=list)
    explanation: str = ''
    difficulty: int = 2  # 1=easy, 2=medium, 3=hard


@dataclass
class GenerationRequest:
    source_text: str
    subject: str = ''
    language: str = 'mk'
    num_questions: int = 10
    question_types: List[QuestionType] = field(default_factory=lambda: ['single'])
    difficulty: int = 2
    extra_instructions: str = ''


@dataclass
class GenerationResult:
    questions: List[GeneratedQuestion]
    suggested_title: str = ''
    suggested_tags: List[str] = field(default_factory=list)
    provider: str = ''
    raw_response: Optional[str] = None


class BaseQuizGenerator(ABC):
    """
    Replace the concrete provider by changing settings.AI_QUIZ_GENERATOR.
    Every provider must produce a GenerationResult from a GenerationRequest.
    """

    @abstractmethod
    def generate(self, request: GenerationRequest) -> GenerationResult:
        ...

    def split_into_quizzes(
        self,
        result: GenerationResult,
        n_quizzes: int,
    ) -> List[GenerationResult]:
        """Evenly distribute questions across N quizzes."""
        if n_quizzes <= 1:
            return [result]
        questions = result.questions
        per_quiz = max(1, len(questions) // n_quizzes)
        chunks = []
        for i in range(n_quizzes):
            start = i * per_quiz
            end = start + per_quiz if i < n_quizzes - 1 else len(questions)
            chunk_questions = questions[start:end]
            if not chunk_questions:
                continue
            chunks.append(GenerationResult(
                questions=chunk_questions,
                suggested_title=f"{result.suggested_title} — Дел {i + 1}",
                suggested_tags=result.suggested_tags,
                provider=result.provider,
            ))
        return chunks
