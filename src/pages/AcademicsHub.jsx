import { Link } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import {
  BookOpen, Layers, CalendarCheck, BarChart3, TrendingUp,
  FileText, ClipboardCheck, Calendar, Video, GraduationCap,
} from "lucide-react";

const modules = [
  { to: "/courses", icon: BookOpen, label: "Courses", desc: "Manage courses" },
  { to: "/subjects", icon: BookOpen, label: "Subjects", desc: "Manage subjects" },
  { to: "/mediums", icon: BookOpen, label: "Mediums", desc: "Instruction mediums" },
  { to: "/batches", icon: Layers, label: "Batches", desc: "Manage batches" },
  { to: "/attendance", icon: CalendarCheck, label: "Attendance", desc: "Mark and view attendance" },
  { to: "/attendance/reports", icon: BarChart3, label: "Attendance Reports", desc: "Attendance analytics" },
  { to: "/progress", icon: TrendingUp, label: "Progress", desc: "Student progress evaluations" },
  { to: "/student-progress", icon: TrendingUp, label: "Progress Report", desc: "Individual progress reports" },
  { to: "/homework", icon: FileText, label: "Homework", desc: "Assign and manage homework" },
  { to: "/exams", icon: ClipboardCheck, label: "Exams", desc: "Create and schedule exams" },
  { to: "/results", icon: BarChart3, label: "Results", desc: "Enter and view results" },
  { to: "/timetable", icon: Calendar, label: "Class Timetable", desc: "Master timetable" },
  { to: "/online-classes", icon: Video, label: "Online Classes", desc: "Virtual classes" },
];

export default function AcademicsHub() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">Academics Hub</h1>
        <p className="text-sm text-secondary-dark mt-1">All academic management tools</p>
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