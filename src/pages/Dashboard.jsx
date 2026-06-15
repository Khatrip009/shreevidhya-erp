import { useEffect, useState } from "react";
import {
  Users,
  BookOpen,
  GraduationCap,
  CalendarCheck,
  IndianRupee,
  Clock,
  TrendingUp,
  AlertCircle,
  UserPlus,
  PhoneCall,
  PlusCircle,
  Receipt,
  FileText,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../api/supabase";

// ─── Reusable Stat Card ─────────────────────────────────────────────────
const StatCard = ({ icon: Icon, title, value, subtext, color }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light hover:border-primary transition-all">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-montserrat text-secondary">{title}</p>
        <h3 className="text-2xl font-righteous text-primary-dark mt-1">{value}</h3>
        {subtext && <p className="text-xs text-secondary-light mt-1 font-montserrat">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  </div>
);

// ─── Quick Action Button ────────────────────────────────────────────────
const QuickAction = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-xl shadow-sm border border-secondary-light hover:border-primary hover:shadow-md transition-all w-full"
  >
    <div className="p-3 bg-primary-bg rounded-full">
      <Icon size={20} className="text-primary" />
    </div>
    <span className="text-xs font-montserrat text-secondary-dark">{label}</span>
  </button>
);

// ─── Reusable Table ─────────────────────────────────────────────────────
const RecentTable = ({ title, columns, data, emptyMessage }) => (
  <div className="bg-white rounded-xl shadow-sm border border-secondary-light overflow-hidden">
    <h3 className="text-lg font-righteous text-primary-dark p-4 border-b border-secondary-light">
      {title}
    </h3>
    {data.length === 0 ? (
      <p className="p-4 text-sm text-secondary font-montserrat">{emptyMessage}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[400px]">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="text-left p-3 text-sm font-montserrat text-secondary-dark">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-t border-secondary-light hover:bg-primary-bg transition">
                {row.map((cell, i) => (
                  <td key={i} className="p-3 text-sm text-secondary-dark font-montserrat">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

// ─── Colors ─────────────────────────────────────────────────────────────
const COLORS = ["#0D47A1", "#FF1070", "#00C49F", "#FFBB28", "#0088FE", "#FF8042", "#AF19FF"];

// ─── Dashboard Component ────────────────────────────────────────────────
export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalStudents: 0,
    activeBatches: 0,
    todayAttendance: { present: 0, total: 0 },
    monthlyFeeCollection: 0,
    pendingFees: 0,
    totalTeachers: 0,
    activeCourses: 0,
    totalParents: 0,
    newInquiriesThisMonth: 0,
    recentInquiries: [],
    recentPayments: [],
    upcomingExams: [],
    monthlyFeeData: [],
    batchStudentData: [],
    inquiryTrendData: [],
    feeStatusData: [], // paid vs pending
    attendanceTrend: [], // last 7 days
    courseWiseStudents: [], // students per course
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const firstOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      )
        .toISOString()
        .split("T")[0];

      // ── Basic counts ──────────────────────────────────────────────────
      const [
        { count: studentCount },
        { count: batchCount },
        { count: teacherCount },
        { count: courseCount },
        { count: parentCount },
        { data: todaySessions },
        { data: monthlyPayments },
        { data: pendingFeeResult },
        { data: recentInquiries },
        { data: recentPayments },
        { data: upcomingExams },
        { count: newInquiriesCount },
      ] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("batches").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("teachers").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }).eq("status", true),
        supabase.from("parents").select("*", { count: "exact", head: true }),
        supabase.from("attendance_sessions").select("id").eq("attendance_date", today),
        supabase.from("fee_payments").select("amount").gte("payment_date", firstOfMonth),
        supabase.from("student_fees").select("id, final_fee"),
        supabase.from("inquiries").select("inquiry_no, student_name, mobile, status").order("created_at", { ascending: false }).limit(5),
        supabase.from("fee_payments").select("payment_date, amount, payment_mode, student_fees(student_id, students(first_name, last_name))").order("payment_date", { ascending: false }).limit(5),
        supabase.from("exams").select("exam_name, exam_date, batches(batch_name)").gte("exam_date", today).order("exam_date", { ascending: true }).limit(5),
        supabase.from("inquiries").select("*", { count: "exact", head: true }).gte("created_at", firstOfMonth),
      ]);

      // ── Today's attendance ──────────────────────────────────────────────
      let presentCount = 0;
      let totalMarked = 0;
      if (todaySessions.length > 0) {
        const sessionIds = todaySessions.map((s) => s.id);
        const { data: marks } = await supabase
          .from("student_attendance")
          .select("status")
          .in("session_id", sessionIds);
        if (marks) {
          presentCount = marks.filter((m) => m.status === "Present").length;
          totalMarked = marks.length;
        }
      }

      // ── Pending fees ───────────────────────────────────────────────────
      let pendingTotal = 0;
      if (pendingFeeResult) {
        const paymentSums = await Promise.all(
          pendingFeeResult.map(async (fee) => {
            const { data: pays } = await supabase
              .from("fee_payments")
              .select("amount")
              .eq("student_fee_id", fee.id);
            const paid = pays?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
            return Math.max(Number(fee.final_fee) - paid, 0);
          })
        );
        pendingTotal = paymentSums.reduce((sum, p) => sum + p, 0);
      }

      const monthlyTotal = monthlyPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // ── Charts data ─────────────────────────────────────────────────────

      // Monthly fee collection (last 6 months)
      const feeData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.toLocaleString("default", { month: "short" });
        const year = d.getFullYear();
        const startOfMonth = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        const endOfMonth = new Date(year, d.getMonth() + 1, 0).toISOString().split("T")[0];
        const { data: payments } = await supabase
          .from("fee_payments")
          .select("amount")
          .gte("payment_date", startOfMonth)
          .lte("payment_date", endOfMonth);
        feeData.push({ month, collection: payments?.reduce((s, p) => s + Number(p.amount), 0) || 0 });
      }

      // Students per batch
      const { data: activeBatches } = await supabase.from("batches").select("id, batch_name").eq("status", "active");
      const batchStudentData = [];
      if (activeBatches) {
        for (const batch of activeBatches) {
          const { data: enrollments } = await supabase.from("student_batches").select("id").eq("batch_id", batch.id).eq("status", "active");
          batchStudentData.push({ name: batch.batch_name, students: enrollments?.length || 0 });
        }
      }

      // Inquiry trend (last 6 months)
      const inquiryData = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.toLocaleString("default", { month: "short" });
        const year = d.getFullYear();
        const startOfMonth = `${year}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        const endOfMonth = new Date(year, d.getMonth() + 1, 0).toISOString().split("T")[0];
        const { count } = await supabase.from("inquiries").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth).lte("created_at", endOfMonth);
        inquiryData.push({ month, inquiries: count || 0 });
      }

      // Fee status (paid vs pending)
      let totalFee = 0;
      let paidFee = 0;
      if (pendingFeeResult) {
        for (const fee of pendingFeeResult) {
          totalFee += Number(fee.final_fee);
          const { data: pays } = await supabase.from("fee_payments").select("amount").eq("student_fee_id", fee.id);
          paidFee += pays?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        }
      }
      const pendingFee = totalFee - paidFee;
      const feeStatusData = [
        { name: "Paid", value: paidFee },
        { name: "Pending", value: pendingFee },
      ];

      // Attendance trend (last 7 days)
      const attendanceTrend = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const day = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-IN", { weekday: "short" });
        const { data: sessions } = await supabase.from("attendance_sessions").select("id").eq("attendance_date", day);
        if (sessions?.length) {
          const ids = sessions.map(s => s.id);
          const { data: marks } = await supabase.from("student_attendance").select("status").in("session_id", ids);
          const present = marks?.filter(m => m.status === "Present").length || 0;
          const total = marks?.length || 0;
          attendanceTrend.push({ day: label, date: day, percentage: total > 0 ? Math.round((present / total) * 100) : 0 });
        } else {
          attendanceTrend.push({ day: label, date: day, percentage: 0 });
        }
      }

      // Students per course (doughnut chart)
      const { data: courseStudentData } = await supabase.from("courses").select("id, course_name").eq("status", true);
      const courseWiseStudents = [];
      if (courseStudentData) {
        for (const course of courseStudentData) {
          const { data: batchesOfCourse } = await supabase.from("batches").select("id").eq("course_id", course.id).eq("status", "active");
          const batchIds = batchesOfCourse?.map(b => b.id) || [];
          if (batchIds.length > 0) {
            const { data: enrollments } = await supabase.from("student_batches").select("id").in("batch_id", batchIds).eq("status", "active");
            courseWiseStudents.push({ name: course.course_name, students: enrollments?.length || 0 });
          } else {
            courseWiseStudents.push({ name: course.course_name, students: 0 });
          }
        }
      }

      setStats({
        totalStudents: studentCount,
        activeBatches: batchCount,
        todayAttendance: { present: presentCount, total: totalMarked },
        monthlyFeeCollection: monthlyTotal,
        pendingFees: pendingTotal,
        totalTeachers: teacherCount,
        activeCourses: courseCount,
        totalParents: parentCount,
        newInquiriesThisMonth: newInquiriesCount,
        recentInquiries: recentInquiries || [],
        recentPayments: recentPayments || [],
        upcomingExams: upcomingExams || [],
        monthlyFeeData: feeData,
        batchStudentData,
        inquiryTrendData: inquiryData,
        feeStatusData,
        attendanceTrend,
        courseWiseStudents,
      });
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          <p className="mt-4 text-secondary font-montserrat">Loading dashboard…</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Welcome & Quick Actions */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-righteous text-primary-dark">
              Welcome, {profile?.full_name || "Admin"}!
            </h1>
            <p className="text-sm text-secondary-dark font-montserrat mt-1">
              Here's your academy at a glance.
            </p>
          </div>
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
            <QuickAction icon={PhoneCall} label="New Inquiry" onClick={() => navigate("/inquiries?new=true")} />
            <QuickAction icon={UserPlus} label="Add Student" onClick={() => navigate("/students?new=true")} />
            <QuickAction icon={Receipt} label="Record Payment" onClick={() => navigate("/fees?action=collect")} />
            <QuickAction icon={PlusCircle} label="New Exam" onClick={() => navigate("/exams?new=true")} />
            <QuickAction icon={CalendarCheck} label="New Session" onClick={() => navigate("/attendance?new=true")} />
            <QuickAction icon={FileText} label="New Homework" onClick={() => navigate("/homework?new=true")} />
          </div>
        </div>
      </div>

      {/* Stats Grid (enhanced) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard icon={Users} title="Total Students" value={stats.totalStudents} subtext="Active enrollments" color="bg-blue-500" />
        <StatCard icon={BookOpen} title="Active Batches" value={stats.activeBatches} subtext="Currently running" color="bg-emerald-500" />
        <StatCard icon={GraduationCap} title="Teachers" value={stats.totalTeachers} color="bg-purple-500" />
        <StatCard icon={Users} title="Parents" value={stats.totalParents} color="bg-cyan-500" />
        <StatCard
          icon={CalendarCheck}
          title="Today's Attendance"
          value={stats.todayAttendance.total > 0 ? `${Math.round((stats.todayAttendance.present / stats.todayAttendance.total) * 100)}%` : "N/A"}
          subtext={stats.todayAttendance.total > 0 ? `${stats.todayAttendance.present} / ${stats.todayAttendance.total} marked` : "No session today"}
          color="bg-orange-500"
        />
        <StatCard icon={IndianRupee} title="Monthly Collection" value={`₹${stats.monthlyFeeCollection.toLocaleString()}`} subtext="This month" color="bg-green-600" />
        <StatCard icon={AlertCircle} title="Pending Fees" value={`₹${stats.pendingFees.toLocaleString()}`} subtext="All time" color="bg-red-500" />
        <StatCard icon={TrendingUp} title="Active Courses" value={stats.activeCourses} color="bg-teal-500" />
        <StatCard icon={Clock} title="Upcoming Exams" value={stats.upcomingExams.length} subtext="Next few days" color="bg-indigo-500" />
        <StatCard icon={PhoneCall} title="New Inquiries (Month)" value={stats.newInquiriesThisMonth} subtext="This month" color="bg-pink-500" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Fee Collection */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h3 className="text-lg font-righteous text-primary-dark mb-4">Monthly Fee Collection (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.monthlyFeeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
              <Bar dataKey="collection" fill="#0D47A1" radius={[4, 4, 0, 0]} name="Collection" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Students per Batch Pie */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h3 className="text-lg font-righteous text-primary-dark mb-4">Students per Batch</h3>
          {stats.batchStudentData.length === 0 ? (
            <p className="text-sm text-secondary text-center py-12">No batch data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.batchStudentData} dataKey="students" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, students }) => `${name}: ${students}`}>
                  {stats.batchStudentData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Attendance Trend (Last 7 Days) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h3 className="text-lg font-righteous text-primary-dark mb-4">Attendance Trend (Last 7 Days)</h3>
          {stats.attendanceTrend.length === 0 ? (
            <p className="text-sm text-secondary text-center py-12">No attendance data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Line type="monotone" dataKey="percentage" stroke="#0D47A1" strokeWidth={2} name="Attendance %" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Fee Status (Paid vs Pending) */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h3 className="text-lg font-righteous text-primary-dark mb-4">Fee Status (Overall)</h3>
          {stats.feeStatusData.reduce((s, i) => s + i.value, 0) === 0 ? (
            <p className="text-sm text-secondary text-center py-12">No fee data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.feeStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ₹${value.toLocaleString()}`}>
                  <Cell fill="#16a34a" />
                  <Cell fill="#dc2626" />
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Course‑wise Students Doughnut */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h3 className="text-lg font-righteous text-primary-dark mb-4">Students per Course</h3>
          {stats.courseWiseStudents.length === 0 ? (
            <p className="text-sm text-secondary text-center py-12">No course data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={stats.courseWiseStudents} dataKey="students" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({ name, students }) => `${name}: ${students}`}>
                  {stats.courseWiseStudents.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Inquiry Trend */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h3 className="text-lg font-righteous text-primary-dark mb-4">Inquiry Trend (Last 6 Months)</h3>
          {stats.inquiryTrendData.length === 0 ? (
            <p className="text-sm text-secondary text-center py-12">No inquiry data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.inquiryTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="inquiries" stroke="#FF1070" strokeWidth={2} name="Inquiries" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTable
          title="Recent Inquiries"
          columns={["Inquiry No", "Student", "Mobile", "Status"]}
          data={stats.recentInquiries.map((inq) => [
            inq.inquiry_no,
            inq.student_name,
            inq.mobile,
            <span key={inq.inquiry_no} className={`px-2 py-1 rounded-full text-xs font-medium ${
              inq.status === "New" ? "bg-blue-100 text-blue-700" : inq.status === "Joined" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
            }`}>{inq.status}</span>,
          ])}
          emptyMessage="No recent inquiries"
        />
        <RecentTable
          title="Recent Payments"
          columns={["Date", "Student", "Amount", "Mode"]}
          data={stats.recentPayments.map((pay) => [
            pay.payment_date,
            pay.student_fees?.students ? `${pay.student_fees.students.first_name} ${pay.student_fees.students.last_name}` : "N/A",
            `₹${Number(pay.amount).toLocaleString()}`,
            pay.payment_mode,
          ])}
          emptyMessage="No recent payments"
        />
        <RecentTable
          title="Upcoming Exams"
          columns={["Exam", "Batch", "Date"]}
          data={stats.upcomingExams.map((exam) => [
            exam.exam_name,
            exam.batches?.batch_name || "-",
            exam.exam_date,
          ])}
          emptyMessage="No upcoming exams"
        />
      </div>
    </AdminLayout>
  );
}