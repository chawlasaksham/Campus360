import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

function TestPage() {
  const { testId } = useParams();

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [duration, setDuration] = useState(30);
  const [submitted, setSubmitted] = useState(false);
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState(duration * 60);
  // 🔹 Load questions
  useEffect(() => {
    api.get(`/tests/${testId}/questions`)
      .then(res => setQuestions(res.data));
  }, [testId]);

  useEffect(() => {
    if (submitted) return;

    const interval = setInterval(() => {
        setTimeLeft(prev => {
        if (prev <= 1) {
            handleSubmit();
            return 0;
        }
        return prev - 1;
        });
    }, 1000);

    return () => clearInterval(interval);
    }, [submitted]);

  // 🔹 Get duration from backend
  useEffect(() => {
    api.get(`/student/tests`).then(res => {
      const t = res.data.find(x => x.id === testId);
      if (t) setDuration(t.duration);
    });
  }, [testId]);

  // 🔹 Timer auto submit
  useEffect(() => {
    if (submitted) return;

    const timer = setTimeout(() => {
      handleSubmit();
    }, duration * 60 * 1000);

    return () => clearTimeout(timer);
  }, [duration, submitted]);

  // 🔹 Select answer
  const selectOption = (qid, optionIndex) => {
    setAnswers(prev => [
      ...prev.filter(a => a.question_id !== qid),
      { question_id: qid, selected_option: optionIndex }
    ]);
  };

  // 🔹 Submit function
  const handleSubmit = async () => {
    if (submitted) return;

    try {
      await api.post(`/student/tests/${testId}/submit`, {
        answers
      });

      setSubmitted(true);
      alert("Submitted!");
      navigate("/student");
    } catch (e) {
      console.error(e);
      alert("Error submitting test");
    }
  };

  return (
  <div className="min-h-screen bg-gray-50 p-6">
    <div className="max-w-4xl mx-auto">
        <div className="text-sm text-gray-600">
        ⏱ Time left: {Math.floor(timeLeft / 60)}:
        {String(timeLeft % 60).padStart(2, "0")}
        </div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📝 Test</h2>
        <button
          onClick={handleSubmit}
          disabled={submitted}
          className="bg-red-500 text-white px-4 py-2 rounded-md"
        >
          Submit
        </button>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {questions.map((q, index) => {
          const selected = answers.find(a => a.question_id === q.id)?.selected_option;

          return (
            <div key={q.id} className="bg-white p-5 rounded-lg shadow">
              <p className="font-semibold mb-3">
                Q{index + 1}. {q.question_text}
              </p>

              <div className="grid gap-2">
                {q.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => selectOption(q.id, i)}
                    className={`text-left p-3 rounded border ${
                      selected === i
                        ? "bg-yellow-200 border-yellow-500"
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);}

export default TestPage;