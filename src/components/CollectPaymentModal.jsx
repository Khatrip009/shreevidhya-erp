import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  X, Calendar, IndianRupee, CreditCard, Hash, FileText, User,
  ChevronDown, List,
} from "lucide-react";
import { collectPayment } from "../services/feeService";
import { supabase } from "../api/supabase";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";

export default function CollectPaymentModal({ fee, onClose, onSuccess }) {
  const darkLogo = useOrgDarkLogo();
  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    payment_mode: "Cash",
    transaction_no: "",
    remarks: "",
    installment_id: "",
  });
  const [installments, setInstallments] = useState([]);
  const [loadingInstallments, setLoadingInstallments] = useState(true);

  // Fetch installments for this fee
  useEffect(() => {
    async function loadInstallments() {
      const { data, error } = await supabase
        .from("fee_installments")
        .select("*")
        .eq("student_fee_id", fee.id)
        .order("installment_number");
      if (error) {
        toast.error("Could not load installments");
      } else {
        setInstallments(data || []);
      }
      setLoadingInstallments(false);
    }
    loadInstallments();
  }, [fee.id]);

  // When an installment is selected, auto-fill the amount
  const selectedInstallment = installments.find(
    (inst) => inst.id === Number(form.installment_id)
  );

  useEffect(() => {
    if (selectedInstallment) {
      setForm((prev) => ({ ...prev, amount: selectedInstallment.amount.toString() }));
    }
  }, [selectedInstallment]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    try {
      const paymentPayload = {
        student_fee_id: fee.id,
        payment_date: form.payment_date,
        amount: Number(form.amount),
        payment_mode: form.payment_mode,
        transaction_no: form.transaction_no,
        remarks: form.remarks,
        installment_id: form.installment_id || null,
      };

      await collectPayment(paymentPayload, fee.student_id);
      toast.success("Payment collected, receipt generated");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Payment failed");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      {/* Scrollable white card */}
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <img
              src={darkLogo}
              alt="ShreeVidhya Academy"
              className="h-10 w-auto"
            />
            <h2 className="text-xl font-righteous text-primary-dark">
              Collect Payment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-bg rounded-lg transition"
          >
            <X size={20} className="text-secondary-dark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Student Info */}
          <div className="bg-primary-bg rounded-lg p-4 flex items-start gap-3">
            <User size={20} className="text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-primary-dark">
                {fee.students?.first_name} {fee.students?.last_name}
              </p>
              <p className="text-sm text-secondary-dark mt-1">
                Final Fee:{" "}
                <span className="font-bold text-primary">
                  ₹{Number(fee.final_fee).toLocaleString("en-IN")}
                </span>
              </p>
              {fee.total_paid > 0 && (
                <p className="text-sm text-green-700">
                  Already paid: ₹{Number(fee.total_paid).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </div>

          {/* Installments Section */}
          {loadingInstallments ? (
            <p className="text-sm text-secondary">Loading installments...</p>
          ) : installments.length > 0 ? (
            <div>
              <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                <List size={14} className="inline mr-1" />
                Installments (optional)
              </label>
              <select
                name="installment_id"
                value={form.installment_id}
                onChange={handleChange}
                className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              >
                <option value="">No specific installment (lump sum)</option>
                {installments.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    #{inst.installment_number} – ₹{Number(inst.amount).toLocaleString("en-IN")}
                    {inst.due_date ? ` (Due ${inst.due_date})` : ""}
                    {inst.status === "Paid" ? " ✓ Paid" : ""}
                  </option>
                ))}
              </select>
              {selectedInstallment && (
                <p className="text-xs text-secondary mt-1">
                  Amount auto‑filled with installment amount. You can still change it.
                </p>
              )}
            </div>
          ) : null}

          {/* Date */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Calendar size={14} className="inline mr-1" />
              Date *
            </label>
            <input
              type="date"
              name="payment_date"
              value={form.payment_date}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <IndianRupee size={14} className="inline mr-1" />
              Amount *
            </label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="Enter amount"
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
              required
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <CreditCard size={14} className="inline mr-1" />
              Payment Mode
            </label>
            <select
              name="payment_mode"
              value={form.payment_mode}
              onChange={handleChange}
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
            </select>
          </div>

          {/* Transaction No */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <Hash size={14} className="inline mr-1" />
              Transaction No / Reference
            </label>
            <input
              type="text"
              name="transaction_no"
              value={form.transaction_no}
              onChange={handleChange}
              placeholder="e.g., UTR or Cheque No"
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-montserrat text-secondary-dark mb-1">
              <FileText size={14} className="inline mr-1" />
              Remarks
            </label>
            <input
              type="text"
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              placeholder="Any additional note"
              className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
            />
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
            <button
              type="submit"
              className="w-full sm:w-auto bg-accent hover:bg-accent-light text-white px-6 py-2.5 rounded-lg font-montserrat transition flex items-center justify-center gap-2"
            >
              <IndianRupee size={16} />
              Collect Payment
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto border border-secondary-light text-secondary-dark hover:bg-secondary-bg px-6 py-2.5 rounded-lg font-montserrat transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}