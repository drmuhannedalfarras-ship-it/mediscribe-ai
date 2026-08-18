# MediScribe AI - Clinical AI Copilot

Enterprise healthcare platform with AI-assisted clinical documentation.

**Current Phase:** Phase 1 - AI Medical Scribe  
**Status:** Foundation & Architecture Complete

---

## QUICK START

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+ (optional for local development)
- Docker (for containerization)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev

# Server runs on: http://localhost:3000
# API Docs: http://localhost:3000/api/docs
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
ng serve --open

# Application opens on: http://localhost:4200
```

---

## PROJECT STRUCTURE

```
mediscribe-ai/
├── backend/                    # NestJS backend
│   ├── src/
│   │   ├── entities/          # TypeORM entities
│   │   ├── dto/               # Data transfer objects
│   │   ├── modules/           # Feature modules
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── patients/
│   │   │   ├── consultations/
│   │   │   ├── audio/
│   │   │   ├── audit/
│   │   │   └── health/
│   │   ├── config/            # Configuration files
│   │   ├── filters/           # Exception filters
│   │   ├── guards/            # Auth guards
│   │   └── main.ts            # Entry point
│   ├── test/                  # Tests
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # Angular frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── guards/
│   │   ├── assets/
│   │   └── environments/
│   ├── angular.json
│   └── tsconfig.json
│
├── database/                   # Database migrations
│   └── migrations/
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── SECURITY.md
│   └── DEPLOYMENT.md
│
├── docker-compose.yml          # Local development environment
├── Dockerfile                  # Backend container
├── PHASE_1_ROADMAP.md          # Implementation roadmap
└── README.md                   # This file
```

---

## CORE CONCEPTS

### AI Copilot Philosophy

MediScribe AI is **not** an autonomous doctor. The fundamental principle is:

**"AI recommends. Physician decides."**

The physician retains full authority over:
- Clinical diagnosis
- Diagnostic investigations
- Imaging studies
- Treatment decisions
- Medication selections
- Follow-up planning
- Final documentation

### Clinical Safety

- **Never invent information:** If the patient didn't mention something, classify it as UNKNOWN
- **Clear AI labeling:** All AI-generated content is marked and separable
- **Physician control:** Every AI recommendation requires physician approval
- **Audit trail:** Complete record of all clinical actions
- **Fail safe:** System preserves data if any component fails

### Data Classification

For every clinical finding:
- **POSITIVE:** Patient explicitly confirmed
- **NEGATIVE:** Patient explicitly denied
- **UNKNOWN:** Not discussed or insufficient information

Never convert UNKNOWN to NEGATIVE. Missing information is unknown, not negative.

---

## PHASES

### Phase 1: AI Medical Scribe (Current)
- Automatic transcription
- Speaker identification
- Clinical information extraction
- AI-generated SOAP notes
- Physician review and editing
- Finalized clinical records
- Complete audit trail

### Phase 2: Clinical Decision Support
- Differential diagnosis support
- Missing information detection
- Investigation recommendations
- Evidence-based guideline retrieval

### Phase 3: Clinical Management Support
- Evidence-based management options
- Medication safety checking
- Drug interaction detection
- Follow-up recommendations

### Phase 4: Multimodal Clinical AI
- Digital stethoscope integration
- ECG data analysis
- Laboratory result integration
- Medical imaging analysis
- Longitudinal patient analysis

---

## ARCHITECTURE

### Backend Architecture

```
Application Layer (Controllers)
        ↓
Service Layer (Business Logic)
        ↓
Repository Layer (Data Access)
        ↓
Database Layer (PostgreSQL)
```

### AI Architecture

```
Application
        ↓
AI Gateway (Provider abstraction)
        ↓
