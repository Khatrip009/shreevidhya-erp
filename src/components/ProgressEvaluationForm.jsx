import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  X,
  Layers,
  User,
  Calendar,
  TrendingUp,
  Star,
  MessageSquareText,
} from "lucide-react";
import {
  getActiveBatches,
  getStudentsByBatch,
} from "../services/progressService";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";

export default function ProgressEvaluationForm({
  onSubmit,
  onClose,
  initialData = {},
}) {
  const darkLogo = useOrgDarkLogo();
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);

  const [form, setForm] = useState({
    student_id: initialData.student_id || "",
    batch_id: initialData.batch_id || "",
    evaluation_date:
      initialData.evaluation_date || new Date().toISOString().split("T")[0],
    attendance_percentage: initialData.attendance_percentage || "",
    performance_score: initialData.performance_score || "",
    teacher_remarks: initialData.teacher_remarks || "",
  });

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (form.batch_id) {
      loadStudents(form.batch_id);
    } else {
      setStudents([]);
    }
  }, [form.batch_id]);

  async function loadBatches() {
    const data = await getActiveBatches();
    setBatches(data);
  }

  async function loadStudents(batchId) {
    try {
      const data = await getStudentsByBatch(batchId);
      setStudents(data);
    } catch {
      toast.error("Failed to load students");
    }
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.student_id || !form.batch_id || !form.evaluation_date) {
      toast.error("Student, batch, and date are required");
      return;
    }
    const payload = {
      ...form,
      attendance_percentage: form.attendance_percentage
        ? Number(form.attendance_percentage)
        : null,
      performance_score: form.performance_score
        ? Number(form.performance_score)
        : null,
    };
    try {
      await onSubmit(payload);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        {/* Header with logo */}
        <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <img
              src={darkLogo}
              alt="ShreeVidhya Academy"
              className="h-10 w-auto"
            />
            <h2 className="text-xl font-righteous text-primary-dark">
              {initialData.id ? "Edit Evaluation" : "New Evaluation"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-bg rounded-lg transition"
          >
            <X size={20} className="text-secondary-dark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Batch */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Layers size={14} className="inline mr-1" />
              Batch *
            </label>
            <select
              name="batch_id"
              value={form.batch_id}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              required
            >
              <option value="">Select Batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name}
                </option>
              ))}
            </select>
          </div>

          {/* Student */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <User size={14} className="inline mr-1" />
              Student *
            </label>
            <select
              name="student_id"
              value={form.student_id}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              required
              disabled={!form.batch_id}
            >
              <option value="">Select Student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.admission_no})
                </option>
              ))}
            </select>
          </div>

          {/* Evaluation Date */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Calendar size={14} className="inline mr-1" />
              Evaluation Date *
            </label>
            <input
              type="date"
              name="evaluation_date"
              value={form.evaluation_date}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              required
            />
          </div>

          {/* Attendance % and Performance Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <TrendingUp size={14} className="inline mr-1" />
                Attendance %
              </label>
              <input
                type="number"
                name="attendance_percentage"
                placeholder="e.g., 85"
                value={form.attendance_percentage}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Star size={14} className="inline mr-1" />
                Performance Score
              </label>
              <input
                type="number"
                name="performance_score"
                placeholder="e.g., 72"
                value={form.performance_score}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>

          {/* Teacher Remarks */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <MessageSquareText size={14} className="inline mr-1" />
              Teacher Remarks
            </label>
            <textarea
              name="teacher_remarks"
              placeholder="Comments on progress..."
              value={form.teacher_remarks}
              onChange={handleChange}
              rows={3}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat transition flex items-center justify-center gap-2"
            >
              {initialData.id ? "Update Evaluation" : "Save Evaluation"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto border border-secondary-light text-secondary-dark hover:bg-secondary-bg px-6 py-2.5 rounded-lg font-montserrat transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}