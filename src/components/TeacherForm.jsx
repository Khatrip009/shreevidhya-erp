// src/components/TeacherForm.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../api/supabase";
import toast from "react-hot-toast";
import {
  X,
  User,
  Mail,
  Lock,
  Briefcase,
  Phone,
  BookOpen,
  Layers,
  GraduationCap,
  BookMarked,
} from "lucide-react";
import {
  getCourseLevelOptions,
  getSubjectOptions,
} from "../services/teacherService";

export default function TeacherForm({ initialData = null, onSubmit, onClose }) {
  const isEdit = !!initialData;

  // Build initial form state – ensure course_ids are derived from levels/subjects if needed
  const getInitialCourseIds = () => {
    if (initialData?.course_ids?.length) return initialData.course_ids;
    // If no course_ids but we have levels/subjects, infer courses from them
    const levelCourseIds = (initialData?.course_levels || []).map(cl => cl.course_id).filter(Boolean);
    const subjectCourseIds = (initialData?.subjects || []).map(s => s.course_id).filter(Boolean);
    const all = [...levelCourseIds, ...subjectCourseIds];
    return [...new Set(all)];
  };

  const [form, setForm] = useState({
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    email: initialData?.email || "",
    password: "",
    employee_code: initialData?.employee_code || "",
    mobile: initialData?.mobile || "",
    qualification: initialData?.qualification || "",
    joining_date: initialData?.joining_date || "",
    salary: initialData?.salary || "",
    status: initialData?.status || "active",
    medium_ids: initialData?.mediums?.map((m) => m.id) || [],
    course_ids: getInitialCourseIds(),
    course_level_ids: initialData?.course_levels?.map((cl) => cl.id) || [],
    subject_ids: initialData?.subjects?.map((s) => s.id) || [],
  });

  const [mediums, setMediums] = useState([]);
  const [courses, setCourses] = useState([]);
  const [allCourseLevels, setAllCourseLevels] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch dropdown options
  useEffect(() => {
    const fetchData = async () => {
      const [mediumRes, courseRes, levelRes, subjectRes] = await Promise.all([
        supabase.from("mediums").select("id, name").order("name"),
        supabase.from("courses").select("id, course_name").order("course_name"),
        getCourseLevelOptions(),
        getSubjectOptions(),
      ]);
      setMediums(mediumRes.data || []);
      setCourses(courseRes.data || []);
      setAllCourseLevels(levelRes || []);
      setAllSubjects(subjectRes || []);
    };
    fetchData();
  }, []);

  // Filter levels and subjects based on selected courses
  const filteredCourseLevels = allCourseLevels.filter(
    (cl) => !form.course_ids || form.course_ids.length === 0 || (cl.course_id && form.course_ids.includes(cl.course_id))
  );
  const filteredSubjects = allSubjects.filter(
    (s) => !form.course_ids || form.course_ids.length === 0 || (s.course_id && form.course_ids.includes(s.course_id))
  );

  // When course selection changes, remove orphaned levels/subjects
  useEffect(() => {
    if (form.course_ids && form.course_ids.length > 0) {
      const validLevelIds = allCourseLevels
        .filter((cl) => form.course_ids.includes(cl.course_id))
        .map((cl) => cl.id);
      const validSubjectIds = allSubjects
        .filter((s) => form.course_ids.includes(s.course_id))
        .map((s) => s.id);

      setForm((prev) => ({
        ...prev,
        course_level_ids: prev.course_level_ids.filter((id) => validLevelIds.includes(id)),
        subject_ids: prev.subject_ids.filter((id) => validSubjectIds.includes(id)),
      }));
    } else {
      // No courses selected → clear levels and subjects
      setForm((prev) => ({
        ...prev,
        course_level_ids: [],
        subject_ids: [],
      }));
    }
  }, [form.course_ids, allCourseLevels, allSubjects]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      const arrayName = name;
      setForm((prev) => {
        const current = prev[arrayName] || [];
        if (checked) {
          return { ...prev, [arrayName]: [...current, Number(value)] };
        } else {
          return { ...prev, [arrayName]: current.filter((id) => id !== Number(value)) };
        }
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-righteous text-primary-dark">
            {isEdit ? "Edit Teacher" : "Add New Teacher"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary-bg rounded-lg">
            <X size={20} className="text-secondary-dark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Basic fields (unchanged) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <User size={14} className="inline mr-1" /> First Name *
              </label>
              <input
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Briefcase size={14} className="inline mr-1" /> Employee Code
            </label>
            <input
              type="text"
              name="employee_code"
              value={form.employee_code}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Phone size={14} className="inline mr-1" /> Mobile
            </label>
            <input
              type="text"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Mail size={14} className="inline mr-1" /> Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Lock size={14} className="inline mr-1" /> Password {!isEdit && "*"}
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required={!isEdit}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">Qualification</label>
            <input
              type="text"
              name="qualification"
              value={form.qualification}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">Joining Date</label>
              <input
                type="date"
                name="joining_date"
                value={form.joining_date}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">Salary</label>
              <input
                type="number"
                name="salary"
                value={form.salary}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* ===== MULTI‑SELECT: MEDIUMS ===== */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-2">
              <Layers size={14} className="inline mr-1" /> Assigned Mediums
            </label>
            <div className="flex flex-wrap gap-3 p-3 border border-secondary-light rounded-lg bg-gray-50">
              {mediums.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="medium_ids"
                    value={m.id}
                    checked={form.medium_ids?.includes(m.id)}
                    onChange={handleChange}
                    className="rounded accent-primary h-4 w-4"
                  />
                  {m.name}
                </label>
              ))}
              {mediums.length === 0 && (
                <span className="text-sm text-secondary">No mediums available</span>
              )}
            </div>
          </div>

          {/* ===== MULTI‑SELECT: COURSES ===== */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-2">
              <BookOpen size={14} className="inline mr-1" /> Assigned Courses
            </label>
            <div className="flex flex-wrap gap-3 p-3 border border-secondary-light rounded-lg bg-gray-50">
              {courses.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    name="course_ids"
                    value={c.id}
                    checked={form.course_ids?.includes(c.id)}
                    onChange={handleChange}
                    className="rounded accent-primary h-4 w-4"
                  />
                  {c.course_name}
                </label>
              ))}
              {courses.length === 0 && (
                <span className="text-sm text-secondary">No courses available</span>
              )}
            </div>
          </div>

          {/* ===== MULTI‑SELECT: COURSE LEVELS (filtered) ===== */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-2">
              <GraduationCap size={14} className="inline mr-1" /> Assigned Course Levels
            </label>
            <div className="flex flex-wrap gap-3 p-3 border border-secondary-light rounded-lg bg-gray-50">
              {form.course_ids && form.course_ids.length > 0 ? (
                filteredCourseLevels.length > 0 ? (
                  filteredCourseLevels.map((cl) => (
                    <label key={cl.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        name="course_level_ids"
                        value={cl.id}
                        checked={form.course_level_ids?.includes(cl.id)}
                        onChange={handleChange}
                        className="rounded accent-primary h-4 w-4"
                      />
                      {cl.level_name}
                    </label>
                  ))
                ) : (
                  <span className="text-sm text-secondary">No levels found for selected courses</span>
                )
              ) : (
                <span className="text-sm text-secondary">Select a course first</span>
              )}
            </div>
          </div>

          {/* ===== MULTI‑SELECT: SUBJECTS (filtered) ===== */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-2">
              <BookMarked size={14} className="inline mr-1" /> Assigned Subjects
            </label>
            <div className="flex flex-wrap gap-3 p-3 border border-secondary-light rounded-lg bg-gray-50">
              {form.course_ids && form.course_ids.length > 0 ? (
                filteredSubjects.length > 0 ? (
                  filteredSubjects.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        name="subject_ids"
                        value={s.id}
                        checked={form.subject_ids?.includes(s.id)}
                        onChange={handleChange}
                        className="rounded accent-primary h-4 w-4"
                      />
                      {s.subject_name}
                    </label>
                  ))
                ) : (
                  <span className="text-sm text-secondary">No subjects found for selected courses</span>
                )
              ) : (
                <span className="text-sm text-secondary">Select a course first</span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat transition disabled:opacity-60"
            >
              {loading ? "Saving..." : isEdit ? "Update Teacher" : "Create Teacher"}
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