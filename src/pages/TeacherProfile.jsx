import { useQuery } from "@tanstack/react-query";
import { User, Mail, Phone, Briefcase, Calendar } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../api/supabase";

export default function TeacherProfile() {
  const { user } = useAuth();

  const { data: teacher, isLoading } = useQuery({
    queryKey: ["teacher-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) return <AdminLayout><div className="p-8 text-center">Loading…</div></AdminLayout>;
  if (!teacher) return <AdminLayout><div className="p-8 text-center">No teacher record found.</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">My Profile</h1>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm border border-secondary-light max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User size={18} className="text-primary" />
            <span className="font-medium">{teacher.first_name} {teacher.last_name}</span>
          </div>
          {teacher.employee_code && (
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-primary" />
              <span>Code: {teacher.employee_code}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Phone size={18} className="text-primary" />
            <span>{teacher.mobile}</span>
          </div>
          {teacher.email && (
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-primary" />
              <span>{teacher.email}</span>
            </div>
          )}
          {teacher.qualification && (
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-primary" />
              <span>Qualification: {teacher.qualification}</span>
            </div>
          )}
          {teacher.joining_date && (
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              <span>Joined: {teacher.joining_date}</span>
            </div>
          )}
          {teacher.salary && (
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-primary" />
              <span>Salary: ₹{Number(teacher.salary).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}