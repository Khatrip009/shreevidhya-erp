import { supabase } from "../api/supabase";

/**
 * Reusable function to create auth user + update profile role.
 */
async function createAuthUser(email, password, fullName, role) {
  if (!email || !password) return null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) throw new Error("A user with this email already exists.");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) {
    if (error.message.includes("already been registered"))
      throw new Error("This email is already registered.");
    throw error;
  }

  const userId = data.user.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (profileError) throw profileError;

  return userId;
}

// ─── CRUD ───────────────────────────────────────────────

// Now includes medium, course names, and filters by medium_id & course_id
export async function getTeachers({ pageParam = 0, filters = {} }) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("teachers")
    .select(
      "*, mediums(name), courses(course_name), profiles(email)",
      { count: "exact" }
    )
    .order("id", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,employee_code.ilike.%${filters.search}%`
    );
  }
  if (filters.medium_id) query = query.eq("medium_id", filters.medium_id);
  if (filters.course_id) query = query.eq("course_id", filters.course_id);

  const { data, error, count } = await query;
  if (error) throw error;

  // Flatten medium, course names and user_email
  const enriched = (data || []).map((teacher) => ({
    ...teacher,
    medium_name: teacher.mediums?.name || "",
    course_name: teacher.courses?.course_name || "",
    user_email: teacher.profiles?.email || "",
  }));

  return { data: enriched, count };
}

// Export includes medium, course names, and filters
export async function getAllTeachersForExport(filters = {}) {
  let query = supabase
    .from("teachers")
    .select("*, mediums(name), courses(course_name)")
    .order("id", { ascending: false });

  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,employee_code.ilike.%${filters.search}%`
    );
  }
  if (filters.medium_id) query = query.eq("medium_id", filters.medium_id);
  if (filters.course_id) query = query.eq("course_id", filters.course_id);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((teacher) => ({
    ...teacher,
    medium_name: teacher.mediums?.name || "",
    course_name: teacher.courses?.course_name || "",
  }));
}

// createTeacher/updateTeacher unchanged – medium_id, course_id are accepted via payload
export async function createTeacher(payload) {
  const { email, password, ...teacherData } = payload;

  const fullName = `${teacherData.first_name || ""} ${teacherData.last_name || ""}`.trim();
  const userId = await createAuthUser(email, password, fullName, "teacher");

  const { data: teacher, error } = await supabase
    .from("teachers")
    .insert([{ ...teacherData, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return teacher;
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
    .update({ deleted_at: new Date().toISOString() })
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

// NEW – get mediums for filter dropdown
export async function getMediumOptions() {
  const { data, error } = await supabase
    .from("mediums")
    .select("id, name")
    .order("name");
  if (error) throw error;
  return data || [];
}

// NEW – get courses for filter dropdown (alias for clarity)
export async function getCourseOptions() {
  const { data, error } = await supabase
    .from("courses")
    .select("id, course_name")
    .order("course_name");
  if (error) throw error;
  return data || [];
}