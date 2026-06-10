import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Plus,
  Calendar,
  FileText,
  X,
} from "lucide-react";
import AdminLayout from "../layouts/AdminLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../api/supabase";
import { getLeaves, createLeave } from "../services/leaveService";

export default function MyLeaves() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ start_date: "", end_date: "", reason: "" });

  // Fetch teacher ID safely – never returns undefined
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
      return data?.id || null;         // always null or number
    },
    enabled: !!user?.id,
  });

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["my-leaves", teacherId],
    queryFn: async () => {
      if (!teacherId) return [];
      const { data } = await supabase
        .from("leaves")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!teacherId,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => createLeave({ ...payload, teacher_id: teacherId }),
    onSuccess: () => {
      toast.success("Leave request submitted");
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      setShowForm(false);
      setForm({ start_date: "", end_date: "", reason: "" });
    },
    onError: () => toast.error("Failed to submit leave request"),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.start_date || !form.end_date) return;
    createMutation.mutate(form);
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">My Leaves</h1>
        <button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary-light text-white px-4 py-2 rounded-lg text-sm font-montserrat flex items-center gap-2">
          <Plus size={16} /> Request Leave
        </button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center">Loading...</div>
      ) : leaves.length === 0 ? (
        <p className="text-secondary">No leave requests yet.</p>
      ) : (
        <div className="space-y-4">
          {leaves.map((l) => (
            <div key={l.id} className="bg-white rounded-xl p-4 shadow-sm border border-secondary-light">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-primary" />
                  <span className="text-sm">{l.start_date} → {l.end_date}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  l.status === "Approved" ? "bg-green-100 text-green-700" :
                  l.status === "Rejected" ? "bg-red-100 text-red-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>{l.status}</span>
              </div>
              {l.reason && <p className="text-sm text-secondary mt-2">{l.reason}</p>}
              {l.admin_remarks && <p className="text-xs text-red-500 mt-1">Admin: {l.admin_remarks}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-righteous text-primary-dark">Request Leave</h2>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-secondary-bg rounded-lg">
                <X size={20} className="text-secondary-dark" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1"><Calendar size={14} className="inline mr-1" />Start Date</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1"><Calendar size={14} className="inline mr-1" />End Date</label>
                <input type="date" value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-montserrat text-secondary-dark mb-1"><FileText size={14} className="inline mr-1" />Reason</label>
                <textarea value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} rows={2} className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary outline-none" />
              </div>
              <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
                <button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat transition">Submit</button>
                <button type="button" onClick={() => setShowForm(false)} className="w-full sm:w-auto border border-secondary-light text-secondary-dark hover:bg-secondary-bg px-6 py-2.5 rounded-lg font-montserrat transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}