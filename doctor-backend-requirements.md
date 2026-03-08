# API Endpoints Needed for Doctor Dashboard

Hey, we're building the doctor dashboard next. Here are the API endpoints we need. The patterns should mirror what you've already built for the nurse (`/nurse/...`) and receptionist (`/receptionist/...`) dashboards. All endpoints require JWT auth and should be scoped to the authenticated doctor's organization.

---

## 1. Doctor Dashboard Stats
```
GET /api/v1/doctor/dashboard/stats/
```
Response:
```json
{
  "todays_appointments": 5,
  "active_episodes": 12,
  "patients_in_queue": 3,
  "pending_referrals": 2,
  "admissions_under_care": 8,
  "completed_episodes_this_week": 15
}
```

## 2. My Patients (Active Episodes Under This Doctor)
```
GET /api/v1/doctor/my-patients/
    ?ward_id=<uuid>        (optional filter)
    ?status=ACTIVE         (optional: ACTIVE | COMPLETED)
    ?search=<name>         (optional search by patient name)
    ?page=1                (pagination)
```
Response: paginated list of patients with their current episode, admission (if inpatient), and latest vitals summary. Expected shape per item:
```json
{
  "id": "uuid",
  "patient": {
    "id": "uuid",
    "healthclouda_id": "HCL-ABC123",
    "first_name": "Adaeze",
    "last_name": "Okonkwo",
    "gender": "F",
    "blood_type": "O+",
    "age": 37,
    "allergies": "Penicillin"
  },
  "episode": {
    "id": "uuid",
    "episode_type": "INPATIENT",
    "status": "ACTIVE",
    "chief_complaint": "Chest pain",
    "started_at": "2026-03-01T08:00:00Z"
  },
  "admission": {
    "id": "uuid",
    "ward": { "id": "uuid", "name": "Medical Ward" },
    "bed": { "id": "uuid", "bed_number": "B-001" },
    "admitted_at": "2026-03-01T08:00:00Z"
  },
  "latest_vitals": {
    "blood_pressure_systolic": 120,
    "blood_pressure_diastolic": 80,
    "temperature": 36.8,
    "pulse_rate": 75,
    "recorded_at": "2026-03-03T22:02:19Z"
  }
}
```

## 3. Episodes
```
GET    /api/v1/doctor/episodes/                     — list doctor's episodes (?status=ACTIVE|COMPLETED, ?page=)
POST   /api/v1/doctor/episodes/                     — create new episode
GET    /api/v1/doctor/episodes/:id/                 — full episode detail (patient info, vitals timeline, notes, prescriptions, diagnosis)
PATCH  /api/v1/doctor/episodes/:id/                 — update episode (add diagnosis, update chief complaint)
POST   /api/v1/doctor/episodes/:id/complete/        — complete/close episode (with summary & final diagnosis)
```

Create episode payload:
```json
{
  "patient_id": "uuid",
  "episode_type": "INPATIENT | OUTPATIENT | EMERGENCY",
  "chief_complaint": "string",
  "notes": "string (optional)"
}
```

Complete episode payload:
```json
{
  "summary": "string",
  "final_diagnosis": "string"
}
```

Episode detail response should include nested:
```json
{
  "id": "uuid",
  "patient": { "id": "uuid", "first_name": "...", "last_name": "...", "age": 37, "gender": "F", "blood_type": "O+", "allergies": "..." },
  "episode_type": "INPATIENT",
  "status": "ACTIVE",
  "chief_complaint": "...",
  "diagnosis": "...",
  "started_at": "2026-03-01T08:00:00Z",
  "completed_at": null,
  "notes": [ { "id": "uuid", "content": "...", "note_type": "GENERAL", "created_by": "Dr. Name", "created_at": "..." } ],
  "prescriptions": [ { "id": "uuid", "medication": "...", "dosage": "...", "frequency": "...", "duration": "...", "status": "ACTIVE" } ],
  "vitals_history": [ { "blood_pressure_systolic": 120, "temperature": 36.8, "recorded_at": "..." } ],
  "admission": { "ward": { "name": "..." }, "bed": { "bed_number": "..." } }
}
```

## 4. Clinical Notes
```
GET    /api/v1/doctor/episodes/:id/notes/           — list notes for an episode (chronological)
POST   /api/v1/doctor/episodes/:id/notes/           — add a clinical note
```
Note payload:
```json
{
  "content": "string",
  "note_type": "GENERAL | EXAMINATION | FOLLOW_UP | PROCEDURE"
}
```

