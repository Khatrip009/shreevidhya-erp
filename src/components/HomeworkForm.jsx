import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  X, Layers, BookOpen, FileText, AlignLeft, Calendar, Link2, User, Upload, File,
} from "lucide-react";
import {
  getBatchOptions,
  getSubjectsByCourse,
  getTeacherOptions,
  getMediumOptions,
} from "../services/homeworkService";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrganizationContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../api/supabase";

export default function HomeworkForm({ onSubmit, onClose, initialData = {} }) {
  const darkLogo = useOrgDarkLogo();
  const { user, profile } = useAuth();
  const { branch, selectedFinancialYear } = useOrg();
  const theme = useTheme();
  const branchId = branch?.id;
  const financialYearId = selectedFinancialYear?.id;

  const headingFont = theme?.font_heading || "Righteous";
  const bodyFont = theme?.font_body || "Montserrat";

  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingTeacherId, setLoadingTeacherId] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    batch_id: initialData.batch_id || "",
    subject_id: initialData.subject_id || "",
    title: initialData.title || "",
    description: initialData.description || "",
    assigned_date:
      initialData.assigned_date || new Date().toISOString().split("T")[0],
    due_date: initialData.due_date || "",
    attachment_url: initialData.attachment_url || "",
    created_by: initialData.created_by || "",
  });

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  // Load dropdowns when branch/FY are ready
  useEffect(() => {
    if (!branchId || !financialYearId) return;
    loadDropdowns();
    autoSetTeacher();
  }, [branchId, financialYearId]);

  // Fetch subjects whenever batch_id changes
  useEffect(() => {
    if (!form.batch_id || !branchId || !financialYearId) {
      setSubjects([]);
      return;
    }

    async function fetchSubjects() {
      setLoadingSubjects(true);
      try {
        const { data: batchData, error: batchError } = await supabase
          .from("batches")
          .select("course_id")
          .eq("id", form.batch_id)
          .eq("branch_id", branchId)
          .eq("financial_year_id", financialYearId)
          .maybeSingle();

        if (batchError) throw batchError;
        if (!batchData || !batchData.course_id) {
          setSubjects([]);
          return;
        }

        const subj = await getSubjectsByCourse(
          batchData.course_id,
          branchId,
          financialYearId
        );
        setSubjects(subj);
      } catch (err) {
        console.error("Failed to load subjects:", err);
        toast.error("Failed to load subjects");
        setSubjects([]);
      } finally {
        setLoadingSubjects(false);
      }
    }

    fetchSubjects();
  }, [form.batch_id, branchId, financialYearId]);

  async function autoSetTeacher() {
    if (isAdmin || !user?.id || !branchId || !financialYearId) return;
    try {
      setLoadingTeacherId(true);
      const { data: teacherData } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .eq("branch_id", branchId)
        .eq("financial_year_id", financialYearId)
        .maybeSingle();
      if (teacherData?.id) {
        setForm((prev) => ({ ...prev, created_by: teacherData.id }));
      }
    } catch (err) {
      console.error("Failed to auto-set teacher ID", err);
    } finally {
      setLoadingTeacherId(false);
    }
  }

  async function loadDropdowns() {
    try {
      const [batchData, teacherData] = await Promise.all([
        getBatchOptions(branchId, financialYearId),
        getTeacherOptions(branchId, financialYearId),
      ]);
      setBatches(batchData);
      setTeachers(teacherData);
    } catch {
      toast.error("Failed to load form data");
    }
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  // Handle file upload
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const filePath = `homework-attachments/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from("ShreeVidhya_Academy")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from("ShreeVidhya_Academy")
        .getPublicUrl(filePath);
      const url = publicUrlData.publicUrl;
      setForm((prev) => ({ ...prev, attachment_url: url }));
      toast.success("File uploaded");
    } catch (err) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  function clearAttachment() {
    setForm((prev) => ({ ...prev, attachment_url: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.batch_id || !form.subject_id || !form.title || !form.assigned_date) {
      toast.error("Batch, subject, title, and assigned date are required");
      return;
    }
    try {
      const context = { branchId, financialYearId };
      await onSubmit({ ...form, created_by: form.created_by || null }, context);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto border border-primary-bg">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-primary-bg px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <img
              src={darkLogo}
              alt="ShreeVidhya Academy"
              className="h-10 w-auto"
            />
            <h2
              className="text-xl font-bold text-primary"
              style={{ fontFamily: headingFont }}
            >
              {initialData.id ? "Edit Homework" : "New Homework"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-bg rounded-lg transition"
          >
            <X size={20} className="text-primary-dark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Batch & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                className="block text-sm text-primary-dark mb-1"
                style={{ fontFamily: bodyFont }}
              >
                <Layers size={14} className="inline mr-1" />
                Batch *
              </label>
              <select
                name="batch_id"
                value={form.batch_id}
                onChange={handleChange}
                className="w-full border border-primary-bg bg-white text-primary-dark rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                required
                style={{ fontFamily: bodyFont }}
              >
                <option value="">Select Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batch_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-sm text-primary-dark mb-1"
                style={{ fontFamily: bodyFont }}
              >
                <BookOpen size={14} className="inline mr-1" />
                Subject *
              </label>
              <select
                name="subject_id"
                value={form.subject_id}
                onChange={handleChange}
                className="w-full border border-primary-bg bg-white text-primary-dark rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                required
                disabled={!form.batch_id || loadingSubjects}
                style={{ fontFamily: bodyFont }}
              >
                <option value="">
                  {loadingSubjects
                    ? "Loading subjects..."
                    : "Select Subject"}
                </option>
                {!loadingSubjects &&
                  subjects.length === 0 &&
                  form.batch_id && (
                    <option value="" disabled>
                      No subjects found for this batch.
                    </option>
                  )}
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subject_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              className="block text-sm text-primary-dark mb-1"
              style={{ fontFamily: bodyFont }}
            >
              <FileText size={14} className="inline mr-1" />
              Title *
            </label>
            <input
              name="title"
              placeholder="Homework title"
              value={form.title}
              onChange={handleChange}
              className="w-full border border-primary-bg bg-white text-primary-dark rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-primary-dark/40"
              required
              style={{ fontFamily: bodyFont }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className="block text-sm text-primary-dark mb-1"
              style={{ fontFamily: bodyFont }}
            >
              <AlignLeft size={14} className="inline mr-1" />
              Description
            </label>
            <textarea
              name="description"
              placeholder="Detailed instructions"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full border border-primary-bg bg-white text-primary-dark rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-primary-dark/40 resize-none"
              style={{ fontFamily: bodyFont }}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                className="block text-sm text-primary-dark mb-1"
                style={{ fontFamily: bodyFont }}
              >
                <Calendar size={14} className="inline mr-1" />
                Assigned Date *
              </label>
              <input
                type="date"
                name="assigned_date"
                value={form.assigned_date}
                onChange={handleChange}
                className="w-full border border-primary-bg bg-white text-primary-dark rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                required
              />
            </div>
            <div>
              <label
                className="block text-sm text-primary-dark mb-1"
                style={{ fontFamily: bodyFont }}
              >
                <Calendar size={14} className="inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                name="due_date"
                value={form.due_date}
                onChange={handleChange}
                className="w-full border border-primary-bg bg-white text-primary-dark rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Attachment – file upload */}
          <div>
            <label
              className="block text-sm text-primary-dark mb-1"
              style={{ fontFamily: bodyFont }}
            >
              <Link2 size={14} className="inline mr-1" />
              Attachment
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 border border-primary-bg bg-white text-primary-dark rounded-lg hover:bg-primary-bg transition text-sm"
                style={{ fontFamily: bodyFont }}
              >
                <Upload size={16} />
                {uploading ? "Uploading..." : "Choose File"}
              </button>
              {form.attachment_url && (
                <div className="flex items-center gap-2 text-sm text-primary-dark">
                  <a
                    href={form.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline flex items-center gap-1"
                  >
                    <File size={14} /> View file
                  </a>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="text-accent-dark hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Teacher */}
          {isAdmin ? (
            <div>
              <label
                className="block text-sm text-primary-dark mb-1"
                style={{ fontFamily: bodyFont }}
              >
                <User size={14} className="inline mr-1" />
                Assigned Teacher
              </label>
              <select
                name="created_by"
                value={form.created_by}
                onChange={handleChange}
                className="w-full border border-primary-bg bg-white text-primary-dark rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                style={{ fontFamily: bodyFont }}
              >
                <option value="">Optional</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.first_name} {t.last_name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input
              type="hidden"
              name="created_by"
              value={form.created_by || ""}
            />
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
            <button
              type="submit"
              disabled={loadingTeacherId || loadingSubjects}
              className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg transition flex items-center justify-center gap-2"
              style={{ fontFamily: bodyFont }}
            >
              {initialData.id ? "Update Homework" : "Create Homework"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto border border-primary-bg text-primary-dark hover:bg-primary-bg px-6 py-2.5 rounded-lg transition"
              style={{ fontFamily: bodyFont }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}