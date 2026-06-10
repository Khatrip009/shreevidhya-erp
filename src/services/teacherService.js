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
  // Does not handle auth changes for simplicity.
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