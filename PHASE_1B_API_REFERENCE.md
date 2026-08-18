# Phase 1B - Patient Management API Reference

Quick reference for all Phase 1B endpoints with examples.

---

## 🚀 CREATE PATIENT

```bash
POST /api/v1/patients
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1985-06-15",
  "gender": "MALE",
  "nationality": "American",
  "email": "john.doe@example.com",
  "phoneNumber": "+1-555-0123",
  "address": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "postalCode": "62701",
  "country": "USA",
  "emergencyContact": "Jane Doe",
  "emergencyContactPhone": "+1-555-0124",
  "bloodType": "O+",
  "familyHistory": "Hypertension in father",
  "socialHistory": "Non-smoker, social drinker",
  "smokingStatus": "NEVER"
}

Response (201):
{
  "statusCode": 201,
  "message": "Patient created successfully",
  "patient": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "patientId": "P-20260816xxxx",
    "mrn": "20260816xxxx",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "dateOfBirth": "1985-06-15",
    "age": 39,
    "gender": "MALE",
    "email": "john.doe@example.com",
    "status": "ACTIVE",
    "createdAt": "2026-08-16T12:00:00Z"
  }
}
```

---

## 📋 LIST ALL PATIENTS

```bash
GET /api/v1/patients?skip=0&take=20&status=ACTIVE
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Patients retrieved",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "patientId": "P-20260816xxxx",
      "mrn": "20260816xxxx",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "age": 39,
      "gender": "MALE",
      "status": "ACTIVE",
      "allergies": [
        {
          "id": "uuid",
          "allergen": "Penicillin",
          "severity": "CRITICAL"
        }
      ],
      "medications": [
        {
          "id": "uuid",
          "medicationName": "Metoprolol",
          "status": "ACTIVE"
        }
      ]
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 20,
    "total": 150
  }
}
```

---

## 🔍 SEARCH PATIENTS

```bash
GET /api/v1/patients/search?firstName=John&lastName=Doe&email=john@example.com
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Search results",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "patientId": "P-20260816xxxx",
      "mrn": "20260816xxxx",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "status": "ACTIVE"
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 20,
    "total": 1
  }
}
```

**Search Parameters:**
- `mrn` - Medical Record Number
- `firstName` - Patient first name
- `lastName` - Patient last name
- `email` - Patient email address
- `phoneNumber` - Patient phone number
- `skip` - Pagination offset (default: 0)
- `take` - Records per page (default: 20, max: 100)

---

## 👤 GET PATIENT DETAILS

```bash
GET /api/v1/patients/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Patient details retrieved",
  "patient": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "patientId": "P-20260816xxxx",
    "mrn": "20260816xxxx",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "dateOfBirth": "1985-06-15",
    "age": 39,
    "gender": "MALE",
    "email": "john.doe@example.com",
    "phoneNumber": "+1-555-0123",
    "address": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "postalCode": "62701",
    "country": "USA",
    "emergencyContact": "Jane Doe",
    "emergencyContactPhone": "+1-555-0124",
    "bloodType": "O+",
    "familyHistory": "Hypertension in father",
    "socialHistory": "Non-smoker, social drinker",
    "smokingStatus": "NEVER",
    "status": "ACTIVE",
    "allergies": [
      {
        "id": "uuid",
        "allergen": "Penicillin",
        "severity": "CRITICAL",
        "reaction": "Anaphylaxis",
        "onsetDate": "2010-01-15"
      }
    ],
    "medications": [
      {
        "id": "uuid",
        "medicationName": "Metoprolol",
        "dose": "25mg",
        "frequency": "Twice daily",
        "status": "ACTIVE",
        "startDate": "2020-06-01"
      }
    ],
    "conditions": [
      {
        "id": "uuid",
        "conditionName": "Type 2 Diabetes",
        "icdCode": "E11",
        "severity": "Moderate",
        "status": "ACTIVE",
        "onsetDate": "2015-03-20"
      }
    ],
    "vitalSigns": [
      {
        "id": "uuid",
        "height": 175,
        "weight": 75,
        "bmi": 24.5,
        "systolicBP": 120,
        "diastolicBP": 80,
        "pulse": 72,
        "temperature": 37.0,
        "respiratoryRate": 16,
        "spO2": 98,
        "measuredAt": "2026-08-16T10:00:00Z"
      }
    ],
    "createdAt": "2026-08-16T12:00:00Z"
  }
}
```

---

## ✏️ UPDATE PATIENT

```bash
PUT /api/v1/patients/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {token}
Content-Type: application/json

{
  "phoneNumber": "+1-555-9999",
  "address": "456 Oak Ave",
  "city": "Chicago",
  "bloodType": "AB+",
  "smokingStatus": "FORMER"
}

Response (200):
{
  "statusCode": 200,
  "message": "Patient updated",
  "patient": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phoneNumber": "+1-555-9999",
    "address": "456 Oak Ave",
    "city": "Chicago",
    "bloodType": "AB+",
    "smokingStatus": "FORMER"
  }
}
```

