import { useQuery } from "@tanstack/react-query";
import { IndianRupee } from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../api/supabase";

export default function MySalary() {
  const { user } = useAuth();

  // Safely fetch teacher ID – never returns undefined
  const { data: teacherId } = useQuery({
    queryKey: ["teacher-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();                // won't throw if 0 rows
      if (error) throw error;
      return data?.id || null;         // explicitly null or number
    },
    enabled: !!user?.id,
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["my-salary", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data } = await supabase
        .from("salary_payments")
        .select("payment_date, amount, payment_mode, remarks")
        .eq("teacher_id", teacherId)
        .order("payment_date", { ascending: false });
      return data || [];
    },
    enabled: !!teacherId,
  });

  if (isLoading) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;

  return (
    <AdminLayout>
      <h1 className="text-3xl font-righteous text-primary-dark mb-6">My Salary</h1>
      {payments.length === 0 ? (
        <p className="text-secondary">No salary payments recorded yet.</p>
      ) : (
        <div className="space-y-4">
          {payments.map((p, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 shadow-sm border border-secondary-light flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{p.payment_date}</p>
                <p className="text-xs text-secondary">{p.payment_mode} – {p.remarks || "No remarks"}</p>
              </div>
              <p className="font-bold text-primary">₹{Number(p.amount).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}