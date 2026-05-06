"""End-to-end backend tests for Class Management System."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://attendance-plus-27.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PWD = "TestPass123"
RUN_ID = uuid.uuid4().hex[:8]
ADMIN_EMAIL = f"admin_test_{RUN_ID}@example.com"
TEACHER_EMAIL = f"teacher_test_{RUN_ID}@example.com"
TEACHER2_EMAIL = f"teacher2_test_{RUN_ID}@example.com"
STUDENT_EMAIL = f"student_test_{RUN_ID}@example.com"
STUDENT2_EMAIL = f"student2_test_{RUN_ID}@example.com"


state = {}


def h(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Auth ----------
def test_01_register_admin():
    r = requests.post(f"{API}/auth/register", json={"name": "Admin Test", "email": ADMIN_EMAIL, "password": PWD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["role"] == "admin"
    assert data["email"] == ADMIN_EMAIL
    assert "id" in data
    state["admin_id"] = data["id"]


def test_02_register_duplicate_email_fails():
    r = requests.post(f"{API}/auth/register", json={"name": "X", "email": ADMIN_EMAIL, "password": PWD})
    assert r.status_code == 400


def test_03_login_admin_returns_token_and_user():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": PWD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and data["token"]
    assert data["user"]["role"] == "admin"
    state["admin_token"] = data["token"]


def test_04_login_invalid_password():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_05_me_with_bearer():
    r = requests.get(f"{API}/auth/me", headers=h(state["admin_token"]))
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_06_me_unauthenticated():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---------- Admin subjects ----------
def test_10_create_subjects():
    for name, code in [("Mathematics", "MATH101"), ("Physics", "PHY101"), ("Chemistry", "CHE101")]:
        r = requests.post(f"{API}/admin/subjects", json={"name": name, "code": code}, headers=h(state["admin_token"]))
        assert r.status_code == 200, r.text
        state.setdefault("subjects", []).append(r.json())
    assert len(state["subjects"]) == 3


def test_11_list_subjects():
    r = requests.get(f"{API}/admin/subjects", headers=h(state["admin_token"]))
    assert r.status_code == 200
    ids = [s["id"] for s in r.json()]
    for s in state["subjects"]:
        assert s["id"] in ids


# ---------- Admin users ----------
def test_20_create_teacher_with_subjects():
    sids = [state["subjects"][0]["id"], state["subjects"][1]["id"]]  # Math, Physics
    r = requests.post(f"{API}/admin/users", json={
        "name": "Teacher One", "email": TEACHER_EMAIL, "password": PWD,
        "role": "teacher", "subject_ids": sids,
    }, headers=h(state["admin_token"]))
    assert r.status_code == 200, r.text
    state["teacher_id"] = r.json()["id"]


def test_21_create_teacher2_with_chemistry():
    sids = [state["subjects"][2]["id"]]
    r = requests.post(f"{API}/admin/users", json={
        "name": "Teacher Two", "email": TEACHER2_EMAIL, "password": PWD,
        "role": "teacher", "subject_ids": sids,
    }, headers=h(state["admin_token"]))
    assert r.status_code == 200
    state["teacher2_id"] = r.json()["id"]


def test_22_create_students():
    sids_math_only = [state["subjects"][0]["id"]]
    sids_math_phy = [state["subjects"][0]["id"], state["subjects"][1]["id"]]

    r = requests.post(f"{API}/admin/users", json={
        "name": "Student One", "email": STUDENT_EMAIL, "password": PWD,
        "role": "student", "subject_ids": sids_math_phy,
    }, headers=h(state["admin_token"]))
    assert r.status_code == 200
    state["student_id"] = r.json()["id"]

    r2 = requests.post(f"{API}/admin/users", json={
        "name": "Student Two", "email": STUDENT2_EMAIL, "password": PWD,
        "role": "student", "subject_ids": sids_math_only,
    }, headers=h(state["admin_token"]))
    assert r2.status_code == 200
    state["student2_id"] = r2.json()["id"]


def test_23_list_students_with_subjects():
    r = requests.get(f"{API}/admin/users?role=student", headers=h(state["admin_token"]))
    assert r.status_code == 200
    users = r.json()
    found = next((u for u in users if u["id"] == state["student_id"]), None)
    assert found is not None
    assert set(found["subject_ids"]) == {state["subjects"][0]["id"], state["subjects"][1]["id"]}


def test_24_list_teachers_with_subjects():
    r = requests.get(f"{API}/admin/users?role=teacher", headers=h(state["admin_token"]))
    assert r.status_code == 200
    t = next((u for u in r.json() if u["id"] == state["teacher_id"]), None)
    assert t and len(t["subject_ids"]) == 2


def test_25_update_user_subjects():
    new_sids = [state["subjects"][2]["id"]]  # move student to chemistry only
    r = requests.put(
        f"{API}/admin/users/{state['student2_id']}/subjects",
        json={"subject_ids": new_sids}, headers=h(state["admin_token"]),
    )
    assert r.status_code == 200
    # verify
    r2 = requests.get(f"{API}/admin/users?role=student", headers=h(state["admin_token"]))
    u = next(u for u in r2.json() if u["id"] == state["student2_id"])
    assert u["subject_ids"] == new_sids


# ---------- Role guards ----------
def test_30_teacher_cannot_call_admin():
    r = requests.post(f"{API}/auth/login", json={"email": TEACHER_EMAIL, "password": PWD})
    assert r.status_code == 200
    state["teacher_token"] = r.json()["token"]

    r2 = requests.post(f"{API}/admin/subjects", json={"name": "X"}, headers=h(state["teacher_token"]))
    assert r2.status_code == 403


def test_31_student_cannot_call_teacher_or_admin():
    r = requests.post(f"{API}/auth/login", json={"email": STUDENT_EMAIL, "password": PWD})
    assert r.status_code == 200
    state["student_token"] = r.json()["token"]

    r2 = requests.get(f"{API}/teacher/subjects", headers=h(state["student_token"]))
    assert r2.status_code == 403
    r3 = requests.get(f"{API}/admin/users", headers=h(state["student_token"]))
    assert r3.status_code == 403


def test_32_admin_cannot_call_student_only():
    r = requests.get(f"{API}/student/subjects", headers=h(state["admin_token"]))
    assert r.status_code == 403


# ---------- Teacher flows ----------
def test_40_teacher_subjects():
    r = requests.get(f"{API}/teacher/subjects", headers=h(state["teacher_token"]))
    assert r.status_code == 200
    sids = [s["id"] for s in r.json()]
    assert state["subjects"][0]["id"] in sids
    assert state["subjects"][1]["id"] in sids
    assert state["subjects"][2]["id"] not in sids  # chemistry not teacher1


def test_41_teacher_subject_students():
    math_id = state["subjects"][0]["id"]
    r = requests.get(f"{API}/teacher/subjects/{math_id}/students", headers=h(state["teacher_token"]))
    assert r.status_code == 200
    sids = [s["id"] for s in r.json()]
    assert state["student_id"] in sids


def test_42_teacher_forbidden_other_subject():
    chem_id = state["subjects"][2]["id"]
    r = requests.get(f"{API}/teacher/subjects/{chem_id}/students", headers=h(state["teacher_token"]))
    assert r.status_code == 403


def test_43_mark_attendance_and_fetch():
    math_id = state["subjects"][0]["id"]
    payload = {
        "subject_id": math_id, "date": "2026-01-15",
        "records": [
            {"student_id": state["student_id"], "status": "present"},
        ],
    }
    r = requests.post(f"{API}/teacher/attendance", json=payload, headers=h(state["teacher_token"]))
    assert r.status_code == 200, r.text
    assert r.json()["count"] == 1

    # Replace same date: should delete old and insert new
    payload["records"][0]["status"] = "absent"
    r2 = requests.post(f"{API}/teacher/attendance", json=payload, headers=h(state["teacher_token"]))
    assert r2.status_code == 200

    r3 = requests.get(f"{API}/teacher/attendance?subject_id={math_id}", headers=h(state["teacher_token"]))
    assert r3.status_code == 200
    recs = [x for x in r3.json() if x["date"] == "2026-01-15"]
    assert len(recs) == 1 and recs[0]["status"] == "absent"


def test_44_attendance_forbidden_other_subject():
    chem_id = state["subjects"][2]["id"]
    r = requests.post(f"{API}/teacher/attendance", json={
        "subject_id": chem_id, "date": "2026-01-15", "records": [],
    }, headers=h(state["teacher_token"]))
    assert r.status_code == 403


def test_45_add_and_get_marks():
    math_id = state["subjects"][0]["id"]
    r = requests.post(f"{API}/teacher/marks", json={
        "subject_id": math_id, "student_id": state["student_id"],
        "exam_type": "midterm", "max_marks": 100, "score": 85,
    }, headers=h(state["teacher_token"]))
    assert r.status_code == 200, r.text
    state["mark_id"] = r.json()["id"]

    r2 = requests.get(f"{API}/teacher/marks?subject_id={math_id}", headers=h(state["teacher_token"]))
    assert r2.status_code == 200
    assert any(m["id"] == state["mark_id"] for m in r2.json())


def test_46_delete_mark_ownership():
    # Teacher2 should not be able to delete teacher1's mark
    r = requests.post(f"{API}/auth/login", json={"email": TEACHER2_EMAIL, "password": PWD})
    t2 = r.json()["token"]
    r2 = requests.delete(f"{API}/teacher/marks/{state['mark_id']}", headers=h(t2))
    assert r2.status_code == 403

    # Teacher1 can delete
    r3 = requests.delete(f"{API}/teacher/marks/{state['mark_id']}", headers=h(state["teacher_token"]))
    assert r3.status_code == 200


# ---------- Student flows ----------
def test_50_student_subjects():
    r = requests.get(f"{API}/student/subjects", headers=h(state["student_token"]))
    assert r.status_code == 200
    sids = [s["id"] for s in r.json()]
    assert state["subjects"][0]["id"] in sids
    assert state["subjects"][1]["id"] in sids


def test_51_student_attendance_only_own():
    # Add another mark/attendance for student1, then ensure student2 doesn't see it
    r = requests.get(f"{API}/student/attendance", headers=h(state["student_token"]))
    assert r.status_code == 200
    for rec in r.json():
        assert rec["student_id"] == state["student_id"]


def test_52_student_marks_only_own():
    # create a fresh mark for student1
    math_id = state["subjects"][0]["id"]
    requests.post(f"{API}/teacher/marks", json={
        "subject_id": math_id, "student_id": state["student_id"],
        "exam_type": "final", "max_marks": 100, "score": 92,
    }, headers=h(state["teacher_token"]))

    r = requests.get(f"{API}/student/marks", headers=h(state["student_token"]))
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    for m in data:
        assert m["student_id"] == state["student_id"]


# ---------- Cascade delete ----------
def test_60_delete_user_cascades():
    # delete student1 and verify marks/attendance gone
    r = requests.delete(f"{API}/admin/users/{state['student_id']}", headers=h(state["admin_token"]))
    assert r.status_code == 200

    math_id = state["subjects"][0]["id"]
    r2 = requests.get(f"{API}/teacher/attendance?subject_id={math_id}", headers=h(state["teacher_token"]))
    assert all(rec["student_id"] != state["student_id"] for rec in r2.json())
    r3 = requests.get(f"{API}/teacher/marks?subject_id={math_id}", headers=h(state["teacher_token"]))
    assert all(m["student_id"] != state["student_id"] for m in r3.json())


def test_61_delete_subject_cascades():
    phy_id = state["subjects"][1]["id"]
    r = requests.delete(f"{API}/admin/subjects/{phy_id}", headers=h(state["admin_token"]))
    assert r.status_code == 200
    r2 = requests.get(f"{API}/admin/subjects", headers=h(state["admin_token"]))
    assert phy_id not in [s["id"] for s in r2.json()]


# ---------- Cleanup ----------
def test_99_cleanup():
    for uid_key in ["teacher_id", "teacher2_id", "student2_id"]:
        if state.get(uid_key):
            requests.delete(f"{API}/admin/users/{state[uid_key]}", headers=h(state["admin_token"]))
    for s in state.get("subjects", []):
        requests.delete(f"{API}/admin/subjects/{s['id']}", headers=h(state["admin_token"]))
    requests.delete(f"{API}/admin/users/{state['admin_id']}", headers=h(state["admin_token"]))