---

## 🗑️ DELETE PATIENT

```bash
DELETE /api/v1/patients/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Patient deleted"
}
```

---

## 🚨 ADD ALLERGY

```bash
POST /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/allergies
Authorization: Bearer {token}
Content-Type: application/json

{
  "allergen": "Penicillin",
  "severity": "CRITICAL",
  "reaction": "Anaphylaxis"
}

Response (201):
{
  "statusCode": 201,
  "message": "Allergy added",
  "allergy": {
    "id": "uuid",
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "allergen": "Penicillin",
    "severity": "CRITICAL",
    "reaction": "Anaphylaxis",
    "onsetDate": "2026-08-16T12:00:00Z",
    "isActive": true
  }
}
```

**Severity Levels:**
- `MILD` - Minor symptoms
- `MODERATE` - Significant symptoms
- `SEVERE` - Serious symptoms
- `CRITICAL` - Life-threatening

---

## 📋 GET ALLERGIES

```bash
GET /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/allergies
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Allergies retrieved",
  "allergies": [
    {
      "id": "uuid",
      "allergen": "Penicillin",
      "severity": "CRITICAL",
      "reaction": "Anaphylaxis",
      "onsetDate": "2010-01-15",
      "isActive": true
    },
    {
      "id": "uuid",
      "allergen": "Aspirin",
      "severity": "MODERATE",
      "reaction": "Urticaria",
      "onsetDate": "2015-06-20",
      "isActive": true
    }
  ]
}
```

---

## 🗑️ REMOVE ALLERGY

```bash
DELETE /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/allergies/allergy-uuid
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Allergy removed"
}
```

---

## 💊 ADD MEDICATION

```bash
POST /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/medications
Authorization: Bearer {token}
Content-Type: application/json

{
  "medicationName": "Metoprolol",
  "dose": "25mg",
  "frequency": "Twice daily",
  "indication": "Hypertension"
}

Response (201):
{
  "statusCode": 201,
  "message": "Medication added",
  "medication": {
    "id": "uuid",
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "medicationName": "Metoprolol",
    "dose": "25mg",
    "frequency": "Twice daily",
    "indication": "Hypertension",
    "status": "ACTIVE",
    "startDate": "2026-08-16T12:00:00Z"
  }
}
```

---

## 📋 GET ACTIVE MEDICATIONS

```bash
GET /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/medications/active
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Active medications retrieved",
  "medications": [
    {
      "id": "uuid",
      "medicationName": "Metoprolol",
      "dose": "25mg",
      "frequency": "Twice daily",
      "indication": "Hypertension",
      "status": "ACTIVE",
      "startDate": "2020-06-01T00:00:00Z"
    }
  ]
}
```

---

## ⏸️ DISCONTINUE MEDICATION

```bash
PUT /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/medications/med-uuid/discontinue
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Medication discontinued",
  "medication": {
    "id": "uuid",
    "medicationName": "Metoprolol",
    "status": "DISCONTINUED",
    "endDate": "2026-08-16T12:00:00Z"
  }
}
```

---

## 🔄 RESUME MEDICATION

```bash
PUT /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/medications/med-uuid/resume
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Medication resumed",
  "medication": {
    "id": "uuid",
    "medicationName": "Metoprolol",
    "status": "ACTIVE"
  }
}
```

---

## 🏥 ADD CONDITION

```bash
POST /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/conditions
Authorization: Bearer {token}
Content-Type: application/json

{
  "conditionName": "Type 2 Diabetes",
  "icdCode": "E11",
  "severity": "Moderate"
}

Response (201):
{
  "statusCode": 201,
  "message": "Condition added",
  "condition": {
    "id": "uuid",
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "conditionName": "Type 2 Diabetes",
    "icdCode": "E11",
    "severity": "Moderate",
    "status": "ACTIVE",
    "onsetDate": "2026-08-16T12:00:00Z"
  }
}
```

---

## 📋 GET ACTIVE CONDITIONS

```bash
GET /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/conditions/active
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Active conditions retrieved",
  "conditions": [
    {
      "id": "uuid",
      "conditionName": "Type 2 Diabetes",
      "icdCode": "E11",
      "severity": "Moderate",
      "status": "ACTIVE",
      "onsetDate": "2015-03-20T00:00:00Z"
    }
  ]
}
```

---

## ✅ RESOLVE CONDITION

```bash
PUT /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/conditions/cond-uuid/resolve
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Condition resolved",
  "condition": {
    "id": "uuid",
    "conditionName": "Acute Bronchitis",
    "status": "RESOLVED",
    "resolutionDate": "2026-08-16T12:00:00Z"
  }
}
```

---

## 📊 RECORD VITAL SIGNS

