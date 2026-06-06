import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Search,
  Edit3,
  Trash2,
  X,
  User,
  Mail,
  Shield,
  Save,
  UserPlus,
} from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { supabase } from "../api/supabase";

const ALLOWED_ROLES = ["Super Admin", "Admin", "Teacher", "Student", "Parent"];

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "Admin",
    teacher_id: "",   // for linking teacher
    student_id: "",   // for linking student
  });

  // Fetch teachers dropdown (for linking)
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-dropdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("teachers")
        .select("id, first_name, last_name, employee_code");
      return data || [];
    },
  });

  // Fetch students dropdown (for linking)
  const { data: students = [] } = useQuery({
    queryKey: ["students-dropdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name, admission_no");
      return data || [];
    },
  });

  // Fetch profiles
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredProfiles = profiles.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.email?.toLowerCase().includes(term) ||
      p.full_name?.toLowerCase().includes(term)
    );
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, role, is_active }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role, is_active, updated_at: new Date() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User updated");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setEditingId(null);
    },
    onError: (err) => toast.error(err.message || "Update failed"),
  });

  const inviteMutation = useMutation({
    mutationFn: async (formData) => {
      // Check duplicate email
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", formData.email)
        .maybeSingle();
      if (existingProfile) throw new Error("A user with this email already exists");

      // Create auth user
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.full_name },
          },
        });

      if (signUpError) {
        if (signUpError.message.includes("already been registered"))
          throw new Error("This email is already registered");
        throw signUpError;
      }

      const userId = signUpData?.user?.id;
      if (!userId) throw new Error("User creation failed");

      // Update profile role & full name (the trigger already created a profile with default role)
      await supabase
        .from("profiles")
        .update({ role: formData.role, full_name: formData.full_name })
        .eq("id", userId);

      // Automatically link teacher or student if selected
      if (formData.role === "Teacher" && formData.teacher_id) {
        const { error: linkError } = await supabase
          .from("teachers")
          .update({ user_id: userId })
          .eq("id", formData.teacher_id);
        if (linkError) throw new Error("Failed to link teacher record");
      } else if (formData.role === "Student" && formData.student_id) {
        const { error: linkError } = await supabase
          .from("students")
          .update({ user_id: userId })
          .eq("id", formData.student_id);
        if (linkError) throw new Error("Failed to link student record");
      }
    },
    onSuccess: () => {
      toast.success("User invited and linked successfully");
      setShowInvite(false);
      setInviteForm({
        email: "",
        password: "",
        full_name: "",
        role: "Admin",
        teacher_id: "",
        student_id: "",
      });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (err) => toast.error(err.message || "Invitation failed"),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: false, updated_at: new Date() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User deactivated");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (err) => toast.error(err.message || "Deactivation failed"),
  });

  function startEdit(profile) {
    setEditingId(profile.id);
    setEditRole(profile.role);
    setEditActive(profile.is_active);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleInviteSubmit(e) {
    e.preventDefault();
    if (!inviteForm.email || !inviteForm.password) {
      toast.error("Email and password are required");
      return;
    }
    if (inviteForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    inviteMutation.mutate(inviteForm);
  }

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-righteous text-primary-dark">Users</h1>
          <p className="text-sm text-secondary-dark font-montserrat mt-1">
            Manage staff, students and parent accounts
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-primary hover:bg-primary-light text-white px-5 py-2.5 rounded-lg transition font-montserrat text-sm flex items-center gap-2"
        >
          <UserPlus size={18} /> Invite User
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
        />
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-secondary-light rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-100 border-b border-secondary-light">
              <tr>
                <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">
                  <Mail size={14} className="inline mr-1" /> Email
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  <User size={14} className="inline mr-1" /> Full Name
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  <Shield size={14} className="inline mr-1" /> Role
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Status
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-secondary">
                    Loading users…
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-secondary">
                    <div className="flex flex-col items-center gap-2">
                      <User size={32} className="text-secondary-light" />
                      <span>No users found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className="border-b border-secondary-light hover:bg-primary-bg transition"
                  >
                    <td className="p-3 text-sm">{profile.email}</td>
                    <td className="p-3 text-sm">
                      {profile.full_name || "-"}
                    </td>
                    <td className="p-3 text-sm">
                      {editingId === profile.id ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="border border-secondary-light rounded p-1 text-sm focus:ring-1 focus:ring-primary outline-none"
                        >
                          {ALLOWED_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="bg-primary-bg text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                          {profile.role}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm">
                      {editingId === profile.id ? (
                        <select
                          value={editActive}
                          onChange={(e) =>
                            setEditActive(e.target.value === "true")
                          }
                          className="border border-secondary-light rounded p-1 text-sm focus:ring-1 focus:ring-primary outline-none"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            profile.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {profile.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sm">
                      {editingId === profile.id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              updateMutation.mutate({
                                id: profile.id,
                                role: editRole,
                                is_active: editActive,
                              })
                            }
                            className="bg-primary hover:bg-primary-light text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                          >
                            <Save size={14} /> Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="border border-secondary-light px-3 py-1 rounded text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(profile)}
                            className="text-blue-600 hover:underline"
                            title="Edit"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                !window.confirm(
                                  "Deactivate this user? They will no longer be able to log in."
                                )
                              )
                                return;
                              deactivateMutation.mutate(profile.id);
                            }}
                            className="text-red-600 hover:underline"
                            title="Deactivate"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal (with linking dropdowns) */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <img
                  src="/ShreeVidhyaDark.png"
                  alt="ShreeVidhya Academy"
                  className="h-10 w-auto"
                />
                <h2 className="text-xl font-righteous text-primary-dark">
                  Invite User
                </h2>
              </div>
              <button
                onClick={() => setShowInvite(false)}
                className="p-2 hover:bg-secondary-bg rounded-lg"
              >
                <X size={20} className="text-secondary-dark" />
              </button>
            </div>
            <form onSubmit={handleInviteSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <Mail size={14} className="inline mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={inviteForm.password}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, password: e.target.value })
                  }
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <User size={14} className="inline mr-1" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteForm.full_name}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, full_name: e.target.value })
                  }
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                />
              </div>
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <Shield size={14} className="inline mr-1" />
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({
                      ...inviteForm,
                      role: e.target.value,
                      teacher_id: "",
                      student_id: "",
                    })
                  }
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                >
                  {ALLOWED_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditionally show teacher/student dropdown */}
              {inviteForm.role === "Teacher" && (
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    <User size={14} className="inline mr-1" />
                    Link to Teacher Record (optional)
                  </label>
                  <select
                    value={inviteForm.teacher_id}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, teacher_id: e.target.value })
                    }
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  >
                    <option value="">-- Select Teacher --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name} ({t.employee_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {inviteForm.role === "Student" && (
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    <User size={14} className="inline mr-1" />
                    Link to Student Record (optional)
                  </label>
                  <select
                    value={inviteForm.student_id}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, student_id: e.target.value })
                    }
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  >
                    <option value="">-- Select Student --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.first_name} {s.last_name} ({s.admission_no})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat transition"
                >
                  {inviteMutation.isLoading ? "Sending..." : "Invite"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="w-full sm:w-auto border border-secondary-light text-secondary-dark hover:bg-secondary-bg px-6 py-2.5 rounded-lg font-montserrat transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}