import { supabase } from "../api/supabase";

export async function getStudents({ pageParam = 0, filters = {} }) {
  const limit = 10; // rows per page
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("students")
    .select("*", { count: "exact" })
    .order("id", { ascending: false })
    .range(from, to);

  // Apply filters
  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`
    );
  }
  if (filters.standard) query = query.eq("standard", filters.standard);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.batch_id) {
    // If batch filter is applied, we need to join via student_batches
    // Instead, we'll use a subquery to get student IDs in that batch
    const { data: batchStudents } = await supabase
      .from("student_batches")
      .select("student_id")
      .eq("batch_id", filters.batch_id)
      .eq("status", "active");
    const ids = batchStudents?.map((b) => b.student_id) || [];
    if (ids.length > 0) query = query.in("id", ids);
    else return { data: [], count: 0 }; // no students in that batch
  }
  if (filters.course_id) {
    const { data: courseBatches } = await supabase
      .from("batches")
      .select("id")
      .eq("course_id", filters.course_id);
    const batchIds = courseBatches?.map((b) => b.id) || [];
    const { data: batchStudents } = await supabase
      .from("student_batches")
      .select("student_id")
      .in("batch_id", batchIds)
      .eq("status", "active");
    const ids = batchStudents?.map((b) => b.student_id) || [];
    if (ids.length > 0) query = query.in("id", ids);
    else return { data: [], count: 0 };
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function getStudent(id) {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function createStudent(payload) {
  const { data, error } = await supabase
    .from("students")
    .insert([payload])
    .select();
  if (error) throw error;
  return data;
}

export async function updateStudent(id, payload) {
  const { data, error } = await supabase
    .from("students")
    .update(payload)
    .eq("id", id)
    .select();
  if (error) throw error;
  return data;
}

export async function deleteStudent(id) {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Export all filtered data (for CSV)
export async function getAllStudentsForExport(filters = {}) {
  let query = supabase
    .from("students")
    .select("*")
    .order("id", { ascending: false });

  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`
    );
  }
  if (filters.standard) query = query.eq("standard", filters.standard);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.status) query = query.eq("status", filters.status);
  // Apply batch/course filters if needed (similar to above)

  const { data, error } = await query;
  if (error) throw error;
  return data;
}