Provider Implementation (Anthropic/Azure/Google)
```

The AI gateway is provider-agnostic. Switch providers by changing environment variables without rewriting application code.

### Real-time Communication

WebSocket connection for:
- Live transcript updates during consultation
- Real-time AI processing status
- Notification delivery

---

## KEY ENTITIES

### Users & Authorization
- User (Physician, Nurse, Admin)
- Role (SUPER_ADMIN, CLINICAL_ADMIN, PHYSICIAN, NURSE, AUDITOR, CLINICAL_GOVERNANCE)
- Permission (Granular access control)
- UserRole (RBAC junction)

### Patient Management
- Patient (Demographics, medical information)
- PatientAllergy (With severity levels)
- PatientMedication (Current and historical)
- PatientCondition (Diagnoses)
- VitalSigns (Height, weight, BP, pulse, temperature, RR, SpO2)

### Consultation
- Consultation (Physician-patient interaction)
- ConsultationConsent (Patient consent for recording)
- AudioSession (Recording metadata)
- TranscriptSegment (Speech-to-text with speakers)
- ClinicalExtraction (Structured clinical data)
- ClinicalNote (SOAP notes)

### Governance
- AuditLog (Complete action trail)
- ModelVersion (AI model tracking)

---

## API ENDPOINTS (Phase 1)

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh JWT token

### Patients
- `GET /api/v1/patients` - List patients
- `POST /api/v1/patients` - Create patient
- `GET /api/v1/patients/:id` - Get patient details
- `PUT /api/v1/patients/:id` - Update patient
- `DELETE /api/v1/patients/:id` - Delete patient (soft delete)
- `GET /api/v1/patients/:id/vital-signs` - Get vital signs history

### Consultations
- `POST /api/v1/consultations` - Create consultation
- `GET /api/v1/consultations/:id` - Get consultation
- `GET /api/v1/patients/:patientId/consultations` - Get patient consultations
- `POST /api/v1/consultations/:id/start` - Start consultation
- `POST /api/v1/consultations/:id/end` - End consultation
- `POST /api/v1/consultations/:id/finalize` - Finalize consultation

### Consent
- `POST /api/v1/consultations/:id/consent/give` - Patient gives consent
- `POST /api/v1/consultations/:id/consent/decline` - Patient declines consent
- `POST /api/v1/consultations/:id/consent/withdraw` - Withdraw consent

### Audio & Transcription
- `POST /api/v1/consultations/:id/audio/start` - Start recording
- `POST /api/v1/consultations/:id/audio/stop` - Stop recording
- `GET /api/v1/consultations/:id/transcript` - Get transcript
- `POST /api/v1/transcript-segments/:id/correct` - Correct transcript

### Clinical Notes
- `POST /api/v1/consultations/:id/notes/generate` - Generate SOAP note
- `GET /api/v1/consultations/:id/notes` - Get clinical note
- `PUT /api/v1/notes/:id` - Edit clinical note
- `POST /api/v1/notes/:id/approve` - Approve note
- `POST /api/v1/notes/:id/finalize` - Finalize note
- `POST /api/v1/notes/:id/amend` - Amend finalized note

### Audit
- `GET /api/v1/audit/logs` - Query audit logs
- `GET /api/v1/audit/logs/:id` - Get audit log detail
- `POST /api/v1/audit/export` - Export audit report

---

## SECURITY

### Authentication & Authorization
- JWT tokens with configurable expiration
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Permission-level authorization
- MFA-ready architecture

### Data Protection
- Encryption at rest for sensitive data
- Encryption in transit (HTTPS)
- No PHI in logs (only IDs)
- Secure secrets management (environment variables)
- SQL injection prevention (parameterized queries)

### Audit & Compliance
- Complete action audit trail
- User and role tracking
- Data change history
- Access logging
- Compliance-ready retention policies

---

## ENVIRONMENT VARIABLES

### Core Configuration
```
NODE_ENV=development
APP_PORT=3000
APP_NAME=MediScribe AI
APP_VERSION=0.1.0
```

### Database
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=mediscribe
DB_PASSWORD=***
DB_DATABASE=mediscribe_ai
```

### Security
```
JWT_SECRET=***
JWT_EXPIRATION=86400
SESSION_SECRET=***
```

### AI Services
```
AI_PROVIDER=anthropic
AI_API_KEY=***
SPEECH_TO_TEXT_PROVIDER=azure
SPEECH_TO_TEXT_KEY=***
```

See `.env.example` for complete configuration.

---

## TESTING

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

---

## DOCKER

### Development Environment
```bash
docker-compose up -d

# Creates:
# - PostgreSQL database
# - Redis cache
# - Backend API
# - Frontend application
```

### Production Build
```bash
docker build -t mediscribe-ai:latest .
docker run -p 3000:3000 mediscribe-ai:latest
```

---

## COMPLIANCE & REGULATORY

This is software under development. Important:

- ⚠️ **NOT clinically validated**
- ⚠️ **NOT regulatory approved**
- ⚠️ **NOT for production use** without proper validation
- ⚠️ **NOT HIPAA compliant** without additional implementation

Clinical deployment requires:
- Clinical validation studies
- Security testing and audit
- HIPAA compliance implementation
- Regulatory approval (FDA/CE mark as needed)
- Clinical governance framework
- Institutional review and approval

---

## DOCUMENTATION

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design and components
- **[DATABASE.md](./docs/DATABASE.md)** - Database schema documentation
- **[API.md](./docs/API.md)** - Complete API reference
- **[SECURITY.md](./docs/SECURITY.md)** - Security controls and policies
- **[TESTING.md](./docs/TESTING.md)** - Testing strategy
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Production deployment
- **[CLINICAL_GOVERNANCE.md](./docs/CLINICAL_GOVERNANCE.md)** - AI governance
- **[PHASE_1_ROADMAP.md](./PHASE_1_ROADMAP.md)** - Implementation plan

---

## SUPPORT

For issues and questions:
- GitHub Issues: Bug reports and feature requests
- Documentation: Comprehensive guides
- Email: support@mediscribe-ai.com (when available)

---

## LICENSE

Proprietary - MediScribe AI

---

## CONTRIBUTING

This is a controlled development project. Contact the team for contribution guidelines.

---

**Remember:** AI recommends. Physician decides.
