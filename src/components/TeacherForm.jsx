import { useState } from "react";
import toast from "react-hot-toast";
import {
  X,
  Hash,
  User,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  IndianRupee,
  Layers,
} from "lucide-react";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";

export default function TeacherForm({ onSubmit, onClose, initialData = {} }) {
  const darkLogo = useOrgDarkLogo();
  const [form, setForm] = useState({
    employee_code: initialData.employee_code || "",
    first_name: initialData.first_name || "",
    last_name: initialData.last_name || "",
    mobile: initialData.mobile || "",
    email: initialData.email || "",
    qualification: initialData.qualification || "",
    joining_date: initialData.joining_date || "",
    salary: initialData.salary || "",
    status: initialData.status || "active",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.first_name || !form.mobile) {
      toast.error("First name and mobile are required");
      return;
    }

    const payload = {
      ...form,
      salary: form.salary ? Number(form.salary) : null,
      joining_date: form.joining_date || null,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl">
        {/* Header with logo */}
        <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <img
              src={darkLogo}
              alt="ShreeVidhya Academy"
              className="h-10 w-auto"
            />
            <h2 className="text-xl font-righteous text-primary-dark">
              {initialData.id ? "Edit Teacher" : "Add Teacher"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-bg rounded-lg transition"
          >
            <X size={20} className="text-secondary-dark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Employee Code */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Hash size={14} className="inline mr-1" />
              Employee Code
            </label>
            <input
              name="employee_code"
              placeholder="Auto or manual"
              value={form.employee_code}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Layers size={14} className="inline mr-1" />
              Status
            </label>
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

          {/* First & Last Name */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <User size={14} className="inline mr-1" />
              First Name *
            </label>
            <input
              name="first_name"
              placeholder="First name"
              value={form.first_name}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <User size={14} className="inline mr-1" />
              Last Name
            </label>
            <input
              name="last_name"
              placeholder="Last name"
              value={form.last_name}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
            />
          </div>

          {/* Mobile & Email */}
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
              <Mail size={14} className="inline mr-1" />
              Email
            </label>
            <input
              name="email"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
            />
          </div>

          {/* Qualification & Salary */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <GraduationCap size={14} className="inline mr-1" />
              Qualification
            </label>
            <input
              name="qualification"
              placeholder="Highest degree"
              value={form.qualification}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <IndianRupee size={14} className="inline mr-1" />
              Salary
            </label>
            <input
              name="salary"
              type="number"
              placeholder="Monthly salary"
              value={form.salary}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
            />
          </div>

          {/* Joining Date */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Calendar size={14} className="inline mr-1" />
              Joining Date
            </label>
            <input
              name="joining_date"
              type="date"
              value={form.joining_date}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="col-span-1 sm:col-span-2 flex flex-col sm:flex-row justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 border border-secondary-light rounded-lg text-secondary-dark hover:bg-secondary-bg font-montserrat transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-light text-white rounded-lg font-montserrat transition flex items-center justify-center gap-2"
            >
              {initialData.id ? "Update Teacher" : "Add Teacher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}