"""Google Gemini implementation of the quiz generator.

Uses the free tier of Google AI Studio. No credit card required.
Get a key at: https://aistudio.google.com/app/apikey
"""
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
      "type": "single",
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
- "multiple": 4-6 опции, 2 или повеќе точни.
- "essay": choices = [] (празна листа), без точни одговори. Очекуваниот одговор оди во `explanation`.

МАТЕРИЈАЛ ЗА АНАЛИЗА:
\"\"\"
{req.source_text}
\"\"\"

Сега врати само JSON, ништо друго."""


def extract_json(text: str) -> dict:
    """Pull the first JSON object out of a model response, tolerating prose around it."""
    fence_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if fence_match:
        return json.loads(fence_match.group(1))
    first = text.find('{')
    last = text.rfind('}')
    if first != -1 and last != -1 and last > first:
        return json.loads(text[first:last + 1])
    raise ValueError("No JSON object found in model response")


class GeminiQuizGenerator(BaseQuizGenerator):
    """Calls Google's Gemini API to generate quizzes (free tier)."""

    def __init__(self, api_key: str = None, model: str = None):
        # Lazy import so module loads even if package is missing
        from google import genai

        self.api_key = api_key or settings.GEMINI_API_KEY
        # Default to free-tier model with best price/quality ratio
        self.model = model or settings.GEMINI_MODEL or 'gemini-2.5-flash-lite'

        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY не е конфигуриран. "
                "Земи бесплатен клуч на https://aistudio.google.com/app/apikey"
            )
        self.client = genai.Client(api_key=self.api_key)

    def generate(self, request: GenerationRequest) -> GenerationResult:
        import logging
        import time
        logger = logging.getLogger(__name__)

        # Gemini Flash-Lite has 1M token context, no need to truncate aggressively
        MAX_CHARS = 200_000
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

        # Combine system + user into one prompt
        full_prompt = SYSTEM_PROMPT + "\n\n" + build_user_prompt(clipped_request)

        # Use response_mime_type to force JSON output - Gemini supports this natively
        from google.genai import types
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.7,
            max_output_tokens=8000,
        )

        # Try primary model, then fallbacks if overloaded
        models_to_try = [
            self.model,
            'gemini-2.5-flash',       # bigger but more reliable
            'gemini-2.0-flash',       # stable older
            'gemini-1.5-flash',       # very stable older
        ]
        # Dedupe while preserving order
        seen = set()
        models_to_try = [m for m in models_to_try if not (m in seen or seen.add(m))]

        response = None
        last_err = None
        for model_name in models_to_try:
            # Each model gets 2 attempts with exponential backoff
            for attempt in range(2):
                try:
                    logger.info(f"[Gemini] try {model_name} (attempt {attempt + 1})")
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents=full_prompt,
                        config=config,
                    )
                    logger.info(f"[Gemini] success with {model_name}")
                    break
                except Exception as e:
                    err_str = str(e)
                    last_err = err_str
                    logger.warning(f"[Gemini] {model_name} attempt {attempt + 1} failed: {err_str[:200]}")
                    # If 503 / overloaded - wait and retry
                    if '503' in err_str or 'UNAVAILABLE' in err_str.upper() or 'overloaded' in err_str.lower():
                        if attempt == 0:
                            time.sleep(2)  # brief wait before retry
                            continue
                        else:
                            break  # next model
                    # Other errors (auth, quota) - don't retry this model
                    break
            if response is not None:
                break

        if response is None:
            # All models failed
            if '503' in (last_err or '') or 'overloaded' in (last_err or '').lower():
                raise RuntimeError(
                    "Google Gemini е презафатен во моментот. Сите алтернативни модели исто. "
                    "Обиди се повторно за 1-2 минути."
                )
            raise RuntimeError(f"Сите Gemini модели не успеаја: {str(last_err)[:200]}")

        raw = (response.text or '').strip()
        if not raw:
            # Check if response was blocked by safety filter
            try:
                finish_reason = response.candidates[0].finish_reason if response.candidates else None
                logger.error(f"[Gemini] empty response, finish_reason={finish_reason}")
                raise RuntimeError(
                    f"Gemini не врати содржина (можеби safety filter). Reason: {finish_reason}"
                )
            except (AttributeError, IndexError):
                raise RuntimeError("Gemini врати празна содржина.")

        try:
            data = extract_json(raw)
        except Exception as e:
            logger.error(f"[Gemini] JSON parse failed. Raw response: {raw[:500]}")
            raise RuntimeError(
                f"AI врати невалиден JSON: {str(e)[:100]}. "
                f"Прв 200 знаци: {raw[:200]}"
            )

        questions_raw = data.get('questions', [])
        if not questions_raw:
            logger.error(f"[Gemini] no questions in response. Data keys: {list(data.keys())}")
            raise RuntimeError("AI не врати ниту едно прашање.")

        questions = self._parse_questions(questions_raw)

        return GenerationResult(
            questions=questions,
            suggested_title=data.get('title', '').strip(),
            suggested_tags=[str(t) for t in data.get('tags', [])][:10],
            provider=f'google-gemini-{self.model}',
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
