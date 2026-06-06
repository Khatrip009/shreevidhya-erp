import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Award,
  IndianRupee,
  Settings,
  ChevronDown,
  Bell,
  X,
  CalendarClock,
  Wallet,
  Building,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getOrganization } from "../services/organizationService";

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

  const role = profile.role;

  // ---------- Student links ----------
  const studentLinks = (
    <>
      <NavLink to="/student" end className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? "bg-primary-light" : "hover:bg-primary-light"}`}>
        <LayoutDashboard size={18} /> Dashboard
      </NavLink>
      <NavLink to="/student/profile" className="block py-2 ml-8 text-secondary-light hover:text-white">My Profile</NavLink>
      <NavLink to="/student/batch" className="block py-2 ml-8 text-secondary-light hover:text-white">Batch & Course</NavLink>
      <NavLink to="/student/attendance" className="block py-2 ml-8 text-secondary-light hover:text-white">Attendance</NavLink>
      <NavLink to="/student/fees" className="block py-2 ml-8 text-secondary-light hover:text-white">Fees</NavLink>
      <NavLink to="/student/homework" className="block py-2 ml-8 text-secondary-light hover:text-white">Homework</NavLink>
      <NavLink to="/student/results" className="block py-2 ml-8 text-secondary-light hover:text-white">Results</NavLink>
      <NavLink to="/student/certificates" className="block py-2 ml-8 text-secondary-light hover:text-white">Certificates</NavLink>
      <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? "bg-primary-light" : "hover:bg-primary-light"}`}>
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
      <NavLink to="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <Settings size={18} /> Settings
      </NavLink>
    </>
  );

  // ---------- Admin / Super Admin full links ----------
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
          {[["/inquiries","Inquiries"],["/students","Students"],["/parents","Parents"],["/student-batches","Batch Assign"],["/student-documents","Documents"]].map(([to,label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `block py-2 transition ${isActive ? "text-white font-medium" : "text-secondary-light hover:text-white"}`}>{label}</NavLink>
          ))}
        </div>
      )}
      {/* Academics */}
      <button onClick={() => setAcademicOpen(!academicOpen)} className="w-full flex justify-between items-center px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <span className="flex items-center gap-3"><GraduationCap size={18} />Academics</span>
        <ChevronDown size={16} className={`transition ${academicOpen ? "rotate-180" : ""}`} />
      </button>
      {academicOpen && (
        <div className="ml-8 space-y-1">
          {[["/courses","Courses"],["/subjects","Subjects"],["/batches","Batches"],["/attendance","Attendance"],["/attendance/reports","Attendance Reports"],["/progress","Progress"],["/student-progress","Progress Report"],["/homework","Homework"],["/exams","Exams"],["/results","Results"]].map(([to,label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `block py-2 transition ${isActive ? "text-white font-medium" : "text-secondary-light hover:text-white"}`}>{label}</NavLink>
          ))}
        </div>
      )}
      {/* Finance */}
      <button onClick={() => setFinanceOpen(!financeOpen)} className="w-full flex justify-between items-center px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <span className="flex items-center gap-3"><IndianRupee size={18} />Finance</span>
        <ChevronDown size={16} className={`transition ${financeOpen ? "rotate-180" : ""}`} />
      </button>
      {financeOpen && (
        <div className="ml-8 space-y-1">
          {[["/fees","Fees"],["/receipts","Receipts"],["/income","Income"],["/expenses","Expenses"],["/salary-payments","Salary Payments"]].map(([to,label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `block py-2 transition ${isActive ? "text-white font-medium" : "text-secondary-light hover:text-white"}`}>{label}</NavLink>
          ))}
        </div>
      )}
      <NavLink to="/leave-management" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-light transition">
        <CalendarClock size={18} /> Leave Management
      </NavLink>
      <NavLink to="/teachers" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? "bg-primary-light" : "hover:bg-primary-light"}`}>
        <BookOpen size={18} /> Teachers
      </NavLink>
      <NavLink to="/certificates" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? "bg-primary-light" : "hover:bg-primary-light"}`}>
        <Award size={18} /> Certificates
      </NavLink>
      <NavLink to="/notifications" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? "bg-primary-light" : "hover:bg-primary-light"}`}>
        <Bell size={18} /> Notifications
      </NavLink>
      <NavLink to="/user-management" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? "bg-primary-light" : "hover:bg-primary-light"}`}>
        <Users size={18} /> Users
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? "bg-primary-light" : "hover:bg-primary-light"}`}>
        <Settings size={18} /> Settings
      </NavLink>
      <NavLink to="/organization-settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? "bg-primary-light" : "hover:bg-primary-light"}`}>
        <Building size={18} />
        Organization
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
        {role === "Student" && studentLinks}
        {role === "Teacher" && teacherLinks}
        {(role === "Admin" || role === "Super Admin") && adminLinks}
      </nav>
    </aside>
  );
}