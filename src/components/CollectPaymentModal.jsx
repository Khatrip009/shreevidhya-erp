import { useState } from "react";
import toast from "react-hot-toast";
import {
  X,
  Calendar,
  IndianRupee,
  CreditCard,
  Hash,
  FileText,
  User,
} from "lucide-react";
import { collectPayment } from "../services/feeService";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";

export default function CollectPaymentModal({ fee, onClose, onSuccess }) {
  const darkLogo = useOrgDarkLogo();
  const [form, setForm] = useState({
    student_fee_id: fee.id,
    student_id: fee.student_id,
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    payment_mode: "Cash",
    transaction_no: "",
    remarks: "",
  });

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      const { student_id, ...paymentPayload } = form;
      await collectPayment(paymentPayload, student_id);
      toast.success("Payment collected, receipt generated");
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Payment failed");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        {/* Header with logo */}
        <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
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
            </div>
          </div>

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