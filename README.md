# MediScribe AI - Clinical AI Copilot

A clinical documentation platform: physicians record a consultation, the audio is transcribed, and the transcript moves through a review workflow to a finalized record.

**Current status:** patient management, consultation lifecycle, audio recording, and the physician review workflow (AI review ready → physician review → finalized, with send-back for re-recording) are implemented and tested end-to-end. Transcription currently uses a **mock provider** (a small pool of canned physician/patient exchanges) rather than a real speech-to-text service — see [Scope](#scope--whats-mocked).

---

## Prerequisites

- Node.js 18+
- Docker (for PostgreSQL and Redis)

## Setup

### 1. Start PostgreSQL and Redis

From the project root:

```bash
docker compose up -d postgres redis
```

This starts Postgres on `5432` and Redis on `6379`. If either port is already in use on your machine, override it (e.g. `DB_PORT=5433 docker compose up -d postgres redis`) and adjust `backend/.env` to match in the next step.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed        # creates roles, permissions, demo users and patients
npm run start:dev   # runs on http://localhost:3001, migrations run automatically on boot
```

API docs (Swagger) are served at `http://localhost:3001/api`.

### 3. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npx ng serve --port 4201
```

Open **http://localhost:4201**.

> The frontend's API URL (`frontend/src/environments/environment.ts`) and the backend's `CORS_ORIGIN` (`backend/.env`) are already set to match ports 3001/4201. If you change either port, update both files.

## Log in

The seeder creates these accounts (password shown next to each):

| Email | Password | Role |
|---|---|---|
| `admin@mediscribe.local` | `admin123` | Admin |
| `dr.smith@mediscribe.local` | `doctor123` | Physician |
| `dr.johnson@mediscribe.local` | `doctor123` | Physician |
| `nurse.jane@mediscribe.local` | `nurse123` | Nurse |

## Testing

```bash
cd backend && npm test    # unit tests
cd frontend && npm test   # unit tests
```

Both `npm run build` (frontend: `ng build`, backend: `nest build`) should complete with no errors.

## Scope / what's mocked

- **Transcription is mocked.** `backend/src/modules/consultations/services/transcription/mock-transcription.provider.ts` returns a random subsequence of canned dialogue, not a real speech-to-text result. It's wired behind a `TRANSCRIPTION_PROVIDER` DI token, so swapping in a real provider (Azure/Whisper/etc.) doesn't require changing any call sites.
- **No AI clinical note generation / decision support yet.** The consultation workflow stops at a finalized transcript; SOAP note generation and clinical decision support described in some of the earlier planning docs in this repo are not implemented.
- **Consent and audio recording are real.** Browser `MediaRecorder` captures audio, uploads it, and the pipeline (upload → mock transcription → status transition) runs for real.

## Project structure

```
project/
├── backend/    # NestJS + TypeORM + Postgres API
├── frontend/   # Angular 17 (standalone components)
├── scripts/    # helper scripts
└── docker-compose.yml   # Postgres, Redis, and (untested) full-stack containers
```

`docker-compose.yml` also defines `backend`, `frontend`, `pgadmin`, and `redis-commander` services for a fully containerized setup; only the `postgres` and `redis` services have been exercised in local development so far.

## Compliance

This is a development project — not clinically validated, not regulatory approved, not HIPAA compliant as-is. See in-code comments and the AI Copilot principle this system follows: **AI recommends. Physician decides.**
