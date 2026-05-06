from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr


# ---------- DB ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


# ---------- App ----------
app = FastAPI()
api = APIRouter(prefix="/api")


# ---------- JWT / Password helpers ----------
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-change-me-super-secret-64chars-xxxxxxxxxxxxxxxxxxxxxxxxx")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_role(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dep


# ---------- Models ----------
Role = Literal["admin", "teacher", "student"]


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: Role


class CreateUserIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["teacher", "student"]
    subject_ids: List[str] = []  # for student: enroll; for teacher: teach


class SubjectIn(BaseModel):
    name: str
    code: Optional[str] = None


class SubjectOut(BaseModel):
    id: str
    name: str
    code: Optional[str] = None


class AssignSubjectsIn(BaseModel):
    subject_ids: List[str]


class AttendanceRecord(BaseModel):
    student_id: str
    status: Literal["present", "absent"]


class MarkAttendanceIn(BaseModel):
    subject_id: str
    date: str  # YYYY-MM-DD
    records: List[AttendanceRecord]


class AddMarkIn(BaseModel):
    subject_id: str
    student_id: str
    exam_type: str  # e.g. midterm / final / quiz / custom
    max_marks: float
    score: float
    date: Optional[str] = None

class CreateAnnouncementIn(BaseModel):
    title: str
    message: str
    subject_id: Optional[str] = None  # None = global

# ---------- Utility ----------
def new_id() -> str:
    return str(uuid.uuid4())


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        # samesite="none",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )


def clean_user(doc: dict) -> dict:
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# ---------- Auth endpoints ----------
@api.post("/auth/register", response_model=UserOut)
async def register_admin(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": new_id(),
        "name": payload.name,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["role"])
    set_auth_cookie(response, token)
    return UserOut(**clean_user(user))


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["role"])
    set_auth_cookie(response, token)
    return {"user": clean_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**user)


# ---------- Admin: Subjects ----------
@api.get("/admin/subjects", response_model=List[SubjectOut])
async def list_subjects(_: dict = Depends(require_role("admin", "teacher", "student"))):
    subs = await db.subjects.find({}, {"_id": 0}).to_list(1000)
    return [SubjectOut(**s) for s in subs]


@api.post("/admin/subjects", response_model=SubjectOut)
async def create_subject(payload: SubjectIn, _: dict = Depends(require_role("admin"))):
    sub = {"id": new_id(), "name": payload.name, "code": payload.code}
    await db.subjects.insert_one(sub.copy())
    return SubjectOut(**sub)


@api.delete("/admin/subjects/{subject_id}")
async def delete_subject(subject_id: str, _: dict = Depends(require_role("admin"))):
    await db.subjects.delete_one({"id": subject_id})
    await db.enrollments.delete_many({"subject_id": subject_id})
    await db.teacher_assignments.delete_many({"subject_id": subject_id})
    await db.attendance.delete_many({"subject_id": subject_id})
    await db.marks.delete_many({"subject_id": subject_id})
    return {"ok": True}


# ---------- Admin: Users ----------
@api.get("/admin/users")
async def list_users(role: Optional[str] = None, _: dict = Depends(require_role("admin"))):
    q = {}
    if role:
        q["role"] = role
    users = await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(1000)
    # attach subject IDs
    for u in users:
        if u["role"] == "student":
            enrolls = await db.enrollments.find({"student_id": u["id"]}, {"_id": 0}).to_list(1000)
            u["subject_ids"] = [e["subject_id"] for e in enrolls]
        elif u["role"] == "teacher":
            teach = await db.teacher_assignments.find({"teacher_id": u["id"]}, {"_id": 0}).to_list(1000)
            u["subject_ids"] = [t["subject_id"] for t in teach]
    return users


@api.post("/admin/users")
async def create_user(payload: CreateUserIn, _: dict = Depends(require_role("admin"))):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = new_id()
    user = {
        "id": uid,
        "name": payload.name,
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    # Assign subjects
    if payload.role == "student":
        for sid in payload.subject_ids:
            await db.enrollments.insert_one({"id": new_id(), "student_id": uid, "subject_id": sid})
    else:
        for sid in payload.subject_ids:
            await db.teacher_assignments.insert_one({"id": new_id(), "teacher_id": uid, "subject_id": sid})
    return {"ok": True, "id": uid}


@api.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, _: dict = Depends(require_role("admin"))):
    await db.users.delete_one({"id": user_id})
    await db.enrollments.delete_many({"student_id": user_id})
    await db.teacher_assignments.delete_many({"teacher_id": user_id})
    await db.attendance.delete_many({"student_id": user_id})
    await db.marks.delete_many({"student_id": user_id})
    return {"ok": True}


