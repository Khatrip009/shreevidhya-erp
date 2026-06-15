import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  BookOpen,
  DollarSign,
  Layers,
} from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import {
  getFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
} from "../services/feeService";
import { supabase } from "../api/supabase";
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";

export default function FeeStructures() {
  const queryClient = useQueryClient();
  const darkLogo = useOrgDarkLogo();

  const [search, setSearch] = useState("");
  const [mediumFilter, setMediumFilter] = useState("");   // NEW
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    course_id: "",
    fee_amount: "",
    installment_allowed: false,
  });

  // Fetch fee structures (service now returns medium_name)
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

  // Fetch mediums for filter
  const { data: mediums = [] } = useQuery({
    queryKey: ["mediums-dropdown"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mediums")
        .select("id, name")
        .order("name");
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

  // Filter by search and medium
  const filteredStructures = structures.filter((s) => {
    const matchesSearch = s.courses?.course_name?.toLowerCase().includes(search.toLowerCase());
    const matchesMedium = !mediumFilter || s.courses?.medium_id == mediumFilter;
    return matchesSearch && matchesMedium;
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
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-righteous text-primary-dark">
            Fee Structures
          </h1>
          <p className="text-sm text-secondary-dark font-montserrat mt-1">
            Define course fees
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary hover:bg-primary-light text-white px-5 py-2.5 rounded-lg transition font-montserrat text-sm flex items-center gap-2"
        >
          <Plus size={18} /> Add Structure
        </button>
      </div>

      {/* Search & Medium Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
          />
          <input
            type="text"
            placeholder="Search by course name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-secondary-light rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
          />
        </div>
        <select
          value={mediumFilter}
          onChange={(e) => setMediumFilter(e.target.value)}
          className="border border-secondary-light rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-primary outline-none"
        >
          <option value="">All Mediums</option>
          {mediums.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-slate-100 border-b border-secondary-light">
              <tr>
                <th className="p-3 text-left text-sm font-montserrat text-secondary-dark">
                  Course
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Medium
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Fee Amount
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Installments
                </th>
                <th className="text-left text-sm font-montserrat text-secondary-dark">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-secondary">
                    Loading fee structures…
                  </td>
                </tr>
              ) : filteredStructures.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-secondary">
                    <div className="flex flex-col items-center gap-2">
                      <DollarSign size={32} className="text-secondary-light" />
                      <span>No fee structures defined yet</span>
                      {(search || mediumFilter) && (
                        <span className="text-xs text-secondary-light">
                          Try adjusting your filters
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStructures.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-secondary-light hover:bg-primary-bg transition"
                  >
                    <td className="p-3 text-sm">{s.courses?.course_name}</td>
                    <td className="text-sm">
                      {s.courses?.mediums?.name || "-"}
                    </td>
                    <td className="text-sm font-semibold">
                      ₹{Number(s.fee_amount).toLocaleString()}
                    </td>
                    <td className="text-sm">
                      {s.installment_allowed ? "Yes" : "No"}
                    </td>
                    <td className="text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(s)}
                          className="text-blue-600 hover:underline"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (!window.confirm("Delete this fee structure?"))
                              return;
                            deleteMutation.mutate(s.id);
                          }}
                          className="text-red-600 hover:underline"
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

      {/* Add / Edit Modal – unchanged */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <img
                  src={darkLogo}
                  alt="ShreeVidhya Academy"
                  className="h-10 w-auto"
                />
                <h2 className="text-xl font-righteous text-primary-dark">
                  {editing ? "Edit Structure" : "New Structure"}
                </h2>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 hover:bg-secondary-bg rounded-lg transition"
              >
                <X size={20} className="text-secondary-dark" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <BookOpen size={14} className="inline mr-1" /> Course *
                </label>
                <select
                  value={form.course_id}
                  onChange={(e) =>
                    setForm({ ...form, course_id: e.target.value })
                  }
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                  required
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1">
                  <DollarSign size={14} className="inline mr-1" /> Fee Amount *
                </label>
                <input
                  type="number"
                  value={form.fee_amount}
                  onChange={(e) =>
                    setForm({ ...form, fee_amount: e.target.value })
                  }
                  className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder-secondary-light"
                  placeholder="e.g., 5000"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.installment_allowed}
                  onChange={(e) =>
                    setForm({ ...form, installment_allowed: e.target.checked })
                  }
                  id="installment"
                  className="rounded accent-primary h-4 w-4"
                />
                <label
                  htmlFor="installment"
                  className="text-sm font-montserrat text-secondary-dark cursor-pointer"
                >
                  Allow Installments
                </label>
              </div>
              <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat transition"
                >
                  {editing ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="w-full sm:w-auto border border-secondary-light text-secondary-dark hover:bg-secondary-bg px-6 py-2.5 rounded-lg font-montserrat transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}