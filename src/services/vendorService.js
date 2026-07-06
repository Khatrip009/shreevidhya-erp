// src/services/vendorService.js
import { supabase } from "../api/supabase";

export async function getVendors(filters = {}) {
  let query = supabase.from("vendors").select("*").order("vendor_name");
  if (filters.search) {
    query = query.ilike("vendor_name", `%${filters.search}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getVendor(id) {
  const { data, error } = await supabase.from("vendors").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createVendor(payload) {
  const { data, error } = await supabase.from("vendors").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateVendor(id, payload) {
  const { data, error } = await supabase
    .from("vendors")
    .update({ ...payload, updated_at: new Date() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVendor(id) {
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) throw error;
}