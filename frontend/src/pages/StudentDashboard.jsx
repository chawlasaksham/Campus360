import React, { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { api, formatError } from "../lib/api";
import { toast } from "sonner";
import { BookOpen, CalendarDays, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function StudentDashboard() {
  const [subjects, setSubjects] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [tests, setTests] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    api.get("/student/tests").then(res => setTests(res.data));
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const [s, a, m, ann] = await Promise.all([
          api.get("/student/subjects"),
          api.get("/student/attendance"),
          api.get("/student/marks"),
          api.get("/student/announcements"),
        ]);

        setSubjects(s.data);
        setAttendance(a.data);
        setMarks(m.data);
        setAnnouncements(ann.data);
        if (s.data.length) setSelected(s.data[0]);
      } catch (e) { toast.error(formatError(e)); }
    })();
  }, []);

  const overallAttendance = useMemo(() => {
    if (attendance.length === 0) return 0;
    const p = attendance.filter((r) => r.status === "present").length;
    return Math.round((p / attendance.length) * 100);
  }, [attendance]);

  const subjectAttPct = useMemo(() => {
    const map = {};
    subjects.forEach((s) => {
      const recs = attendance.filter((a) => a.subject_id === s.id);
      const p = recs.filter((r) => r.status === "present").length;
      map[s.id] = { total: recs.length, present: p, pct: recs.length ? Math.round((p / recs.length) * 100) : null };
    });
    return map;
  }, [subjects, attendance]);

  const subjectAtt = attendance.filter((a) => a.subject_id === selected?.id);
  const subjectMarks = marks.filter((m) => m.subject_id === selected?.id);
  const startTest = async (testId) => {
  try {
    await api.post(`/student/tests/${testId}/start`);
    navigate(`/test/${testId}`);
  } catch (e) {
    if (e.response?.status === 400) {
      alert("You already attempted this test");
    } else {
      alert("Something went wrong");
    }
  }
};
  const att = useMemo(() => {
    const p = subjectAtt.filter((r) => r.status === "present").length;
    const a = subjectAtt.filter((r) => r.status === "absent").length;
    const pct = subjectAtt.length ? Math.round((p / subjectAtt.length) * 100) : 0;
    return { p, a, pct, total: subjectAtt.length };
  }, [subjectAtt]);

  return (
    <Layout subtitle="Student" title="Your progress">
      <div className="nb-card-flat p-5 mb-6">
      <div className="nb-label mb-3">📝 Tests</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tests.map(t => (
          <div key={t.id} className="border border-black rounded-md p-4 bg-white flex justify-between items-center">
            <div>
              <div className="font-bold">{t.title}</div>
              <div className="text-sm text-gray-500">
                Duration: {t.duration} mins
              </div>
            </div>

            <button
              onClick={() => startTest(t.id)}
              className="bg-black text-white px-4 py-2 rounded-md hover:scale-105 transition"
            >
              Start
            </button>
          </div>
        ))}
      </div>
    </div>
      <div className="nb-card-flat p-5 mb-6">
  <div className="nb-label mb-3">📢 Announcements</div>

  {announcements.length === 0 ? (
    <div className="text-sm text-[#52525B]">No announcements yet.</div>
        ) : (
          <div className="space-y-3">
            {announcements.slice(0, 5).map((a) => (
              <div key={a.id} className="border border-black rounded-md p-3 bg-white">
                <div className="font-bold">{a.title}</div>
                <div className="text-sm text-[#52525B]">{a.message}</div>
                <div className="text-xs text-gray-400 mt-1">{a.created_at}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="nb-card p-6 bg-[#FDE68A]" data-testid="stat-subjects">
          <div className="nb-label">Subjects</div>
          <div className="font-heading text-5xl mt-1">{subjects.length}</div>
        </div>
        <div className="nb-card p-6 bg-[#E8F5E9]" data-testid="stat-attendance">
          <div className="nb-label">Overall Attendance</div>
          <div className="font-heading text-5xl mt-1">{overallAttendance}%</div>
        </div>
        <div className="nb-card p-6 bg-[#BAE6FD]" data-testid="stat-marks">
          <div className="nb-label">Marks Entries</div>
          <div className="font-heading text-5xl mt-1">{marks.length}</div>
        </div>
      </div>

      {subjects.length > 0 && (
        <div className="nb-card-flat p-5 mb-8" data-testid="att-summary-card">
          <div className="nb-label mb-3">Attendance by subject</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((s) => {
              const ap = subjectAttPct[s.id];
              const pct = ap?.pct;
              const fillColor = pct == null ? "#E4E4E7" : pct >= 75 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";
              const fillWidth = pct == null ? 0 : pct;
              return (
                <div key={s.id} className="border border-black rounded-md p-3 bg-white" data-testid={`att-summary-${s.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold truncate" title={s.name}>{s.name}</span>
                    <span className="font-heading text-2xl leading-none">{pct == null ? "—" : `${pct}%`}</span>
                  </div>
                  <div className="h-2 w-full border border-black rounded-sm bg-[#FAFAF7] overflow-hidden">
                    <div style={{ width: `${fillWidth}%`, background: fillColor }} className="h-full transition-all" />
                  </div>
                  <div className="text-xs text-[#52525B] mt-2">
                    {ap?.total ? `${ap.present}/${ap.total} present` : "No attendance recorded"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="nb-card-flat p-10 text-center text-[#52525B]">You aren't enrolled in any subjects yet.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <div className="nb-card-flat p-5">
              <div className="nb-label mb-3">Subjects</div>
              <ul className="space-y-2">
                {subjects.map((s) => {
                  const ap = subjectAttPct[s.id];
                  const tone = ap?.pct == null ? "bg-[#F4F4F5] text-[#52525B]" :
                               ap.pct >= 75 ? "bg-[#86EFAC]" :
                               ap.pct >= 50 ? "bg-[#FDE68A]" : "bg-[#FCA5A5]";
                  return (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelected(s)}
                      className={`w-full text-left border border-black rounded-md p-3 transition-all ${
                        selected?.id === s.id ? "bg-[#FDE68A] shadow-[3px_3px_0_0_#111]" : "bg-white hover:bg-[#FAFAF7]"
                      }`}
                      data-testid={`student-subject-${s.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <BookOpen size={14} />
                          <span className="font-bold truncate">{s.name}</span>
                        </div>
                        <span className={`text-[11px] font-bold border border-black rounded px-1.5 py-0.5 ${tone}`} data-testid={`subject-att-pct-${s.id}`}>
                          {ap?.pct == null ? "—" : `${ap.pct}%`}
                        </span>
                      </div>
                      <div className="text-xs text-[#52525B] mt-1">
                        {s.code || "—"} · {ap?.total || 0} {ap?.total === 1 ? "day" : "days"}
                      </div>
                    </button>
                  </li>
                );})}
              </ul>
            </div>
          </aside>

          <section className="lg:col-span-9 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="nb-card p-5">
                <div className="nb-label">Attendance</div>
                <div className="font-heading text-4xl">{att.pct}%</div>
                <div className="text-xs text-[#52525B]">{att.p} present / {att.a} absent / {att.total} days</div>
              </div>
              <div className="nb-card p-5 bg-[#E8F5E9]">
                <div className="nb-label">Exams recorded</div>
                <div className="font-heading text-4xl">{subjectMarks.length}</div>
              </div>
              <div className="nb-card p-5 bg-[#BAE6FD]">
                <div className="nb-label">Average</div>
                <div className="font-heading text-4xl">
                  {subjectMarks.length ? Math.round(subjectMarks.reduce((acc, m) => acc + (m.score / m.max_marks) * 100, 0) / subjectMarks.length) + "%" : "—"}
                </div>
              </div>
            </div>

            <div className="nb-card-flat p-5">
              <div className="flex items-center gap-2 mb-4"><CalendarDays size={18} /><h3 className="font-heading text-2xl">Attendance history</h3></div>
              {subjectAtt.length === 0 ? (
                <div className="text-sm text-[#52525B]">No attendance recorded yet.</div>
              ) : (
                <table className="nb-table">
                  <thead><tr><th>Date</th><th>Status</th></tr></thead>
                  <tbody>
                    {subjectAtt.slice().sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
                      <tr key={r.id} data-testid={`att-history-${r.id}`}>
                        <td>{r.date}</td>
                        <td>
                          <span className={`nb-chip ${r.status === "present" ? "bg-[#86EFAC]" : "bg-[#FCA5A5]"}`}>{r.status.toUpperCase()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="nb-card-flat p-5">
              <div className="flex items-center gap-2 mb-4"><Award size={18} /><h3 className="font-heading text-2xl">Marks</h3></div>
              {subjectMarks.length === 0 ? (
                <div className="text-sm text-[#52525B]">No marks yet.</div>
              ) : (
                <table className="nb-table">
                  <thead><tr><th>Exam</th><th>Score</th><th>%</th><th>Date</th></tr></thead>
                  <tbody>
                    {subjectMarks.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((m) => (
                      <tr key={m.id} data-testid={`marks-history-${m.id}`}>
                        <td className="font-semibold">{m.exam_type}</td>
                        <td><span className="font-bold">{m.score}</span> <span className="text-[#52525B]">/ {m.max_marks}</span></td>
                        <td>{Math.round((m.score / m.max_marks) * 100)}%</td>
                        <td className="text-[#52525B]">{m.date || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      )}
    </Layout>
  );
}
