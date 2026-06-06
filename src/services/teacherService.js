import { supabase } from "../api/supabase";

export async function getTeachers({ pageParam = 0, filters = {} }) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("teachers")
    .select("*", { count: "exact" })
    .order("id", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,employee_code.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function getAllTeachersForExport(filters = {}) {
  let query = supabase
    .from("teachers")
    .select("*")
    .order("id", { ascending: false });

  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,employee_code.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createTeacher(payload) {
  const { data, error } = await supabase
    .from("teachers")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTeacher(id, payload) {
  const { data, error } = await supabase
    .from("teachers")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTeacher(id) {
  const { error } = await supabase
    .from("teachers")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function getTeacherOptions() {
  const { data, error } = await supabase
    .from("teachers")
    .select("id, first_name, last_name");
  if (error) throw error;
  return data;
}