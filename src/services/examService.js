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
    .update({ deleted_at: new Date().toISOString() })
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

// FIXED: uses the correct table name "student_results"
export async function getResultsByExam(examId) {
  if (!examId) return [];
  const { data, error } = await supabase
    .from("student_results")                             // <-- changed
    .select(`*, students(first_name, last_name, admission_no)`)
    .eq("exam_id", examId)
    .order("marks_obtained", { ascending: false });
  if (error) throw error;
  return data || [];
}

// FIXED: uses "student_results"
export async function saveResults(examId, resultsPayload) {
  // Delete old marks
  const { error: deleteError } = await supabase
    .from("student_results")                            // <-- changed
    .delete()
    .eq("exam_id", examId);
  if (deleteError) throw deleteError;

  if (resultsPayload.length === 0) return;

  const { error: insertError } = await supabase
    .from("student_results")                            // <-- changed
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
  if (!id) throw new Error("Exam ID is required");
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

export async function getAllExams() {
  const { data, error } = await supabase
    .from("exams")
    .select(`*, batches(batch_name, course_id, courses(course_name))`)
    .order("exam_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

// FIXED: uses "student_results"
export async function getStudentProgress(studentId) {
  const { data: results, error } = await supabase
    .from("student_results")                            // <-- changed
    .select(
      `marks_obtained,
      exams!inner(
        id,
        exam_name,
        exam_date,
        total_marks,
        batches(course_id, courses(course_name))
      )`
    )
    .eq("student_id", studentId)
    .order("exam_date", { ascending: true, foreignTable: "exams" });

  if (error) throw error;

  const grouped = {};
  results.forEach((r) => {
    const courseId = r.exams?.batches?.course_id;
    const courseName = r.exams?.batches?.courses?.course_name || "Unknown Course";
    if (!grouped[courseId]) {
      grouped[courseId] = {
        course_id: courseId,
        course_name: courseName,
        exams: [],
      };
    }
    grouped[courseId].exams.push({
      exam_id: r.exams.id,
      exam_name: r.exams.exam_name,
      exam_date: r.exams.exam_date,
      total_marks: r.exams.total_marks,
      marks_obtained: r.marks_obtained,
    });
  });

  return Object.values(grouped);
}