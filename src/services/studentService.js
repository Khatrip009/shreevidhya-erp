import { supabase } from "../api/supabase";

/**
 * Create a Supabase auth user, update profile role, and return the user ID.
 * Throws user-friendly error if email already exists.
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
      throw new Error("This email is already registered. Please use another email.");
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

// Now includes medium name and medium_id filter
export async function getStudents({ pageParam = 0, filters = {} }) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("students")
    .select("*, mediums(name)", { count: "exact" })
    .order("id", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`
    );
  }
  if (filters.standard) query = query.eq("standard", filters.standard);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.medium_id) query = query.eq("medium_id", filters.medium_id);
  if (filters.batch_id) {
    const { data: batchStudents } = await supabase
      .from("student_batches")
      .select("student_id")
      .eq("batch_id", filters.batch_id)
      .eq("status", "active");
    const ids = batchStudents?.map((b) => b.student_id) || [];
    if (ids.length > 0) query = query.in("id", ids);
    else return { data: [], count: 0 };
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

  // Flatten medium name
  const enriched = (data || []).map((student) => ({
    ...student,
    medium_name: student.mediums?.name || "",
  }));

  return { data: enriched, count };
}

// Now returns medium name
export async function getStudent(id) {
  const { data, error } = await supabase
    .from("students")
    .select("*, mediums(name)")
    .eq("id", id)
    .single();
  if (error) throw error;

  return {
    ...data,
    medium_name: data.mediums?.name || "",
  };
}

// createStudent/updateStudent unchanged – medium_id is part of payload
export async function createStudent(payload) {
  const { _parent_ids, email, password, ...studentData } = payload;

  const fullName = `${studentData.first_name || ""} ${studentData.last_name || ""}`.trim();
  const userId = await createAuthUser(email, password, fullName, "student");

  const { data: student, error } = await supabase
    .from("students")
    .insert([{ ...studentData, user_id: userId }])
    .select()
    .single();
  if (error) throw error;

  if (_parent_ids && _parent_ids.length > 0) {
    const links = _parent_ids.map((parentId) => ({
      student_id: student.id,
      parent_id: parentId,
      relation: "Parent",
    }));
    const { error: linkError } = await supabase.from("student_parents").insert(links);
    if (linkError) throw linkError;
  }

  return student;
}

export async function updateStudent(id, payload) {
  const { _parent_ids, email, password, ...studentData } = payload;
  const { data: student, error } = await supabase
    .from("students")
    .update(studentData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if (_parent_ids !== undefined) {
    await supabase.from("student_parents").delete().eq("student_id", id);
    if (_parent_ids.length > 0) {
      const links = _parent_ids.map((parentId) => ({
        student_id: id,
        parent_id: parentId,
        relation: "Parent",
      }));
      const { error: linkError } = await supabase.from("student_parents").insert(links);
      if (linkError) throw linkError;
    }
  }
  return student;
}

export async function deleteStudent(id) {
  const { error } = await supabase
    .from("students")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Export includes medium name and medium_id filter
export async function getAllStudentsForExport(filters = {}) {
  let query = supabase
    .from("students")
    .select("*, mediums(name)")
    .order("id", { ascending: false });

  if (filters.search) {
    query = query.or(
      `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`
    );
  }
  if (filters.standard) query = query.eq("standard", filters.standard);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.medium_id) query = query.eq("medium_id", filters.medium_id);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((student) => ({
    ...student,
    medium_name: student.mediums?.name || "",
  }));
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