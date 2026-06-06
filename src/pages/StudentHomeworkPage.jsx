import { useQuery } from "@tanstack/react-query";
import { BookOpen, Calendar } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { useStudentId } from "../hooks/useStudentId";
import { supabase } from "../api/supabase";

export default function StudentHomeworkPage() {
  const { studentId, isLoading: idLoading } = useStudentId();

  const { data: homeworks = [], isLoading } = useQuery({
    queryKey: ["student-homeworks-list", studentId],
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
        .select(`*, subjects(subject_name), batches(batch_name)`)
        .in("batch_id", batchIds)
        .order("due_date", { ascending: true });
      return data || [];
    },
    enabled: !!studentId,
  });

  if (idLoading || isLoading) {
    return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <h1 className="text-3xl font-righteous text-primary-dark mb-6">My Homework</h1>
      {homeworks.length === 0 ? (
        <p className="text-secondary">No homework assigned.</p>
      ) : (
        <div className="space-y-4">
          {homeworks.map((hw) => (
            <div key={hw.id} className="bg-white rounded-xl p-4 shadow-sm border border-secondary-light">
              <h3 className="font-semibold">{hw.title}</h3>
              <p className="text-sm text-secondary mt-1">{hw.description}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-secondary-dark">
                <span className="flex items-center gap-1"><BookOpen size={14} /> {hw.subjects?.subject_name}</span>
                <span className="flex items-center gap-1"><Calendar size={14} /> Assigned: {hw.assigned_date}</span>
                <span className="flex items-center gap-1"><Calendar size={14} /> Due: {hw.due_date}</span>
              </div>
              {hw.attachment_url && (
                <a href={hw.attachment_url} target="_blank" className="text-primary text-sm mt-2 inline-block">View attachment →</a>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}