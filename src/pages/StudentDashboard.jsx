import { useEffect, useLayoutEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "react-router-dom";
import {
  User, Calendar, IndianRupee, Award, Clock, FileText,
  Phone, Mail, MapPin, School, Layers,
} from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../api/supabase";

export default function StudentDashboard() {
  const { user } = useAuth();

  // ---------- 1. Student info ----------
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ["student-info", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const studentId = student?.id;

  // ---------- 2. Batches ----------
  const { data: batches = [] } = useQuery({
    queryKey: ["student-batches", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data } = await supabase
        .from("student_batches")
        .select(`batch_id, batches(batch_name, course_id, courses(course_name))`)
        .eq("student_id", studentId)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!studentId,
  });

  // ---------- 3. Attendance ----------
  const { data: attendance = { percentage: 0, present: 0, total: 0 } } = useQuery({
    queryKey: ["student-attendance", studentId],
    queryFn: async () => {
      if (!studentId) return { percentage: 0, present: 0, total: 0 };
      const { data: batchRows } = await supabase
        .from("student_batches")
        .select("batch_id")
        .eq("student_id", studentId)
        .eq("status", "active");
      const batchIds = batchRows?.map((b) => b.batch_id) || [];
      if (!batchIds.length) return { percentage: 0, present: 0, total: 0 };

      const { data: sessions } = await supabase
        .from("attendance_sessions")
        .select("id")
        .in("batch_id", batchIds);
      const sessionIds = sessions?.map((s) => s.id) || [];
      if (!sessionIds.length) return { percentage: 0, present: 0, total: 0 };

      const { data: marks } = await supabase
        .from("student_attendance")
        .select("status")
        .eq("student_id", studentId)
        .in("session_id", sessionIds);

      const total = sessionIds.length;
      const present = marks?.filter((m) => m.status === "Present").length || 0;
      return { percentage: ((present / total) * 100).toFixed(1), present, total };
    },
    enabled: !!studentId,
  });

  // ---------- 4. Fees ----------
  const { data: fees = { total: 0, paid: 0, pending: 0 } } = useQuery({
    queryKey: ["student-fees", studentId],
    queryFn: async () => {
      if (!studentId) return { total: 0, paid: 0, pending: 0 };
      const { data: feeRecords } = await supabase
        .from("student_fees")
        .select("id, final_fee")
        .eq("student_id", studentId);

      let total = 0, paid = 0;
      for (const f of feeRecords || []) {
        total += Number(f.final_fee);
        const { data: payments } = await supabase
          .from("fee_payments")
          .select("amount")
          .eq("student_fee_id", f.id);
        paid += payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      }
      return { total, paid, pending: total - paid };
    },
    enabled: !!studentId,
  });

  // ---------- 5. Results ----------
  const { data: results = [] } = useQuery({
    queryKey: ["student-results", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data } = await supabase
        .from("student_results")
        .select("marks_obtained, remarks, exams(exam_name, total_marks, exam_date)")
        .eq("student_id", studentId)
        .order("exam_id", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!studentId,
  });

  // ---------- 6. Homework ----------
  const { data: homeworks = [] } = useQuery({
    queryKey: ["student-homeworks", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data: batchRows } = await supabase
        .from("student_batches")
        .select("batch_id")
        .eq("student_id", studentId)
        .eq("status", "active");
      const batchIds = batchRows?.map((b) => b.batch_id) || [];
      if (!batchIds.length) return [];

      const { data } = await supabase
        .from("homework")
        .select("title, due_date, subjects(subject_name)")
        .in("batch_id", batchIds)
        .order("due_date", { ascending: true })
        .limit(3);
      return data || [];
    },
    enabled: !!studentId,
  });

  // ---------- 7. Certificates ----------
  const { data: certificateCount = 0 } = useQuery({
    queryKey: ["student-certificates", studentId],
    queryFn: async () => {
      if (!studentId) return 0;
      const { count } = await supabase
        .from("certificates")
        .select("*", { count: "exact", head: true })
        .eq("student_id", studentId);
      return count || 0;
    },
    enabled: !!studentId,
  });

  // ---------- Scroll Logic ----------
  const location = useLocation();

  // Robust scroll: tries main-content container first, falls back to whole page
  const scrollToSection = (sectionId) => {
    const container = document.getElementById("main-content") || window;
    const element = document.getElementById(sectionId);
    if (element) {
      const top = typeof container === "object" && container !== window
        ? element.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
        : element.getBoundingClientRect().top + window.scrollY;
      const scrollOptions = { top: top - 20, behavior: "smooth" };
      if (container !== window) container.scrollTo(scrollOptions);
      else window.scrollTo(scrollOptions);
    } else {
      console.warn(`Element with id "${sectionId}" not found.`);
    }
  };

  // React to hash changes
  useLayoutEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash) {
      // Small delay ensures DOM is fully painted
      setTimeout(() => scrollToSection(hash), 100);
    }
  }, [location.hash]);

  // Also expose globally so sidebar can call it (fallback)
  useEffect(() => {
    window.studentScrollToSection = scrollToSection;
    return () => { delete window.studentScrollToSection; };
  }, []);

  // ---------- Render ----------
  if (studentLoading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-secondary">Loading profile…</div>
      </AdminLayout>
    );
  }

  if (!student) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-red-500">
          No student record linked to your account. Contact the office.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">
          Welcome, {student.first_name}!
        </h1>
        <p className="text-sm text-secondary-dark font-montserrat mt-1">
          Your student dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div id="profile" className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h2 className="text-lg font-righteous text-primary-dark mb-4"><User size={18} /> Personal Details</h2>
          <div className="space-y-3 text-sm text-secondary-dark">
            <p><strong>Admission No:</strong> {student.admission_no || "-"}</p>
            <p><strong>Name:</strong> {student.first_name} {student.last_name}</p>
            {student.gender && <p><strong>Gender:</strong> {student.gender}</p>}
            {student.dob && <p><strong>DOB:</strong> {student.dob}</p>}
            <p className="flex items-center gap-1"><Phone size={14} className="text-primary" /> {student.mobile}</p>
            {student.whatsapp && <p className="flex items-center gap-1"><Phone size={14} className="text-primary" /> {student.whatsapp} (WhatsApp)</p>}
            {student.email && <p className="flex items-center gap-1"><Mail size={14} className="text-primary" /> {student.email}</p>}
            {student.address && <p className="flex items-start gap-1"><MapPin size={14} className="text-primary mt-0.5" /> {student.address}, {student.city}, {student.state} {student.pincode}</p>}
            <p className="flex items-center gap-1"><School size={14} className="text-primary" /> {student.school_name || "N/A"}</p>
            {student.board && <p><strong>Board:</strong> {student.board}</p>}
            {student.joining_date && <p><strong>Joining:</strong> {student.joining_date}</p>}
            <Link to={`/students/${student.id}`} className="text-primary hover:underline text-sm mt-2 inline-block">
              View Full Profile →
            </Link>
          </div>
        </div>

        {/* Batch & Attendance */}
        <div className="space-y-6">
          <div id="batch" className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
            <h2 className="text-lg font-righteous text-primary-dark mb-4"><Layers size={18} /> Current Batch</h2>
            {batches.length === 0 ? (
              <p className="text-sm text-secondary">Not assigned to any batch</p>
            ) : (
              <ul className="list-disc list-inside text-sm">
                {batches.map((b) => (
                  <li key={b.batch_id}>{b.batches?.batch_name} – {b.batches?.courses?.course_name}</li>
                ))}
              </ul>
            )}
          </div>
          <div id="attendance" className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
            <h2 className="text-lg font-righteous text-primary-dark mb-4"><Calendar size={18} /> Attendance</h2>
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full" style={{ width: `${attendance.percentage}%` }}></div>
              </div>
              <span className="font-bold text-sm">{attendance.percentage}%</span>
            </div>
            <p className="text-xs text-secondary mt-1">{attendance.present} present / {attendance.total} sessions</p>
          </div>
        </div>

        {/* Fee Summary */}
        <div id="fees" className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h2 className="text-lg font-righteous text-primary-dark mb-4"><IndianRupee size={18} /> Fee Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Total Fee</span><span className="font-medium">₹{fees.total.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Paid</span><span className="text-green-600 font-medium">₹{fees.paid.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Pending</span><span className="text-red-600 font-medium">₹{fees.pending.toLocaleString()}</span></div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${fees.total > 0 ? ((fees.paid / fees.total) * 100).toFixed(0) : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div id="results" className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h2 className="text-lg font-righteous text-primary-dark mb-4"><Award size={18} /> Recent Results</h2>
          {results.length === 0 ? (
            <p className="text-sm text-secondary">No results yet.</p>
          ) : (
            <ul className="space-y-3">
              {results.map((r, idx) => (
                <li key={idx} className="border-b pb-2 last:border-0">
                  <p className="font-medium text-sm">{r.exams?.exam_name}</p>
                  <p className="text-xs text-secondary">Marks: {r.marks_obtained}/{r.exams?.total_marks} – {r.exams?.exam_date}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div id="homework" className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h2 className="text-lg font-righteous text-primary-dark mb-4"><Clock size={18} /> Upcoming Homework</h2>
          {homeworks.length === 0 ? (
            <p className="text-sm text-secondary">No upcoming homework.</p>
          ) : (
            <ul className="space-y-3">
              {homeworks.map((hw, idx) => (
                <li key={idx} className="border-b pb-2 last:border-0">
                  <p className="font-medium text-sm">{hw.title}</p>
                  <p className="text-xs text-secondary">{hw.subjects?.subject_name} – Due: {hw.due_date}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div id="certificates" className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
          <h2 className="text-lg font-righteous text-primary-dark mb-4"><FileText size={18} /> Certificates</h2>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{certificateCount}</p>
            <p className="text-xs text-secondary">issued</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}