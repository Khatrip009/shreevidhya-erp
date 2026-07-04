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
  Video,
  FileText,
  PanelLeftOpen,
  PanelLeftClose,
  Megaphone,
  ClipboardCheck,
  BarChart3,
  UserCog,
  Shield,
  Layers,
  TrendingUp,
  Calendar,
  CalendarCheck,    // ← missing import
  Palette, 
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getOrganization } from "../services/organizationService";

function normaliseRole(rawRole) {
  return (rawRole || "").toLowerCase().replace(/\s+/g, "_");
}

/* ─── Small Section Header (only visible when expanded) ─── */
function SectionLabel({ children }) {
  return (
    <p className="px-4 pt-4 pb-1 text-[10px] font-montserrat font-semibold uppercase tracking-wider text-secondary-light">
      {children}
    </p>
  );
}

/* ─── Sidebar Link – always shows icon, hides text when collapsed ─── */
function SidebarLink({ to, icon: Icon, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={children}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
          isActive
            ? "bg-primary-light text-white"
            : "hover:bg-primary-light/50 text-secondary-light hover:text-white"
        }`
      }
    >
      <Icon size={18} className="flex-shrink-0" />
      <span className="truncate">{children}</span>
    </NavLink>
  );
}

/* ─── Accordion Toggle ─── */
function AccordionToggle({ icon: Icon, label, open, onClick, collapsed }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg hover:bg-primary-light/50 transition-colors text-secondary-light hover:text-white"
    >
      <span className="flex items-center gap-3 truncate">
        <Icon size={18} className="flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </span>
      {!collapsed && (
        <ChevronDown
          size={16}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      )}
    </button>
  );
}

export default function Sidebar({ onClose, collapsed, onToggleCollapse }) {
  const { profile } = useAuth();
  const [admissionOpen, setAdmissionOpen] = useState(false);
  const [academicOpen, setAcademicOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);

  const { data: org } = useQuery({
    queryKey: ["organization"],
    queryFn: getOrganization,
    staleTime: 10 * 60 * 1000,
  });

  if (!profile) {
    return (
      <aside
        className="bg-primary text-white h-screen border-r border-primary-dark flex flex-col transition-all duration-300"
        style={{ width: collapsed ? 64 : 288 }}
      >
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-secondary-light">Loading…</p>
        </div>
      </aside>
    );
  }

  const role = normaliseRole(profile.role);

  // ────────────── Student Links ──────────────
  const studentLinks = (
    <>
      <SidebarLink to="/student" end icon={LayoutDashboard}>
        Dashboard
      </SidebarLink>
      {!collapsed && <SectionLabel>My Space</SectionLabel>}
      <SidebarLink to="/student/profile" icon={BookOpen}>
        My Profile
      </SidebarLink>
      <SidebarLink to="/student/batch" icon={Layers}>
        Batch & Course
      </SidebarLink>
      <SidebarLink to="/student/attendance" icon={CalendarCheck}>
        Attendance
      </SidebarLink>
      <SidebarLink to="/student/fees" icon={IndianRupee}>
        Fees
      </SidebarLink>
      <SidebarLink to="/student/homework" icon={FileText}>
        Homework
      </SidebarLink>
      <SidebarLink to="/student/exams" icon={ClipboardCheck}>
        Exams
      </SidebarLink>
      <SidebarLink to="/student/results" icon={BarChart3}>
        Results
      </SidebarLink>
      <SidebarLink to="/student/certificates" icon={Award}>
        Certificates
      </SidebarLink>
      <SidebarLink to="/student/timetable" icon={Calendar}>
        Timetable
      </SidebarLink>
      <SidebarLink to="/student/resources" icon={BookOpen}>
        Learning Resources
      </SidebarLink>
      <SidebarLink to="/online-classes" icon={Video}>
        Online Classes
      </SidebarLink>
      <div className="border-t border-primary-dark my-2" />
      <SidebarLink to="/student/notifications" icon={Bell}>
        Notifications
      </SidebarLink>
      <SidebarLink to="/settings" icon={Settings}>
        Settings
      </SidebarLink>
    </>
  );

  // ────────────── Teacher Links ──────────────
  const teacherLinks = (
    <>
      <SidebarLink to="/teacher" end icon={LayoutDashboard}>
        Dashboard
      </SidebarLink>
      <AccordionToggle
        icon={GraduationCap}
        label="Academics"
        open={academicOpen}
        onClick={() => setAcademicOpen(!academicOpen)}
        collapsed={collapsed}
      />
      {academicOpen && !collapsed && (
        <div className="ml-6 space-y-1">
          <SidebarLink to="/attendance" icon={CalendarCheck}>
            Attendance
          </SidebarLink>
          <SidebarLink to="/homework" icon={FileText}>
            Homework
          </SidebarLink>
          <SidebarLink to="/exams" icon={ClipboardCheck}>
            Exams
          </SidebarLink>
          <SidebarLink to="/results" icon={BarChart3}>
            Results
          </SidebarLink>
          <SidebarLink to="/teacher/resources" icon={BookOpen}>
            Learning Resources
          </SidebarLink>
          <SidebarLink to="/online-classes" icon={Video}>
            Online Classes
          </SidebarLink>
        </div>
      )}
      <SidebarLink to="/teacher/salary" icon={Wallet}>
        My Salary
      </SidebarLink>
      <SidebarLink to="/teacher/leaves" icon={CalendarClock}>
        My Leaves
      </SidebarLink>
      <SidebarLink to="/teacher/profile" icon={BookOpen}>
        My Profile
      </SidebarLink>
      <SidebarLink to="/teacher/timetable" icon={Calendar}>
        My Timetable
      </SidebarLink>
      <div className="border-t border-primary-dark my-2" />
      <SidebarLink to="/notifications" icon={Bell}>
        Notifications
      </SidebarLink>
      <SidebarLink to="/settings" icon={Settings}>
        Settings
      </SidebarLink>
    </>
  );

  // ────────────── Admin Links (re‑organised) ──────────────
  const adminLinks = (
    <>
      <SidebarLink to="/" end icon={LayoutDashboard}>
        Dashboard
      </SidebarLink>

      {/* Admissions */}
      <AccordionToggle
        icon={Users}
        label="Admissions"
        open={admissionOpen}
        onClick={() => setAdmissionOpen(!admissionOpen)}
        collapsed={collapsed}
      />
      {admissionOpen && !collapsed && (
        <div className="ml-6 space-y-1">
          <SidebarLink to="/inquiries" icon={Megaphone}>
            Inquiries
          </SidebarLink>
          <SidebarLink to="/students" icon={Users}>
            Students
          </SidebarLink>
          <SidebarLink to="/parents" icon={Users}>
            Parents
          </SidebarLink>
          <SidebarLink to="/student-batches" icon={Layers}>
            Batch Assign
          </SidebarLink>
          <SidebarLink to="/student-documents" icon={FileText}>
            Documents
          </SidebarLink>
        </div>
      )}

      {/* Academics */}
      <AccordionToggle
        icon={GraduationCap}
        label="Academics"
        open={academicOpen}
        onClick={() => setAcademicOpen(!academicOpen)}
        collapsed={collapsed}
      />
      {academicOpen && !collapsed && (
        <div className="ml-6 space-y-1">
          <SidebarLink to="/courses" icon={BookOpen}>
            Courses
          </SidebarLink>
          <SidebarLink to="/subjects" icon={BookOpen}>
            Subjects
          </SidebarLink>
          <SidebarLink to="/mediums" icon={BookOpen}>
            Mediums
          </SidebarLink>
          <SidebarLink to="/batches" icon={Layers}>
            Batches
          </SidebarLink>
          <SidebarLink to="/attendance" icon={CalendarCheck}>
            Attendance
          </SidebarLink>
          <SidebarLink to="/attendance/reports" icon={BarChart3}>
            Attendance Reports
          </SidebarLink>
          <SidebarLink to="/progress" icon={TrendingUp}>
            Progress
          </SidebarLink>
          <SidebarLink to="/student-progress" icon={TrendingUp}>
            Progress Report
          </SidebarLink>
          <SidebarLink to="/homework" icon={FileText}>
            Homework
          </SidebarLink>
          <SidebarLink to="/exams" icon={ClipboardCheck}>
            Exams
          </SidebarLink>
          <SidebarLink to="/results" icon={BarChart3}>
            Results
          </SidebarLink>
          <SidebarLink to="/timetable" icon={Calendar}>
            Class Timetable
          </SidebarLink>
          <SidebarLink to="/online-classes" icon={Video}>
            Online Classes
          </SidebarLink>
        </div>
      )}

      {/* Finance */}
      <AccordionToggle
        icon={IndianRupee}
        label="Finance"
        open={financeOpen}
        onClick={() => setFinanceOpen(!financeOpen)}
        collapsed={collapsed}
      />
      {financeOpen && !collapsed && (
        <div className="ml-6 space-y-1">
          <SidebarLink to="/fees/structures" icon={IndianRupee}>
            Fee Structures
          </SidebarLink>
          <SidebarLink to="/fees" icon={IndianRupee}>
            Fees
          </SidebarLink>
          <SidebarLink to="/receipts" icon={FileText}>
            Receipts
          </SidebarLink>
          <SidebarLink to="/income" icon={IndianRupee}>
            Income
          </SidebarLink>
          <SidebarLink to="/expenses" icon={IndianRupee}>
            Expenses
          </SidebarLink>
          <SidebarLink to="/salary-payments" icon={Wallet}>
            Salary Payments
          </SidebarLink>
          <SidebarLink to="/profit-loss" icon={BarChart3}>
            Profit & Loss
          </SidebarLink>
          <SidebarLink to="/learning-resources" icon={BookOpen}>
            Learning Resources
          </SidebarLink>
          <SidebarLink to="/tax-settings" icon={Settings}>
            Tax Settings
          </SidebarLink>
          <SidebarLink to="/tax-report" icon={FileText}>
            Tax Report
          </SidebarLink>
        </div>
      )}

      {/* HR & Staff */}
      {!collapsed && <SectionLabel>HR & Staff</SectionLabel>}
      <SidebarLink to="/teachers" icon={BookOpen}>
        Teachers
      </SidebarLink>
      <SidebarLink to="/leave-management" icon={CalendarClock}>
        Leave Management
      </SidebarLink>

      {/* Certificates & Reports */}
      {!collapsed && <SectionLabel>Documents</SectionLabel>}
      <SidebarLink to="/certificates" icon={Award}>
        Certificates
      </SidebarLink>
      <SidebarLink to="/reports" icon={FileText}>
        Reports
      </SidebarLink>

      {/* Communication */}
      {!collapsed && <SectionLabel>Communication</SectionLabel>}
      <SidebarLink to="/notifications" icon={Bell}>
        Notifications
      </SidebarLink>

      {/* System */}
      {!collapsed && <SectionLabel>System</SectionLabel>}
      <SidebarLink to="/user-management" icon={Shield}>
        Users
      </SidebarLink>
      <SidebarLink to="/settings" icon={Settings}>
        Settings
      </SidebarLink>
      <SidebarLink to="/organization-settings" icon={Building}>
        Organization
      </SidebarLink>
      <SidebarLink to="/theme-settings" icon={Palette}>
        Theme Settings
      </SidebarLink>
    </>
  );

  return (
    <aside
      className="bg-primary text-white h-screen border-r border-primary-dark flex flex-col overflow-y-auto sidebar-scroll transition-all duration-300"
      style={{ width: collapsed ? 64 : 288 }}
    >
      {/* Top bar with collapse toggle and mobile close */}
      <div className="flex items-center justify-between p-2">
        <button
          onClick={onToggleCollapse}
          className="hidden lg:block text-white/80 hover:text-white p-1 rounded hover:bg-primary-light"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
        <button
          onClick={onClose}
          className="lg:hidden text-white/80 hover:text-white p-1 ml-auto"
        >
          <X size={24} />
        </button>
      </div>

      {/* Logo */}
      <div className="flex justify-center border-b border-primary-dark py-4">
        <img
          src={org?.logo_light_url || "/ShreeVidhyalight.png"}
          alt="ShreeVidhya Academy"
          style={{
            height: collapsed ? 32 : 64,
            width: "auto",
            transition: "height 0.3s",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {role === "student" && studentLinks}
        {role === "teacher" && teacherLinks}
        {(role === "admin" || role === "super_admin") && adminLinks}
      </nav>
    </aside>
  );
}