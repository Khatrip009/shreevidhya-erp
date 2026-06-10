import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  X, Hash, User, Phone, Mail, GraduationCap, Calendar,
  IndianRupee, Layers, Lock, Link2,
} from "lucide-react";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../api/supabase";

export default function TeacherForm({ onSubmit, onClose, initialData = {} }) {
  const darkLogo = useOrgDarkLogo();
  const { user, profile } = useAuth();

  // ---- Teacher fields ----
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

  // ---- Login account options ----
  const [loginMode, setLoginMode] = useState("none"); // "none" | "create" | "link"
  const [loginEmail, setLoginEmail] = useState(initialData.email || "");
  const [loginPassword, setLoginPassword] = useState("teacher123");
  const [existingUserId, setExistingUserId] = useState(""); // uuid from profiles

  // ---- Fetch existing profiles for linking ----
  const [existingUsers, setExistingUsers] = useState([]);
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .order("email")
      .then(({ data }) => setExistingUsers(data || []));
  }, []);

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

    if (loginMode === "create" && !loginEmail) {
      toast.error("Login email is required when creating an account");
      return;
    }
    if (loginMode === "create" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (loginMode === "link" && !existingUserId) {
      toast.error("Please select an existing user to link");
      return;
    }

    try {
      // ---- STEP 1: Handle auth user linking/creation ----
      let authUserId = null;

      if (loginMode === "create") {
        // Save admin session before creating new user
        const { data: sessionData } = await supabase.auth.getSession();
        const adminSession = sessionData?.session;

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: loginEmail,
          password: loginPassword,
          options: {
            data: {
              full_name: `${form.first_name} ${form.last_name || ""}`.trim(),
              role: "teacher",
            },
          },
        });

        if (signUpError) {
          if (signUpError.message.includes("already registered"))
            throw new Error("This email is already registered.");
          throw signUpError;
        }

        authUserId = signUpData?.user?.id;
        if (!authUserId) throw new Error("Auth user creation returned no ID");

        // Restore admin session
        if (adminSession) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
        }

        // Update profile role to teacher (trigger already created it with default)
        await supabase
          .from("profiles")
          .update({ role: "teacher" })
          .eq("id", authUserId);

        toast.success("Login account created");
      } else if (loginMode === "link") {
        authUserId = existingUserId;
        // Ensure profile role is teacher and active
        const { error: roleUpdateError } = await supabase
          .from("profiles")
          .update({ role: "teacher", is_active: true })
          .eq("id", existingUserId);
        if (roleUpdateError) throw roleUpdateError;
        toast.success("Existing user linked");
      }

      // ---- STEP 2: Build teacher payload ----
      const payload = {
        ...form,
        salary: form.salary ? Number(form.salary) : null,
        joining_date: form.joining_date || null,
        user_id: authUserId,   // null if no login selected
      };

      await onSubmit(payload);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      {/* Scrollable container */}
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <img src={darkLogo} alt="ShreeVidhya Academy" className="h-10 w-auto" />
            <h2 className="text-xl font-righteous text-primary-dark">
              {initialData.id ? "Edit Teacher" : "Add Teacher"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary-bg rounded-lg transition">
            <X size={20} className="text-secondary-dark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Employee Code & Status */}
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

          {/* ===== LOGIN ACCOUNT SECTION ===== */}
          <div className="col-span-1 sm:col-span-2 border-t border-secondary-light pt-5">
            <h3 className="text-lg font-righteous text-primary-dark mb-3 flex items-center gap-2">
              <Lock size={18} /> Teacher Login Account
            </h3>

            {/* Login mode selection */}
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-2 text-sm font-montserrat text-secondary-dark">
                <input
                  type="radio"
                  name="loginMode"
                  value="none"
                  checked={loginMode === "none"}
                  onChange={() => setLoginMode("none")}
                  className="accent-primary"
                />
                No login account
              </label>
              <label className="flex items-center gap-2 text-sm font-montserrat text-secondary-dark">
                <input
                  type="radio"
                  name="loginMode"
                  value="create"
                  checked={loginMode === "create"}
                  onChange={() => setLoginMode("create")}
                  className="accent-primary"
                />
                Create new login account
              </label>
              <label className="flex items-center gap-2 text-sm font-montserrat text-secondary-dark">
                <input
                  type="radio"
                  name="loginMode"
                  value="link"
                  checked={loginMode === "link"}
                  onChange={() => setLoginMode("link")}
                  className="accent-primary"
                />
                Link to existing user
              </label>
            </div>

            {/* Fields for create mode */}
            {loginMode === "create" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    <Mail size={14} className="inline mr-1" /> Login Email *
                  </label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="teacher@example.com"
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    <Lock size={14} className="inline mr-1" /> Password
                  </label>
                  <input
                    type="text"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none bg-gray-100"
                    readOnly
                  />
                  <p className="text-xs text-secondary-light mt-1">
                    Default: “teacher123”. User should change it after first login.
                  </p>
                </div>
              </div>
            )}

            {/* Fields for link mode */}
            {loginMode === "link" && (
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <Link2 size={14} className="inline mr-1" />
                  Select Existing User *
                </label>
                <select
                  value={existingUserId}
                  onChange={(e) => setExistingUserId(e.target.value)}
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none"
                  required
                >
                  <option value="" disabled>
                    -- choose a user --
                  </option>
                  {existingUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.email}) – {u.role}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-secondary-light mt-1">
                  The selected user's role will be updated to "teacher".
                </p>
              </div>
            )}
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