@api.put("/admin/users/{user_id}/subjects")
async def update_user_subjects(user_id: str, payload: AssignSubjectsIn, _: dict = Depends(require_role("admin"))):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["role"] == "student":
        await db.enrollments.delete_many({"student_id": user_id})
        for sid in payload.subject_ids:
            await db.enrollments.insert_one({"id": new_id(), "student_id": user_id, "subject_id": sid})
    elif user["role"] == "teacher":
        await db.teacher_assignments.delete_many({"teacher_id": user_id})
        for sid in payload.subject_ids:
            await db.teacher_assignments.insert_one({"id": new_id(), "teacher_id": user_id, "subject_id": sid})
    else:
        raise HTTPException(status_code=400, detail="Only teachers/students can have subjects")
    return {"ok": True}


# ---------- Teacher endpoints ----------
@api.get("/teacher/subjects", response_model=List[SubjectOut])
async def teacher_subjects(user: dict = Depends(require_role("teacher"))):
    teach = await db.teacher_assignments.find({"teacher_id": user["id"]}, {"_id": 0}).to_list(1000)
    sids = [t["subject_id"] for t in teach]
    subs = await db.subjects.find({"id": {"$in": sids}}, {"_id": 0}).to_list(1000)
    return [SubjectOut(**s) for s in subs]


