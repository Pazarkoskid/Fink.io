# Fink.io

Веб-апликација за автоматско генерирање квизови од учебни материјали со помош на AI. Интерфејсот е на македонски јазик.

**Поддржани улоги:** Гостин, Студент, Инструктор, Модератор, Администратор
**Поддржани формати:** PDF, DOC, DOCX, PPT, PPTX, TXT
**AI:** Google Gemini (бесплатен tier) или Anthropic Claude (платено) — заменливо

---

## Архитектура

```
fink_io/
├── backend/         # Django + DRF + JWT + Claude API
│   ├── apps/
│   │   ├── accounts/      # User со 5 улоги
│   │   ├── materials/     # Subject + Material upload + text extraction
│   │   ├── ai_service/    # AI provider (Claude засега, заменлив)
│   │   ├── quizzes/       # Quiz, Question, Choice, Attempt, Like
│   │   ├── moderation/    # Report queue
│   │   └── analytics/     # UserStats, leaderboard, platform stats
│   └── fink_io/           # settings, urls, wsgi
└── frontend/        # React 18 + Vite + Tailwind CSS + zustand
    └── src/
        ├── pages/         # 18 страници (Home, QuizPlay, Leaderboard,
        │                  #              AdminPanel, QuizAnalytics...)
        ├── components/    # Header, QuizCard, Layout, RequireAuth
        └── lib/           # api.js (axios клиент) + auth.js (zustand)
```

---

## Локално стартување

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Уреди .env и стави го твојот GEMINI_API_KEY (бесплатен од aistudio.google.com)

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

Backend сега работи на `http://localhost:8000`
Admin панел: `http://localhost:8000/admin`

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend на `http://localhost:5173`. Vite автоматски прокси-ира `/api/*` кон Django.

---

## AI Provider - бесплатен Google Gemini

По дифолт, апликацијата го користи **Google Gemini API** кој има бесплатен tier (без кредитна картичка).

### Како да го добиеш бесплатниот клуч (1 минута)

1. Оди на https://aistudio.google.com/app/apikey
2. Логирај се со Google акаунт
3. Клик на „Create API Key" → копирај го клучот (почнува со `AIza...`)
4. Стави го во `backend/.env`:

```
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.5-flash-lite
```

### Бесплатни лимити

- **15 баранја во минута**
- **1000 баранја во ден**
- 1,000,000 токени context (огромно — цели учебници можат во едно баранје)
- Без кредитна картичка
- Без истек

За твојот use case (студенти што генерираат квизови) ова е сосема доволно за стотици корисници. Кога ќе ја прерастеш бесплатната квота, едноставно префрли се на платена сметка (~$0.10 за 1M output токени).

### Алтернативи

Архитектурата е апстрактна. За да го замениш Gemini со друг provider, постави во `.env`:

```
AI_PROVIDER=claude       # за Anthropic Claude (платено)
ANTHROPIC_API_KEY=sk-ant-...
```

Можеш и да напишеш свој provider (на пр. за fine-tuned локален mT5 модел) — наследи од `BaseQuizGenerator` во `apps/ai_service/base.py` и регистрирај го во `services.py:get_quiz_generator()`.

---

## Deployment на Render

### Backend

1. Креирај нов **Web Service** на Render и поврзи го repo-то.
2. Root directory: `backend`
3. Build Command: `./build.sh`
4. Start Command: `gunicorn fink_io.wsgi:application`
5. Environment variables:
   ```
   SECRET_KEY=<long random string>
   DEBUG=False
   ALLOWED_HOSTS=.onrender.com
   DATABASE_URL=<auto-popolneto od Render PostgreSQL>
   AI_PROVIDER=gemini
   GEMINI_API_KEY=AIza...
   GEMINI_MODEL=gemini-2.5-flash-lite
   CORS_ALLOWED_ORIGINS=https://your-frontend.onrender.com
   ```
6. Додај **PostgreSQL** database на Render и поврзи го (Render автоматски ќе го стави `DATABASE_URL`).

### Frontend

