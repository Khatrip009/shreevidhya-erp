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
   CreditCard, 
} from "lucide-react";
import Papa from "papaparse";
import AdminLayout from "../layouts/AdminLayout";
import StudentForm from "../components/StudentForm";
import {
  getStudents,
  deleteStudent,
  getAllStudentsForExport,
} from "../services/studentService";
import { generateAdmissionPdf } from "../utils/admissionPdf";
import { printAdmissionForm } from "../utils/printAdmissionForm";
import { generateIdCard } from "../utils/idCardPdf";

export default function Students() {
  const queryClient = useQueryClient();

  // Filters
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
  const [editingStudent, setEditingStudent] = useState(null);
  const fileInputRef = useRef(null);

  const filters = { search, ...advancedFilters };

  // Infinite query – unchanged
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

  // Only delete mutation remains (create/update are handled inside StudentForm)
  const deleteMutation = useMutation({
    mutationFn: deleteStudent,
    onSuccess: () => {
      toast.success("Student deleted");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  // CSV Import – uses createStudent from service (still works because it expects clean payload)
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
            // We still import via the service because CSV doesn't need parent linking etc.
            const { createStudent } = await import("../services/studentService");
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

  // CSV Export – unchanged
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

  // PDF / Print – unchanged
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

  function handleDelete(id) {
    if (!window.confirm("Delete student?")) return;
    deleteMutation.mutate(id);
  }

  // Called after StudentForm successfully creates/updates a student
  function handleFormSuccess() {
    queryClient.invalidateQueries({ queryKey: ["students"] });
    setShowForm(false);
    setEditingStudent(null);
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

      {/* Quick Search & Filter Toggle – unchanged */}
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

      {/* Advanced Filters Panel – unchanged */}
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
        </div>
      )}

      {/* Students Table – unchanged except Edit button now sets editingStudent */}
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
                        <button
                          onClick={() => setEditingStudent(student)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-500 hover:underline text-sm"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => handlePrintAdmission(student.id)}
                          className="text-green-600 hover:underline text-sm flex items-center gap-1"
                        >
                          <Printer size={14} /> Print
                        </button>
                        
                        <button
                          onClick={async () => {         // <-- make it async
                            try {
                              await generateIdCard({ type: "student", id: student.id });
                            } catch (err) {
                              toast.error(err.message);
                            }
                          }}
                          className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                        >
                          <CreditCard size={14} /> ID Card
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

      {/* Load More – unchanged */}
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

      {/* Student Form Modals – using the self‑contained StudentForm */}
      {showForm && (
        <StudentForm
          onSuccess={handleFormSuccess}
          onClose={() => setShowForm(false)}
        />
      )}
      {editingStudent && (
        <StudentForm
          initialData={editingStudent}
          onSuccess={handleFormSuccess}
          onClose={() => setEditingStudent(null)}
        />
      )}
    </AdminLayout>
  );
}