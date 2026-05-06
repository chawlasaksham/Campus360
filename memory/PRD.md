# Class Management System (ClassBoard)

## Original Problem Statement
Website for class management with 3 users: student, teacher, admin. Admin adds/removes students & teachers and designates subjects. Admin enrolls students in subjects when adding them. Teacher opens attendance page, sees all students and marks present/absent with date and enters marks in the subject. Student sees attendance of each subject and marks received. Role decided by login. Admin signup page on website. All data in MongoDB. React + JS.

## Stack
- Backend: FastAPI + MongoDB (motor), JWT + bcrypt, UUID-based IDs
- Frontend: React 19, React Router v7, Tailwind + Shadcn UI, sonner toasts
- Theme: Pastel Neo-Brutalist (butter/mint/sky accents, hard 1px borders, offset shadows). Fonts: DM Serif Display (headings) + Work Sans (body)

## User Personas
- **Admin**: Creates subjects, adds/removes teachers & students, assigns subjects.
- **Teacher**: Views assigned subjects, marks daily attendance, records exam marks.
- **Student**: Views enrolled subjects, attendance %, marks per exam type.

## What's Implemented (v1 — 2026-02)
- Open admin signup + login (JWT, bcrypt, token via Bearer + httpOnly cookie)
- Role-gated routes: `/admin`, `/teacher`, `/student`
- Admin: CRUD subjects; CRUD teachers & students with subject assignments; update subject assignments
- Teacher: list my subjects, list subject's enrolled students, bulk mark attendance (present/absent by date, idempotent per date), add/delete marks with custom exam type + max marks
- Student: view enrolled subjects, attendance history per subject with % stats, marks history with % per exam
- Cascade delete: removing a subject/user cleans up enrollments/assignments/attendance/marks
- Backend tested: 30/30 pytest passed

## Backlog (P1 / P2)
- P1: Lock down admin signup with invite code once first admin exists
- P1: Bulk CSV import of students/teachers; edit user name/email
- P1: Brute-force login protection (5-fail lockout per playbook)
- P2: Attendance report exports; per-subject analytics (trends, charts)
- P2: Teacher can see per-student attendance %; student can see overall report card
- P2: Password reset flow (forgot-password/reset-password)
- P2: Split server.py into routers; add unique indexes on enrollments/assignments
- P2: Explicit CORS origin instead of wildcard with credentials

## Next Tasks
- Confirm end-to-end UX with user; gather feedback
- Add invite-code-protected admin signup for production safety
