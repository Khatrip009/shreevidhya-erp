import { useQuery } from "@tanstack/react-query";
import { IndianRupee, FileText, Download } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { useStudentId } from "../hooks/useStudentId";
import { supabase } from "../api/supabase";
import { format } from "date-fns"; // optional, can use toLocaleDateString

export default function StudentFeesPage() {
  const { studentId, isLoading: idLoading } = useStudentId();

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ["student-fees-list", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data } = await supabase
        .from("student_fees")
        .select(`*, fee_structures(fee_amount, courses(course_name))`)
        .eq("student_id", studentId);
      return data || [];
    },
    enabled: !!studentId,
  });

  // Payment history for a selected fee (could be a modal, here we just list)
  // ... collect payment modal can be reused from existing CollectPaymentModal, but for now we'll just show a button.

  if (idLoading || isLoading) {
    return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <h1 className="text-3xl font-righteous text-primary-dark mb-6">My Fees</h1>
      {fees.length === 0 ? (
        <p className="text-secondary">No fee records found.</p>
      ) : (
        <div className="space-y-4">
          {fees.map((fee) => (
            <div key={fee.id} className="bg-white rounded-xl p-5 shadow-sm border border-secondary-light">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{fee.fee_structures?.courses?.course_name}</p>
                  <p className="text-sm text-secondary">Total: ₹{Number(fee.final_fee).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  {/* Show paid, pending etc – compute later */}
                  <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm">
                    <IndianRupee size={16} className="inline mr-1" /> Pay Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}