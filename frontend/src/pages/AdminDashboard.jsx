import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, formatError } from "../lib/api";
import { toast } from "sonner";
import { Plus, Trash2, X, BookOpen, Users, GraduationCap as CapIcon } from "lucide-react";

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center p-4" onClick={onClose} data-testid="modal-overlay">
      <div className="nb-card-flat w-full max-w-lg p-6 relative" onClick={(e) => e.stopPropagation()} data-testid="modal">
        <button className="absolute top-3 right-3 p-1 border border-black rounded-md bg-white hover:bg-[#FEE2E2]" onClick={onClose} data-testid="modal-close-btn">
          <X size={16} />
        </button>
        <div className="nb-label mb-1">Action</div>
        <h2 className="font-heading text-3xl mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "bg-white", testid }) {
  return (
    <div className={`nb-card p-6 ${color}`} data-testid={testid}>
      <div className="nb-label">{label}</div>
      <div className="font-heading text-5xl mt-1">{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("students");
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const loadAll = async () => {
    try {
      const [s, st, te] = await Promise.all([
        api.get("/admin/subjects"),
        api.get("/admin/users?role=student"),
        api.get("/admin/users?role=teacher"),
      ]);
      setSubjects(s.data);
      setStudents(st.data);
      setTeachers(te.data);
    } catch (e) { toast.error(formatError(e)); }
  };

  useEffect(() => { loadAll(); }, []);

  return (
    <Layout subtitle="Admin Console" title="Manage your school">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard label="Subjects" value={subjects.length} color="bg-[#FDE68A]" testid="stat-subjects" />
        <StatCard label="Teachers" value={teachers.length} color="bg-[#BAE6FD]" testid="stat-teachers" />
        <StatCard label="Students" value={students.length} color="bg-[#E8F5E9]" testid="stat-students" />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap" data-testid="admin-tabs">
        {[
          { k: "students", label: "Students", icon: CapIcon },
          { k: "teachers", label: "Teachers", icon: Users },
          { k: "subjects", label: "Subjects", icon: BookOpen },
        ].map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex items-center gap-2 px-5 py-2.5 border border-black rounded-md font-bold text-sm transition-all ${
              tab === k ? "bg-[#111] text-white shadow-[3px_3px_0_0_#111]" : "bg-white hover:bg-[#FAFAF7]"
            }`}
            data-testid={`tab-${k}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "subjects" && <SubjectsPanel subjects={subjects} reload={loadAll} />}
      {tab === "students" && <UsersPanel role="student" users={students} subjects={subjects} reload={loadAll} />}
      {tab === "teachers" && <UsersPanel role="teacher" users={teachers} subjects={subjects} reload={loadAll} />}
    </Layout>
  );
}

function SubjectsPanel({ subjects, reload }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [confirmId, setConfirmId] = useState(null);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/subjects", form);
      toast.success("Subject created");
      setOpen(false); setForm({ name: "", code: "" });
      reload();
    } catch (e) { toast.error(formatError(e)); }
  };

  const del = async () => {
    const id = confirmId;
    setConfirmId(null);
    try {
      await api.delete(`/admin/subjects/${id}`);
      toast.success("Subject deleted");
      reload();
    } catch (e) { toast.error(formatError(e)); }
  };

  return (
    <div className="nb-card-flat p-6" data-testid="subjects-panel">
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-heading text-2xl">Subjects</h2>
        <button className="nb-btn-primary flex items-center gap-2" onClick={() => setOpen(true)} data-testid="add-subject-btn">
          <Plus size={16} /> Add Subject
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="p-10 text-center text-[#52525B]">No subjects yet. Start by adding one.</div>
      ) : (
        <table className="nb-table">
          <thead><tr><th>Name</th><th>Code</th><th className="text-right">Action</th></tr></thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} data-testid={`subject-row-${s.id}`}>
                <td className="font-semibold">{s.name}</td>
                <td className="text-[#52525B]">{s.code || "—"}</td>
                <td className="text-right">
                  <button className="nb-btn-danger inline-flex items-center gap-1" onClick={() => setConfirmId(s.id)} data-testid={`delete-subject-${s.id}`}>
                    <Trash2 size={14} /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add a new subject">
        <form onSubmit={add} className="space-y-4" data-testid="add-subject-form">
          <div><label className="nb-label">Name</label>
            <input required className="nb-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="subject-name-input" />
          </div>
          <div><label className="nb-label">Code (optional)</label>
            <input className="nb-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="subject-code-input" />
          </div>
          <button className="nb-btn-primary w-full" data-testid="subject-save-btn">Create Subject</button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title="Delete this subject?"
        message="This will remove all related enrollments, attendance and marks."
        onCancel={() => setConfirmId(null)}
        onConfirm={del}
        testid="confirm-delete-subject"
      />
    </div>
  );
}

