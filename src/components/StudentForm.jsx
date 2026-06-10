import { useState, useEffect } from "react";
import {
  X, User, Phone, Mail, MapPin, School, Calendar, Hash, Upload,
  Plus, Search, Lock, Link2,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../api/supabase";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";
import ParentForm from "./ParentForm";

export default function StudentForm({ onSuccess, onClose, initialData = {} }) {
  const isEdit = !!initialData.id;
  const darkLogo = useOrgDarkLogo();

  // ---- Student fields ----
  const [form, setForm] = useState({
    admission_no: initialData.admission_no || "",
    first_name: initialData.first_name || "",
    last_name: initialData.last_name || "",
    gender: initialData.gender || "",
    dob: initialData.dob || "",
    mobile: initialData.mobile || "",
    whatsapp: initialData.whatsapp || "",
    email: initialData.email || "",
    address: initialData.address || "",
    city: initialData.city || "",
    state: initialData.state || "",
    pincode: initialData.pincode || "",
    school_name: initialData.school_name || "",
    board: initialData.board || "",
    standard: initialData.standard || "",
    joining_date: initialData.joining_date || new Date().toISOString().split("T")[0],
    status: initialData.status || "active",
  });

  // ---- Login account options ----
  const [loginMode, setLoginMode] = useState("none"); // "none" | "create" | "link"
  const [loginEmail, setLoginEmail] = useState(initialData.email || "");
  const [loginPassword, setLoginPassword] = useState("student123");
  const [existingUserId, setExistingUserId] = useState(""); // uuid from profiles

  // ---- Parent linking ----
  const [allParents, setAllParents] = useState([]);
  const [linkedParents, setLinkedParents] = useState([]);
  const [parentSearch, setParentSearch] = useState("");
  const [showAddParentModal, setShowAddParentModal] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingAdmission, setLoadingAdmission] = useState(!isEdit && !initialData.admission_no);

  // ---- Fetch existing profiles for linking ----
  const [existingUsers, setExistingUsers] = useState([]);
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .order("email")
      .then(({ data }) => setExistingUsers(data || []));
  }, []);

  // ----------------------------------------------------------------------
  // Auto-generate admission number (format: SRA-00001)
  // ----------------------------------------------------------------------
  useEffect(() => {
    if (isEdit || initialData.admission_no) return;

    async function generateAdmissionNo() {
      try {
        const { data, error } = await supabase
          .from("students")
          .select("admission_no")
          .order("admission_no", { ascending: false })
          .limit(1);

        if (error) throw error;

        let nextNumber = 1;
        if (data && data.length > 0 && data[0].admission_no) {
          const last = data[0].admission_no;
          const match = last.match(/SRA-(\d+)/);
          if (match && match[1]) {
            nextNumber = parseInt(match[1], 10) + 1;
          } else {
            const numMatch = last.match(/\d+/);
            if (numMatch) nextNumber = parseInt(numMatch[0], 10) + 1;
          }
        }
        const padded = String(nextNumber).padStart(5, "0");
        const newAdmissionNo = `SRA-${padded}`;
        setForm((prev) => ({ ...prev, admission_no: newAdmissionNo }));
      } catch (err) {
        console.error("Failed to generate admission number:", err);
        setForm((prev) => ({ ...prev, admission_no: `SRA-${Date.now()}` }));
      } finally {
        setLoadingAdmission(false);
      }
    }

    generateAdmissionNo();
  }, [isEdit, initialData.admission_no]);

  // Load all parents for search
  useEffect(() => {
    supabase
      .from("parents")
      .select("*")
      .order("father_name")
      .then(({ data }) => setAllParents(data || []));
  }, []);

  // Load already linked parents when editing
  useEffect(() => {
    if (isEdit && initialData.id) {
      supabase
        .from("student_parents")
        .select("parent_id, relation, parents(*)")
        .eq("student_id", initialData.id)
        .then(({ data }) => {
          if (data) {
            const validParents = data
              .map((item) => item.parents)
              .filter((parent) => parent !== null);
            setLinkedParents(validParents);
          }
        });
    }
  }, [isEdit, initialData.id]);

  const filteredParents = allParents.filter((p) => {
    const term = parentSearch.toLowerCase();
    return (
      p?.father_name?.toLowerCase().includes(term) ||
      p?.mother_name?.toLowerCase().includes(term) ||
      p?.mobile?.includes(term)
    );
  });

  function addExistingParent(parent) {
    if (!parent || linkedParents.find((lp) => lp.id === parent.id)) return;
    setLinkedParents((prev) => [...prev, parent]);
  }

  function removeLinkedParent(parentId) {
    setLinkedParents((prev) => prev.filter((p) => p.id !== parentId));
  }

  function handleNewParentCreated(newParent) {
    setAllParents((prev) => [newParent, ...prev]);
    setLinkedParents((prev) => [...prev, newParent]);
    setShowAddParentModal(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ---------- Main Submit ----------
  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.first_name || !form.last_name || !form.mobile) {
      toast.error("First name, last name, and mobile are required");
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

    setUploading(true);

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
              full_name: `${form.first_name} ${form.last_name}`,
              role: "student",
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

        // Update profile role to student (trigger already created it with default)
        await supabase
          .from("profiles")
          .update({ role: "student" })
          .eq("id", authUserId);

        toast.success("Login account created");
      } else if (loginMode === "link") {
        authUserId = existingUserId;
        // Ensure profile role is student and active
        const { error: roleUpdateError } = await supabase
          .from("profiles")
          .update({ role: "student", is_active: true })
          .eq("id", existingUserId);
        if (roleUpdateError) throw roleUpdateError;
        toast.success("Existing user linked");
      }

      // ---- STEP 2: Upload photo (if any) ----
      let photoUrl = initialData.photo_url || null;
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `student-photos/students/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("ShreeVidhya_Academy")
          .upload(filePath, photoFile, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage
          .from("ShreeVidhya_Academy")
          .getPublicUrl(filePath);
        photoUrl = publicUrlData.publicUrl;
      }

      // ---- STEP 3: Create/update student record ----
      const studentData = {
        admission_no: form.admission_no || null,
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender || null,
        dob: form.dob || null,
        mobile: form.mobile,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        school_name: form.school_name || null,
        board: form.board || null,
        standard: form.standard || null,
        joining_date: form.joining_date || null,
        status: form.status,
        photo_url: photoUrl,
        user_id: authUserId,
      };

      let studentId = initialData.id;

      if (isEdit) {
        const { error } = await supabase
          .from("students")
          .update(studentData)
          .eq("id", studentId);
        if (error) throw error;
        toast.success("Student updated successfully");
      } else {
        const { data, error } = await supabase
          .from("students")
          .insert(studentData)
          .select("id")
          .single();
        if (error) throw error;
        studentId = data.id;
        toast.success("Student added successfully");
      }

      // ---- STEP 4: Parent linking ----
      if (studentId) {
        await supabase.from("student_parents").delete().eq("student_id", studentId);
        if (linkedParents.length) {
          const links = linkedParents.map((p) => ({
            student_id: studentId,
            parent_id: p.id,
            relation: "guardian",
          }));
          const { error: linkError } = await supabase.from("student_parents").insert(links);
          if (linkError) throw linkError;
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Operation failed");
    } finally {
      setUploading(false);
    }
  }

  // ---------- Render ----------
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <img src={darkLogo} alt="ShreeVidhya Academy" className="h-10 w-auto" />
            <h2 className="text-xl font-righteous text-primary-dark">
              {isEdit ? "Edit Student" : "Add New Student"}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary-bg rounded-lg transition">
            <X size={20} className="text-secondary-dark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Admission No & Photo Upload */}
          <div className="col-span-1 sm:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Hash size={14} className="inline mr-1" />
                Admission No
              </label>
              <input
                name="admission_no"
                value={form.admission_no}
                onChange={handleChange}
                placeholder="Auto-generated"
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                disabled={loadingAdmission}
              />
              {loadingAdmission && <p className="text-xs text-secondary-light mt-1">Generating...</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <Upload size={14} className="inline mr-1" />
                Student Photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files[0])}
                className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-white hover:file:bg-primary-light file:cursor-pointer"
              />
              {initialData.photo_url && !photoFile && (
                <img
                  src={initialData.photo_url}
                  alt="Current"
                  className="h-12 w-12 rounded mt-2 object-cover border border-secondary-light"
                />
              )}
            </div>
          </div>

          {/* First & Last Name */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <User size={14} className="inline mr-1" />
              First Name *
            </label>
            <input
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
              required
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              placeholder="First name"
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <User size={14} className="inline mr-1" />
              Last Name *
            </label>
            <input
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
              required
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              placeholder="Last name"
            />
          </div>

          {/* Gender & DOB */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">Gender</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Calendar size={14} className="inline mr-1" />
              Date of Birth
            </label>
            <input
              type="date"
              name="dob"
              value={form.dob}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
          </div>

          {/* Mobile & WhatsApp */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Phone size={14} className="inline mr-1" />
              Mobile *
            </label>
            <input
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              required
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              placeholder="Phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Phone size={14} className="inline mr-1" />
              WhatsApp
            </label>
            <input
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              placeholder="WhatsApp number"
            />
          </div>

          {/* Email */}
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Mail size={14} className="inline mr-1" />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              placeholder="Email address"
            />
          </div>

          {/* Address, City, State, Pincode */}
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <MapPin size={14} className="inline mr-1" />
              Address
            </label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows={2}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
              placeholder="Street address"
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">City</label>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              placeholder="City"
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">State</label>
            <input
              name="state"
              value={form.state}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              placeholder="State"
            />
          </div>
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">Pincode</label>
            <input
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              placeholder="Pincode"
            />
          </div>

          {/* School Details */}
          <div className="col-span-1 sm:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <School size={14} className="inline mr-1" />
                School Name
              </label>
              <input
                name="school_name"
                value={form.school_name}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                placeholder="School name"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">Board</label>
              <input
                name="board"
                value={form.board}
                onChange={handleChange}
                placeholder="GSEB, CBSE, etc."
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">Standard</label>
              <input
                name="standard"
                value={form.standard}
                onChange={handleChange}
                placeholder="e.g., 10"
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
            </div>
          </div>

          {/* Joining Date & Status */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Calendar size={14} className="inline mr-1" />
              Joining Date
            </label>
            <input
              type="date"
              name="joining_date"
              value={form.joining_date}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
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
              <option value="graduated">Graduated</option>
            </select>
          </div>

          {/* ===== LOGIN ACCOUNT SECTION ===== */}
          <div className="col-span-1 sm:col-span-2 border-t border-secondary-light pt-5">
            <h3 className="text-lg font-righteous text-primary-dark mb-3 flex items-center gap-2">
              <Lock size={18} /> Student Login Account
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
                    placeholder="student@example.com"
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
                    Default: “student123”. User should change it after first login.
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
                  The selected user's role will be updated to "student".
                </p>
              </div>
            )}
          </div>

          {/* Parents Section */}
          <div className="col-span-1 sm:col-span-2">
            <h3 className="text-lg font-righteous text-primary-dark mb-3 flex items-center gap-2">
              <User size={18} /> Parents / Guardians
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {linkedParents.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-2 bg-primary-bg text-primary px-3 py-1.5 rounded-full text-sm"
                >
                  {p?.father_name || p?.mother_name || p?.mobile || "Unknown Parent"}
                  <button
                    type="button"
                    onClick={() => removeLinkedParent(p.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search existing parent..."
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                className="w-full border border-secondary-light rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            {parentSearch && (
              <div className="max-h-32 overflow-y-auto border border-secondary-light rounded-lg mb-3">
                {filteredParents.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="px-4 py-2 text-sm hover:bg-primary-bg cursor-pointer flex justify-between items-center"
                    onClick={() => addExistingParent(p)}
                  >
                    <span>{p?.father_name || p?.mother_name} – {p?.mobile}</span>
                    <Plus size={16} className="text-primary" />
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowAddParentModal(true)}
              className="text-primary hover:underline text-sm flex items-center gap-1"
            >
              <Plus size={16} /> Add New Parent
            </button>
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
              disabled={uploading || loadingAdmission}
              className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-light text-white rounded-lg font-montserrat transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? "Processing..." : isEdit ? "Update Student" : "Add Student"}
            </button>
          </div>
        </form>

        {showAddParentModal && (
          <ParentForm
            onSubmit={(parentPayload) => handleNewParentCreated(parentPayload)}
            onClose={() => setShowAddParentModal(false)}
          />
        )}
      </div>
    </div>
  );
}