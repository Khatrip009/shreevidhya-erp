// src/pages/Students.jsx
import { useState, useRef, useEffect } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, Plus, Edit3, Trash2, Download, Upload, X, User, Loader, Save } from "lucide-react";
import Papa from "papaparse";
import AdminLayout from "../layouts/AdminLayout";
import ConfirmDialog from "../components/ConfirmDialog";
import BackButton from "../components/BackButton";
import { getStudents, createStudent, updateStudent, deleteStudent, getMediumOptions } from "../services/studentService";
import { supabase } from "../api/supabase";
import GSTLookup from "../components/GSTLookup";

export default function Students() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterMedium, setFilterMedium] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: "",
    admission_no: "",
    date_of_birth: "",
    gender: "",
    address: "",
    standard: "",
    medium_id: "",
    status: "Active",
    // GST fields
    gstin: "",
    legal_business_name: "",
    trade_name: "",
    state_code: "",
    place_of_supply: "",
    registration_type: "",
    billing_address: "",
  });

  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch mediums for dropdown
  const { data: mediums = [] } = useQuery({
    queryKey: ["mediums-dropdown"],
    queryFn: getMediumOptions,
  });

  // Fetch states for dropdown
  const { data: states = [] } = useQuery({
    queryKey: ["states-dropdown"],
    queryFn: async () => {
      const { data } = await supabase.from("states").select("id, name, code").order("name");
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch students with infinite scroll & filters
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["students", search, filterMedium],
    queryFn: ({ pageParam = 0 }) =>
      getStudents({ pageParam, filters: { search, medium_id: filterMedium } }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.data.length, 0);
      if (lastPage.count && totalFetched < lastPage.count) return allPages.length;
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
  });

  const students = data?.pages.flatMap((page) => page.data) || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => createStudent(payload),
    onSuccess: () => {
      toast.success("Student created");
      queryClient.invalidateQueries(["students"]);
      closeModal();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateStudent(id, payload),
    onSuccess: () => {
      toast.success("Student updated");
      queryClient.invalidateQueries(["students"]);
      closeModal();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteStudent(id),
    onSuccess: () => {
      toast.success("Student deleted");
      queryClient.invalidateQueries(["students"]);
    },
    onError: (err) => toast.error(err.message),
  });

  // Form handlers
  const openCreate = () => {
    setEditing(null);
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      mobile: "",
      admission_no: "",
      date_of_birth: "",
      gender: "",
      address: "",
      standard: "",
      medium_id: "",
      status: "Active",
      gstin: "",
      legal_business_name: "",
      trade_name: "",
      state_code: "",
      place_of_supply: "",
      registration_type: "",
      billing_address: "",
    });
    setShowModal(true);
  };

  const openEdit = (student) => {
    setEditing(student);
    setForm({
      first_name: student.first_name || "",
      last_name: student.last_name || "",
      email: student.email || "",
      mobile: student.mobile || "",
      admission_no: student.admission_no || "",
      date_of_birth: student.date_of_birth || "",
      gender: student.gender || "",
      address: student.address || "",
      standard: student.standard || "",
      medium_id: student.medium_id || "",
      status: student.status || "Active",
      gstin: student.gstin || "",
      legal_business_name: student.legal_business_name || "",
      trade_name: student.trade_name || "",
      state_code: student.state_code || "",
      place_of_supply: student.place_of_supply || "",
      registration_type: student.registration_type || "",
      billing_address: student.billing_address || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Auto‑fill from GST lookup
  const handleGSTLookupSuccess = (data) => {
    setForm((prev) => ({
      ...prev,
      legal_business_name: data.legal_name || prev.legal_business_name,
      trade_name: data.trade_name || prev.trade_name,
      state_code: data.state_code || prev.state_code,
      registration_type: data.registration_type || prev.registration_type,
      billing_address: data.address || prev.billing_address,
    }));
    toast.success("GST details auto‑filled");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Basic validation
    if (!form.first_name.trim()) {
      toast.error("First name is required");
      return;
    }
    // Clean GSTIN
    if (form.gstin) {
      form.gstin = form.gstin.replace(/\s/g, "").toUpperCase();
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (id) => setConfirmDelete(id);

  const handleExport = () => toast("Export functionality available in production");

  // CSV Import
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0;
        for (const row of results.data) {
          try {
            const payload = {
              first_name: row.first_name,
              last_name: row.last_name,
              email: row.email,
              mobile: row.mobile,
              admission_no: row.admission_no,
              date_of_birth: row.date_of_birth,
              gender: row.gender,
              address: row.address,
              standard: row.standard,
              medium_id: row.medium_id,
              status: row.status || "Active",
            };
            await createStudent(payload);
            successCount++;
          } catch (err) {
            console.error(err);
          }
        }
        toast.success(`${successCount} students imported`);
        queryClient.invalidateQueries(["students"]);
      },
      error: () => toast.error("CSV parsing error"),
    });
  };

  return (
    <AdminLayout>
      <BackButton to="/admissions-hub" label="Admissions Hub" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-righteous text-primary-dark">Students</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openCreate}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Student
          </button>
          <button
            onClick={handleExport}
            className="border px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="border px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Upload size={16} /> Import
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleImport}
          />
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search by name, admission no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm"
          />
        </div>
        <select
          value={filterMedium}
          onChange={(e) => setFilterMedium(e.target.value)}
          className="border rounded-lg px-4 py-2.5 text-sm"
        >
          <option value="">All Mediums</option>
          {mediums.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left text-sm">Admission No</th>
                <th className="p-3 text-left text-sm">Name</th>
                <th className="p-3 text-left text-sm">Medium</th>
                <th className="p-3 text-left text-sm">Mobile</th>
                <th className="p-3 text-left text-sm">Status</th>
                <th className="p-3 text-left text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-secondary">Loading…</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-secondary">No students found.</td></tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-3 text-sm">{student.admission_no || "—"}</td>
                    <td className="p-3 text-sm font-medium">
                      <Link to={`/students/${student.id}`} className="hover:text-primary">
                        {student.first_name} {student.last_name}
                      </Link>
                    </td>
                    <td className="p-3 text-sm">{student.medium_name || "—"}</td>
                    <td className="p-3 text-sm">{student.mobile || "—"}</td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        student.status === "Active" ? "bg-green-100 text-green-700" :
                        student.status === "Inactive" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>{student.status || "Active"}</span>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(student)}
                          className="text-blue-600 hover:underline"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-600 hover:underline"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => fetchNextPage()}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm"
          >
            {isFetchingNextPage ? "Loading…" : "Load More"}
          </button>
        </div>
      )}

      {/* Modal for Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-righteous text-primary-dark">
                {editing ? "Edit Student" : "Add Student"}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-secondary-bg rounded-lg">
                <X size={20} className="text-secondary-dark" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    Mobile
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    value={form.mobile}
                    onChange={handleChange}
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    Admission No
                  </label>
                  <input
                    type="text"
                    name="admission_no"
                    value={form.admission_no}
                    onChange={handleChange}
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={form.date_of_birth}
                    onChange={handleChange}
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    Standard
                  </label>
                  <input
                    type="text"
                    name="standard"
                    value={form.standard}
                    onChange={handleChange}
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  Address
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows={2}
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    Medium
                  </label>
                  <select
                    name="medium_id"
                    value={form.medium_id}
                    onChange={handleChange}
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select Medium</option>
                    {mediums.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Graduated">Graduated</option>
                  </select>
                </div>
              </div>

              {/* GST Section */}
              <div className="border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold text-secondary-dark mb-3">GST Information</h3>
                <div>
                  <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                    GSTIN
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      name="gstin"
                      value={form.gstin}
                      onChange={handleChange}
                      className="flex-1 border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary uppercase"
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                    />
                    <GSTLookup
                      gstin={form.gstin}
                      onSuccess={handleGSTLookupSuccess}
                      buttonText="Fetch GST Details"
                      className="flex-shrink-0"
                    />
                  </div>
                  <p className="text-xs text-secondary-light mt-1">
                    Enter GSTIN and click "Fetch GST Details" to auto‑fill business name, state, and billing address.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                      Legal Business Name
                    </label>
                    <input
                      type="text"
                      name="legal_business_name"
                      value={form.legal_business_name}
                      onChange={handleChange}
                      className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                      Trade Name
                    </label>
                    <input
                      type="text"
                      name="trade_name"
                      value={form.trade_name}
                      onChange={handleChange}
                      className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                      State
                    </label>
                    <select
                      name="state_code"
                      value={form.state_code}
                      onChange={handleChange}
                      className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select State</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.code}>
                          {state.name} ({state.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                      Place of Supply (Default)
                    </label>
                    <select
                      name="place_of_supply"
                      value={form.place_of_supply}
                      onChange={handleChange}
                      className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Default</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.code}>
                          {state.name} ({state.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                      Registration Type
                    </label>
                    <select
                      name="registration_type"
                      value={form.registration_type}
                      onChange={handleChange}
                      className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select</option>
                      <option value="Regular">Regular</option>
                      <option value="Composition">Composition</option>
                      <option value="Unregistered">Unregistered</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                      Billing Address
                    </label>
                    <input
                      type="text"
                      name="billing_address"
                      value={form.billing_address}
                      onChange={handleChange}
                      className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary"
                      placeholder="As per GST registration"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="border border-secondary-light px-4 py-2 rounded-lg text-sm hover:bg-secondary-bg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-primary hover:bg-primary-light text-white px-6 py-2 rounded-lg text-sm flex items-center gap-2 transition disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {editing ? "Update" : "Create"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {confirmDelete && (
        <ConfirmDialog
          message="Are you sure you want to delete this student?"
          onConfirm={() => { deleteMutation.mutate(confirmDelete); setConfirmDelete(null); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </AdminLayout>
  );
}