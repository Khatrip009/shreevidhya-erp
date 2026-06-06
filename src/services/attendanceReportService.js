import { supabase } from "../api/supabase";

/**
 * Get attendance report: per student in a batch (or all batches)
 * Returns array of { student_id, student_name, admission_no, total_sessions, present_count, percentage }
 */
export async function getAttendanceReport(batchId, startDate, endDate) {
  // 1. Get sessions for the batch (and date range)
  let sessionQuery = supabase
    .from("attendance_sessions")
    .select("id, attendance_date")
    .order("attendance_date", { ascending: true });

  if (batchId) {
    sessionQuery = sessionQuery.eq("batch_id", batchId);
  }
  if (startDate) {
    sessionQuery = sessionQuery.gte("attendance_date", startDate);
  }
  if (endDate) {
    sessionQuery = sessionQuery.lte("attendance_date", endDate);
  }

  const { data: sessions, error: sessionError } = await sessionQuery;
  if (sessionError) throw sessionError;
  if (!sessions.length) return []; // No sessions → no data

  const sessionIds = sessions.map((s) => s.id);

  // 2. Get all students in the batch(es) – if batchId specified, get that batch's students, else all active students
  let studentQuery = supabase.from("student_batches").select(`
      student_id,
      students!inner( id, first_name, last_name, admission_no )
    `).eq("status", "active");

  if (batchId) {
    studentQuery = studentQuery.eq("batch_id", batchId);
  }

  const { data: studentRows, error: studentError } = await studentQuery;
  if (studentError) throw studentError;

  // unique students
  const studentsMap = {};
  studentRows.forEach((row) => {
    if (row.students) {
      studentsMap[row.student_id] = row.students;
    }
  });
  const students = Object.values(studentsMap);

  // 3. Get attendance marks for these sessions and students
  const studentIds = Object.keys(studentsMap);
  if (!studentIds.length) return [];

  const { data: marks, error: marksError } = await supabase
    .from("student_attendance")
    .select("student_id, status")
    .in("session_id", sessionIds)
    .in("student_id", studentIds);

  if (marksError) throw marksError;

  // 4. Calculate per student
  const totalSessions = sessionIds.length;
  const presentCountMap = {};
  marks.forEach((m) => {
    if (m.status === "Present") {
      presentCountMap[m.student_id] = (presentCountMap[m.student_id] || 0) + 1;
    }
  });

  return students.map((student) => {
    const present = presentCountMap[student.id] || 0;
    return {
      student_id: student.id,
      student_name: `${student.first_name} ${student.last_name}`,
      admission_no: student.admission_no,
      total_sessions: totalSessions,
      present_count: present,
      percentage: totalSessions > 0 ? ((present / totalSessions) * 100).toFixed(1) : 0,
    };
  });
}

// Get active batches for filter dropdown
export async function getActiveBatches() {
  const { data, error } = await supabase
    .from("batches")
    .select("id, batch_name")
    .eq("status", "active")
    .order("batch_name");
  if (error) throw error;
  return data;
}