// src/pages/FeeStructures.jsx
import { useState, useRef } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Search, Plus, Edit3, Trash2, Download, Upload, X, List, Package,
} from "lucide-react";
import Papa from "papaparse";
import AdminLayout from "../layouts/AdminLayout";
import { supabase } from "../api/supabase";

// Fetch fee structures with components
async function getFeeStructures({ pageParam = 0, filters = {} }) {
  const limit = 100; // ✅ increased from 10 to 100
  let query = supabase
    .from("fee_structures")
    .select("*, courses(course_name), tax_rates(name, rate), fee_structure_components(*)")
    .order("id")
    .range(pageParam * limit, (pageParam + 1) * limit - 1);

  if (filters.search) {
    query = query.or(`courses.course_name.ilike.%${filters.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data || [], count };
}

export default function FeeStructures() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    course_id: "",
    fee_amount: "",
    tax_rate_id: "",
    tax_inclusive: true,
  });
  const [components, setComponents] = useState([{ component_name: "", amount: "", is_taxable: true }]);

  const fileInputRef = useRef(null);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, course_name").eq("status", true);
      return data || [];
    },
  });

  const { data: taxRates = [] } = useQuery({
    queryKey: ["tax-rates"],
    queryFn: async () => {
      const { data } = await supabase.from("tax_rates").select("id, name").eq("is_active", true);
      return data || [];
    },
  });

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["fee-structures", search],
    queryFn: ({ pageParam = 0 }) => getFeeStructures({ pageParam, filters: { search } }),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.data.length, 0);
      if (lastPage.count && totalFetched < lastPage.count) return allPages.length;
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60 * 1000,
  });

  const feeStructures = data?.pages.flatMap((page) => page.data) || [];

  const createMut = useMutation({
    mutationFn: async () => {
      const totalFee = components.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
      const { data: fs, error } = await supabase
        .from("fee_structures")
        .insert({
          course_id: form.course_id,
          fee_amount: totalFee,
          tax_rate_id: form.tax_rate_id || null,
          tax_inclusive: form.tax_inclusive,
        })
        .select()
        .single();
      if (error) throw error;
      const compInserts = components.map((c, idx) => ({
        fee_structure_id: fs.id,
        component_name: c.component_name,
        amount: parseFloat(c.amount),
        is_taxable: c.is_taxable,
        sort_order: idx,
      }));
      await supabase.from("fee_structure_components").insert(compInserts);
      return fs;
    },
    onSuccess: () => {
      toast.success("Fee structure created");
      queryClient.invalidateQueries(["fee-structures"]);
      setShowForm(false);
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMut = useMutation({
    mutationFn: async () => {
      const totalFee = components.reduce((s, c) => s + (parseFloat(c.amount) || 0), 0);
      await supabase
        .from("fee_structures")
        .update({
          course_id: form.course_id,
          fee_amount: totalFee,
          tax_rate_id: form.tax_rate_id || null,
          tax_inclusive: form.tax_inclusive,
        })
        .eq("id", editing.id);
      await supabase.from("fee_structure_components").delete().eq("fee_structure_id", editing.id);
      const compInserts = components.map((c, idx) => ({
        fee_structure_id: editing.id,
        component_name: c.component_name,
        amount: parseFloat(c.amount),
        is_taxable: c.is_taxable,
        sort_order: idx,
      }));
      await supabase.from("fee_structure_components").insert(compInserts);
    },
    onSuccess: () => {
      toast.success("Fee structure updated");
      queryClient.invalidateQueries(["fee-structures"]);
      setEditing(null);
      setShowForm(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id) => {
      await supabase.from("fee_structures").delete().eq("id", id);
    },
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries(["fee-structures"]);
    },
    onError: () => toast.error("Delete failed"),
  });

  const resetForm = () => {
    setForm({ course_id: "", fee_amount: "", tax_rate_id: "", tax_inclusive: true });
    setComponents([{ component_name: "", amount: "", is_taxable: true }]);
  };

  const openCreate = () => { resetForm(); setEditing(null); setShowForm(true); };
  const openEdit = (fs) => {
    setForm({
      course_id: fs.course_id,
      tax_rate_id: fs.tax_rate_id || "",
      tax_inclusive: fs.tax_inclusive,
    });
    setComponents(
      fs.fee_structure_components?.map((c) => ({
        component_name: c.component_name,
        amount: c.amount,
        is_taxable: c.is_taxable,
      })) || [{ component_name: "", amount: "", is_taxable: true }]
    );
    setEditing(fs);
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.course_id) { toast.error("Select a course"); return; }
    if (components.some((c) => !c.component_name.trim() || !c.amount)) {
      toast.error("All components need a name and amount");
      return;
    }
    if (editing) updateMut.mutate();
    else createMut.mutate();
  };

  const addComponent = () => {
    setComponents([...components, { component_name: "", amount: "", is_taxable: true }]);
  };
  const removeComponent = (idx) => {
    setComponents(components.filter((_, i) => i !== idx));
  };
  const updateComponent = (idx, field, value) => {
    const updated = [...components];
    updated[idx][field] = value;
    setComponents(updated);
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">Fee Structures</h1>
        <button onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          <Plus size={16} /> Add Structure
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
        <input type="text" placeholder="Search by course..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm" />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-3 text-left text-sm">Course</th>
              <th className="p-3 text-left text-sm">Total Fee</th>
              <th className="p-3 text-left text-sm">Tax</th>
              <th className="p-3 text-left text-sm">Components</th>
              <th className="p-3 text-left text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-6 text-center">Loading…</td></tr>
            ) : feeStructures.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-secondary">No fee structures.</td></tr>
            ) : (
              feeStructures.map((fs) => (
                <tr key={fs.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-sm">{fs.courses?.course_name || "—"}</td>
                  <td className="p-3 text-sm">₹ {Number(fs.fee_amount).toLocaleString("en-IN")}</td>
                  <td className="p-3 text-sm">{fs.tax_rates?.name || "None"}</td>
                  <td className="p-3 text-sm">
                    {fs.fee_structure_components?.map((c) => (
                      <span key={c.id} className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs mr-1 mb-1">
                        {c.component_name}: ₹{Number(c.amount).toLocaleString("en-IN")}
                      </span>
                    ))}
                  </td>
                  <td className="text-sm">
                    <button onClick={() => openEdit(fs)} className="text-blue-600 mr-2"><Edit3 size={15} /></button>
                    <button onClick={() => { if (window.confirm("Delete?")) deleteMut.mutate(fs.id); }} className="text-red-600"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <div className="flex justify-center mt-4">
          <button onClick={() => fetchNextPage()} className="bg-primary text-white px-4 py-2 rounded-lg text-sm">
            {isFetchingNextPage ? "Loading…" : "Load More"}
          </button>
        </div>
      )}

      {/* Add/Edit Modal – unchanged */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-righteous text-primary-dark">{editing ? "Edit Structure" : "Add Structure"}</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-secondary-dark" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-1">Course *</label>
                <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className="w-full border rounded p-2.5 text-sm" required>
                  <option value="">Select course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Tax Rate</label>
                  <select value={form.tax_rate_id} onChange={(e) => setForm({ ...form, tax_rate_id: e.target.value })} className="w-full border rounded p-2.5 text-sm">
                    <option value="">None</option>
                    {taxRates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.tax_inclusive} onChange={(e) => setForm({ ...form, tax_inclusive: e.target.checked })} className="rounded text-primary" />
                    Tax Inclusive
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fee Components</label>
                <div className="space-y-3">
                  {components.map((comp, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 items-center border p-2 rounded">
                      <input
                        type="text"
                        placeholder="Name"
                        value={comp.component_name}
                        onChange={(e) => updateComponent(idx, "component_name", e.target.value)}
                        className="col-span-2 border rounded p-2 text-sm"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={comp.amount}
                        onChange={(e) => updateComponent(idx, "amount", e.target.value)}
                        className="col-span-1 border rounded p-2 text-sm"
                        required
                      />
                      <label className="flex items-center gap-1 text-xs col-span-1">
                        <input
                          type="checkbox"
                          checked={comp.is_taxable}
                          onChange={(e) => updateComponent(idx, "is_taxable", e.target.checked)}
                          className="rounded text-primary"
                        />
                        Taxable
                      </label>
                      <button type="button" onClick={() => removeComponent(idx)} className="text-red-500 justify-self-end"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addComponent} className="text-primary text-sm mt-2 flex items-center gap-1">
                  <Plus size={16} /> Add Component
                </button>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm">{editing ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}