```bash
POST /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/vital-signs
Authorization: Bearer {token}
Content-Type: application/json

{
  "height": 175,
  "weight": 75,
  "systolicBP": 120,
  "diastolicBP": 80,
  "pulse": 72,
  "temperature": 37.0,
  "respiratoryRate": 16,
  "spO2": 98,
  "notes": "Patient stable after rest"
}

Response (201):
{
  "statusCode": 201,
  "message": "Vital signs recorded",
  "vitalSigns": {
    "id": "uuid",
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "height": 175,
    "weight": 75,
    "bmi": 24.5,
    "systolicBP": 120,
    "diastolicBP": 80,
    "pulse": 72,
    "temperature": 37.0,
    "respiratoryRate": 16,
    "spO2": 98,
    "notes": "Patient stable after rest",
    "measuredAt": "2026-08-16T12:00:00Z",
    "recordedBy": {
      "id": "user-uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@hospital.com"
    }
  },
  "abnormalities": []
}
```

---

## 📈 GET LATEST VITAL SIGNS

```bash
GET /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/vital-signs/latest
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Latest vital signs retrieved",
  "vitalSigns": {
    "id": "uuid",
    "height": 175,
    "weight": 75,
    "bmi": 24.5,
    "systolicBP": 120,
    "diastolicBP": 80,
    "pulse": 72,
    "temperature": 37.0,
    "respiratoryRate": 16,
    "spO2": 98,
    "measuredAt": "2026-08-16T10:00:00Z"
  },
  "abnormalities": []
}
```

**Abnormalities Detected:**
- Hypothermia: Temperature <36.5°C
- Fever: Temperature >38.5°C
- Hypertensive Crisis: SBP >180 or DBP >120
- Hypotension: SBP <90 or DBP <60
- Bradycardia: Pulse <60
- Tachycardia: Pulse >100
- Low Oxygen: SpO2 <92%
- Bradypnea: RR <12
- Tachypnea: RR >20

---

## 📊 GET VITAL SIGNS HISTORY

```bash
GET /api/v1/patients/550e8400-e29b-41d4-a716-446655440000/vital-signs/history?skip=0&take=20
Authorization: Bearer {token}

Response (200):
{
  "statusCode": 200,
  "message": "Vital signs history retrieved",
  "data": [
    {
      "id": "uuid",
      "height": 175,
      "weight": 75,
      "bmi": 24.5,
      "systolicBP": 120,
      "diastolicBP": 80,
      "pulse": 72,
      "temperature": 37.0,
      "respiratoryRate": 16,
      "spO2": 98,
      "measuredAt": "2026-08-16T10:00:00Z"
    }
  ],
  "pagination": {
    "skip": 0,
    "take": 20,
    "total": 45
  }
}
```

---

## 🔑 REQUIRED JWT TOKEN

All endpoints require a valid JWT token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**To get a token:**
```bash
POST /api/v1/auth/login
{
  "email": "user@hospital.com",
  "password": "password123"
}
```

---

## 🔐 ROLE REQUIREMENTS

### Create Patient
- PHYSICIAN
- CLINICAL_ADMIN
- SUPER_ADMIN
- NURSE

### View Patient
- PHYSICIAN
- CLINICAL_ADMIN
- SUPER_ADMIN
- NURSE

### Update Patient
- PHYSICIAN
- CLINICAL_ADMIN
- SUPER_ADMIN

### Delete Patient
- CLINICAL_ADMIN
- SUPER_ADMIN

### Record Vital Signs
- PHYSICIAN
- NURSE
- CLINICAL_ADMIN
- SUPER_ADMIN

### Manage Medications/Conditions
- PHYSICIAN
- CLINICAL_ADMIN
- SUPER_ADMIN

---

## 📊 PAGINATION

All list endpoints support pagination:

```
?skip=0&take=20
```

- `skip` - Number of records to skip (default: 0)
- `take` - Number of records to return (default: 20, max: 100)

---

## ✅ SUCCESS RESPONSES

All successful responses follow this format:

```json
{
  "statusCode": 200,
  "message": "Human-readable message",
  "data": {},
  "pagination": {
    "skip": 0,
    "take": 20,
    "total": 100
  }
}
```

---

## ❌ ERROR RESPONSES

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "BadRequest",
  "timestamp": "2026-08-16T12:00:00Z"
}
```

**Common Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Server Error

---

## 🧪 TESTING WITH CURL

### Create Patient
```bash
curl -X POST http://localhost:3000/api/v1/patients \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1985-06-15",
    "gender": "MALE"
  }'
```

### Add Allergy
```bash
curl -X POST http://localhost:3000/api/v1/patients/PATIENT_ID/allergies \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "allergen": "Penicillin",
    "severity": "CRITICAL"
  }'
```

### Record Vital Signs
```bash
curl -X POST http://localhost:3000/api/v1/patients/PATIENT_ID/vital-signs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "height": 175,
    "weight": 75,
    "systolicBP": 120,
    "diastolicBP": 80,
    "pulse": 72,
    "temperature": 37.0,
    "respiratoryRate": 16,
    "spO2": 98
  }'
```

---

Last Updated: August 16, 2026
