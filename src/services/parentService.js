import { supabase } from "../api/supabase";

/**
 * Helper: create an auth user + update profile role.
 * Returns the new user's UUID, or null if no credentials provided.
 */
async function createAuthUser(email, password, fullName, role) {
  if (!email || !password) return null;

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingProfile) throw new Error("A user with this email already exists.");

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

// ─── Paginated fetch WITH linked students ──────────────────────
export async function getParents({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("parents")
    .select(
      `*,
       student_parents(
         students(first_name, last_name, id)
       )`,
      { count: "exact" }
    )
    .order("id", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `father_name.ilike.%${filters.search}%,mother_name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  // Flatten student data for easier rendering
  const enriched = (data || []).map((parent) => ({
    ...parent,
    linked_students: (parent.student_parents || [])
      .map((link) => link.students)
      .filter(Boolean),
  }));
  return { data: enriched, count };
}

// Export all parents (for CSV) – still flat, you may add student names if needed
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

/**
 * Create a parent record.
 * @param {Object} payload – parent fields + optional `email` & `password` for auth.
 * @param {number} [studentId] – if provided, the new parent is immediately linked to this student.
 */
export async function createParent(payload, studentId = null) {
  const { email, password, ...parentData } = payload;

  const fullName =
    parentData.father_name || parentData.mother_name || "Parent";
  const userId = await createAuthUser(email, password, fullName, "parent");

  const { data: parent, error } = await supabase
    .from("parents")
    .insert([{ ...parentData, user_id: userId }])
    .select()
    .single();
  if (error) throw error;

  // If a student ID was provided, automatically link
  if (studentId) {
    const { error: linkError } = await supabase
      .from("student_parents")
      .insert({
        student_id: studentId,
        parent_id: parent.id,
        relation: "guardian",
      });
    if (linkError) throw linkError;
  }

  return parent;
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
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function linkStudentToParent(parentId, studentId) {
  // Check if link already exists
  const { data: existing } = await supabase
    .from("student_parents")
    .select("id")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existing) {
    throw new Error("This student is already linked to this parent.");
  }

  // Create new link
  const { error } = await supabase
    .from("student_parents")
    .insert({
      parent_id: parentId,
      student_id: studentId,
      relation: "parent",
    });

  if (error) throw error;
}