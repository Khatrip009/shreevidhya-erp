import { supabase } from "../api/supabase";

// Paginated fetch with filters
export async function getBatches({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("batches")
    .select(
      `*, courses(course_name), teachers(first_name, last_name)`,
      { count: "exact" }
    )
    .order("id", { ascending: false })
    .range(from, to);

  // Apply filters
  if (filters.search) {
    query = query.ilike("batch_name", `%${filters.search}%`);
  }
  if (filters.course_id) query = query.eq("course_id", filters.course_id);
  if (filters.teacher_id) query = query.eq("teacher_id", filters.teacher_id);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

// Unpaginated fetch for export
export async function getAllBatchesForExport(filters = {}) {
  let query = supabase
    .from("batches")
    .select(`*, courses(course_name), teachers(first_name, last_name)`)
    .order("id", { ascending: false });

  if (filters.search) query = query.ilike("batch_name", `%${filters.search}%`);
  if (filters.course_id) query = query.eq("course_id", filters.course_id);
  if (filters.teacher_id) query = query.eq("teacher_id", filters.teacher_id);
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// CRUD
export async function createBatch(payload) {
  const { data, error } = await supabase
    .from("batches")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBatch(id, payload) {
  const { data, error } = await supabase
    .from("batches")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBatch(id) {
  const { error } = await supabase
    .from("batches")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Dropdown options
export async function getCourseOptions() {
  const { data, error } = await supabase
    .from("courses")
    .select("id, course_name");
  if (error) throw error;
  return data || [];
}

export async function getTeacherOptions() {
  const { data, error } = await supabase
    .from("teachers")
    .select("id, first_name, last_name");
  if (error) throw error;
  return data || [];
}