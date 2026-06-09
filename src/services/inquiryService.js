import { supabase } from "../api/supabase";

// Paginated fetch with filters
export async function getInquiries({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("inquiries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `student_name.ilike.%${filters.search}%,parent_name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,inquiry_no.ilike.%${filters.search}%`
    );
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.interested_course_id) query = query.eq("interested_course_id", filters.interested_course_id);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.start_date) query = query.gte("created_at", filters.start_date);
  if (filters.end_date) query = query.lte("created_at", filters.end_date);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

// Export all inquiries matching filters (for CSV)
export async function getAllInquiriesForExport(filters = {}) {
  let query = supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.search) {
    query = query.or(
      `student_name.ilike.%${filters.search}%,parent_name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,inquiry_no.ilike.%${filters.search}%`
    );
  }
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.interested_course_id) query = query.eq("interested_course_id", filters.interested_course_id);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.start_date) query = query.gte("created_at", filters.start_date);
  if (filters.end_date) query = query.lte("created_at", filters.end_date);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// CRUD
export async function createInquiry(payload) {
  const { data, error } = await supabase
    .from("inquiries")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInquiry(id, payload) {
  const { data, error } = await supabase
    .from("inquiries")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteInquiry(id) {
  const { error } = await supabase
    .from("inquiries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Dropdown options for filters/form
export async function getCourseOptions() {
  const { data, error } = await supabase
    .from("courses")
    .select("id, course_name")
    .eq("status", true);
  if (error) throw error;
  return data || [];
}