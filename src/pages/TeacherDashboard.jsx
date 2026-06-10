import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Layers,
  CalendarCheck,
  BookOpen,
  Award,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import AdminLayout from "../layouts/AdminLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../api/supabase";

export default function TeacherDashboard() {
  const { user, profile } = useAuth();

  // 1. Find the teacher record linked to this auth user (safe version)
  const { data: teacherId, isLoading: teacherLoading } = useQuery({
    queryKey: ["teacher-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();                // won't throw if 0 rows
      if (error) throw error;
      return data?.id || null;         // explicitly null or number
    },
    enabled: !!user?.id,
  });

  // 2. Assigned batches
  const { data: batches = [], isLoading: batchesLoading } = useQuery({
    queryKey: ["teacher-batches", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data } = await supabase
        .from("batch_teachers")
        .select(`
          batch_id,
          batches(
            id,
            batch_name,
            start_time,
            end_time,
            days,
            capacity,
            courses(course_name)
          )
        `)
        .eq("teacher_id", teacherId);
      return data || [];
    },
    enabled: !!teacherId,
  });

  const batchIds = batches.map((b) => b.batch_id);

  // 3. Today's attendance sessions
  const today = new Date().toISOString().split("T")[0];
  const { data: todaySessions = [] } = useQuery({
    queryKey: ["teacher-today-sessions", batchIds, today],
    queryFn: async () => {
      if (!batchIds.length) return [];
      const { data } = await supabase
        .from("attendance_sessions")
        .select(`id, attendance_date, topic_covered, batches(batch_name)`)
        .in("batch_id", batchIds)
        .eq("attendance_date", today);
      return data || [];
    },
    enabled: batchIds.length > 0,
  });

  // 4. Upcoming homework (next 5)
  const { data: homeworks = [] } = useQuery({
    queryKey: ["teacher-homeworks", batchIds],
    queryFn: async () => {
      if (!batchIds.length) return [];
      const { data } = await supabase
        .from("homework")
        .select(`id, title, due_date, batches(batch_name), subjects(subject_name)`)
        .in("batch_id", batchIds)
        .gte("due_date", today)
        .order("due_date", { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: batchIds.length > 0,
  });

  // 5. Upcoming exams (next 5)
  const { data: exams = [] } = useQuery({
    queryKey: ["teacher-exams", batchIds],
    queryFn: async () => {
      if (!batchIds.length) return [];
      const { data } = await supabase
        .from("exams")
        .select(`id, exam_name, exam_date, total_marks, batches(batch_name)`)
        .in("batch_id", batchIds)
        .gte("exam_date", today)
        .order("exam_date", { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: batchIds.length > 0,
  });

  // 6. Attendance trend (last 30 days) for chart
  const { data: attendanceTrend = [] } = useQuery({
    queryKey: ["teacher-attendance-trend", batchIds],
    queryFn: async () => {
      if (!batchIds.length) return [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDate = thirtyDaysAgo.toISOString().split("T")[0];

      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select(`id, attendance_date`)
        .in("batch_id", batchIds)
        .gte("attendance_date", startDate)
        .order("attendance_date", { ascending: true });

      if (!sessions || sessions.length === 0) return [];

      const sessionIds = sessions.map((s) => s.id);
      const { data: marks } = await supabase
        .from("student_attendance")
        .select("session_id, status")
        .in("session_id", sessionIds);

      // group by date
      const byDate = {};
      sessions.forEach((s) => {
        byDate[s.attendance_date] = { total: 0, present: 0 };
      });
      marks?.forEach((m) => {
        const session = sessions.find((s) => s.id === m.session_id);
        if (!session) return;
        const date = session.attendance_date;
        if (byDate[date]) {
          byDate[date].total++;
          if (m.status === "Present") byDate[date].present++;
        }
      });

      const trend = Object.entries(byDate).map(([date, stats]) => ({
        date,
        attendance: stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : 0,
      }));

      return trend;
    },
    enabled: batchIds.length > 0,
  });

  if (teacherLoading || batchesLoading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">Loading…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">
          Welcome, {profile?.full_name || "Teacher"}!
        </h1>
        <p className="text-sm text-secondary-dark font-montserrat mt-1">
          Your teaching dashboard
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">My Batches</p>
              <h3 className="text-2xl font-bold mt-1">{batches.length}</h3>
            </div>
            <Layers size={28} className="text-primary" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Today's Sessions</p>
              <h3 className="text-2xl font-bold mt-1">{todaySessions.length}</h3>
            </div>
            <CalendarCheck size={28} className="text-primary" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Upcoming Homework</p>
              <h3 className="text-2xl font-bold mt-1">{homeworks.length}</h3>
            </div>
            <BookOpen size={28} className="text-primary" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Upcoming Exams</p>
              <h3 className="text-2xl font-bold mt-1">{exams.length}</h3>
            </div>
            <Award size={28} className="text-primary" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Attendance Trend Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h2 className="text-lg font-righteous text-primary-dark mb-4 flex items-center gap-2">
            <TrendingUp size={18} /> Attendance Trend (Last 30 Days)
          </h2>
          {attendanceTrend.length === 0 ? (
            <p className="text-sm text-secondary text-center py-12">
              No attendance data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} unit="%" />
                <Tooltip formatter={(value) => `${value}%`} />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke="#0D47A1"
                  strokeWidth={2}
                  dot={false}
                  name="Attendance %"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming Exams Timeline Chart */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h2 className="text-lg font-righteous text-primary-dark mb-4 flex items-center gap-2">
            <Award size={18} /> Upcoming Exams
          </h2>
          {exams.length === 0 ? (
            <p className="text-sm text-secondary text-center py-12">
              No upcoming exams.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={exams.map((e) => ({
                  name: e.exam_name,
                  batch: e.batches?.batch_name,
                  date: e.exam_date,
                  totalMarks: e.total_marks,
                }))}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={12} />
                <Tooltip
                  formatter={(value, name, props) => [
                    `Batch: ${props.payload.batch}\nDate: ${props.payload.date}\nMarks: ${props.payload.totalMarks}`,
                    "Details",
                  ]}
                />
                <Bar dataKey="totalMarks" fill="#FF1070" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Batches */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h2 className="text-lg font-righteous text-primary-dark mb-4 flex items-center gap-2">
            <Layers size={18} /> My Batches
          </h2>
          {batches.length === 0 ? (
            <p className="text-sm text-secondary">No batches assigned.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {batches.map((b) => (
                <li key={b.batch_id} className="flex justify-between">
                  <span>
                    {b.batches?.batch_name} ({b.batches?.courses?.course_name})
                  </span>
                  <span className="text-secondary">
                    {b.batches?.start_time} - {b.batches?.end_time}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Today's Attendance */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h2 className="text-lg font-righteous text-primary-dark mb-4 flex items-center gap-2">
            <CalendarCheck size={18} /> Today's Sessions
          </h2>
          {todaySessions.length === 0 ? (
            <p className="text-sm text-secondary">No sessions today.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {todaySessions.map((s) => (
                <li key={s.id} className="flex justify-between">
                  <span>
                    {s.batches?.batch_name} – {s.topic_covered || "No topic"}
                  </span>
                  <Link
                    to={`/attendance/mark/${s.id}`}
                    className="text-primary hover:underline"
                  >
                    Mark
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Homework */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h2 className="text-lg font-righteous text-primary-dark mb-4 flex items-center gap-2">
            <BookOpen size={18} /> Upcoming Homework
          </h2>
          {homeworks.length === 0 ? (
            <p className="text-sm text-secondary">No upcoming homework.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {homeworks.map((hw) => (
                <li key={hw.id}>
                  <span className="font-medium">{hw.title}</span> –{" "}
                  {hw.subjects?.subject_name} ({hw.batches?.batch_name})
                  <br />
                  <span className="text-secondary text-xs">
                    Due: {hw.due_date}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Exams */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h2 className="text-lg font-righteous text-primary-dark mb-4 flex items-center gap-2">
            <Award size={18} /> Upcoming Exams
          </h2>
          {exams.length === 0 ? (
            <p className="text-sm text-secondary">No upcoming exams.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {exams.map((ex) => (
                <li key={ex.id}>
                  <span className="font-medium">{ex.exam_name}</span> –{" "}
                  {ex.batches?.batch_name}
                  <br />
                  <span className="text-secondary text-xs">
                    {ex.exam_date} | Total: {ex.total_marks}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}