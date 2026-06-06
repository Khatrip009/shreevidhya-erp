import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  X,
  BookOpen,
  GraduationCap,
  Users,
  Calendar,
  Clock,
  Hash,
} from "lucide-react";
import { getCourseOptions } from "../services/courseService";
import { getTeacherOptions } from "../services/teacherService";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";

export default function BatchForm({ onSubmit, onClose, initialData = {} }) {
  const darkLogo = useOrgDarkLogo();
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [form, setForm] = useState({
    batch_name: initialData.batch_name || "",
    course_id: initialData.course_id || "",
    teacher_id: initialData.teacher_id || "",
    start_date: initialData.start_date || "",
    end_date: initialData.end_date || "",
    start_time: initialData.start_time || "",
    end_time: initialData.end_time || "",
    capacity: initialData.capacity || "",
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const courseData = await getCourseOptions();
      const teacherData = await getTeacherOptions();
      setCourses(courseData);
      setTeachers(teacherData);
    } catch {
      toast.error("Failed to load form options");
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.batch_name || !form.course_id) {
      toast.error("Batch name and course are required");
      return;
    }
    await onSubmit(form);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header with logo */}
        <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
           <img
  src={darkLogo}
  alt="ShreeVidhya Academy"
  className="h-10 w-auto"
/>
            <h2 className="text-xl font-righteous text-primary-dark">
              {initialData.id ? "Edit Batch" : "New Batch"}
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
          {/* Batch Name */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Hash size={14} className="inline mr-1" />
              Batch Name *
            </label>
            <input
              name="batch_name"
              placeholder="e.g., STD10-Morning-A"
              value={form.batch_name}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              required
            />
          </div>

          {/* Course & Teacher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <GraduationCap size={14} className="inline mr-1" />
                Course *
              </label>
              <select
                name="course_id"
                value={form.course_id}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                required
              >
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Users size={14} className="inline mr-1" />
                Teacher
              </label>
              <select
                name="teacher_id"
                value={form.teacher_id}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="">Select Teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.first_name} {teacher.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start & End Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Calendar size={14} className="inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Calendar size={14} className="inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Start & End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Clock size={14} className="inline mr-1" />
                Start Time
              </label>
              <input
                type="time"
                name="start_time"
                value={form.start_time}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Clock size={14} className="inline mr-1" />
                End Time
              </label>
              <input
                type="time"
                name="end_time"
                value={form.end_time}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Capacity */}
          <div className="max-w-xs">
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Users size={14} className="inline mr-1" />
              Capacity
            </label>
            <input
              type="number"
              name="capacity"
              placeholder="Max students"
              value={form.capacity}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat transition flex items-center justify-center gap-2"
            >
              {initialData.id ? "Update Batch" : "Create Batch"}
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