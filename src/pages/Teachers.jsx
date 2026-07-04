// src/pages/Teachers.jsx
import React, { useState, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Search,
  Download,
  Upload,
  Printer,
  UserRoundPlus,
  Mail,
  Link as LinkIcon,
  Unlink,
  Filter,
  X,
  CreditCard,   // <-- added for ID Card button
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
  getMediumOptions,
  getCourseOptions,
  getCourseLevelOptions,
  getSubjectOptions,
} from "../services/teacherService";
import { generateTeacherResumePdf } from "../utils/teacherResumePdf";
import { generateIdCard } from "../utils/idCardPdf";   // <-- imported

export default function Teachers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [mediumFilter, setMediumFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [courseLevelFilter, setCourseLevelFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const fileInputRef = useRef(null);

  // Dropdown data for filters
  const { data: mediums = [] } = useQuery({
    queryKey: ["mediums"],
    queryFn: getMediumOptions,
    staleTime: 10 * 60 * 1000,
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: getCourseOptions,
    staleTime: 10 * 60 * 1000,
  });
  const { data: courseLevels = [] } = useQuery({
    queryKey: ["courseLevels"],
    queryFn: getCourseLevelOptions,
    staleTime: 10 * 60 * 1000,
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: getSubjectOptions,
    staleTime: 10 * 60 * 1000,
  });

  const filters = {
    search,
    medium_id: mediumFilter,
    course_id: courseFilter,
    course_level_id: courseLevelFilter,
    subject_id: subjectFilter,
  };

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["teachers", filters],
    queryFn: ({ pageParam = 0 }) => getTeachers({ pageParam, filters }),
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
              medium_ids: row.medium_id ? [Number(row.medium_id)] : [],
              course_ids: row.course_id ? [Number(row.course_id)] : [],
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

  async function handleCSVExport() {
    try {
      const allData = await getAllTeachersForExport(filters);
      const csv = Papa.unparse(
        allData.map((t) => ({
          employee_code: t.employee_code,
          first_name: t.first_name,
          last_name: t.last_name,
          mobile: t.mobile,
          email: t.email,
          qualification: t.qualification,
          joining_date: t.joining_date,
          salary: t.salary,
          status: t.status,
          mediums: (t.mediums || []).join(", "),
          courses: (t.courses || []).join(", "),
          course_levels: (t.course_levels || []).join(", "),
          subjects: (t.subjects || []).join(", "),
        }))
      );
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

  async function handlePrintResume(teacherId) {
    try {
      await generateTeacherResumePdf(teacherId);
    } catch (err) {
      toast.error("Failed to generate resume PDF");
    }
  }

  // ID Card handler
  async function handlePrintIdCard(teacherId) {
    try {
      await generateIdCard({ type: "teacher", id: teacherId });
    } catch (err) {
      toast.error(err.message || "Failed to generate ID Card");
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

  const truncateId = (uuid) =>
    uuid ? `${uuid.substring(0, 8)}...${uuid.substring(uuid.length - 4)}` : null;

  return (
    <AdminLayout>
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

      {/* Search & Filter Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
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
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="border border-secondary-light px-4 py-2.5 rounded-lg text-secondary-dark hover:bg-secondary-bg font-montserrat text-sm flex items-center gap-2"
        >
          <Filter size={18} /> Filters
          {showFilters && <X size={16} />}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border border-secondary-light">
          <div>
            <label className="text-xs font-montserrat text-secondary-dark">Medium</label>
            <select
              value={mediumFilter}
              onChange={(e) => setMediumFilter(e.target.value)}
              className="w-full border border-secondary-light rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-primary"
            >
              <option value="">All Mediums</option>
              {mediums.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-montserrat text-secondary-dark">Course</label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full border border-secondary-light rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-primary"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.course_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-montserrat text-secondary-dark">Course Level</label>
            <select
              value={courseLevelFilter}
              onChange={(e) => setCourseLevelFilter(e.target.value)}
              className="w-full border border-secondary-light rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-primary"
            >
              <option value="">All Levels</option>
              {courseLevels.map((cl) => (
                <option key={cl.id} value={cl.id}>{cl.level_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-montserrat text-secondary-dark">Subject</label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full border border-secondary-light rounded p-2 text-sm mt-1 focus:ring-1 focus:ring-primary"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.subject_name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end col-span-full">
            <button
              onClick={() => {
                setSearch("");
                setMediumFilter("");
                setCourseFilter("");
                setCourseLevelFilter("");
                setSubjectFilter("");
              }}
              className="text-primary text-sm hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px]">
            <thead className="bg-slate-100 border-b border-secondary-light">
              <tr>
                <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">Code</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Name</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Mobile</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Email</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Linked Account</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Qualification</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Medium</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Course</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Course Levels</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Subjects</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Salary</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-secondary">Loading teachers…</td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-6 text-center text-secondary">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="text-secondary-light" />
                      <span>No teachers found</span>
                      <span className="text-xs text-secondary-light">
                        {search || mediumFilter || courseFilter || courseLevelFilter || subjectFilter
                          ? "Try adjusting your filters"
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
                    <td className="p-3 text-sm">{teacher.employee_code || "-"}</td>
                    <td className="text-sm font-medium">
                      {teacher.first_name} {teacher.last_name}
                    </td>
                    <td className="text-sm">{teacher.mobile}</td>
                    <td className="text-sm">{teacher.email || "-"}</td>
                    <td className="text-sm">
                      {teacher.user_id ? (
                        <div className="flex items-center gap-1">
                          <LinkIcon size={14} className="text-green-600" />
                          <span
                            className="text-green-700 cursor-help"
                            title={teacher.user_id}
                          >
                            {teacher.email || truncateId(teacher.user_id)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500">
                          <Unlink size={14} />
                          <span>Not linked</span>
                        </div>
                      )}
                    </td>
                    <td className="text-sm">{teacher.qualification || "-"}</td>
                    <td className="text-sm">
                      {teacher.mediums?.length > 0
                        ? teacher.mediums.map((m) => m.name).join(", ")
                        : "—"}
                    </td>
                    <td className="text-sm">
                      {teacher.courses?.length > 0
                        ? teacher.courses.map((c) => c.name).join(", ")
                        : "—"}
                    </td>
                    <td className="text-sm">
                      {teacher.course_levels?.length > 0
                        ? teacher.course_levels.map((cl) => cl.name).join(", ")
                        : "—"}
                    </td>
                    <td className="text-sm">
                      {teacher.subjects?.length > 0
                        ? teacher.subjects.map((s) => s.name).join(", ")
                        : "—"}
                    </td>
                    <td className="text-sm">
                      {teacher.salary
                        ? `₹${Number(teacher.salary).toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="text-sm">
                      <div className="flex gap-2 flex-wrap">
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
                        {/* ID Card Button */}
                        <button
                          onClick={() => handlePrintIdCard(teacher.id)}
                          className="text-indigo-600 hover:underline flex items-center gap-1"
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