import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, formatError } from "../lib/api";
import { toast } from "sonner";
import { BookOpen, CalendarDays, Award, Check, X as XIcon, Plus, Trash2 } from "lucide-react";

export default function TeacherDashboard() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [mode, setMode] = useState("attendance"); // 'attendance' | 'marks'
  
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/teacher/subjects");
        setSubjects(data);
        if (data.length) setSelectedSubject(data[0]);
      } catch (e) { toast.error(formatError(e)); }
    })();
  }, []);
  
  return (
    <Layout subtitle="Teacher" title="Today's class">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3" data-testid="subjects-sidebar">
          <div className="nb-card-flat p-5">
            <div className="nb-label mb-3">Your Subjects</div>
            {subjects.length === 0 ? (
              <div className="text-sm text-[#52525B]">No subjects assigned yet. Ask your admin.</div>
            ) : (
              <ul className="space-y-2">
                {subjects.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedSubject(s)}
                      className={`w-full text-left border border-black rounded-md p-3 transition-all ${
                        selectedSubject?.id === s.id ? "bg-[#FDE68A] shadow-[3px_3px_0_0_#111]" : "bg-white hover:bg-[#FAFAF7]"
                      }`}
                      data-testid={`subject-select-${s.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} />
                        <span className="font-bold">{s.name}</span>
                      </div>
                      <div className="text-xs text-[#52525B] mt-1">{s.code || "—"}</div>
                    </button>
                    
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <section className="lg:col-span-9">
          {!selectedSubject ? (
            <div className="nb-card-flat p-10 text-center text-[#52525B]">Select a subject to begin.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
                <div>
                  <div className="nb-label">Subject</div>
                  <h2 className="font-heading text-4xl">{selectedSubject.name}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode("attendance")}
                    className={`flex items-center gap-2 px-4 py-2 border border-black rounded-md font-bold text-sm ${
                      mode === "attendance" ? "bg-[#111] text-white shadow-[3px_3px_0_0_#111]" : "bg-white"
                    }`}
                    data-testid="mode-attendance-btn"
                  >
                    <CalendarDays size={15} /> Attendance
                  </button>
                  <button
                    onClick={() => setMode("marks")}
                    className={`flex items-center gap-2 px-4 py-2 border border-black rounded-md font-bold text-sm ${
                      mode === "marks" ? "bg-[#111] text-white shadow-[3px_3px_0_0_#111]" : "bg-white"
                    }`}
                    data-testid="mode-marks-btn"
                  >
                    <Award size={15} /> Marks
                  </button>
                  <button
                    onClick={() => setMode("announcement")}
                    className={`flex items-center gap-2 px-4 py-2 border border-black rounded-md font-bold text-sm ${
                      mode === "announcement" ? "bg-[#111] text-white shadow-[3px_3px_0_0_#111]" : "bg-white"
                    }`}
                  >
                    📢 Announcement
                  </button>
                  <button
                  onClick={() => setMode("tests")}
                  className={`flex items-center gap-2 px-4 py-2 border border-black rounded-md font-bold text-sm ${
                    mode === "tests" ? "bg-[#111] text-white shadow-[3px_3px_0_0_#111]" : "bg-white"
                  }`}
                >
                  📝 Tests
                </button>
                </div>
              </div>
              {mode === "attendance" ? (
          <AttendancePanel subject={selectedSubject} />
        ) : mode === "marks" ? (
          <MarksPanel subject={selectedSubject} />
        ) : mode === "announcement" ? (
          <AnnouncementPanel subject={selectedSubject} />
        ) : (
          <TestPanel subject={selectedSubject} />
        )}</>)}
        </section>
      </div>
    </Layout>
  );
}

function AttendancePanel({ subject }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [existing, setExisting] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const [s, a] = await Promise.all([
        api.get(`/teacher/subjects/${subject.id}/students`),
        api.get(`/teacher/attendance?subject_id=${subject.id}`),
      ]);
      setStudents(s.data);
      setExisting(a.data);
      // Preload for this date
      const today = a.data.filter((r) => r.date === date);
      const map = {};
      today.forEach((r) => { map[r.student_id] = r.status; });
      setStatusMap(map);
    } catch (e) { toast.error(formatError(e)); }
  };

  useEffect(() => { load(); }, [subject.id, date]);

  const toggle = (sid, status) => setStatusMap((m) => ({ ...m, [sid]: status }));

  const save = async () => {
    setLoading(true);
    try {
      const records = students.map((st) => ({ student_id: st.id, status: statusMap[st.id] || "absent" }));
      await api.post("/teacher/attendance", { subject_id: subject.id, date, records });
      toast.success("Attendance saved");
      load();
    } catch (e) { toast.error(formatError(e)); } finally { setLoading(false); }
  };

  const dayHistory = existing.reduce((acc, r) => {
    acc[r.date] = acc[r.date] || { p: 0, a: 0 };
    acc[r.date][r.status === "present" ? "p" : "a"]++;
    return acc;
  }, {});
  const dates = Object.keys(dayHistory).sort().reverse().slice(0, 8);

  return (
    <div className="space-y-6" data-testid="attendance-panel">
      <div className="nb-card-flat p-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <label className="nb-label">Date</label>
          <input type="date" className="nb-input" value={date} onChange={(e) => setDate(e.target.value)} data-testid="attendance-date-input" />
        </div>
        <button className="nb-btn-primary" onClick={save} disabled={loading || students.length === 0} data-testid="save-attendance-btn">
          {loading ? "Saving…" : "Save Attendance"}
        </button>
      </div>

      {students.length === 0 ? (
        <div className="nb-card-flat p-10 text-center text-[#52525B]">No students enrolled yet.</div>
      ) : (
        <div className="nb-card-flat p-0 overflow-hidden">
          <table className="nb-table">
            <thead><tr><th>Student</th><th>Attendance</th><th className="text-right">Status</th></tr></thead>
            <tbody>
              {students.map((st) => {
                const s = statusMap[st.id];
                const recs = existing.filter((r) => r.student_id === st.id);
                const pres = recs.filter((r) => r.status === "present").length;
                const pct = recs.length ? Math.round((pres / recs.length) * 100) : null;
                const tone = pct == null ? "bg-[#F4F4F5] text-[#52525B]" :
                             pct >= 75 ? "bg-[#86EFAC]" :
                             pct >= 50 ? "bg-[#FDE68A]" : "bg-[#FCA5A5]";
                return (
                  <tr key={st.id} data-testid={`attendance-row-${st.id}`}>
                    <td>
                      <div className="font-semibold">{st.name}</div>
                      <div className="text-xs text-[#52525B]">{st.email}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold border border-black rounded px-2 py-0.5 text-xs ${tone}`} data-testid={`student-att-pct-${st.id}`}>
                          {pct == null ? "—" : `${pct}%`}
                        </span>
                        <span className="text-xs text-[#52525B]">{pres}/{recs.length}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => toggle(st.id, "present")}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 border border-black rounded-md text-sm font-bold ${
                            s === "present" ? "bg-[#86EFAC] shadow-[2px_2px_0_0_#111]" : "bg-white"
                          }`}
                          data-testid={`present-${st.id}`}
                        >
                          <Check size={14} /> Present
                        </button>
                        <button
                          onClick={() => toggle(st.id, "absent")}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 border border-black rounded-md text-sm font-bold ${
                            s === "absent" ? "bg-[#FCA5A5] shadow-[2px_2px_0_0_#111]" : "bg-white"
                          }`}
                          data-testid={`absent-${st.id}`}
                        >
                          <XIcon size={14} /> Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dates.length > 0 && (
        <div className="nb-card-flat p-5">
          <div className="nb-label mb-3">Recent days</div>
          <div className="flex flex-wrap gap-2">
            {dates.map((d) => (
              <span key={d} className="nb-chip bg-[#FAFAF7]">
                {d} · <span className="text-[#10B981]">{dayHistory[d].p}P</span> / <span className="text-[#EF4444]">{dayHistory[d].a}A</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MarksPanel({ subject }) {
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState([]);
  const [form, setForm] = useState({ student_id: "", exam_type: "Midterm", max_marks: 100, score: 0 });

  const load = async () => {
    try {
      const [s, m] = await Promise.all([
        api.get(`/teacher/subjects/${subject.id}/students`),
        api.get(`/teacher/marks?subject_id=${subject.id}`),
      ]);
      setStudents(s.data);
      setMarks(m.data);
      if (s.data.length && !form.student_id) setForm((f) => ({ ...f, student_id: s.data[0].id }));
    } catch (e) { toast.error(formatError(e)); }
  };

  useEffect(() => { load(); }, [subject.id]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/teacher/marks", { ...form, subject_id: subject.id, max_marks: Number(form.max_marks), score: Number(form.score) });
      toast.success("Mark added");
      setForm((f) => ({ ...f, score: 0 }));
      load();
    } catch (e) { toast.error(formatError(e)); }
  };

  const del = async (id) => {
    try {
      await api.delete(`/teacher/marks/${id}`);
      toast.success("Mark removed");
      load();
    } catch (e) { toast.error(formatError(e)); }
  };

  const studentName = (id) => students.find((s) => s.id === id)?.name || "—";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-testid="marks-panel">
      <form onSubmit={submit} className="nb-card-flat p-5 space-y-3 lg:col-span-1" data-testid="add-mark-form">
        <div className="nb-label">Add a Mark</div>
        <div>
          <label className="nb-label">Student</label>
          <select className="nb-input" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required data-testid="mark-student-select">
            {students.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>
        <div>
          <label className="nb-label">Exam Type</label>
          <select className="nb-input" value={form.exam_type} onChange={(e) => setForm({ ...form, exam_type: e.target.value })} data-testid="mark-exam-type-select">
            <option>Midterm</option>
            <option>Final</option>
            <option>Quiz</option>
            <option>Assignment</option>
            <option>Project</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="nb-label">Score</label>
            <input type="number" step="0.5" min="0" required className="nb-input" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} data-testid="mark-score-input" />
          </div>
          <div>
            <label className="nb-label">Max</label>
            <input type="number" step="0.5" min="1" required className="nb-input" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} data-testid="mark-max-input" />
          </div>
        </div>
        <button className="nb-btn-primary w-full flex items-center justify-center gap-2" disabled={!form.student_id} data-testid="save-mark-btn">
          <Plus size={16} /> Add Mark
        </button>
      </form>

      <div className="nb-card-flat p-5 lg:col-span-2">
        <div className="nb-label mb-3">Recent Marks</div>
        {marks.length === 0 ? (
          <div className="text-sm text-[#52525B]">No marks yet.</div>
        ) : (
          <table className="nb-table">
            <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {marks.slice().reverse().map((m) => (
                <tr key={m.id} data-testid={`mark-row-${m.id}`}>
                  <td className="font-semibold">{studentName(m.student_id)}</td>
                  <td>{m.exam_type}</td>
                  <td><span className="font-bold">{m.score}</span> <span className="text-[#52525B]">/ {m.max_marks}</span></td>
                  <td className="text-[#52525B]">{m.date}</td>
                  <td className="text-right">
                    <button className="nb-btn-danger inline-flex items-center gap-1" onClick={() => del(m.id)} data-testid={`delete-mark-${m.id}`}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
function AnnouncementPanel({ subject }) {
  const [form, setForm] = useState({ title: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  // 🔄 Fetch announcements
  const loadAnnouncements = async () => {
    try {
      const res = await api.get("/teacher/announcements");
      setAnnouncements(res.data);
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  // 📦 Load on mount
  useEffect(() => {
    loadAnnouncements();
  }, []);

  // ➕ Create announcement
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/teacher/announcements", {
        ...form,
        subject_id: subject?.id || null
      });
      toast.success("Announcement posted");
      setForm({ title: "", message: "" });

      loadAnnouncements(); // refresh
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setLoading(false);
    }
  };

  // 🗑 Delete announcement
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;

    try {
      await api.delete(`/teacher/announcements/${id}`);
      toast.success("Deleted");

      loadAnnouncements(); // refresh
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  return (
    <div className="space-y-6">

      {/* 📢 CREATE FORM */}
      <form onSubmit={submit} className="nb-card-flat p-5 space-y-3">
        <div className="text-xs text-gray-500">
          Posting for: {subject?.name || "All Subjects"}
        </div>

        <div className="nb-label">New Announcement</div>

        <input
          className="nb-input"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />

        <textarea
          className="nb-input"
          placeholder="Message"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />

        <button className="nb-btn-primary w-full" disabled={loading}>
          {loading ? "Posting..." : "Post Announcement"}
        </button>
      </form>

      {/* 📜 ANNOUNCEMENT LIST */}
      <div className="nb-card-flat p-5">
        <div className="nb-label mb-3">Your Announcements</div>

        {announcements.length === 0 ? (
          <div className="text-sm text-[#52525B]">No announcements yet.</div>
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="border border-black rounded-md p-3 bg-white">

                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold">{a.title}</div>
                    <div className="text-sm text-[#52525B]">{a.message}</div>
                  </div>

                  {/* 🗑 DELETE BUTTON */}
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-red-500 text-xs font-bold border border-red-500 px-2 py-1 rounded hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>

                <div className="text-xs text-gray-400 mt-2 flex justify-between">
                  <span>{a.created_at}</span>
                  {a.subject_id ? (
                    <span className="text-blue-500">Subject</span>
                  ) : (
                    <span className="text-green-500">Global</span>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function TestPanel({ subject }) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [tests, setTests] = useState([]);

  // 🔹 question states
  const [selectedTest, setSelectedTest] = useState(null);
  const [qText, setQText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState(0);

  // 🔹 submissions
  const [subs, setSubs] = useState([]);

  // ================= LOAD TESTS =================
  const loadTests = async () => {
    try {
      const res = await api.get("/teacher/tests");
      setTests(res.data);
    } catch (e) {
      toast.error("Failed to load tests");
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  // ================= CREATE TEST =================
  const createTest = async () => {
    try {
      await api.post("/teacher/tests", {
        title,
        subject_id: subject.id,
        duration: Number(duration)
      });

      toast.success("Test created");
      setTitle("");
      loadTests();
    } catch (e) {
      toast.error("Failed to create test");
    }
  };

  // ================= ADD QUESTION =================
  const addQuestion = async () => {
    try {
      await api.post(`/teacher/tests/${selectedTest}/questions`, {
        type: "MCQ",
        question_text: qText,
        options,
        correct_option: correct,
        marks: 5
      });

      toast.success("Question added");

      setQText("");
      setOptions(["", "", "", ""]);
      setCorrect(0);
    } catch (e) {
      toast.error("Failed to add question");
    }
  };

  // ================= LOAD SUBMISSIONS =================
  const loadSubs = async (testId) => {
    try {
      const res = await api.get(`/teacher/tests/${testId}/submissions`);
      setSubs(res.data);
    } catch (e) {
      toast.error("Failed to load submissions");
    }
  };

  // ================= EVALUATE =================
  const evaluate = async (submissionId) => {
    const marks = prompt("Enter marks");

    if (!marks) return;

    try {
      await api.post(`/teacher/submissions/${submissionId}/evaluate`, {
        marks: Number(marks)
      });

      toast.success("Evaluated");
    } catch (e) {
      toast.error("Evaluation failed");
    }
  };

  return (
    <div className="space-y-6">

      {/* ================= CREATE TEST ================= */}
      <div className="nb-card-flat p-5 space-y-3">
        <div className="nb-label">Create Test</div>

        <input
          className="nb-input"
          placeholder="Test title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          type="number"
          className="nb-input"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />

        <button className="nb-btn-primary" onClick={createTest}>
          Create
        </button>
      </div>

      {/* ================= TEST LIST ================= */}
      <div className="nb-card-flat p-5">
        <div className="nb-label mb-3">Your Tests</div>

        {tests.map(t => (
          <div key={t.id} className="border p-3 mb-3 space-y-2">
            <div className="font-bold">{t.title}</div>
            <div className="text-sm">Duration: {t.duration} min</div>

            <div className="flex gap-2">
              <button onClick={() => setSelectedTest(t.id)}>
                ➕ Add Questions
              </button>

              <button onClick={() => loadSubs(t.id)}>
                📄 View Submissions
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ================= ADD QUESTION ================= */}
      {selectedTest && (
        <div className="nb-card-flat p-5 space-y-2">
          <div className="nb-label">Add Question</div>

          <input
            className="nb-input"
            placeholder="Question"
            value={qText}
            onChange={(e) => setQText(e.target.value)}
          />

          {options.map((opt, i) => (
            <input
              key={i}
              className="nb-input"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const newOpts = [...options];
                newOpts[i] = e.target.value;
                setOptions(newOpts);
              }}
            />
          ))}

          <input
            type="number"
            className="nb-input"
            value={correct}
            onChange={(e) => setCorrect(Number(e.target.value))}
            placeholder="Correct option index (0-3)"
          />

          <button className="nb-btn-primary" onClick={addQuestion}>
            Add Question
          </button>
        </div>
      )}

      {/* ================= SUBMISSIONS ================= */}
      {subs.length > 0 && (
        <div className="nb-card-flat p-5 space-y-2">
          <div className="nb-label">Submissions</div>

          {subs.map(s => (
            <div key={s.id} className="border p-3 flex justify-between items-center">
              <div className="space-y-1">
              <div className="font-semibold">👨‍🎓 Student: {s.student_id}</div>

              <div className="text-sm text-gray-600">
                Submitted: {s.submitted_at ? "✅ Yes" : "❌ Not yet"}
              </div>

              <div className="text-sm text-gray-600">
                Evaluated: {s.evaluated ? "✅ Done" : "⏳ Pending"}
              </div>

              {s.total_marks !== undefined && (
                <div className="text-sm font-bold text-green-700">
                  Marks: {s.total_marks}
                </div>

              )}
              {s.answers?.map((a, i) => (
              <div key={i} className="text-xs text-gray-500">
                Q: {a.question_id} → Option: {a.selected_option}
              </div>
            ))}
            </div>
              <button onClick={() => evaluate(s.id)}>
                📝 Evaluate
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
