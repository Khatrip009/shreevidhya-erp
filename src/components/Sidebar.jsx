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
  CalendarCheck,    // ✅ now imported
  Palette,
  User,
  AlertCircle,
  CheckCircle,
  Monitor,
  Box,
  Package,
  Plus,
  ClipboardList,
  ArrowLeftRight,
  Receipt,
  PlusCircle,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { getOrganization } from "../services/organizationService";

function normaliseRole(rawRole) {
  return (rawRole || "").toLowerCase().replace(/\s+/g, "_");
}

/* ─── Small Section Header ─── */
function SectionLabel({ children }) {
  return (
    <p className="px-4 pt-4 pb-1 text-[10px] font-montserrat font-semibold uppercase tracking-wider text-secondary-light">
      {children}
    </p>
  );
}

/* ─── Sidebar Link ─── */
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
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [hrOpen, setHrOpen] = useState(false);
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

// ────────────── Admin / Super Admin Links ──────────────
const adminLinks = (
  <>
    <SidebarLink to="/" end icon={LayoutDashboard}>
      Dashboard
    </SidebarLink>

    {/* ── Admissions Hub ── */}
    {!collapsed && <SectionLabel>Admissions</SectionLabel>}
    <SidebarLink to="/admissions-hub" icon={Users}>
      Admissions Hub
    </SidebarLink>

    {/* ── Academics Hub ── */}
    {!collapsed && <SectionLabel>Academics</SectionLabel>}
    <SidebarLink to="/academics-hub" icon={GraduationCap}>
      Academics Hub
    </SidebarLink>

    {/* ── Accounting Hub ── */}
    {!collapsed && <SectionLabel>Finance & Accounting</SectionLabel>}
    <SidebarLink to="/accounting" icon={IndianRupee}>
      Accounting Hub
    </SidebarLink>

    {/* ── Inventory (keep as accordion for now) ── */}
    <AccordionToggle
      icon={Box}
      label="Inventory"
      open={inventoryOpen}
      onClick={() => setInventoryOpen(!inventoryOpen)}
      collapsed={collapsed}
    />
    {inventoryOpen && !collapsed && (
      <div className="ml-6 space-y-1">
        <SidebarLink to="/inventory-items" icon={Box}>
          Items
        </SidebarLink>
        <SidebarLink to="/inventory-transactions" icon={BarChart3}>
          Transactions
        </SidebarLink>
        <SidebarLink to="/inventory-issue" icon={User}>
          Issue to Student
        </SidebarLink>
        <SidebarLink to="/stock-dashboard" icon={Package}>
          Stock Dashboard
        </SidebarLink>
        <SidebarLink to="/add-stock" icon={Plus}>
          Add Stock
        </SidebarLink>
        <SidebarLink to="/purchase-orders" icon={ClipboardList}>
          Purchase Orders
        </SidebarLink>
      </div>
    )}

    {/* ── HR Hub ── */}
    {!collapsed && <SectionLabel>HR & Staff</SectionLabel>}
    <SidebarLink to="/hr-hub" icon={Users}>
      HR Hub
    </SidebarLink>

    {/* ── Documents ── */}
    {!collapsed && <SectionLabel>Documents</SectionLabel>}
    <SidebarLink to="/certificates" icon={Award}>
      Certificates
    </SidebarLink>
    <SidebarLink to="/reports" icon={FileText}>
      Reports
    </SidebarLink>

    {/* ── Communication ── */}
    {!collapsed && <SectionLabel>Communication</SectionLabel>}
    <SidebarLink to="/notifications" icon={Bell}>
      Notifications
    </SidebarLink>

    {/* ── System ── */}
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
  // ────────────── Render ──────────────
  return (
    <aside
      className="bg-primary text-white h-screen border-r border-primary-dark flex flex-col overflow-y-auto sidebar-scroll transition-all duration-300"
      style={{ width: collapsed ? 64 : 288 }}
    >
      {/* Top bar */}
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