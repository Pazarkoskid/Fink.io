"""Anthropic Claude implementation of the quiz generator."""
import json
import re
from typing import List
from django.conf import settings

from .base import (
    BaseQuizGenerator,
    GenerationRequest,
    GenerationResult,
    GeneratedQuestion,
    GeneratedChoice,
)


SYSTEM_PROMPT = """Ти си експерт за креирање едукативни квизови на македонски јазик.
Твојата задача е да читаш учебни материјали и да генерираш висококвалитетни прашања
за квиз што ќе помогнат студентите да го проверат своето знаење.

Правила:
1. Сите прашања и одговори мора да бидат на македонски јазик (освен ако корисникот не побара поинаку).
2. Прашањата мораат да се базираат само на содржината од дадениот материјал.
3. Точните одговори мора да бидат фактички точни и докажливи од текстот.
4. Избегнувај нејаснотии, заматени формулации или прашања со повеќе можни точни одговори (освен ако типот не е „multiple").
5. За секое прашање, давај кратко објаснување зошто одговорот е точен.
6. Враќај ОДГОВОР ИСКЛУЧИВО како валиден JSON објект, без дополнителен текст пред или по.
"""


def build_user_prompt(req: GenerationRequest) -> str:
    types_label = ', '.join(req.question_types)
    extra = f"\n\nДополнителни инструкции од инструкторот:\n{req.extra_instructions}" \
        if req.extra_instructions else ""
    difficulty_label = {1: 'лесно', 2: 'средно', 3: 'тешко'}.get(req.difficulty, 'средно')

    return f"""Генерирај {req.num_questions} прашања врз основа на материјалот подолу.

Предмет: {req.subject or 'непознат'}
Типови прашања: {types_label}
Тежина: {difficulty_label}
Јазик: македонски{extra}

Врати JSON во ОВОЈ ТОЧЕН формат:
{{
  "title": "предложен наслов на квизот",
  "tags": ["таг1", "таг2", "таг3"],
  "questions": [
    {{
      "text": "Текст на прашањето?",
      "type": "single",   // "single" | "multiple" | "essay"
      "choices": [
        {{"text": "опција А", "is_correct": false}},
        {{"text": "опција Б", "is_correct": true}},
        {{"text": "опција В", "is_correct": false}},
        {{"text": "опција Г", "is_correct": false}}
      ],
      "explanation": "Кратко објаснување зошто Б е точно.",
      "difficulty": 2
    }}
  ]
}}

Правила за типови:
- "single": точно 4 опции, точно 1 точна.
- "multiple": 4–6 опции, 2 или повеќе точни.
- "essay": choices = [] (празна листа), без точни одговори. Очекуваниот одговор оди во `explanation`.

МАТЕРИЈАЛ ЗА АНАЛИЗА:
\"\"\"
{req.source_text}
\"\"\"

Сега врати само JSON, ништо друго."""


def extract_json(text: str) -> dict:
    """Pull the first JSON object out of a model response, tolerating prose around it."""
    # Try fenced code block first
    fence_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if fence_match:
        return json.loads(fence_match.group(1))
    # Otherwise, take the substring from the first { to the last }
    first = text.find('{')
    last = text.rfind('}')
    if first != -1 and last != -1 and last > first:
        return json.loads(text[first:last + 1])
    raise ValueError("No JSON object found in model response")


class ClaudeQuizGenerator(BaseQuizGenerator):
    """Calls the Anthropic API to generate quizzes."""

    def __init__(self, api_key: str = None, model: str = None):
        from anthropic import Anthropic  # imported lazily so the module loads without the package
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.model = model or settings.ANTHROPIC_MODEL
        if not self.api_key:
            raise ValueError(
                "ANTHROPIC_API_KEY not configured. Set it in your environment."
            )
        self.client = Anthropic(api_key=self.api_key)

    def generate(self, request: GenerationRequest) -> GenerationResult:
        # Truncate to a safe size (Claude can handle a lot but we want speed + cost control)
        MAX_CHARS = 60_000  # ~15k tokens of source
        source = request.source_text[:MAX_CHARS]
        if len(request.source_text) > MAX_CHARS:
            source += "\n\n[...материјалот е скратен поради големина...]"

        clipped_request = GenerationRequest(
            source_text=source,
            subject=request.subject,
            language=request.language,
            num_questions=request.num_questions,
            question_types=request.question_types,
            difficulty=request.difficulty,
            extra_instructions=request.extra_instructions,
        )

        message = self.client.messages.create(
            model=self.model,
            max_tokens=8000,
            system=SYSTEM_PROMPT,
            messages=[{
                'role': 'user',
                'content': build_user_prompt(clipped_request),
            }],
        )

        raw = message.content[0].text
        data = extract_json(raw)

        questions = self._parse_questions(data.get('questions', []))

        return GenerationResult(
            questions=questions,
            suggested_title=data.get('title', '').strip(),
            suggested_tags=[str(t) for t in data.get('tags', [])][:10],
            provider='anthropic-claude',
            raw_response=raw,
        )

    def _parse_questions(self, items: list) -> List[GeneratedQuestion]:
        out = []
        for q in items:
            qtype = q.get('type', 'single')
            if qtype not in ('single', 'multiple', 'essay'):
                qtype = 'single'

            choices = []
            if qtype != 'essay':
                for c in q.get('choices', []):
                    choices.append(GeneratedChoice(
                        text=str(c.get('text', '')).strip(),
                        is_correct=bool(c.get('is_correct', False)),
                    ))

            out.append(GeneratedQuestion(
                text=str(q.get('text', '')).strip(),
                type=qtype,
                choices=choices,
                explanation=str(q.get('explanation', '')).strip(),
                difficulty=int(q.get('difficulty', 2)),
            ))
        return out