## 5. Prescriptions
```
GET    /api/v1/doctor/prescriptions/                — list all prescriptions by this doctor (?status=ACTIVE|COMPLETED|CANCELLED, ?episode_id=uuid, ?page=)
POST   /api/v1/doctor/prescriptions/                — create prescription
PATCH  /api/v1/doctor/prescriptions/:id/cancel/     — cancel a prescription
```
Create payload:
```json
{
  "episode_id": "uuid",
  "patient_id": "uuid",
  "medication": "string",
  "dosage": "string",
  "frequency": "string (e.g., 'twice daily')",
  "duration": "string (e.g., '7 days')",
  "instructions": "string (optional)"
}
```

## 6. Referrals
```
GET    /api/v1/doctor/referrals/incoming/           — referrals sent TO this doctor (?status=PENDING|ACCEPTED|DECLINED)
GET    /api/v1/doctor/referrals/outgoing/           — referrals sent BY this doctor
POST   /api/v1/doctor/referrals/                    — create outgoing referral
PATCH  /api/v1/doctor/referrals/:id/accept/         — accept incoming referral
PATCH  /api/v1/doctor/referrals/:id/decline/        — decline incoming referral (with reason)
GET    /api/v1/doctor/referrals/:id/                — referral detail
```
Create referral payload:
```json
{
  "patient_id": "uuid",
  "episode_id": "uuid (optional)",
  "referred_to": "uuid (doctor or facility)",
  "reason": "string",
  "urgency": "LOW | MEDIUM | HIGH | CRITICAL",
  "clinical_notes": "string (optional)"
}
```
Decline payload:
```json
{
  "reason": "string"
}
```

## 7. Appointments (Read + Update only — receptionists create them)
```
GET    /api/v1/doctor/appointments/                 — list doctor's appointments (?status=SCHEDULED|COMPLETED|CANCELLED|NO_SHOW, ?date=YYYY-MM-DD, ?page=)
GET    /api/v1/doctor/appointments/:id/             — appointment detail
PATCH  /api/v1/doctor/appointments/:id/             — update status (complete, cancel, no-show) + add notes
```
Update payload:
```json
{
  "status": "COMPLETED | CANCELLED | NO_SHOW",
  "notes": "string (optional)"
}
```

## 8. Patient Vitals (Read-only for doctors)
```
GET    /api/v1/doctor/patients/:id/vitals/          — current vitals
GET    /api/v1/doctor/patients/:id/vitals/history/  — vitals history (for charting trends)
```
Vitals history response (sorted by recorded_at ascending):
```json
[
  {
    "blood_pressure_systolic": 120,
    "blood_pressure_diastolic": 80,
    "temperature": 36.8,
    "pulse_rate": 75,
    "respiratory_rate": 16,
    "oxygen_saturation": 98,
    "weight": 70.5,
    "recorded_at": "2026-03-01T08:00:00Z"
  }
]
```

## 9. Existing Endpoints to Reuse
These already exist and just need doctor role permission added:
- `POST /api/v1/auth/me/toggle-duty/` — duty status toggle (already built for nurses)
- `GET /api/v1/auth/me/notifications/` — notifications list
- `GET /api/v1/auth/me/notifications/unread-count/` — unread count
- `PATCH /api/v1/auth/me/notifications/:id/read/` — mark as read
- `GET /api/v1/auth/me/` — current user profile

---

## Important Notes

- All list endpoints should support pagination: `{ count, next, previous, results }`
- Doctor should only see patients/episodes/prescriptions within their own organization
- The `toggle-duty` endpoint should already work for doctors — just verify the role permission
- Notification types to support: `NEW_APPOINTMENT`, `REFERRAL_RECEIVED`, `PATIENT_ASSIGNED`, `VITALS_ALERT`, `EPISODE_UPDATE`
- Vitals history endpoint should return data sorted by `recorded_at` (ascending) so the frontend can chart it
- Episode detail should include nested: patient info, vitals (latest), clinical notes, prescriptions, and admission info (if inpatient)
- For the `my-patients` endpoint, include patients where the doctor is the assigned/attending doctor on an active episode
- Referral urgency levels: LOW, MEDIUM, HIGH, CRITICAL
- Clinical note types: GENERAL, EXAMINATION, FOLLOW_UP, PROCEDURE
- Episode types: INPATIENT, OUTPATIENT, EMERGENCY