@api.get("/teacher/subjects/{subject_id}/students")
async def subject_students(subject_id: str, user: dict = Depends(require_role("teacher"))):
    # verify teacher owns subject
    owns = await db.teacher_assignments.find_one({"teacher_id": user["id"], "subject_id": subject_id})
    if not owns:
        raise HTTPException(status_code=403, detail="Not your subject")
    enrolls = await db.enrollments.find({"subject_id": subject_id}, {"_id": 0}).to_list(1000)
    sids = [e["student_id"] for e in enrolls]
    students = await db.users.find({"id": {"$in": sids}, "role": "student"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return students


@api.post("/teacher/attendance")
async def mark_attendance(payload: MarkAttendanceIn, user: dict = Depends(require_role("teacher"))):
    owns = await db.teacher_assignments.find_one({"teacher_id": user["id"], "subject_id": payload.subject_id})
    if not owns:
        raise HTTPException(status_code=403, detail="Not your subject")
    # Replace existing records for that subject+date
    await db.attendance.delete_many({"subject_id": payload.subject_id, "date": payload.date})
    docs = []
    for r in payload.records:
        docs.append({
            "id": new_id(),
            "subject_id": payload.subject_id,
            "student_id": r.student_id,
            "date": payload.date,
            "status": r.status,
            "marked_by": user["id"],
            "marked_at": datetime.now(timezone.utc).isoformat(),
        })
    if docs:
        await db.attendance.insert_many(docs)
    return {"ok": True, "count": len(docs)}


@api.get("/teacher/attendance")
async def get_attendance_for_subject(subject_id: str, user: dict = Depends(require_role("teacher"))):
    owns = await db.teacher_assignments.find_one({"teacher_id": user["id"], "subject_id": subject_id})
    if not owns:
        raise HTTPException(status_code=403, detail="Not your subject")
    records = await db.attendance.find({"subject_id": subject_id}, {"_id": 0}).to_list(5000)
    return records


@api.post("/teacher/marks")
async def add_marks(payload: AddMarkIn, user: dict = Depends(require_role("teacher"))):
    owns = await db.teacher_assignments.find_one({"teacher_id": user["id"], "subject_id": payload.subject_id})
    if not owns:
        raise HTTPException(status_code=403, detail="Not your subject")
    doc = {
        "id": new_id(),
        "subject_id": payload.subject_id,
        "student_id": payload.student_id,
        "exam_type": payload.exam_type,
        "max_marks": payload.max_marks,
        "score": payload.score,
        "date": payload.date or datetime.now(timezone.utc).date().isoformat(),
        "teacher_id": user["id"],
    }
    await db.marks.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.get("/teacher/marks")
async def get_marks_for_subject(subject_id: str, user: dict = Depends(require_role("teacher"))):
    owns = await db.teacher_assignments.find_one({"teacher_id": user["id"], "subject_id": subject_id})
    if not owns:
        raise HTTPException(status_code=403, detail="Not your subject")
    records = await db.marks.find({"subject_id": subject_id}, {"_id": 0}).to_list(5000)
    return records



@api.delete("/teacher/marks/{mark_id}")
async def delete_mark(mark_id: str, user: dict = Depends(require_role("teacher"))):
    m = await db.marks.find_one({"id": mark_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    if m.get("teacher_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Not your record")
    await db.marks.delete_one({"id": mark_id})
    return {"ok": True}

@api.post("/teacher/announcements")
async def create_announcement(
    payload: CreateAnnouncementIn,
    user: dict = Depends(require_role("teacher"))
):
    # If subject-specific → verify teacher owns it
    if payload.subject_id:
        owns = await db.teacher_assignments.find_one({
            "teacher_id": user["id"],
            "subject_id": payload.subject_id
        })
        if not owns:
            raise HTTPException(status_code=403, detail="Not your subject")

    doc = {
        "id": new_id(),
        "title": payload.title,
        "message": payload.message,
        "subject_id": payload.subject_id,  # can be None
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "audience": "subject" if payload.subject_id else "global"
    }

    await db.announcements.insert_one(doc.copy())
    doc.pop("_id", None)

    return doc

@api.get("/teacher/announcements")
async def teacher_announcements(user: dict = Depends(require_role("teacher"))):
    records = await db.announcements.find(
        {"created_by": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)

    return records

@api.post("/teacher/tests")
async def create_test(payload: dict, user: dict = Depends(require_role("teacher"))):
    test = {
        "id": new_id(),
        "title": payload.get("title"),
        "subject_id": payload.get("subject_id"),
        "teacher_id": user.get("id"),
        "duration": payload.get("duration"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = await db.tests.insert_one(test)

    # 🔥 FORCE SAFE RESPONSE
    return {
        "id": test["id"],
        "title": test["title"],
        "subject_id": test["subject_id"],
        "teacher_id": test["teacher_id"],
        "duration": test["duration"],
        "created_at": test["created_at"]
    }


@api.post("/teacher/tests/{test_id}/questions")
async def add_question(test_id: str, payload: dict, user: dict = Depends(require_role("teacher"))):

    # ✅ Check test exists
    test = await db.tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # ✅ Ensure teacher owns test
    if test["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your test")

    question = {
        "id": new_id(),
        "test_id": test_id,
        "type": payload.get("type"),  # MCQ / SUBJECTIVE
        "question_text": payload.get("question_text"),
        "options": payload.get("options", []),
        "correct_option": payload.get("correct_option"),
        "marks": payload.get("marks", 1)
    }

    await db.questions.insert_one(question)

    # ✅ Safe return (no ObjectId)
    return {
        "id": question["id"],
        "test_id": question["test_id"],
        "type": question["type"],
        "question_text": question["question_text"],
        "options": question["options"],
        "correct_option": question["correct_option"],
        "marks": question["marks"]
    }
@api.get("/tests/{test_id}/questions")
async def get_questions(test_id: str):
    questions = await db.questions.find(
        {"test_id": test_id},
        {"_id": 0}
    ).to_list(1000)

    return questions

@api.post("/teacher/submissions/{submission_id}/evaluate")
async def evaluate(submission_id: str, payload: dict, user: dict = Depends(require_role("teacher"))):

    submission = await db.submissions.find_one({"id": submission_id})
    if not submission:
        raise HTTPException(404, "Submission not found")

    total_marks = payload.get("marks")

    await db.submissions.update_one(
        {"id": submission_id},
        {"$set": {
            "total_marks": total_marks,
            "evaluated": True
        }}
    )

    # 🔥 ALSO STORE IN MARKS (reuse your system)
    test = await db.tests.find_one({"id": submission["test_id"]})

    await db.marks.insert_one({
        "id": new_id(),
        "subject_id": test["subject_id"],
        "student_id": submission["student_id"],
        "exam_type": "Test",
        "max_marks": 100,
        "score": total_marks,
        "date": datetime.now().date().isoformat(),
        "teacher_id": user["id"]
    })

    return {"ok": True}

@api.get("/teacher/tests")
async def get_teacher_tests(user: dict = Depends(require_role("teacher"))):
    tests = await db.tests.find(
        {"teacher_id": user["id"]},
        {"_id": 0}
    ).to_list(1000)

    return tests

@api.get("/teacher/tests/{test_id}/submissions")
async def get_submissions(
    test_id: str,
    user: dict = Depends(require_role("teacher"))
):
    # 🔹 Check test exists
    test = await db.tests.find_one({"id": test_id})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # 🔹 Ensure teacher owns the test (IMPORTANT)
    if test["teacher_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Not your test")

    # 🔹 Get submissions
    submissions = await db.submissions.find(
        {"test_id": test_id},
        {"_id": 0}
    ).to_list(1000)

    return submissions
# ---------- Student endpoints ----------
@api.get("/student/subjects", response_model=List[SubjectOut])
async def student_subjects(user: dict = Depends(require_role("student"))):
    enrolls = await db.enrollments.find({"student_id": user["id"]}, {"_id": 0}).to_list(1000)
    sids = [e["subject_id"] for e in enrolls]
    subs = await db.subjects.find({"id": {"$in": sids}}, {"_id": 0}).to_list(1000)
    return [SubjectOut(**s) for s in subs]


@api.get("/student/attendance")
async def student_attendance(user: dict = Depends(require_role("student"))):
    records = await db.attendance.find({"student_id": user["id"]}, {"_id": 0}).to_list(5000)
    return records

@api.get("/student/tests")
async def get_tests(user: dict = Depends(require_role("student"))):
    return await db.tests.find({}, {"_id": 0}).to_list(1000)

@api.get("/student/marks")
async def student_marks(user: dict = Depends(require_role("student"))):
    records = await db.marks.find({"student_id": user["id"]}, {"_id": 0}).to_list(5000)
    return records

@api.get("/student/announcements")
async def student_announcements(user: dict = Depends(require_role("student"))):
    # Get student subjects
    enrolls = await db.enrollments.find(
        {"student_id": user["id"]},
        {"_id": 0}
    ).to_list(1000)

    subject_ids = [e["subject_id"] for e in enrolls]

    # Fetch announcements (global + subject-specific)
    records = await db.announcements.find({
        "$or": [
            {"audience": "global"},
            {"subject_id": {"$in": subject_ids}}
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(1000)

    return records
@api.delete("/teacher/announcements/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    user: dict = Depends(require_role("teacher"))
):
    ann = await db.announcements.find_one({"id": announcement_id})

    if not ann:
        raise HTTPException(status_code=404, detail="Not found")

    # ✅ only creator can delete
    if ann.get("created_by") != user["id"]:
        raise HTTPException(status_code=403, detail="Not your announcement")

    await db.announcements.delete_one({"id": announcement_id})

    return {"ok": True}


@api.post("/student/tests/{test_id}/start")
async def start_test(test_id: str, user: dict = Depends(require_role("student"))):

    # ❗ prevent multiple attempts
    existing = await db.submissions.find_one({
        "test_id": test_id,
        "student_id": user["id"]
    })
    if existing:
        raise HTTPException(400, "Already attempted")

    submission = {
        "id": new_id(),
        "test_id": test_id,
        "student_id": user["id"],
        "started_at": datetime.now(timezone.utc).isoformat(),
        "answers": [],
        "evaluated": False
    }

    await db.submissions.insert_one(submission)

    return {
        "id": submission["id"],
        "test_id": submission["test_id"]
    }

@api.post("/student/tests/{test_id}/submit")
async def submit_test(test_id: str, payload: dict, user: dict = Depends(require_role("student"))):

    submission = await db.submissions.find_one({
        "test_id": test_id,
        "student_id": user["id"]
    })

    if not submission:
        raise HTTPException(404, "Start test first")

    # ⏱ TIME CHECK (important)
    started = datetime.fromisoformat(submission["started_at"])
    test = await db.tests.find_one({"id": test_id})

    if datetime.now(timezone.utc) > started + timedelta(minutes=test["duration"]):
        raise HTTPException(400, "Time expired")

    await db.submissions.update_one(
        {"id": submission["id"]},
        {"$set": {
            "answers": payload["answers"],
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {"ok": True}
# ---------- Mount ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["http://localhost:3000"],  
    allow_methods=["*"],
    allow_headers=["*"],
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.subjects.create_index("id", unique=True)
    await db.announcements.create_index("created_at")
    await db.announcements.create_index("subject_id")
    await db.announcements.create_index("created_by")


@app.on_event("shutdown")
async def shutdown():
    client.close()
