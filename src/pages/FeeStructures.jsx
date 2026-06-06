import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import AdminLayout from "../layouts/AdminLayout";
import {
  getFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
} from "../services/feeService";
import { supabase } from "../api/supabase";

export default function FeeStructures() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    course_id: "",
    fee_amount: "",
    installment_allowed: false,
  });

  // Fetch fee structures
  const { data: structures = [], isLoading } = useQuery({
    queryKey: ["feeStructures"],
    queryFn: getFeeStructures,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch courses for dropdown
  const { data: courses = [] } = useQuery({
    queryKey: ["courses-dropdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, course_name");
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createFeeStructure,
    onSuccess: () => {
      toast.success("Fee structure created");
      queryClient.invalidateQueries({ queryKey: ["feeStructures"] });
      setShowForm(false);
    },
    onError: () => toast.error("Failed to create fee structure"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateFeeStructure(id, payload),
    onSuccess: () => {
      toast.success("Fee structure updated");
      queryClient.invalidateQueries({ queryKey: ["feeStructures"] });
      setEditing(null);
    },
    onError: () => toast.error("Failed to update fee structure"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFeeStructure,
    onSuccess: () => {
      toast.success("Fee structure deleted");
      queryClient.invalidateQueries({ queryKey: ["feeStructures"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  function openCreate() {
    setForm({ course_id: "", fee_amount: "", installment_allowed: false });
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(structure) {
    setForm({
      course_id: structure.course_id,
      fee_amount: structure.fee_amount,
      installment_allowed: structure.installment_allowed,
    });
    setEditing(structure);
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      course_id: form.course_id,
      fee_amount: Number(form.fee_amount),
      installment_allowed: form.installment_allowed,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <AdminLayout>
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Fee Structures</h1>
          <p className="text-slate-500">Define course fees</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-slate-900 text-white px-5 py-2 rounded-lg"
        >
          Add Structure
        </button>
      </div>

      <div className="bg-white rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left">Course</th>
              <th className="text-left">Fee Amount</th>
              <th className="text-left">Installments</th>
              <th className="text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="text-center p-6">
                  Loading...
                </td>
              </tr>
            ) : structures.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center p-6 text-slate-500">
                  No fee structures yet
                </td>
              </tr>
            ) : (
              structures.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-3">{s.courses?.course_name}</td>
                  <td>₹{Number(s.fee_amount).toLocaleString()}</td>
                  <td>{s.installment_allowed ? "Yes" : "No"}</td>
                  <td>
                    <button
                      onClick={() => openEdit(s)}
                      className="text-blue-600 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (!window.confirm("Delete this fee structure?"))
                          return;
                        deleteMutation.mutate(s.id);
                      }}
                      className="text-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editing ? "Edit Structure" : "New Structure"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Course</label>
                <select
                  value={form.course_id}
                  onChange={(e) =>
                    setForm({ ...form, course_id: e.target.value })
                  }
                  className="w-full border p-3 rounded"
                  required
                >
                  <option value="">Select</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fee Amount (₹)
                </label>
                <input
                  type="number"
                  value={form.fee_amount}
                  onChange={(e) =>
                    setForm({ ...form, fee_amount: e.target.value })
                  }
                  className="w-full border p-3 rounded"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.installment_allowed}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      installment_allowed: e.target.checked,
                    })
                  }
                  id="installment"
                />
                <label htmlFor="installment">Allow Installments</label>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="border px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 text-white px-5 py-2 rounded"
                >
                  {editing ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}