1. Креирај нов **Static Site** на Render.
2. Root directory: `frontend`
3. Build Command: `npm install && npm run build`
4. Publish Directory: `dist`
5. Environment variable:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```
6. Под Redirects/Rewrites додај: `/*` → `/index.html` (статус 200), за SPA routing.

---

## API endpoints (резиме)

### Auth
- `POST /api/auth/token/` — најава (email + password)
- `POST /api/auth/token/refresh/` — освежи токен
- `POST /api/accounts/register/` — регистрација
- `GET /api/accounts/me/` — моите податоци
- `PATCH /api/accounts/me/` — измени профил

### Materials
- `GET /api/materials/subjects/` — листа предмети
- `GET /api/materials/` — мои материјали
- `POST /api/materials/` — прикачи материјал (multipart)
- `POST /api/materials/<id>/re-extract/` — повторно извлечи текст

### Quizzes
- `GET /api/quizzes/` — јавна листа објавени квизови
- `GET /api/quizzes/mine/` — мои квизови
- `POST /api/quizzes/generate/` — AI генерација од материјал
- `GET /api/quizzes/<id>/` — детали (со точни одговори за автор)
- `PATCH /api/quizzes/<id>/` — уреди
- `POST /api/quizzes/<id>/publish/` — објави
- `POST /api/quizzes/<id>/like/` — лајкни (toggle)
- `GET /api/quizzes/<id>/play/` — играј (без точни одговори)
- `POST /api/quizzes/<id>/submit/` — испрати одговори
- `GET /api/quizzes/attempts/` — мојата историја

### Moderation
- `POST /api/moderation/reports/` — пријави квиз/прашање
- `GET /api/moderation/reports/queue/` — редица (за модератор)
- `POST /api/moderation/reports/<id>/action/` — акција (remove_quiz / dismiss / resolve)

### Analytics
- `GET /api/analytics/leaderboard/?period=all|week|month` — јавна ранг листа (топ 100)
- `GET /api/analytics/me/` — мои аггрегирани статистики и ранг
- `GET /api/analytics/quiz/<id>/` — детална статистика за квиз (автор-only)
- `GET /api/analytics/platform/` — статистика на цела платформа (админ-only)

---

## Замена на AI providerот

AI-сервисот е апстракција. За да го замениш Claude со сопствен модел:

1. Креирај нова класа во `backend/apps/ai_service/` која наследува од `BaseQuizGenerator`.
2. Имплементирај го методот `generate(request: GenerationRequest) -> GenerationResult`.
3. Во `backend/apps/ai_service/services.py`, во функцијата `get_quiz_generator()`, врати ја твојата нова класа.

Останатиот код не треба никаква измена.

Пример за fine-tuned HuggingFace модел (mT5):

```python
class MT5QuizGenerator(BaseQuizGenerator):
    def __init__(self):
        from transformers import pipeline
        self.pipe = pipeline('text2text-generation',
                             model='./models/mt5-finetuned-mk')

    def generate(self, request):
        output = self.pipe(request.source_text, max_length=2048)
        # ...парсирај го output во GenerationResult...
        return GenerationResult(questions=[...], provider='mt5-local')
```

---

## Мобилна апликација

Frontend-от е PWA — корисниците можат да го „инсталираат" од Chrome/Safari како нативна апликација.

За права нативна апликација на App Store / Google Play, опции:
- **React Native** + истиот Django REST API
- **Capacitor** wrap на постоечкиот React frontend (најбрз пат)

---

## Стек

**Backend**
- Django 5.0 + Django REST Framework
- JWT (djangorestframework-simplejwt)
- PostgreSQL во продукција, SQLite за развој
- Google Gen AI SDK (Gemini) + Anthropic Python SDK (опционално)
- pypdf, python-docx, python-pptx за извлекување текст
- gunicorn + whitenoise за продукција

**Frontend**
- React 18 + Vite
- Tailwind CSS (custom palette: cream / ink / accent burnt orange)
- Zustand за state management
- Axios со JWT refresh interceptor
- Lucide icons
- React Router 6

---

## Лиценца

MIT. Користи го слободно.
