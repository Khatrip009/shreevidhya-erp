import { supabase } from "../api/supabase";

// Paginated fetch with filters
export async function getHomeworks({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("homework")
    .select(
      `*,
      batches(batch_name, course_id),
      subjects(subject_name),
      teachers(first_name, last_name)`,
      { count: "exact" }
    )
    .order("assigned_date", { ascending: false })
    .range(from, to);

  // Apply filters
  if (filters.batchId) query = query.eq("batch_id", filters.batchId);
  if (filters.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }
  if (filters.startDate) query = query.gte("assigned_date", filters.startDate);
  if (filters.endDate) query = query.lte("assigned_date", filters.endDate);

  const { data, error, count } = await query;
  if (error) throw error;

  // Enrich with submission count – fail safely if RLS denies
  const enriched = await Promise.all(
    data.map(async (hw) => {
      let subCount = 0;
      try {
        const { count, error: subError } = await supabase
          .from("homework_submissions")
          .select("*", { count: "exact", head: true })
          .eq("homework_id", hw.id);
        if (!subError) subCount = count || 0;
      } catch {}
      return { ...hw, submission_count: subCount };
    })
  );

  return { data: enriched, count };
}

// Export all homework matching filters (for CSV)
export async function getAllHomeworksForExport(filters = {}) {
  let query = supabase
    .from("homework")
    .select(
      `*,
      batches(batch_name, course_id),
      subjects(subject_name),
      teachers(first_name, last_name)`
    )
    .order("assigned_date", { ascending: false });

  if (filters.batchId) query = query.eq("batch_id", filters.batchId);
  if (filters.subjectId) query = query.eq("subject_id", filters.subjectId);
  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }
  if (filters.startDate) query = query.gte("assigned_date", filters.startDate);
  if (filters.endDate) query = query.lte("assigned_date", filters.endDate);

  const { data, error } = await query;
  if (error) throw error;

  // Enrich with submission count
  const enriched = await Promise.all(
    data.map(async (hw) => {
      let subCount = 0;
      try {
        const { count, error: subError } = await supabase
          .from("homework_submissions")
          .select("*", { count: "exact", head: true })
          .eq("homework_id", hw.id);
        if (!subError) subCount = count || 0;
      } catch {}
      return { ...hw, submission_count: subCount };
    })
  );

  return enriched;
}

// CRUD
export async function createHomework(payload) {
  const { data, error } = await supabase
    .from("homework")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHomework(id, payload) {
  const { data, error } = await supabase
    .from("homework")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
export async function deleteHomework(id) {
  const { error } = await supabase
    .from("homework")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Submissions (unchanged)
export async function getSubmissionsByHomework(homeworkId) {
  const { data, error } = await supabase
    .from("homework_submissions")
    .select(
      `id, student_id, submission_file, submitted_at, remarks, marks, status,
      students(first_name, last_name, admission_no)`
    )
    .eq("homework_id", homeworkId)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateSubmission(id, payload) {
  const { data, error } = await supabase
    .from("homework_submissions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Dropdowns
export async function getBatchOptions() {
  const { data, error } = await supabase
    .from("batches")
    .select("id, batch_name")
    .eq("status", "active")
    .order("batch_name");
  if (error) throw error;
  return data || [];
}

export async function getSubjectsByCourse(courseId) {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, subject_name")
    .eq("course_id", courseId);
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

export async function getBatchStudents(batchId) {
  const { data, error } = await supabase
    .from("student_batches")
    .select("student_id, students(id, first_name, last_name, admission_no)")
    .eq("batch_id", batchId)
    .eq("status", "active");
  if (error) throw error;
  return data.map((item) => item.students);
}