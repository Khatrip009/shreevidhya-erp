import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  X, User, Phone, Mail, Briefcase, MapPin, Users,
} from "lucide-react";
import { supabase } from "../api/supabase";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";
import { createParent } from "../services/parentService";

export default function ParentForm({
  onSubmit,          // callback when parent is created (existing usage)
  onClose,
  initialData = {},
  studentId = null,  // if provided, parent will be auto-linked to this student
}) {
  const darkLogo = useOrgDarkLogo();
  const [form, setForm] = useState({
    father_name: initialData.father_name || "",
    mother_name: initialData.mother_name || "",
    mobile: initialData.mobile || "",
    whatsapp: initialData.whatsapp || "",
    email: initialData.email || "",
    occupation: initialData.occupation || "",
    address: initialData.address || "",
  });

  // Standalone mode: student selection is required
  const [selectedStudentId, setSelectedStudentId] = useState(studentId || null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(!studentId);

  useEffect(() => {
    if (!studentId) {
      // Fetch all active students (simplified – you might want a search)
      supabase
        .from("students")
        .select("id, first_name, last_name, standard")
        .eq("status", "active")
        .order("first_name")
        .then(({ data }) => setStudents(data || []))
        .finally(() => setLoadingStudents(false));
    }
  }, [studentId]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.father_name && !form.mother_name) {
      toast.error("At least one parent name is required");
      return;
    }
    if (!form.mobile) {
      toast.error("Mobile number is required");
      return;
    }
    if (!studentId && !selectedStudentId) {
      toast.error("Please select a student to link this parent");
      return;
    }

    try {
      const idToLink = studentId || selectedStudentId;
      const createdParent = await createParent(form, idToLink);
      onSubmit(createdParent);   // pass back to parent component
      toast.success("Parent created and linked");
    } catch (err) {
      toast.error(err.message || "Failed to create parent");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <img
              src={darkLogo}
              alt="ShreeVidhya Academy"
              className="h-10 w-auto"
            />
            <h2 className="text-xl font-righteous text-primary-dark">
              {initialData.id ? "Edit Parent" : "Add Parent"}
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
          {/* Student selector – only when not already inside a student form */}
          {!studentId && (
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Users size={14} className="inline mr-1" />
                Link to Student *
              </label>
              {loadingStudents ? (
                <p className="text-sm text-secondary">Loading students...</p>
              ) : (
                <select
                  value={selectedStudentId || ""}
                  onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
                  required
                >
                  <option value="" disabled>Select a student</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} {s.standard ? `(Std ${s.standard})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Father & Mother Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <User size={14} className="inline mr-1" />
                Father Name
              </label>
              <input
                name="father_name"
                placeholder="Father's full name"
                value={form.father_name}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <User size={14} className="inline mr-1" />
                Mother Name
              </label>
              <input
                name="mother_name"
                placeholder="Mother's full name"
                value={form.mother_name}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              />
            </div>
          </div>

          {/* Mobile & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Phone size={14} className="inline mr-1" />
                Mobile *
              </label>
              <input
                name="mobile"
                placeholder="Phone number"
                value={form.mobile}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Phone size={14} className="inline mr-1" />
                WhatsApp
              </label>
              <input
                name="whatsapp"
                placeholder="WhatsApp number"
                value={form.whatsapp}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              />
            </div>
          </div>

          {/* Email & Occupation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Mail size={14} className="inline mr-1" />
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Briefcase size={14} className="inline mr-1" />
                Occupation
              </label>
              <input
                name="occupation"
                placeholder="Occupation"
                value={form.occupation}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <MapPin size={14} className="inline mr-1" />
              Address
            </label>
            <textarea
              name="address"
              placeholder="Full address"
              value={form.address}
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
              {initialData.id ? "Update Parent" : "Create Parent"}
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