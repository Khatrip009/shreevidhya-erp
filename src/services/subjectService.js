import { supabase } from "../api/supabase";

// Paginated fetch with search filter
export async function getSubjects({ pageParam = 0, filters = {} } = {}) {
  const limit = 50; // subjects are small, so we can load more per page
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("subjects")
    .select("*, courses(course_name)", { count: "exact" })
    .order("course_id, id")
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `subject_name.ilike.%${filters.search}%,courses.course_name.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

// Export all subjects (unpaginated, respecting search)
export async function getAllSubjectsForExport(filters = {}) {
  let query = supabase
    .from("subjects")
    .select("*, courses(course_name)")
    .order("course_id, id");

  if (filters.search) {
    query = query.or(
      `subject_name.ilike.%${filters.search}%,courses.course_name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// CRUD
export async function createSubject(payload) {
  const { data, error } = await supabase
    .from("subjects")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSubject(id, payload) {
  const { data, error } = await supabase
    .from("subjects")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(id) {
  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Course dropdown (unchanged)
export async function getCoursesForDropdown() {
  const { data, error } = await supabase
    .from("courses")
    .select("id, course_name")
    .order("course_name");
  if (error) throw error;
  return data;
}