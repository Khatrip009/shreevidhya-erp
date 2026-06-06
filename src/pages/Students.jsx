import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  UserCircle2,
  Search,
  Filter,
  Download,
  Upload,
  Printer,
  X,
  Users,
} from "lucide-react";
import Papa from "papaparse";
import AdminLayout from "../layouts/AdminLayout";
import StudentForm from "../components/StudentForm";
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getAllStudentsForExport,
} from "../services/studentService";
import { generateAdmissionPdf } from "../utils/admissionPdf";
import { printAdmissionForm } from "../utils/printAdmissionForm";

export default function Students() {
  const queryClient = useQueryClient();

  // Filters – quick search always visible, others inside advanced panel
  const [search, setSearch] = useState("");
  const [advancedFilters, setAdvancedFilters] = useState({
    standard: "",
    gender: "",
    status: "",
    batch_id: "",
    course_id: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const fileInputRef = useRef(null);

  // Combine quick search with advanced filters for API call
  const filters = { search, ...advancedFilters };

  // Infinite query
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["students", filters],
    queryFn: ({ pageParam = 0 }) => getStudents({ pageParam, filters }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce(
        (sum, page) => sum + page.data.length,
        0
      );
      if (lastPage.count && totalFetched < lastPage.count) {
        return allPages.length;
      }
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
  });

  const students = data?.pages.flatMap((page) => page.data) || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      toast.success("Student created");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setShowForm(false);
    },
    onError: () => toast.error("Failed to create student"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateStudent(id, payload),
    onSuccess: () => {
      toast.success("Student updated");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditing(null);
    },
    onError: () => toast.error("Failed to update student"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => toast.success("Student deleted"),
    onError: () => toast.error("Delete failed"),
  });

  // CSV Import
  async function handleCSVImport(event) {
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
              admission_no: row.admission_no || null,
              first_name: row.first_name,
              last_name: row.last_name,
              mobile: row.mobile,
              standard: row.standard,
              school_name: row.school_name,
            };
            await createStudent(payload);
            successCount++;
          } catch (err) {
            console.error(err);
          }
        }
        toast.success(`${successCount} students imported`);
        queryClient.invalidateQueries({ queryKey: ["students"] });
      },
      error: () => toast.error("CSV parsing error"),
    });
  }

  // CSV Export
  async function handleCSVExport() {
    try {
      const allData = await getAllStudentsForExport(filters);
      const csv = Papa.unparse(allData);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Export failed");
    }
  }

  // PDF / Print
  async function handlePrintAdmission(studentId) {
    try {
      await generateAdmissionPdf(studentId);
    } catch (err) {
      console.error("PDF fallback:", err);
      try {
        await printAdmissionForm(studentId);
      } catch (fallbackErr) {
        toast.error(fallbackErr.message || "Failed to generate form");
      }
    }
  }

  function handleCreate(payload) {
    createMutation.mutate(payload);
  }

  function handleUpdate(payload) {
    updateMutation.mutate({ id: editing.id, payload });
  }

  function handleDelete(id) {
    if (!window.confirm("Delete student?")) return;
    deleteMutation.mutate(id);
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-righteous text-primary-dark">Students</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-primary-light text-white px-5 py-2.5 rounded-lg transition font-montserrat text-sm flex items-center gap-2"
          >
            <Users size={18} /> Add Student
          </button>
          <button
            onClick={handleCSVExport}
            className="border border-secondary-light px-4 py-2.5 rounded-lg text-secondary-dark hover:bg-secondary-bg font-montserrat text-sm flex items-center gap-2"
          >
            <Download size={18} /> Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="border border-secondary-light px-4 py-2.5 rounded-lg text-secondary-dark hover:bg-secondary-bg font-montserrat text-sm flex items-center gap-2"
          >
            <Upload size={18} /> Import
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleCSVImport}
          />
        </div>
      </div>

      {/* Quick Search & Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            placeholder="Search by name or admission no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-secondary-light rounded-lg pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="border border-secondary-light px-4 py-2.5 rounded-lg text-secondary-dark hover:bg-secondary-bg font-montserrat text-sm flex items-center gap-2 self-start"
        >
          <Filter size={18} /> Advanced Filters
          {showFilters ? <X size={16} /> : null}
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border border-secondary-light">
          <div>
            <label className="text-xs font-montserrat text-secondary-dark">Standard</label>
            <input
              type="text"
              value={advancedFilters.standard}
              onChange={(e) => setAdvancedFilters({ ...advancedFilters, standard: e.target.value })}
              className="w-full border border-secondary-light rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-primary"
              placeholder="e.g., 10"
            />
          </div>
          <div>
            <label className="text-xs font-montserrat text-secondary-dark">Gender</label>
            <select
              value={advancedFilters.gender}
              onChange={(e) => setAdvancedFilters({ ...advancedFilters, gender: e.target.value })}
              className="w-full border border-secondary-light rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-primary"
            >
              <option value="">All</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-montserrat text-secondary-dark">Status</label>
            <select
              value={advancedFilters.status}
              onChange={(e) => setAdvancedFilters({ ...advancedFilters, status: e.target.value })}
              className="w-full border border-secondary-light rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-primary"
            >
              <option value="">All</option>
              <option>active</option>
              <option>inactive</option>
              <option>graduated</option>
            </select>
          </div>
          {/* Additional filters can be added here */}
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-100 border-b border-secondary-light">
              <tr>
                <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">Photo</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Admission No</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Name</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Mobile</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Standard</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-secondary">Loading students…</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-secondary">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="text-secondary-light" />
                      <span>No students found</span>
                      <span className="text-xs text-secondary-light">Try adjusting your search or filters</span>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="border-b border-secondary-light hover:bg-primary-bg transition">
                    <td className="p-3">
                      {student.photo_url ? (
                        <img
                          src={student.photo_url}
                          alt={student.first_name}
                          className="w-10 h-10 rounded-full object-cover border border-secondary-light"
                        />
                      ) : (
                        <UserCircle2 className="w-10 h-10 text-secondary" />
                      )}
                    </td>
                    <td className="text-sm">{student.admission_no || "-"}</td>
                    <td>
                      <Link to={`/students/${student.id}`} className="text-primary hover:underline font-medium text-sm">
                        {student.first_name} {student.last_name}
                      </Link>
                    </td>
                    <td className="text-sm">{student.mobile}</td>
                    <td className="text-sm">{student.standard || "-"}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditing(student)} className="text-blue-600 hover:underline text-sm">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(student.id)} className="text-red-500 hover:underline text-sm">
                          Delete
                        </button>
                        <button
                          onClick={() => handlePrintAdmission(student.id)}
                          className="text-green-600 hover:underline text-sm flex items-center gap-1"
                        >
                          <Printer size={14} /> Print
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

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat text-sm transition disabled:opacity-60"
          >
            {isFetchingNextPage ? "Loading more…" : "Load More"}
          </button>
        </div>
      )}

      {/* Student Form Modals */}
      {showForm && (
        <StudentForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
      {editing && (
        <StudentForm
          initialData={editing}
          onSubmit={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}
    </AdminLayout>
  );
}