// src/pages/HRHub.jsx
import { Link } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import {
  Users,
  CalendarClock,
  Wallet,
  UserCog,
  Settings,
  TrendingUp,
  CalendarCheck,
  FileText,
} from "lucide-react";

const modules = [
  { to: "/teachers", icon: Users, label: "Teachers", desc: "Manage teacher profiles" },
  { to: "/leave-management", icon: CalendarClock, label: "Leave Management", desc: "Approve/decline leave requests" },
  { to: "/salary-payments", icon: Wallet, label: "Salary Payments", desc: "Process staff salaries" },
  { to: "/salary-setup", icon: Settings, label: "Salary Setup", desc: "Configure salary type, rates & TDS" },
  { to: "/generate-salaries", icon: TrendingUp, label: "Generate Salaries", desc: "Bulk generate salary for a month" },
  { to: "/teacher-attendance", icon: CalendarCheck, label: "Teacher Attendance", desc: "Mark teacher attendance" },
  { to: "/user-management", icon: UserCog, label: "User Management", desc: "Manage system users" },
  { to: "/salary-report", icon: FileText, label: "Salary Report", desc: "View monthly salary summary & accounting status" },
];

export default function HRHub() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">HR & Staff Hub</h1>
        <p className="text-sm text-secondary-dark mt-1">All human resource and staff management tools</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.to}
              to={mod.to}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-primary-bg rounded-lg">
                  <Icon size={20} className="text-primary" />
                </div>
              </div>
              <h3 className="font-righteous text-primary-dark group-hover:text-accent transition-colors">
                {mod.label}
              </h3>
              <p className="text-sm text-secondary-dark mt-1">{mod.desc}</p>
            </Link>
          );
        })}
      </div>
    </AdminLayout>
  );
}