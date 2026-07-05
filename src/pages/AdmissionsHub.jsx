import { Link } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import { Users, Megaphone, Layers, FileText, UserPlus } from "lucide-react";

const modules = [
  { to: "/inquiries", icon: Megaphone, label: "Inquiries", desc: "Manage student inquiries" },
  { to: "/students", icon: Users, label: "Students", desc: "View and manage all students" },
  { to: "/parents", icon: Users, label: "Parents", desc: "Parent / guardian records" },
  { to: "/student-batches", icon: Layers, label: "Batch Assign", desc: "Assign students to batches" },
  { to: "/student-documents", icon: FileText, label: "Documents", desc: "Student documents" },
];

export default function AdmissionsHub() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">Admissions Hub</h1>
        <p className="text-sm text-secondary-dark mt-1">All student admission and enrollment tools</p>
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