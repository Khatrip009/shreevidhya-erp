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
  Award,
} from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../api/supabase";

// Reusable stat card with brand styling
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

// Reusable table section with brand styling
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

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeBatches: 0,
    todayAttendance: { present: 0, total: 0 },
    monthlyFeeCollection: 0,
    pendingFees: 0,
    totalTeachers: 0,
    activeCourses: 0,
    recentInquiries: [],
    recentPayments: [],
    upcomingExams: [],
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

      // Fetch everything in parallel
      const [
        { count: studentCount },
        { count: batchCount },
        { count: teacherCount },
        { count: courseCount },
        { data: todaySessions },
        { data: monthlyPayments },
        { data: pendingFeeResult },
        { data: recentInquiries },
        { data: recentPayments },
        { data: upcomingExams },
      ] = await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase
          .from("batches")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("teachers").select("*", { count: "exact", head: true }),
        supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("status", true),
        // today's attendance sessions
        supabase
          .from("attendance_sessions")
          .select("id, batches(batch_name)")
          .eq("attendance_date", today),
        // monthly fee collection
        supabase
          .from("fee_payments")
          .select("amount")
          .gte("payment_date", firstOfMonth),
        // pending fees total (sum of final_fee minus sum of paid)
        supabase.from("student_fees").select("id, final_fee"),
        // recent inquiries (last 5)
        supabase
          .from("inquiries")
          .select("inquiry_no, student_name, mobile, status")
          .order("created_at", { ascending: false })
          .limit(5),
        // recent payments (last 5)
        supabase
          .from("fee_payments")
          .select("payment_date, amount, payment_mode, student_fees(student_id, students(first_name, last_name))")
          .order("payment_date", { ascending: false })
          .limit(5),
        // upcoming exams (next 5)
        supabase
          .from("exams")
          .select("exam_name, exam_date, batches(batch_name)")
          .gte("exam_date", today)
          .order("exam_date", { ascending: true })
          .limit(5),
      ]);

      // Calculate today's attendance
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

      // Calculate pending fees
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

      const monthlyTotal =
        monthlyPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      setStats({
        totalStudents: studentCount,
        activeBatches: batchCount,
        todayAttendance: { present: presentCount, total: totalMarked },
        monthlyFeeCollection: monthlyTotal,
        pendingFees: pendingTotal,
        totalTeachers: teacherCount,
        activeCourses: courseCount,
        recentInquiries: recentInquiries || [],
        recentPayments: recentPayments || [],
        upcomingExams: upcomingExams || [],
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
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-secondary font-montserrat">Loading dashboard…</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-righteous text-primary-dark">
          Welcome, {profile?.full_name || "Admin"}!
        </h1>
        <p className="text-sm text-secondary-dark font-montserrat mt-1">
          Here's your academy at a glance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={Users}
          title="Total Students"
          value={stats.totalStudents}
          subtext="Active enrollments"
          color="bg-blue-500"
        />
        <StatCard
          icon={BookOpen}
          title="Active Batches"
          value={stats.activeBatches}
          subtext="Currently running"
          color="bg-emerald-500"
        />
        <StatCard
          icon={GraduationCap}
          title="Teachers"
          value={stats.totalTeachers}
          color="bg-purple-500"
        />
        <StatCard
          icon={CalendarCheck}
          title="Today's Attendance"
          value={
            stats.todayAttendance.total > 0
              ? `${Math.round(
                  (stats.todayAttendance.present /
                    stats.todayAttendance.total) *
                    100
                )}%`
              : "N/A"
          }
          subtext={
            stats.todayAttendance.total > 0
              ? `${stats.todayAttendance.present} present / ${stats.todayAttendance.total} marked`
              : "No session today"
          }
          color="bg-orange-500"
        />
        <StatCard
          icon={IndianRupee}
          title="Monthly Fee Collection"
          value={`₹${stats.monthlyFeeCollection.toLocaleString()}`}
          subtext="This month"
          color="bg-green-600"
        />
        <StatCard
          icon={AlertCircle}
          title="Pending Fees"
          value={`₹${stats.pendingFees.toLocaleString()}`}
          subtext="All time"
          color="bg-red-500"
        />
        <StatCard
          icon={TrendingUp}
          title="Active Courses"
          value={stats.activeCourses}
          color="bg-teal-500"
        />
        <StatCard
          icon={Clock}
          title="Upcoming Exams"
          value={stats.upcomingExams.length}
          subtext="Next few days"
          color="bg-indigo-500"
        />
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
            <span
              key={inq.inquiry_no}
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                inq.status === "New"
                  ? "bg-blue-100 text-blue-700"
                  : inq.status === "Joined"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {inq.status}
            </span>,
          ])}
          emptyMessage="No recent inquiries"
        />
        <RecentTable
          title="Recent Payments"
          columns={["Date", "Student", "Amount", "Mode"]}
          data={stats.recentPayments.map((pay) => [
            pay.payment_date,
            pay.student_fees?.students
              ? `${pay.student_fees.students.first_name} ${pay.student_fees.students.last_name}`
              : "N/A",
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