import { supabase } from "../api/supabase";

// Paginated fetch with filters – now includes all assigned teachers
export async function getBatches({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("batches")
    .select(
      `*, 
       courses(course_name),
       teachers(first_name, last_name),
       batch_teachers(teacher_id, subject_id, teachers(first_name, last_name), subjects(subject_name))
      `,
      { count: "exact" }
    )
    .order("id", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.ilike("batch_name", `%${filters.search}%`);
  }
  if (filters.course_id) query = query.eq("course_id", filters.course_id);
  if (filters.teacher_id) {
    // filter by teacher_id in the junction table
    const { data: linkedBatches } = await supabase
      .from("batch_teachers")
      .select("batch_id")
      .eq("teacher_id", filters.teacher_id);
    const batchIds = linkedBatches?.map((r) => r.batch_id) || [];
    if (batchIds.length > 0) query = query.in("id", batchIds);
    else return { data: [], count: 0 };
  }
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error, count } = await query;
  if (error) throw error;

  // Flatten the teachers for display
  const enriched = (data || []).map((batch) => ({
    ...batch,
    assigned_teachers: (batch.batch_teachers || []).map((bt) => ({
      teacher_id: bt.teacher_id,
      teacher_name: bt.teachers
        ? `${bt.teachers.first_name} ${bt.teachers.last_name}`
        : null,
      subject_id: bt.subject_id,
      subject_name: bt.subjects?.subject_name || null,
    })),
  }));

  return { data: enriched, count };
}

// Unpaginated export (simplified – without teacher details for performance)
export async function getAllBatchesForExport(filters = {}) {
  let query = supabase
    .from("batches")
    .select(`*, courses(course_name)`)
    .order("id", { ascending: false });

  if (filters.search) query = query.ilike("batch_name", `%${filters.search}%`);
  if (filters.course_id) query = query.eq("course_id", filters.course_id);
  if (filters.teacher_id) {
    const { data: linkedBatches } = await supabase
      .from("batch_teachers")
      .select("batch_id")
      .eq("teacher_id", filters.teacher_id);
    const batchIds = linkedBatches?.map((r) => r.batch_id) || [];
    if (batchIds.length > 0) query = query.in("id", batchIds);
    else return [];
  }
  if (filters.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Create batch – supports both old teacher_id and new teacher_subjects
export async function createBatch(payload) {
  const { teacher_subjects, teacher_id, ...batchData } = payload;

  // 1. Insert batch (keep teacher_id for backward compatibility)
  const { data: batch, error } = await supabase
    .from("batches")
    .insert([{ ...batchData, teacher_id: teacher_id || null }])
    .select()
    .single();
  if (error) throw error;

  // 2. Handle teacher assignments
  await syncBatchTeachers(batch.id, teacher_subjects, teacher_id);

  return batch;
}

// Update batch – merged logic
export async function updateBatch(id, payload) {
  const { teacher_subjects, teacher_id, ...batchData } = payload;

  // 1. Update batch row
  const { data: batch, error } = await supabase
    .from("batches")
    .update({ ...batchData, teacher_id: teacher_id || null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  // 2. Sync teacher assignments
  await syncBatchTeachers(id, teacher_subjects, teacher_id);

  return batch;
}

// Helper: sync batch_teachers table
async function syncBatchTeachers(batchId, teacherSubjects, singleTeacherId) {
  // If new teacher_subjects array is provided, use it
  if (teacherSubjects !== undefined) {
    await supabase.from("batch_teachers").delete().eq("batch_id", batchId);
    const links = teacherSubjects
      .filter((ts) => ts.teacher_id)
      .map((ts) => ({
        batch_id: batchId,
        teacher_id: ts.teacher_id,
        subject_id: ts.subject_id || null,
      }));
    if (links.length > 0) {
      const { error: linkError } = await supabase
        .from("batch_teachers")
        .insert(links);
      if (linkError) throw linkError;
    }
  } else if (singleTeacherId !== undefined) {
    // Fallback: old single teacher_id logic
    await supabase.from("batch_teachers").delete().eq("batch_id", batchId);
    if (singleTeacherId) {
      const { error: linkError } = await supabase
        .from("batch_teachers")
        .insert({ batch_id: batchId, teacher_id: singleTeacherId });
      if (linkError) throw linkError;
    }
  }
  // If neither is provided, leave the existing assignments alone
}

export async function deleteBatch(id) {
  const { error } = await supabase
    .from("batches")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;

  await supabase
    .from("batch_teachers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("batch_id", id);
}

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