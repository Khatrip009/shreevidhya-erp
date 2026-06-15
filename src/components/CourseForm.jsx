import { useState } from "react";
import toast from "react-hot-toast";
import { X, BookOpen, FileText, Clock, Layers } from "lucide-react";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";
import { supabase } from "../api/supabase";
import { useQuery } from "@tanstack/react-query";

export default function CourseForm({ onSubmit, onClose, initialData = {} }) {
  const darkLogo = useOrgDarkLogo();

  const [form, setForm] = useState({
    course_name: initialData.course_name || "",
    description: initialData.description || "",
    duration_months: initialData.duration_months || "",
    medium_id: initialData.medium_id || "",   // NEW
  });

  // Fetch mediums for dropdown
  const { data: mediums = [] } = useQuery({
    queryKey: ["mediums-dropdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mediums")
        .select("id, name")
        .order("name");
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.course_name.trim()) {
      toast.error("Course name is required");
      return;
    }
    await onSubmit({
      ...form,
      duration_months: Number(form.duration_months),
      medium_id: form.medium_id || null,    // NEW
    });
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
              {initialData.id ? "Edit Course" : "Add Course"}
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
          {/* Course Name */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <BookOpen size={14} className="inline mr-1" />
              Course Name *
            </label>
            <input
              name="course_name"
              placeholder="e.g., Abacus, Vedic Maths"
              value={form.course_name}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <FileText size={14} className="inline mr-1" />
              Description
            </label>
            <textarea
              name="description"
              placeholder="Brief description of the course"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light resize-none"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Clock size={14} className="inline mr-1" />
              Duration (Months)
            </label>
            <input
              type="number"
              name="duration_months"
              placeholder="e.g., 12"
              value={form.duration_months}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              min="1"
            />
          </div>

          {/* Medium – NEW */}
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

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat transition flex items-center justify-center gap-2"
            >
              {initialData.id ? "Update Course" : "Create Course"}
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