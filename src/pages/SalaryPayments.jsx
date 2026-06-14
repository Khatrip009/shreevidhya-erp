import { useState, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  Trash2,
  Download,
  Upload,
  X,
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  User,
  Filter,
} from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { getSalaryPayments, createSalaryPayment, deleteSalaryPayment } from "../services/salaryService";
import { supabase } from "../api/supabase";

export default function SalaryPayments() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    teacher_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    payment_mode: "Cash",
    remarks: "",
  });
  const fileInputRef = useRef(null);

  // Fetch teachers for dropdown
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-dropdown"],
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("id, first_name, last_name, employee_code");
      return data || [];
    },
  });

  // Infinite query for salary payments
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["salary-payments", { search }],
    queryFn: ({ pageParam = 0 }) => getSalaryPayments({ pageParam, filters: { search } }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.data.length, 0);
      if (lastPage.count && totalFetched < lastPage.count) return allPages.length;
      return undefined;
    },
    initialPageParam: 0,
  });

  const payments = data?.pages.flatMap((page) => page.data) || [];

  const createMutation = useMutation({
    mutationFn: createSalaryPayment,
    onSuccess: () => {
      toast.success("Salary payment recorded");
      queryClient.invalidateQueries({ queryKey: ["salary-payments"] });
      setShowForm(false);
    },
    onError: () => toast.error("Failed to record payment"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSalaryPayment,
    onSuccess: () => {
      toast.success("Payment deleted");
      queryClient.invalidateQueries({ queryKey: ["salary-payments"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.teacher_id || !form.amount) {
      toast.error("Teacher and amount are required");
      return;
    }
    // No more created_by – will default to null
    createMutation.mutate({ ...form, amount: Number(form.amount) });
  }

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-righteous text-primary-dark">Salary Payments</h1>
          <p className="text-sm text-secondary-dark font-montserrat">Record and view teacher salary payments</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary-light text-white px-5 py-2.5 rounded-lg font-montserrat text-sm flex items-center gap-2">
          <IndianRupee size={18} /> Pay Salary
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          placeholder="Search by teacher name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-secondary-light rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-slate-100 border-b border-secondary-light">
              <tr>
                <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">Teacher</th>
                <th className="text-left">Date</th>
                <th className="text-left">Amount</th>
                <th className="text-left">Mode</th>
                <th className="text-left">Remarks</th>
                <th className="text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-secondary">Loading...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-secondary">No salary payments found.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-b border-secondary-light hover:bg-primary-bg transition">
                    <td className="p-3 text-sm">{p.teachers?.first_name} {p.teachers?.last_name} ({p.teachers?.employee_code})</td>
                    <td className="text-sm">{p.payment_date}</td>
                    <td className="text-sm font-semibold">₹{Number(p.amount).toLocaleString()}</td>
                    <td className="text-sm">{p.payment_mode}</td>
                    <td className="text-sm">{p.remarks || "-"}</td>
                    <td className="text-sm">
                      <button onClick={() => { if (window.confirm("Delete?")) deleteMutation.mutate(p.id); }} className="text-red-600 hover:underline"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="flex justify-center mt-6">
          <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat text-sm transition disabled:opacity-60">
            {isFetchingNextPage ? "Loading more…" : "Load More"}
          </button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <img src="/ShreeVidhyaDark.png" alt="Logo" className="h-10 w-auto" />
                <h2 className="text-xl font-righteous text-primary-dark">Pay Salary</h2>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-secondary-bg rounded-lg"><X size={20} className="text-secondary-dark" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1"><User size={14} className="inline mr-1" />Teacher</label>
                <select value={form.teacher_id} onChange={(e) => setForm({...form, teacher_id: e.target.value})} className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none" required>
                  <option value="">Select Teacher</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.employee_code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1"><Calendar size={14} className="inline mr-1" />Date</label>
                <input type="date" value={form.payment_date} onChange={(e) => setForm({...form, payment_date: e.target.value})} className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1"><IndianRupee size={14} className="inline mr-1" />Amount</label>
                <input type="number" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1"><CreditCard size={14} className="inline mr-1" />Mode</label>
                <select value={form.payment_mode} onChange={(e) => setForm({...form, payment_mode: e.target.value})} className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none">
                  <option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">Remarks</label>
                <input type="text" value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})} className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
                <button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat transition">Pay</button>
                <button type="button" onClick={() => setShowForm(false)} className="w-full sm:w-auto border border-secondary-light text-secondary-dark hover:bg-secondary-bg px-6 py-2.5 rounded-lg font-montserrat transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 