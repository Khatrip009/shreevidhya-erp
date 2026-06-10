import React, { useState, useRef } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Coins,
  Eye,
  Wallet,
  User,
  BookOpen,
  DollarSign,
  Percent,
  Tag,
  X,
  Download,
  Upload,
  List,
} from "lucide-react";
import Papa from "papaparse";
import AdminLayout from "../layouts/AdminLayout";
import CollectPaymentModal from "../components/CollectPaymentModal";
import {
  getStudentFees,
  createStudentFee,
  updateStudentFee,
  deleteStudentFee,
  getPayments,
  getAllStudentFeesForExport,
} from "../services/feeService";
import { supabase } from "../api/supabase";

export default function StudentFees() {
  const queryClient = useQueryClient();

  // ---- Pagination & search ----
  const [search, setSearch] = useState("");
  const filters = { search };

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["studentFees", filters],
    queryFn: ({ pageParam = 0 }) => getStudentFees({ pageParam, filters }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.data.length, 0);
      if (lastPage.count && totalFetched < lastPage.count) {
        return allPages.length;
      }
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 2 * 60 * 1000,
  });

  const studentFees = data?.pages.flatMap((page) => page.data) || [];

  // ---- Dropdown options ----
  const { data: students = [] } = useQuery({
    queryKey: ["students-dropdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name, admission_no");
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: feeStructures = [] } = useQuery({
    queryKey: ["feeStructures-dropdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("fee_structures")
        .select("id, fee_amount, installment_allowed, courses(course_name)");
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: createStudentFee,
    onSuccess: () => {
      toast.success("Fee assigned");
      queryClient.invalidateQueries({ queryKey: ["studentFees"] });
      setShowAssignForm(false);
    },
    onError: () => toast.error("Failed to assign fee"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateStudentFee(id, payload),
    onSuccess: () => {
      toast.success("Fee updated");
      queryClient.invalidateQueries({ queryKey: ["studentFees"] });
      setEditingFee(null);
      setShowAssignForm(false);
    },
    onError: () => toast.error("Failed to update fee"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStudentFee,
    onSuccess: () => {
      toast.success("Fee record deleted");
      queryClient.invalidateQueries({ queryKey: ["studentFees"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  // ---- UI state ----
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [collectingFee, setCollectingFee] = useState(null);
  const [viewPayments, setViewPayments] = useState(null);
  const [selectedFeeForPayments, setSelectedFeeForPayments] = useState(null);
  const fileInputRef = useRef(null);

  // Payment history lazy load
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments", selectedFeeForPayments?.id],
    queryFn: () => getPayments(selectedFeeForPayments.id),
    enabled: !!selectedFeeForPayments,
    staleTime: 0,
  });

  // ---- Form state ----
  const [form, setForm] = useState({
    student_id: "",
    fee_structure_id: "",
    total_fee: "",
    discount: 0,
    final_fee: "",
    status: "Pending",
  });

  // ---- Installment state ----
  const [enableInstallments, setEnableInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(1);
  const [installments, setInstallments] = useState([]);

  // ---- CSV Import ----
  async function handleCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0;
        for (const row of results.data) {
          try {
            const payload = {
              student_id: row.student_id,
              fee_structure_id: row.fee_structure_id,
              total_fee: Number(row.total_fee),
              discount: Number(row.discount) || 0,
              final_fee: Number(row.final_fee),
              status: row.status || "Pending",
            };
            await createStudentFee(payload);
            successCount++;
          } catch (err) {
            console.error(err);
          }
        }
        toast.success(`${successCount} fee records imported`);
        queryClient.invalidateQueries({ queryKey: ["studentFees"] });
      },
      error: () => toast.error("CSV parsing error"),
    });
  }

  // ---- CSV Export ----
  async function handleCSVExport() {
    try {
      const allData = await getAllStudentFeesForExport({ search });
      const csv = Papa.unparse(
        allData.map((f) => ({
          student: `${f.students?.first_name} ${f.students?.last_name}`,
          course: f.fee_structures?.courses?.course_name,
          total_fee: f.total_fee,
          discount: f.discount,
          final_fee: f.final_fee,
          paid: f.total_paid,
          pending: f.pending,
          status: f.status,
        }))
      );
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "student_fees.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Export failed");
    }
  }

  // ---- Helpers ----
  function openAssign() {
    setForm({
      student_id: "",
      fee_structure_id: "",
      total_fee: "",
      discount: 0,
      final_fee: "",
      status: "Pending",
    });
    setEnableInstallments(false);
    setInstallmentCount(1);
    setInstallments([]);
    setEditingFee(null);
    setShowAssignForm(true);
  }

  function openEdit(fee) {
    setForm({
      student_id: fee.student_id,
      fee_structure_id: fee.fee_structure_id,
      total_fee: fee.total_fee,
      discount: fee.discount,
      final_fee: fee.final_fee,
      status: fee.status,
    });

    // Load existing installments (if any) for editing
    if (fee.installments && fee.installments.length > 0) {
      setEnableInstallments(true);
      setInstallmentCount(fee.installments.length);
      setInstallments(
        fee.installments.map((inst) => ({
          amount: inst.amount,
          due_date: inst.due_date || "",
        }))
      );
    } else {
      setEnableInstallments(false);
      setInstallmentCount(1);
      setInstallments([]);
    }
    setEditingFee(fee);
    setShowAssignForm(true);
  }

  function handleFeeStructureChange(structureId) {
    const structure = feeStructures.find((s) => s.id === parseInt(structureId));
    const total = structure ? structure.fee_amount : 0;
    const discount = Number(form.discount) || 0;
    const final = total - discount;
    setForm((prev) => ({
      ...prev,
      fee_structure_id: structureId,
      total_fee: total,
      final_fee: final,
    }));

    // Reset installments if the new structure doesn't allow them
    if (structure && !structure.installment_allowed) {
      setEnableInstallments(false);
      setInstallments([]);
    } else {
      // If installments were enabled, keep the state but don't force it off
    }
  }

  function handleDiscountChange(value) {
    const discount = Number(value) || 0;
    const total = Number(form.total_fee) || 0;
    const final = total - discount;
    setForm((prev) => ({ ...prev, discount, final_fee: final }));
  }

  // ---- Installment handlers ----
  function handleInstallmentCountChange(count) {
    const num = parseInt(count) || 1;
    setInstallmentCount(num);
    const newInstallments = [];
    const equalAmount = Math.floor(form.final_fee / num);
    let remainder = form.final_fee - equalAmount * num;

    for (let i = 0; i < num; i++) {
      let amt = equalAmount + (i === 0 ? remainder : 0); // add remainder to first installment
      newInstallments.push({
        amount: amt,
        due_date: "",
      });
    }
    setInstallments(newInstallments);
  }

  function updateInstallment(index, field, value) {
    setInstallments((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.student_id || !form.fee_structure_id) {
      toast.error("Student and fee structure are required");
      return;
    }

    // If installments enabled, validate total amount
    if (enableInstallments) {
      const totalInstallment = installments.reduce((sum, i) => sum + Number(i.amount), 0);
      if (totalInstallment !== Number(form.final_fee)) {
        toast.error("Installment amounts must total the final fee");
        return;
      }
    }

    const payload = {
      ...form,
      total_fee: Number(form.total_fee),
      discount: Number(form.discount),
      final_fee: Number(form.final_fee),
      installment_data: enableInstallments
        ? installments.map((inst, idx) => ({
            installment_number: idx + 1,
            amount: Number(inst.amount),
            due_date: inst.due_date || null,
          }))
        : null,
    };

    if (editingFee) {
      updateMutation.mutate({ id: editingFee.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleViewPayments(fee) {
    setSelectedFeeForPayments(fee);
    setViewPayments({ fee, payments: [] });
  }

  React.useEffect(() => {
    if (selectedFeeForPayments && payments) {
      setViewPayments({ fee: selectedFeeForPayments, payments });
    }
  }, [payments, selectedFeeForPayments]);

  // ---- Determine if selected fee structure allows installments ----
  const selectedStructure = feeStructures.find(
    (s) => s.id === parseInt(form.fee_structure_id)
  );
  const structureAllowsInstallments = selectedStructure?.installment_allowed;

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-righteous text-primary-dark">Student Fees</h1>
          <p className="text-sm text-secondary-dark font-montserrat mt-1">
            Assign and manage fee records
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={openAssign}
            className="bg-primary hover:bg-primary-light text-white px-5 py-2.5 rounded-lg transition font-montserrat text-sm flex items-center gap-2"
          >
            <Plus size={18} /> Assign Fee
          </button>
          <button
            onClick={handleCSVExport}
            className="border border-secondary-light px-4 py-2.5 rounded-lg text-secondary-dark hover:bg-secondary-bg font-montserrat text-sm flex items-center gap-2"
          >
            <Download size={18} /> Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="border border-secondary-light px-4 py-2.5 rounded-lg text-secondary-dark hover:bg-secondary-bg font-montserrat text-sm flex items-center gap-2"
          >
            <Upload size={18} /> Import
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleCSVImport}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
        <input
          type="text"
          placeholder="Search by student name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-secondary-light rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
        />
      </div>

      {/* Fees Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-100 border-b border-secondary-light">
              <tr>
                <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">Student</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Course</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Final Fee</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Paid</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Pending</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Status</th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-secondary">
                    Loading fee records…
                  </td>
                </tr>
              ) : studentFees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-secondary">
                    <div className="flex flex-col items-center gap-2">
                      <Coins size={32} className="text-secondary-light" />
                      <span>No fee records found</span>
                      <span className="text-xs text-secondary-light">
                        {search ? "Try adjusting your search" : "Assign a fee to get started"}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                studentFees.map((f) => (
                  <tr
                    key={f.id}
                    className="border-b border-secondary-light hover:bg-primary-bg transition"
                  >
                    <td className="p-3 text-sm">
                      <div className="font-medium">
                        {f.students?.first_name} {f.students?.last_name}
                      </div>
                      <div className="text-xs text-secondary-light">
                        {f.students?.admission_no}
                      </div>
                    </td>
                    <td className="text-sm">{f.fee_structures?.courses?.course_name}</td>
                    <td className="text-sm font-semibold">
                      ₹{Number(f.final_fee).toLocaleString()}
                    </td>
                    <td className="text-sm text-green-600">
                      ₹{(f.total_paid || 0).toLocaleString()}
                    </td>
                    <td className="text-sm text-red-600">
                      ₹{(f.pending || 0).toLocaleString()}
                    </td>
                    <td className="text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{
                              width: `${f.final_fee > 0 ? ((f.total_paid / f.final_fee) * 100).toFixed(0) : 0}%`,
                            }}
                          ></div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            f.status === "Paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {f.status}
                        </span>
                      </div>
                    </td>
                    <td className="text-sm">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(f)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => setCollectingFee(f)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Collect Payment">
                          <Wallet size={15} />
                        </button>
                        <button onClick={() => handleViewPayments(f)} className="p-1 text-purple-600 hover:bg-purple-50 rounded" title="Payments">
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (!window.confirm("Delete this fee record?")) return;
                            deleteMutation.mutate(f.id);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat text-sm transition disabled:opacity-60"
          >
            {isFetchingNextPage ? "Loading more…" : "Load More"}
          </button>
        </div>
      )}

      {/* Assign/Edit Modal (branded) */}
      {showAssignForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <img
                  src="/ShreeVidhyaDark.png"
                  alt="ShreeVidhya Academy"
                  className="h-10 w-auto"
                />
                <h2 className="text-xl font-righteous text-primary-dark">
                  {editingFee ? "Edit Fee" : "Assign Fee"}
                </h2>
              </div>
              <button onClick={() => setShowAssignForm(false)} className="p-2 hover:bg-secondary-bg rounded-lg">
                <X size={20} className="text-secondary-dark" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Student */}
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <User size={14} className="inline mr-1" /> Student *
                </label>
                <select
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  required
                >
                  <option value="">Select</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.admission_no})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fee Structure */}
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <BookOpen size={14} className="inline mr-1" /> Fee Structure *
                </label>
                <select
                  value={form.fee_structure_id}
                  onChange={(e) => handleFeeStructureChange(e.target.value)}
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  required
                >
                  <option value="">Select</option>
                  {feeStructures.map((fs) => (
                    <option key={fs.id} value={fs.id}>
                      {fs.courses?.course_name} (₹{fs.fee_amount})
                    </option>
                  ))}
                </select>
              </div>

              {/* Total Fee */}
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <DollarSign size={14} className="inline mr-1" /> Total Fee
                </label>
                <input
                  type="number"
                  value={form.total_fee}
                  disabled
                  className="w-full border border-secondary-light rounded p-2.5 bg-gray-100 text-secondary-dark"
                />
              </div>

              {/* Discount */}
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <Percent size={14} className="inline mr-1" /> Discount
                </label>
                <input
                  type="number"
                  value={form.discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              {/* Final Fee */}
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  Final Fee (auto)
                </label>
                <input
                  type="number"
                  value={form.final_fee}
                  disabled
                  className="w-full border border-secondary-light rounded p-2.5 bg-gray-100 text-secondary-dark"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <Tag size={14} className="inline mr-1" /> Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                >
                  <option>Pending</option>
                  <option>Paid</option>
                </select>
              </div>

              {/* Installments Section (only if structure allows installments) */}
              {structureAllowsInstallments && (
                <div className="border-t border-secondary-light pt-4 mt-4">
                  <label className="flex items-center gap-2 text-sm font-montserrat text-secondary-dark mb-3">
                    <input
                      type="checkbox"
                      checked={enableInstallments}
                      onChange={(e) => {
                        setEnableInstallments(e.target.checked);
                        if (e.target.checked && installments.length === 0) {
                          setInstallmentCount(1);
                          setInstallments([{ amount: form.final_fee, due_date: "" }]);
                        }
                      }}
                      className="rounded accent-primary h-4 w-4"
                    />
                    Enable Installments
                  </label>

                  {enableInstallments && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-montserrat text-secondary-dark">
                          Number of Installments
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={installmentCount}
                          onChange={(e) => handleInstallmentCountChange(e.target.value)}
                          className="w-full border border-secondary-light rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                        />
                      </div>

                      {installments.map((inst, idx) => (
                        <div key={idx} className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-montserrat text-secondary-dark">
                              Amount {idx + 1}
                            </label>
                            <input
                              type="number"
                              value={inst.amount}
                              onChange={(e) => updateInstallment(idx, "amount", Number(e.target.value))}
                              className="w-full border border-secondary-light rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-montserrat text-secondary-dark">
                              Due Date {idx + 1}
                            </label>
                            <input
                              type="date"
                              value={inst.due_date}
                              onChange={(e) => updateInstallment(idx, "due_date", e.target.value)}
                              className="w-full border border-secondary-light rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
                <button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat transition">
                  {editingFee ? "Update Fee" : "Assign Fee"}
                </button>
                <button type="button" onClick={() => setShowAssignForm(false)} className="w-full sm:w-auto border border-secondary-light text-secondary-dark hover:bg-secondary-bg px-6 py-2.5 rounded-lg font-montserrat transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {collectingFee && (
        <CollectPaymentModal
          fee={collectingFee}
          onClose={() => setCollectingFee(null)}
          onSuccess={() => {
            setCollectingFee(null);
            queryClient.invalidateQueries({ queryKey: ["studentFees"] });
          }}
        />
      )}

      {/* View Payments Modal */}
      {viewPayments && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <img
                  src="/ShreeVidhyaDark.png"
                  alt="ShreeVidhya Academy"
                  className="h-10 w-auto"
                />
                <h2 className="text-xl font-righteous text-primary-dark">Payment History</h2>
              </div>
              <button
                onClick={() => {
                  setViewPayments(null);
                  setSelectedFeeForPayments(null);
                }}
                className="p-2 hover:bg-secondary-bg rounded-lg"
              >
                <X size={20} className="text-secondary-dark" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-secondary-dark font-montserrat mb-4">
                <span className="font-medium">
                  {viewPayments.fee.students?.first_name} {viewPayments.fee.students?.last_name}
                </span>{" "}
                – {viewPayments.fee.fee_structures?.courses?.course_name}
              </p>
              {paymentsLoading ? (
                <p className="text-center text-secondary">Loading payments…</p>
              ) : viewPayments.payments.length === 0 ? (
                <p className="text-secondary text-center">No payments yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-2 text-sm font-montserrat text-secondary-dark">Date</th>
                        <th className="text-left p-2 text-sm font-montserrat text-secondary-dark">Amount</th>
                        <th className="text-left p-2 text-sm font-montserrat text-secondary-dark">Mode</th>
                        <th className="text-left p-2 text-sm font-montserrat text-secondary-dark">Txn No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewPayments.payments.map((p) => (
                        <tr key={p.id} className="border-b border-secondary-light">
                          <td className="p-2 text-sm">{p.payment_date}</td>
                          <td className="p-2 text-sm font-medium">₹{Number(p.amount).toLocaleString()}</td>
                          <td className="p-2 text-sm">{p.payment_mode}</td>
                          <td className="p-2 text-sm">{p.transaction_no || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}