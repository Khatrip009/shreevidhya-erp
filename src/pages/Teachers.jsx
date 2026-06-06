import React, { useState, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Search,
  Download,
  Upload,
  Printer,
  UserRoundPlus,
} from "lucide-react";
import Papa from "papaparse";
import AdminLayout from "../layouts/AdminLayout";
import TeacherForm from "../components/TeacherForm";
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getAllTeachersForExport,
} from "../services/teacherService";
import { generateTeacherResumePdf } from "../utils/teacherResumePdf";

export default function Teachers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const fileInputRef = useRef(null);

  // Infinite query with search filter
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["teachers", { search }],
    queryFn: ({ pageParam = 0 }) =>
      getTeachers({ pageParam, filters: { search } }),
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

  const teachers = data?.pages.flatMap((page) => page.data) || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess: () => {
      toast.success("Teacher created");
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setShowForm(false);
    },
    onError: () => toast.error("Failed to create teacher"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateTeacher(id, payload),
    onSuccess: () => {
      toast.success("Teacher updated");
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setEditing(null);
    },
    onError: () => toast.error("Failed to update teacher"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      toast.success("Teacher deleted");
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: () =>
      toast.error("Deletion failed. The teacher may be assigned to a batch."),
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
              employee_code: row.employee_code || null,
              first_name: row.first_name,
              last_name: row.last_name,
              mobile: row.mobile,
              email: row.email,
              qualification: row.qualification,
              joining_date: row.joining_date || null,
              salary: row.salary ? Number(row.salary) : null,
              status: row.status || "active",
            };
            await createTeacher(payload);
            successCount++;
          } catch (err) {
            console.error(err);
          }
        }
        toast.success(`${successCount} teachers imported`);
        queryClient.invalidateQueries({ queryKey: ["teachers"] });
      },
      error: () => toast.error("CSV parsing error"),
    });
  }

  // CSV Export
  async function handleCSVExport() {
    try {
      const allData = await getAllTeachersForExport({ search });
      const csv = Papa.unparse(allData);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "teachers.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Export failed");
    }
  }

  // Resume PDF
  async function handlePrintResume(teacherId) {
    try {
      await generateTeacherResumePdf(teacherId);
    } catch (err) {
      toast.error("Failed to generate resume PDF");
    }
  }

  function handleCreate(payload) {
    createMutation.mutate(payload);
  }

  function handleUpdate(payload) {
    updateMutation.mutate({ id: editing.id, payload });
  }

  function handleDelete(id) {
    if (!window.confirm("Delete this teacher?")) return;
    deleteMutation.mutate(id);
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-righteous text-primary-dark">Teachers</h1>
          <p className="text-sm text-secondary-dark font-montserrat mt-1">
            Manage your teaching staff
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-primary-light text-white px-5 py-2.5 rounded-lg transition font-montserrat text-sm flex items-center gap-2"
          >
            <UserRoundPlus size={18} /> Add Teacher
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

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
        />
        <input
          type="text"
          placeholder="Search by name or code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-secondary-light rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
        />
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-100 border-b border-secondary-light">
              <tr>
                <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">
                  Code
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Name
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Mobile
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Email
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Qualification
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Salary
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-secondary">
                    Loading teachers…
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-secondary">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="text-secondary-light" />
                      <span>No teachers found</span>
                      <span className="text-xs text-secondary-light">
                        {search
                          ? "Try adjusting your search"
                          : "Add a new teacher to get started"}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr
                    key={teacher.id}
                    className="border-b border-secondary-light hover:bg-primary-bg transition"
                  >
                    <td className="p-3 text-sm">
                      {teacher.employee_code || "-"}
                    </td>
                    <td className="text-sm font-medium">
                      {teacher.first_name} {teacher.last_name}
                    </td>
                    <td className="text-sm">{teacher.mobile}</td>
                    <td className="text-sm">{teacher.email || "-"}</td>
                    <td className="text-sm">
                      {teacher.qualification || "-"}
                    </td>
                    <td className="text-sm">
                      {teacher.salary
                        ? `₹${Number(teacher.salary).toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditing(teacher)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => handlePrintResume(teacher.id)}
                          className="text-green-600 hover:underline flex items-center gap-1"
                        >
                          <Printer size={14} /> Resume
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

      {/* Modals */}
      {showForm && (
        <TeacherForm
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}
      {editing && (
        <TeacherForm
          initialData={editing}
          onSubmit={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}
    </AdminLayout>
  );
}