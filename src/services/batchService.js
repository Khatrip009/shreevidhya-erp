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

// CRUD with teacher‑junction sync
export async function createBatch(payload) {
  const { teacher_id, ...batchData } = payload;

  // 1. Insert the batch (keeping teacher_id for direct column if needed)
  const { data: batch, error } = await supabase
    .from("batches")
    .insert([{ ...batchData, teacher_id }])
    .select()
    .single();
  if (error) throw error;

  // 2. Sync to batch_teachers junction
  if (teacher_id) {
    const { error: linkError } = await supabase
      .from("batch_teachers")
      .insert({ batch_id: batch.id, teacher_id });
    if (linkError) throw linkError;
  }

  return batch;
}

export async function updateBatch(id, payload) {
  const { teacher_id, ...batchData } = payload;

  // 1. Update the batch row
  const { data: batch, error } = await supabase
    .from("batches")
    .update({ ...batchData, teacher_id })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  // 2. Replace the teacher assignment in the junction table
  if (teacher_id !== undefined) {
    await supabase.from("batch_teachers").delete().eq("batch_id", id);
    if (teacher_id) {
      const { error: linkError } = await supabase
        .from("batch_teachers")
        .insert({ batch_id: id, teacher_id });
      if (linkError) throw linkError;
    }
  }

  return batch;
}

export async function deleteBatch(id) {
  // soft-delete the batch
  const { error } = await supabase
    .from("batches")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  // also soft-delete batch_teachers entries (optional, but clean)
  await supabase
    .from("batch_teachers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("batch_id", id);
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