import { supabase } from "../api/supabase";

// ============================
// EXAMS LIST (paginated, filters)
// ============================

export async function getExams({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("exams")
    .select(
      `*, batches(batch_name, course_id, courses(course_name))`,
      { count: "exact" }
    )
    .order("exam_date", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `exam_name.ilike.%${filters.search}%,batches.batch_name.ilike.%${filters.search}%`
    );
  }
  if (filters.batchId) query = query.eq("batch_id", filters.batchId);
  if (filters.courseId) {
    const { data: courseBatches } = await supabase
      .from("batches")
      .select("id")
      .eq("course_id", filters.courseId);
    const batchIds = courseBatches?.map(b => b.id) || [];
    if (batchIds.length > 0) query = query.in("batch_id", batchIds);
    else return { data: [], count: 0 };
  }
  if (filters.startDate) query = query.gte("exam_date", filters.startDate);
  if (filters.endDate) query = query.lte("exam_date", filters.endDate);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function getAllExamsForExport(filters = {}) {
  let query = supabase
    .from("exams")
    .select(`*, batches(batch_name, course_id, courses(course_name))`)
    .order("exam_date", { ascending: false });

  if (filters.search) {
    query = query.or(
      `exam_name.ilike.%${filters.search}%,batches.batch_name.ilike.%${filters.search}%`
    );
  }
  if (filters.batchId) query = query.eq("batch_id", filters.batchId);
  if (filters.courseId) {
    const { data: courseBatches } = await supabase
      .from("batches")
      .select("id")
      .eq("course_id", filters.courseId);
    const batchIds = courseBatches?.map(b => b.id) || [];
    if (batchIds.length > 0) query = query.in("batch_id", batchIds);
    else return [];
  }
  if (filters.startDate) query = query.gte("exam_date", filters.startDate);
  if (filters.endDate) query = query.lte("exam_date", filters.endDate);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createExam(payload) {
  const { data, error } = await supabase
    .from("exams")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExam(id, payload) {
  const { data, error } = await supabase
    .from("exams")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExam(id) {
  const { error } = await supabase
    .from("exams")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ============================
// RESULTS & MARKING HELPERS
// ============================

export async function getBatchStudents(batchId) {
  const { data, error } = await supabase
    .from("student_batches")
    .select("student_id, students(id, first_name, last_name, admission_no)")
    .eq("batch_id", batchId)
    .eq("status", "active");
  if (error) throw error;
  return data.map((item) => item.students);
}

export async function getResultsByExam(examId) {
  const { data, error } = await supabase
    .from("student_results")
    .select(`*, students(first_name, last_name, admission_no)`)
    .eq("exam_id", examId);
  if (error) throw error;
  return data;
}

export async function saveResults(examId, resultsPayload) {
  const { error: deleteError } = await supabase
    .from("student_results")
    .delete()
    .eq("exam_id", examId);
  if (deleteError) throw deleteError;

  if (resultsPayload.length === 0) return;
  const { error: insertError } = await supabase
    .from("student_results")
    .insert(
      resultsPayload.map((r) => ({
        exam_id: examId,
        student_id: r.student_id,
        marks_obtained: r.marks_obtained,
        remarks: r.remarks || "",
      }))
    );
  if (insertError) throw insertError;
}

export async function getExamById(id) {
  const { data, error } = await supabase
    .from("exams")
    .select(`*, batches(batch_name, course_id, courses(course_name))`)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

// ============================
// DROPDOWNS
// ============================

export async function getBatchOptions() {
  const { data, error } = await supabase
    .from("batches")
    .select("id, batch_name")
    .eq("status", "active");
  if (error) throw error;
  return data || [];
}

export async function getCourseOptions() {
  const { data, error } = await supabase
    .from("courses")
    .select("id, course_name")
    .order("course_name");
  if (error) throw error;
  return data || [];
}
// Get all exams (unpaginated) – used by Results page
export async function getAllExams() {
  const { data, error } = await supabase
    .from("exams")
    .select(`*, batches(batch_name, course_id, courses(course_name))`)
    .order("exam_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get all exams with results for a specific student, grouped by subject
export async function getStudentProgress(studentId) {
  // 1. Get all exams where the student has results, with subject info
  const { data: results, error } = await supabase
    .from("student_results")
    .select(
      `marks_obtained,
      exams!inner(
        id,
        exam_name,
        exam_date,
        total_marks,
        subject_id,
        subjects(subject_name),
        batches(course_id, courses(course_name))
      )`
    )
    .eq("student_id", studentId)
    .order("exam_date", { ascending: true, foreignTable: "exams" });

  if (error) throw error;

  // 2. Group by subject
  const grouped = {};
  results.forEach((r) => {
    const subjId = r.exams?.subject_id;
    const subjName = r.exams?.subjects?.subject_name || "Unknown Subject";
    if (!grouped[subjId]) {
      grouped[subjId] = {
        subject_id: subjId,
        subject_name: subjName,
        exams: [],
      };
    }
    grouped[subjId].exams.push({
      exam_id: r.exams.id,
      exam_name: r.exams.exam_name,
      exam_date: r.exams.exam_date,
      total_marks: r.exams.total_marks,
      marks_obtained: r.marks_obtained,
    });
  });

  return Object.values(grouped);
}