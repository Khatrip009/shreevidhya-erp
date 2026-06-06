import { supabase } from "../api/supabase";

export async function getStudents({ pageParam = 0, filters = {} }) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("students")
    .select("*", { count: "exact" })
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
  const { _parent_ids, ...studentData } = payload;

  // 1. Insert student
  const { data: student, error } = await supabase
    .from("students")
    .insert([studentData])
    .select()
    .single();
  if (error) throw error;

  // 2. Create student_parent links if any
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
  const { _parent_ids, ...studentData } = payload;

  // 1. Update student record
  const { data: student, error } = await supabase
    .from("students")
    .update(studentData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  // 2. Replace parent links
  if (_parent_ids !== undefined) {
    // Remove old links
    await supabase.from("student_parents").delete().eq("student_id", id);
    // Insert new links
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
  // Clean up parent links first (in case CASCADE is not set)
  await supabase.from("student_parents").delete().eq("student_id", id);
  const { error } = await supabase.from("students").delete().eq("id", id);
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

  const { data, error } = await query;
  if (error) throw error;
  return data;
}