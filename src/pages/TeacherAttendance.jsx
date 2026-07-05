import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../api/supabase";
import toast from "react-hot-toast";
import AdminLayout from "../layouts/AdminLayout";
import { Calendar, Users, CheckCircle, XCircle, Clock } from "lucide-react";

export default function TeacherAttendance() {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: teachers = [] } = useQuery({
    queryKey: ["active-teachers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("teachers")
        .select("id, first_name, last_name, employee_code")
        .eq("status", "active")
        .order("first_name");
      return data || [];
    },
  });

  const { data: attendance = [], isLoading } = useQuery({
    queryKey: ["teacher-attendance", date],
    queryFn: async () => {
      const { data } = await supabase
        .from("teacher_attendance")
        .select("*")
        .eq("attendance_date", date);
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const present = attendance.filter((a) => a.status === "present").length;
    const absent = attendance.filter((a) => a.status === "absent").length;
    const leave = attendance.filter((a) => a.status === "leave").length;
    const halfDay = attendance.filter((a) => a.status === "half_day").length;
    const total = teachers.length;
    const marked = attendance.length;
    return { total, marked, present, absent, leave, halfDay };
  }, [attendance, teachers]);

  const mutation = useMutation({
    mutationFn: async ({ teacher_id, status }) => {
      const existing = attendance.find((a) => a.teacher_id === teacher_id);
      if (existing) {
        const { error } = await supabase
          .from("teacher_attendance")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("teacher_attendance")
          .insert({ teacher_id, attendance_date: date, status });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Attendance updated");
      qc.invalidateQueries(["teacher-attendance"]);
    },
    onError: (err) => toast.error(err.message),
  });

  const getStatus = (teacherId) => {
    const record = attendance.find((a) => a.teacher_id === teacherId);
    return record?.status || "pending";
  };

  const handleBulkStatus = (status) => {
    teachers.forEach((t) => {
      mutation.mutate({ teacher_id: t.id, status });
    });
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">Teacher Attendance</h1>
        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-light w-4 h-4" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-3 border">
          <p className="text-xs text-secondary-light">Total Teachers</p>
          <p className="text-xl font-bold text-primary">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border">
          <p className="text-xs text-secondary-light">Marked</p>
          <p className="text-xl font-bold">{stats.marked}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-green-200">
          <p className="text-xs text-green-600">Present</p>
          <p className="text-xl font-bold text-green-700">{stats.present}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-red-200">
          <p className="text-xs text-red-600">Absent</p>
          <p className="text-xl font-bold text-red-700">{stats.absent}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3 border border-yellow-200">
          <p className="text-xs text-yellow-600">Leave / Half-Day</p>
          <p className="text-xl font-bold text-yellow-700">{stats.leave + stats.halfDay}</p>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => handleBulkStatus("present")}
          className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm hover:bg-green-200 transition flex items-center gap-1"
        >
          <CheckCircle className="w-4 h-4" /> Mark All Present
        </button>
        <button
          onClick={() => handleBulkStatus("absent")}
          className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-sm hover:bg-red-200 transition flex items-center gap-1"
        >
          <XCircle className="w-4 h-4" /> Mark All Absent
        </button>
        <button
          onClick={() => handleBulkStatus("leave")}
          className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-sm hover:bg-yellow-200 transition flex items-center gap-1"
        >
          <Clock className="w-4 h-4" /> Mark All Leave
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-secondary-dark">Teacher</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-secondary-dark">Employee Code</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-secondary-dark">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-secondary">Loading...</td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-secondary">No active teachers.</td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-medium">
                      {t.first_name} {t.last_name}
                    </td>
                    <td className="px-4 py-3 text-sm">{t.employee_code || "—"}</td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        value={getStatus(t.id)}
                        onChange={(e) => mutation.mutate({ teacher_id: t.id, status: e.target.value })}
                        className="border rounded p-1.5 text-sm bg-white focus:ring-1 focus:ring-primary"
                      >
                        <option value="pending">—</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="leave">Leave</option>
                        <option value="half_day">Half Day</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {teachers.length > 0 && (
          <div className="px-4 py-2 text-xs text-secondary-light border-t">
            {attendance.filter((a) => a.status !== "pending").length} marked out of {teachers.length}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}