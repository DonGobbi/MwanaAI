# MwanaAI — AI Learning Platform 🇲🇼

MwanaAI is an AI-powered learning platform for students in Malawi. It started as
a personal tutor and has grown into a full learning loop — **Learn → Practice →
Get help → Track progress** — with dashboards for **students, teachers and
parents**, all aligned to the Malawi curriculum (Standard 1–8 / Form 1–4).

The goal: make learning feel like a patient, encouraging human tutor — and give
teachers and parents real tools to support each student.

---

## ✨ Features

### For students
- **AI Tutor** — ask anything and get step-by-step help pitched at your class
  level. Supports:
  - 📷 **Homework photo upload** — snap a picture of your work and a vision model
    reads it and helps.
  - 🎤 **Voice** — speak your question and 🔊 listen to answers read aloud.
  - 💾 **Save & resume** chats.
  - Quick actions (*explain simply*, *another example*, *quiz me*, …).
- **Guided lessons** — pick a subject and get a syllabus-ordered list of topics,
  each taught as a full lesson; mark topics complete and watch a progress bar.
- **Adaptive quizzes & exam prep** — auto-marked multiple-choice quizzes by
  subject, with **PSLCE / JCE / MSCE** exam styles. An **Adaptive** mode tunes
  difficulty to your past scores, and **AI feedback** tells you exactly what to
  review after each quiz.
- **Smart Study Plan** — AI reads your quiz performance and builds a personalised
  plan for what to study next.
- **Progress & motivation** — scores by subject, 🔥 **day streaks**, a class
  **leaderboard**, and **achievement badges**.
- **Assignments** — see tasks set by your teachers and complete them in one tap.

### For teachers
- **AI Lesson Planner** — generate a ready-to-teach lesson plan (objectives,
  activities, assessment, homework) for any topic — and **assign a matching quiz
  to a class in one click**.
- **Classes** — create a class, share a join code, and see a roster with each
  student's quizzes, average, lessons and last-active.
- **AI Class Insights** — an AI summary of how a class is doing, who needs help,
  and what to teach next.
- **Per-student view** — drill into one student's full history with an AI
  recommendation on how to support them.
- **Assignments** — set a quiz task per class and track completion.
- **Notifications** — a bell shows new submissions since you last checked.
- **Printable reports** — print or save a PDF report for any student.

### For parents
- **Child progress** — look up your child by email to see their stats and recent
  quizzes, and **print a report**.

### Throughout
- **Roles** (student / teacher / parent) with a role-aware dashboard and nav.
- **First-run onboarding** for new students.
- **Dark mode**, polished UI, page transitions, and an AI safety layer
  (**Llama Prompt Guard 2** screens every tutor question).

---

## 🛠 Tech stack

- **Frontend:** React (Create React App), React Router, Tailwind CSS, react-icons
- **Auth & data:** Firebase Authentication + Cloud Firestore
- **AI:** [Groq](https://groq.com) API
  - Tutoring, quizzes, lessons & insights: `llama-3.3-70b-versatile`
    (falls back to `llama-3.1-8b-instant` when rate-limited)
  - Homework images (vision): `meta-llama/llama-4-scout-17b-16e-instruct`
  - Safety: `meta-llama/llama-prompt-guard-2-86m`
- **Backend (optional):** Node.js + Express (the core app talks to Groq/Firebase
  directly and does not require it)
- **Containers:** Docker + Docker Compose

---

## 📁 Project structure

```
MwanaAI_Project/
├── frontend/                    # React app (the main application)
│   └── src/
│       ├── pages/               # Home, Login, Signup, AITutor, Learn, Quiz,
│       │                        #   Progress, Teacher, ParentChild
│       ├── components/          # Navbar, Logo, Markdown, EmptyState, Badges,
│       │                        #   Leaderboard, NotificationBell, Onboarding…
│       ├── services/            # aiTutoring, quizService, lessonService,
│       │                        #   classService, assignmentService,
│       │                        #   aiInsightsService, promptGuard, groqClient…
│       ├── contexts/            # AuthContext
│       ├── config/              # firebase.js, curriculum.js (levels/subjects/exams)
│       └── utils/               # image, speech, badges, printReport
├── backend/                     # Express API (optional)
├── firestore.rules             # Firestore security rules
└── docker-compose.yml          # Run frontend + backend in containers
```

---

## 🚀 Getting started

### Prerequisites
- [Node.js](https://nodejs.org) v16+ (or Docker)
- A free [Groq API key](https://console.groq.com/keys)
- A [Firebase](https://console.firebase.google.com) project (Auth + Firestore)

### 1. Clone
```bash
git clone https://github.com/DonGobbi/MwanaAI.git
cd MwanaAI
```

### 2. Configure the frontend
```bash
cd frontend
cp .env.example .env.local
```
Edit `frontend/.env.local` with your keys:
```
REACT_APP_GROQ_API_KEY=gsk_your_real_key_here
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
REACT_APP_FIREBASE_APP_ID=...
```

### 3. Run it

**Option A — npm**
```bash
cd frontend
npm install
npm start            # http://localhost:3000
```

**Option B — Docker** (runs frontend + backend together)
```bash
docker compose up --build
# frontend → http://localhost:3100   backend → http://localhost:5100
```
(Host ports 3100/5100 are used so they don't clash with other apps on 3000/5000.
You can change them in `docker-compose.yml`.)

### 4. Firebase setup (one-time)
1. **Authentication → Sign-in method →** enable **Email/Password**.
2. **Firestore Database → Rules →** paste the contents of
   [`firestore.rules`](firestore.rules) and **Publish**.

That's it — sign up as a student (you'll get an onboarding flow) and start
learning, or sign up as a teacher to create classes and assignments.

---

## 🔒 Notes on security
- **Firebase web config** values are public client identifiers (protected by
  Firestore security rules and API key restrictions), not secrets.
- **The Groq key** is bundled into the frontend for local development. For a
  public deployment, proxy Groq calls through the backend so the key stays
  server-side.
- `.env*` files and service-account keys are git-ignored — never commit real
  keys; copy the `.env.example` templates instead.

## License
Released under the [MIT License](LICENSE).
