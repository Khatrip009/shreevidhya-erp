import { supabase } from "../api/supabase";

// Paginated fetch with filters
export async function getParents({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("parents")
    .select("*", { count: "exact" })
    .order("id", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `father_name.ilike.%${filters.search}%,mother_name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

// Export all parents (for CSV)
export async function getAllParentsForExport(filters = {}) {
  let query = supabase
    .from("parents")
    .select("*")
    .order("id", { ascending: false });

  if (filters.search) {
    query = query.or(
      `father_name.ilike.%${filters.search}%,mother_name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// CRUD
export async function createParent(payload) {
  const { data, error } = await supabase
    .from("parents")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateParent(id, payload) {
  const { data, error } = await supabase
    .from("parents")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteParent(id) {
  const { error } = await supabase
    .from("parents")
    .delete()
    .eq("id", id);
  if (error) throw error;
}