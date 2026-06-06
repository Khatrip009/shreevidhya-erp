import { useQuery } from "@tanstack/react-query";
import { Layers, User, Clock, Calendar } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { useStudentId } from "../hooks/useStudentId";
import { supabase } from "../api/supabase";

export default function StudentBatchPage() {
  const { studentId, isLoading: idLoading } = useStudentId();

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["student-batches-detail", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data } = await supabase
        .from("student_batches")
        .select(`
          batch_id,
          enrollment_date,
          batches(
            id,
            batch_name,
            start_time,
            end_time,
            days,
            start_date,
            end_date,
            teacher_id,
            teachers(first_name, last_name, email, mobile),
            courses(course_name)
          )
        `)
        .eq("student_id", studentId)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!studentId,
  });

  if (idLoading || isLoading) {
    return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <h1 className="text-3xl font-righteous text-primary-dark mb-6">My Batch</h1>
      {batches.length === 0 ? (
        <p className="text-secondary">Not assigned to any batch.</p>
      ) : (
        <div className="space-y-6">
          {batches.map((item) => (
            <div key={item.batch_id} className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
              <h2 className="text-xl font-semibold">{item.batches?.batch_name}</h2>
              <p className="text-sm text-secondary">{item.batches?.courses?.course_name}</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm"><Clock size={16} className="text-primary" /> {item.batches?.start_time} - {item.batches?.end_time}</div>
                <div className="flex items-center gap-2 text-sm"><Calendar size={16} className="text-primary" /> {item.batches?.days}</div>
                <div className="flex items-center gap-2 text-sm"><User size={16} className="text-primary" /> {item.batches?.teachers?.first_name} {item.batches?.teachers?.last_name}</div>
                <div className="text-sm"><span className="font-medium">Email:</span> {item.batches?.teachers?.email || "N/A"}</div>
              </div>
              <div className="mt-2 text-xs text-secondary">
                Batch period: {item.batches?.start_date} → {item.batches?.end_date}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}