import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  X, Users, BookOpen, Calendar, Layers, Plus, Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getOrganization } from "../services/organizationService";
import { getCourseOptions, getTeacherOptions, getMediumOptions } from "../services/batchService";
import { supabase } from "../api/supabase";
import { useAuth } from "../context/AuthContext";

export default function BatchForm({ onSubmit, onClose, initialData = {} }) {
  const darkLogo = useQuery({ queryKey: ["organization"], queryFn: getOrganization })
    .data?.logo_dark_url || "/ShreeVidhyaDark.png";

  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  // ---- Basic batch fields ----
  const [form, setForm] = useState({
    course_id: initialData.course_id || "",
    batch_name: initialData.batch_name || "",
    start_date: initialData.start_date || "",
    end_date: initialData.end_date || "",
    days: initialData.days || "",
    start_time: initialData.start_time || "",
    end_time: initialData.end_time || "",
    capacity: initialData.capacity || "",
    status: initialData.status || "active",
    medium_id: initialData.medium_id || "",      // NEW
  });

  // ---- Teacher-Subject-Day assignments ----
  const [assignments, setAssignments] = useState([]);

  const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Dropdown data
  const { data: courses = [] } = useQuery({
    queryKey: ["courses-dropdown"],
    queryFn: getCourseOptions,
    staleTime: 10 * 60 * 1000,
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-dropdown"],
    queryFn: getTeacherOptions,
    staleTime: 10 * 60 * 1000,
  });

  // Mediums – NEW
  const { data: mediums = [] } = useQuery({
    queryKey: ["mediums-dropdown"],
    queryFn: getMediumOptions,
    staleTime: 10 * 60 * 1000,
  });

  // Subjects for selected course
  const [subjects, setSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  useEffect(() => {
    if (!form.course_id) {
      setSubjects([]);
      return;
    }
    setLoadingSubjects(true);
    supabase
      .from("subjects")
      .select("id, subject_name")
      .eq("course_id", form.course_id)
      .order("subject_name")
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load subjects");
          setSubjects([]);
        } else {
          setSubjects(data || []);
        }
      })
      .finally(() => setLoadingSubjects(false));
  }, [form.course_id]);

  // Load existing assignments when editing
  useEffect(() => {
    if (initialData.id) {
      supabase
        .from("batch_teachers")
        .select("id, teacher_id, subject_id, day")
        .eq("batch_id", initialData.id)
        .then(({ data }) => {
          if (data) {
            setAssignments(
              data.map((row) => ({
                id: row.id,
                teacher_id: row.teacher_id,
                subject_id: row.subject_id,
                day: row.day || "",
              }))
            );
          }
        });
    }
  }, [initialData.id]);

  // ---- Handlers ----
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function addAssignment() {
    setAssignments((prev) => [
      ...prev,
      { teacher_id: "", subject_id: "", day: "" },
    ]);
  }

  function updateAssignment(index, field, value) {
    setAssignments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function removeAssignment(index) {
    setAssignments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.batch_name || !form.course_id) {
      toast.error("Batch name and course are required");
      return;
    }

    const payload = {
      ...form,
      capacity: form.capacity ? Number(form.capacity) : null,
      medium_id: form.medium_id || null,    // NEW
      teacher_subjects: assignments.map((a) => ({
        teacher_id: a.teacher_id || null,
        subject_id: a.subject_id || null,
        day: a.day || null,
      })),
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <img src={darkLogo} alt="ShreeVidhya Academy" className="h-10 w-auto" />
            <h2 className="text-xl font-righteous text-primary-dark">
              {initialData.id ? "Edit Batch" : "New Batch"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary-bg rounded-lg transition">
            <X size={20} className="text-secondary-dark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Course, Batch Name, Medium */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <BookOpen size={14} className="inline mr-1" />
                Course *
              </label>
              <select
                name="course_id"
                value={form.course_id}
                onChange={handleChange}
                required
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Layers size={14} className="inline mr-1" />
                Batch Name *
              </label>
              <input
                name="batch_name"
                value={form.batch_name}
                onChange={handleChange}
                placeholder="e.g., Morning Batch"
                required
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              />
            </div>
            {/* Medium Dropdown – NEW */}
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Layers size={14} className="inline mr-1" />
                Medium *
              </label>
              <select
                name="medium_id"
                value={form.medium_id}
                onChange={handleChange}
                required
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="">Select Medium</option>
                {mediums.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates, Times, Days, Capacity, Status – unchanged */}
          {/* ... (keep all existing fields) ... */}

          {/* Teacher-Subject-Day Assignments Section – unchanged */}
          {/* ... (keep all existing logic) ... */}

          {/* Buttons – unchanged */}
          {/* ... */}
        </form>
      </div>
    </div>
  );
}