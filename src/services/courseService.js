import { supabase } from "../api/supabase";

// Paginated fetch with search filter – now includes medium name
export async function getCourses({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("courses")
    .select("*, mediums(name)", { count: "exact" })
    .order("id", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.ilike("course_name", `%${filters.search}%`);
  }
  if (filters.medium_id) {
    query = query.eq("medium_id", filters.medium_id);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const enriched = (data || []).map((course) => ({
    ...course,
    medium_name: course.mediums?.name || "",
  }));

  return { data: enriched, count };
}

// Export all courses (unpaginated, respecting search and medium filter)
export async function getAllCoursesForExport(filters = {}) {
  let query = supabase
    .from("courses")
    .select("*, mediums(name)")
    .order("id", { ascending: false });

  if (filters.search) {
    query = query.ilike("course_name", `%${filters.search}%`);
  }
  if (filters.medium_id) {
    query = query.eq("medium_id", filters.medium_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((course) => ({
    ...course,
    medium_name: course.mediums?.name || "",
  }));
}

// CRUD – medium_id is accepted inside payload
export async function createCourse(payload) {
  const { data, error } = await supabase
    .from("courses")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCourse(id, payload) {
  const { data, error } = await supabase
    .from("courses")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCourse(id) {
  const { error } = await supabase
    .from("courses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getCourseOptions() {
  const { data, error } = await supabase
    .from("courses")
    .select("id, course_name");
  if (error) throw error;
  return data;
}

// ========================
// COURSE LEVELS (unchanged)
// ========================

export async function getCourseLevels(courseId) {
  const { data, error } = await supabase
    .from("course_levels")
    .select("*")
    .eq("course_id", courseId)
    .order("level_number", { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCourseLevel(payload) {
  const { data, error } = await supabase
    .from("course_levels")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCourseLevel(id, payload) {
  const { data, error } = await supabase
    .from("course_levels")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCourseLevel(id) {
  const { error } = await supabase
    .from("course_levels")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// NEW – get mediums for filter dropdowns
export async function getMediumOptions() {
  const { data, error } = await supabase
    .from("mediums")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data || [];
}