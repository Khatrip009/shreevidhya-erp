import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Award,
  IndianRupee, Settings, ChevronDown, Bell, X, CalendarClock,
  Wallet, Building, Calendar, Layers,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getOrganization } from "../services/organizationService";

function normaliseRole(rawRole) {
  return (rawRole || "").toLowerCase().replace(/\s+/g, "_");
}

export default function Sidebar({ onClose }) {
  const { profile } = useAuth();
  const [admissionOpen, setAdmissionOpen] = useState(true);
  const [academicOpen, setAcademicOpen] = useState(true);
  const [financeOpen, setFinanceOpen] = useState(true);

  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: getOrganization,
    staleTime: 10 * 60 * 1000,
  });

  if (!profile) {
    return (
      <aside className="w-72 bg-primary text-white h-screen border-r border-primary-dark flex flex-col">
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-secondary-light">Loading menu…</p>
        </div>
      </aside>
    );
  }

  const role = normaliseRole(profile.role);

 // ---------- Student links ----------
const studentLinks = (
  <>
    <NavLink to="/student" end className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? "bg-primary-light" : "hover:bg-primary-light"}`}>
      <LayoutDashboard size={18} /> Dashboard
    </NavLink>
    <div className="ml-8 space-y-1">
      <NavLink to="/student/profile" className="block py-2 text-secondary-light hover:text-white">My Profile</NavLink>
      <NavLink to="/student/batch" className="block py-2 text-secondary-light hover:text-white">Batch & Course</NavLink>
      <NavLink to="/student/attendance" className="block py-2 text-secondary-light hover:text-white">Attendance</NavLink>
      <NavLink to="/student/fees" className="block py-2 text-secondary-light hover:text-white">Fees</NavLink>
      <NavLink to="/student/homework" className="block py-2 text-secondary-light hover:text-white">Homework</NavLink>
      <NavLink to="/student/exams" className="block py-2 text-secondary-light hover:text-white">Exams</NavLink>
      <NavLink to="/student/results" className="block py-2 text-secondary-light hover:text-white">Results</NavLink>
      <NavLink to="/student/certificates" className="block py-2 text-secondary-light hover:text-white">Certificates</NavLink>
      <NavLink to="/student/timetable" className="block py-2 text-secondary-light hover:text-white">Timetable</NavLink>
      <NavLink to="/student/resources" className="block py-2 text-secondary-light hover:text-white">Learning Resources</NavLink>
    </div>
    <NavLink to="/student/notifications" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
      <Bell size={18} /> Notifications
    </NavLink>
    <NavLink to="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
      <Settings size={18} /> Settings
    </NavLink>
  </>
);

  // ---------- Teacher links ----------
  const teacherLinks = (
    <>
      <NavLink to="/teacher" end className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? "bg-primary-light" : "hover:bg-primary-light"}`}>
        <LayoutDashboard size={18} /> Dashboard
      </NavLink>

      <button onClick={() => setAcademicOpen(!academicOpen)} className="w-full flex justify-between items-center px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <span className="flex items-center gap-3"><GraduationCap size={18} />Academics</span>
        <ChevronDown size={16} className={`transition ${academicOpen ? "rotate-180" : ""}`} />
      </button>
      {academicOpen && (
        <div className="ml-8 space-y-1">
          <NavLink to="/attendance" className="block py-2 text-secondary-light hover:text-white">Attendance</NavLink>
          <NavLink to="/homework" className="block py-2 text-secondary-light hover:text-white">Homework</NavLink>
          <NavLink to="/exams" className="block py-2 text-secondary-light hover:text-white">Exams</NavLink>
          <NavLink to="/results" className="block py-2 text-secondary-light hover:text-white">Results</NavLink>
          <NavLink to="/teacher/resources" className="block py-2 text-secondary-light hover:text-white">Learning Resources</NavLink>
        </div>
      )}

      <NavLink to="/teacher/salary" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <Wallet size={18} /> My Salary
      </NavLink>
      <NavLink to="/teacher/leaves" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <CalendarClock size={18} /> My Leaves
      </NavLink>
      <NavLink to="/teacher/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <BookOpen size={18} /> My Profile
      </NavLink>
      <NavLink to="/teacher/timetable" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <CalendarClock size={18} /> My Timetable
      </NavLink>
      <NavLink to="/notifications" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <Bell size={18} /> Notifications
      </NavLink>
      <NavLink to="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <Settings size={18} /> Settings
      </NavLink>
    </>
  );

  // ---------- Admin / Super Admin links ----------
  const adminLinks = (
    <>
      <NavLink to="/" end className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? "bg-primary-light" : "hover:bg-primary-light"}`}>
        <LayoutDashboard size={18} /> Dashboard
      </NavLink>

      {/* Admissions */}
      <button onClick={() => setAdmissionOpen(!admissionOpen)} className="w-full flex justify-between items-center px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <span className="flex items-center gap-3"><Users size={18} />Admissions</span>
        <ChevronDown size={16} className={`transition ${admissionOpen ? "rotate-180" : ""}`} />
      </button>
      {admissionOpen && (
        <div className="ml-8 space-y-1">
          <NavLink to="/inquiries" className="block py-2 text-secondary-light hover:text-white">Inquiries</NavLink>
          <NavLink to="/students" className="block py-2 text-secondary-light hover:text-white">Students</NavLink>
          <NavLink to="/parents" className="block py-2 text-secondary-light hover:text-white">Parents</NavLink>
          <NavLink to="/student-batches" className="block py-2 text-secondary-light hover:text-white">Batch Assign</NavLink>
          <NavLink to="/student-documents" className="block py-2 text-secondary-light hover:text-white">Documents</NavLink>
        </div>
      )}

      {/* Academics */}
      <button onClick={() => setAcademicOpen(!academicOpen)} className="w-full flex justify-between items-center px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <span className="flex items-center gap-3"><GraduationCap size={18} />Academics</span>
        <ChevronDown size={16} className={`transition ${academicOpen ? "rotate-180" : ""}`} />
      </button>
      {academicOpen && (
        <div className="ml-8 space-y-1">
          <NavLink to="/courses" className="block py-2 text-secondary-light hover:text-white">Courses</NavLink>
          <NavLink to="/subjects" className="block py-2 text-secondary-light hover:text-white">Subjects</NavLink>
          <NavLink to="/mediums" className="block py-2 text-secondary-light hover:text-white">Mediums</NavLink>
          <NavLink to="/batches" className="block py-2 text-secondary-light hover:text-white">Batches</NavLink>
          <NavLink to="/attendance" className="block py-2 text-secondary-light hover:text-white">Attendance</NavLink>
          <NavLink to="/attendance/reports" className="block py-2 text-secondary-light hover:text-white">Attendance Reports</NavLink>
          <NavLink to="/progress" className="block py-2 text-secondary-light hover:text-white">Progress</NavLink>
          <NavLink to="/student-progress" className="block py-2 text-secondary-light hover:text-white">Progress Report</NavLink>
          <NavLink to="/homework" className="block py-2 text-secondary-light hover:text-white">Homework</NavLink>
          <NavLink to="/exams" className="block py-2 text-secondary-light hover:text-white">Exams</NavLink>
          <NavLink to="/results" className="block py-2 text-secondary-light hover:text-white">Results</NavLink>
          <NavLink to="/timetable" className="block py-2 text-secondary-light hover:text-white">Class Timetable</NavLink>
        </div>
      )}

      {/* Finance */}
      <button onClick={() => setFinanceOpen(!financeOpen)} className="w-full flex justify-between items-center px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <span className="flex items-center gap-3"><IndianRupee size={18} />Finance</span>
        <ChevronDown size={16} className={`transition ${financeOpen ? "rotate-180" : ""}`} />
      </button>
      {financeOpen && (
        <div className="ml-8 space-y-1">
          <NavLink to="/fees/structures" className="block py-2 text-secondary-light hover:text-white">Fee Structures</NavLink>
          <NavLink to="/fees" className="block py-2 text-secondary-light hover:text-white">Fees</NavLink>
          <NavLink to="/receipts" className="block py-2 text-secondary-light hover:text-white">Receipts</NavLink>
          <NavLink to="/income" className="block py-2 text-secondary-light hover:text-white">Income</NavLink>
          <NavLink to="/expenses" className="block py-2 text-secondary-light hover:text-white">Expenses</NavLink>
          <NavLink to="/salary-payments" className="block py-2 text-secondary-light hover:text-white">Salary Payments</NavLink>
          <NavLink to="/profit-loss" className="block py-2 text-secondary-light hover:text-white">Profit & Loss</NavLink>
          <NavLink to="/learning-resources" className="block py-2 text-secondary-light hover:text-white">Learning Resources</NavLink>
        </div>
      )}

      {/* HR & Staff */}
      <NavLink to="/teachers" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <BookOpen size={18} /> Teachers
      </NavLink>
      <NavLink to="/leave-management" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <CalendarClock size={18} /> Leave Management
      </NavLink>

      {/* Awards & Certificates */}
      <NavLink to="/certificates" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <Award size={18} /> Certificates
      </NavLink>

      {/* Communication & System */}
      <NavLink to="/notifications" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <Bell size={18} /> Notifications
      </NavLink>
      <NavLink to="/user-management" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <Users size={18} /> Users
      </NavLink>
      <NavLink to="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <Settings size={18} /> Settings
      </NavLink>
      <NavLink to="/organization-settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <Building size={18} /> Organization
      </NavLink>
    </>
  );

  return (
    <aside className="w-72 bg-primary text-white h-screen border-r border-primary-dark flex flex-col overflow-y-auto sidebar-scroll">
      <div className="lg:hidden flex justify-end p-2">
        <button onClick={onClose} className="text-white p-1"><X size={24} /></button>
      </div>
      <div className="p-6 border-b border-primary-dark flex justify-center">
        <img
          src={org?.logo_light_url || "/ShreeVidhyalight.png"}
          alt="ShreeVidhya Academy"
          className="h-28 w-auto"
        />
      </div>
      <nav className="p-4 space-y-2 flex-1">
        {role === "student" && studentLinks}
        {role === "teacher" && teacherLinks}
        {(role === "admin" || role === "super_admin") && adminLinks}
      </nav>
    </aside>
  );
}