function UsersPanel({ role, users, subjects, reload }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", subject_ids: [] });
  const [confirmId, setConfirmId] = useState(null);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", email: "", password: "", subject_ids: [] });
    setOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", subject_ids: u.subject_ids || [] });
    setOpen(true);
  };

  const toggleSubject = (sid) => {
    setForm((f) => ({
      ...f,
      subject_ids: f.subject_ids.includes(sid) ? f.subject_ids.filter((i) => i !== sid) : [...f.subject_ids, sid],
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/admin/users/${editing.id}/subjects`, { subject_ids: form.subject_ids });
        toast.success("Subjects updated");
      } else {
        await api.post("/admin/users", { ...form, role });
        toast.success(`${role === "student" ? "Student" : "Teacher"} added`);
      }
      setOpen(false); reload();
    } catch (e) { toast.error(formatError(e)); }
  };

  const del = async () => {
    const id = confirmId;
    setConfirmId(null);
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("Removed");
      reload();
    } catch (e) { toast.error(formatError(e)); }
  };

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "—";

  return (
    <div className="nb-card-flat p-6" data-testid={`${role}-panel`}>
      <div className="flex justify-between items-center mb-5">
        <h2 className="font-heading text-2xl capitalize">{role}s</h2>
        <button className="nb-btn-primary flex items-center gap-2" onClick={openAdd} data-testid={`add-${role}-btn`}>
          <Plus size={16} /> Add {role}
        </button>
      </div>

      {users.length === 0 ? (
        <div className="p-10 text-center text-[#52525B]">No {role}s yet.</div>
      ) : (
        <table className="nb-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Subjects</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} data-testid={`${role}-row-${u.id}`}>
                <td className="font-semibold">{u.name}</td>
                <td className="text-[#52525B]">{u.email}</td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {(u.subject_ids || []).length === 0 && <span className="text-[#52525B] text-sm">None</span>}
                    {(u.subject_ids || []).map((sid) => (
                      <span key={sid} className="nb-chip bg-[#E8F5E9]">{subjectName(sid)}</span>
                    ))}
                  </div>
                </td>
                <td className="text-right space-x-2">
                  <button className="nb-btn-secondary text-sm" onClick={() => openEdit(u)} data-testid={`edit-${role}-${u.id}`}>Subjects</button>
                  <button className="nb-btn-danger inline-flex items-center gap-1" onClick={() => setConfirmId(u.id)} data-testid={`delete-${role}-${u.id}`}>
                    <Trash2 size={14} /> Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${role} subjects` : `Add ${role}`}>
        <form onSubmit={save} className="space-y-4" data-testid={`${role}-form`}>
          {!editing && (
            <>
              <div><label className="nb-label">Full Name</label>
                <input required className="nb-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid={`${role}-name-input`} />
              </div>
              <div><label className="nb-label">Email</label>
                <input required type="email" className="nb-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid={`${role}-email-input`} />
              </div>
              <div><label className="nb-label">Password</label>
                <input required minLength={6} type="password" className="nb-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid={`${role}-password-input`} />
              </div>
            </>
          )}

          <div>
            <label className="nb-label">{role === "student" ? "Enroll in subjects" : "Teach subjects"}</label>
            {subjects.length === 0 ? (
              <div className="text-sm text-[#52525B]">Create subjects first.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => {
                  const active = form.subject_ids.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSubject(s.id)}
                      className={`nb-chip ${active ? "bg-[#FDE68A]" : "bg-white"}`}
                      data-testid={`subject-toggle-${s.id}`}
                    >
                      {active ? "✓ " : ""}{s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button className="nb-btn-primary w-full" data-testid={`${role}-save-btn`}>
            {editing ? "Save subjects" : `Create ${role}`}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmId}
        title={`Remove this ${role}?`}
        message="This will also remove their related attendance, marks and enrollments."
        onCancel={() => setConfirmId(null)}
        onConfirm={del}
        testid={`confirm-delete-${role}`}
      />
    </div>
  );
}

function ConfirmDialog({ open, title, message, onCancel, onConfirm, testid }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] grid place-items-center p-4" onClick={onCancel} data-testid={`${testid}-overlay`}>
      <div className="nb-card-flat w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} data-testid={testid}>
        <div className="nb-label mb-1">Confirm</div>
        <h2 className="font-heading text-3xl mb-2">{title}</h2>
        <p className="text-[#52525B] mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button className="nb-btn-secondary" onClick={onCancel} data-testid={`${testid}-cancel`}>Cancel</button>
          <button className="nb-btn-danger" onClick={onConfirm} data-testid={`${testid}-confirm`}>Yes, delete</button>
        </div>
      </div>
    </div>
  );
}
