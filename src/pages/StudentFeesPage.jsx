import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IndianRupee, FileText, ChevronDown, ChevronUp, Clock,
  CheckCircle, AlertCircle, Calendar, CreditCard, Hash,
} from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { useStudentId } from "../hooks/useStudentId";
import { supabase } from "../api/supabase";

export default function StudentFeesPage() {
  const { studentId, isLoading: idLoading } = useStudentId();
  const [expandedFeeId, setExpandedFeeId] = useState(null);

  // Fetch fee records with installments
  const { data: fees = [], isLoading } = useQuery({
    queryKey: ["student-fees-list", studentId],
    queryFn: async () => {
      if (!studentId) return [];

      // Get student fees
      const { data: feeData, error: feeError } = await supabase
        .from("student_fees")
        .select(`*, fee_structures(fee_amount, courses(course_name))`)
        .eq("student_id", studentId);

      if (feeError) throw feeError;
      if (!feeData || feeData.length === 0) return [];

      // For each fee, fetch payments and installments
      const enriched = await Promise.all(
        feeData.map(async (fee) => {
          // Payments
          const { data: payments } = await supabase
            .from("fee_payments")
            .select("*")
            .eq("student_fee_id", fee.id)
            .order("payment_date", { ascending: false });

          // Installments
          const { data: installments } = await supabase
            .from("fee_installments")
            .select("*")
            .eq("student_fee_id", fee.id)
            .order("installment_number");

          const totalPaid = (payments || []).reduce(
            (sum, p) => sum + Number(p.amount),
            0
          );
          const finalFee = Number(fee.final_fee);
          const pending = Math.max(finalFee - totalPaid, 0);

          return {
            ...fee,
            total_paid: totalPaid,
            pending,
            payments: payments || [],
            installments: installments || [],
          };
        })
      );

      return enriched;
    },
    enabled: !!studentId,
  });

  const toggleExpand = (id) => {
    setExpandedFeeId((prev) => (prev === id ? null : id));
  };

  if (idLoading || isLoading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-secondary">Loading your fees…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <h1 className="text-3xl font-righteous text-primary-dark mb-6">My Fees</h1>

      {fees.length === 0 ? (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-secondary-light text-center">
          <FileText size={32} className="text-secondary-light mx-auto mb-2" />
          <p className="text-secondary">No fee records found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {fees.map((fee) => (
            <div
              key={fee.id}
              className="bg-white rounded-xl shadow-sm border border-secondary-light overflow-hidden"
            >
              {/* Header */}
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="font-bold text-lg text-primary-dark">
                      {fee.fee_structures?.courses?.course_name}
                    </h2>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm">
                      <div className="flex items-center gap-1">
                        <IndianRupee size={16} className="text-secondary" />
                        <span className="font-medium">
                          Total: ₹{Number(fee.final_fee).toLocaleString("en-IN")}
                        </span>
                      </div>
                      {fee.total_paid > 0 && (
                        <div className="flex items-center gap-1">
                          <CheckCircle size={16} className="text-green-600" />
                          <span className="text-green-600 font-medium">
                            Paid: ₹{fee.total_paid.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                      {fee.pending > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertCircle size={16} className="text-red-500" />
                          <span className="text-red-500 font-medium">
                            Pending: ₹{fee.pending.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          fee.status === "Paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {fee.status}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExpand(fee.id)}
                    className="text-primary hover:underline text-sm flex items-center gap-1"
                  >
                    {expandedFeeId === fee.id ? (
                      <>
                        <ChevronUp size={16} /> Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} /> View Details
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedFeeId === fee.id && (
                <div className="border-t border-secondary-light bg-gray-50 p-5 space-y-5">
                  {/* Installments */}
                  {fee.installments.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm text-secondary-dark mb-2 flex items-center gap-1">
                        <Calendar size={16} /> Installments
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="text-left p-2">#</th>
                              <th className="text-left p-2">Amount</th>
                              <th className="text-left p-2">Due Date</th>
                              <th className="text-left p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fee.installments.map((inst) => (
                              <tr key={inst.id} className="border-b border-secondary-light">
                                <td className="p-2">{inst.installment_number}</td>
                                <td className="p-2">
                                  ₹{Number(inst.amount).toLocaleString("en-IN")}
                                </td>
                                <td className="p-2">{inst.due_date || "—"}</td>
                                <td className="p-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      inst.status === "Paid"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-yellow-100 text-yellow-700"
                                    }`}
                                  >
                                    {inst.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Payment History */}
                  <div>
                    <h3 className="font-semibold text-sm text-secondary-dark mb-2 flex items-center gap-1">
                      <CreditCard size={16} /> Payment History
                    </h3>
                    {fee.payments.length === 0 ? (
                      <p className="text-sm text-secondary">No payments recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="text-left p-2">Date</th>
                              <th className="text-left p-2">Amount</th>
                              <th className="text-left p-2">Mode</th>
                              <th className="text-left p-2">Transaction</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fee.payments.map((p) => (
                              <tr key={p.id} className="border-b border-secondary-light">
                                <td className="p-2">{p.payment_date}</td>
                                <td className="p-2 font-medium">
                                  ₹{Number(p.amount).toLocaleString("en-IN")}
                                </td>
                                <td className="p-2">{p.payment_mode}</td>
                                <td className="p-2">{p.transaction_no || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}