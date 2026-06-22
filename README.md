# MwanaAI — Personal AI Tutor 🇲🇼

MwanaAI is an AI-powered personal tutor for students in Malawi. A student picks
their **class/form level** and **subject**, then asks anything they're stuck on —
the tutor explains step by step, in language pitched at their level. They can
even snap a **photo of their homework** and get help with it.

The goal is simple: make it feel like a patient, encouraging human tutor — not a
wall of text.

## Features

- **AI tutor that adapts to the student** — explanations are tailored to the
  student's level (Standard 1–8 / Form 1–4) and subject.
- **Step-by-step help** — guides the student through the working so they learn,
  instead of just dumping answers.
- **Homework photo upload** 📷 — snap a picture of your work and the tutor (a
  vision model) reads it and helps.
- **Quick actions** — one tap for *Explain more simply*, *Another example*,
  *Practice question*, *Quiz me*, or *Study tips*.
- **Readable answers** — responses are formatted (bold terms, numbered steps,
  bullet points), not a tiring block of text.
- **Safety built in** — every question is screened by Meta's **Llama Prompt
  Guard 2** for prompt-injection / jailbreak attempts before it reaches the tutor.
- **Accounts** — students sign up and log in (Firebase Auth); their class level
  is saved to their profile.

## Tech stack

- **Frontend:** React (Create React App), React Router, Tailwind CSS
- **Auth:** Firebase Authentication + Firestore (student profiles)
- **AI:** [Groq](https://groq.com) API
  - Tutoring: `llama-3.1-8b-instant`
  - Homework images: `meta-llama/llama-4-scout-17b-16e-instruct` (vision)
  - Safety: `meta-llama/llama-prompt-guard-2-86m`
- **Backend (optional):** Node.js + Express (not required for the core tutor)

## Project structure

```
MwanaAI_Project/
├── frontend/                  # React app (the main application)
│   └── src/
│       ├── pages/             # Home, Login, Signup, AITutor
│       ├── components/        # Navbar, Footer, Markdown renderer, ...
│       ├── services/          # aiTutoring, promptGuard, firebaseService
│       ├── contexts/          # AuthContext
│       ├── config/            # firebase.js, curriculum.js (levels + subjects)
│       └── utils/             # image.js (downscale homework photos)
└── backend/                   # Express API (optional)
```

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) v16 or later
- A free [Groq API key](https://console.groq.com/keys)

### 1. Clone

```bash
git clone https://github.com/DonGobbi/MwanaAI.git
cd MwanaAI
```

### 2. Run the frontend (the main app)

```bash
cd frontend
npm install
cp .env.example .env.local      # then edit .env.local and add your Groq key
npm start
```

Open http://localhost:3000.

Your `.env.local` should contain:

```
REACT_APP_GROQ_API_KEY=gsk_your_real_key_here
```

### 3. Run the backend (optional)

The core tutor talks to Groq directly and does **not** need the backend. To run
it anyway:

```bash
cd backend
npm install
cp .env.example .env            # development mode uses a mock Firebase
npm run dev                     # http://localhost:5000
```

## Notes

- **Firebase:** the frontend uses a configured Firebase project for login. Make
  sure **Email/Password** sign-in is enabled in the Firebase console. The
  Firebase *web* config in `frontend/src/config/firebase.js` is a public client
  identifier (protected by Firebase security rules), not a secret.
- **API key & production:** for local development the Groq key lives in
  `.env.local` and is bundled into the frontend. For a public deployment, proxy
  Groq calls through the backend so the key stays server-side.
- **Secrets:** `.env*` files and service-account keys are git-ignored. Never
  commit real keys — copy the `.env.example` templates instead.

## License

Released under the [MIT License](LICENSE).
