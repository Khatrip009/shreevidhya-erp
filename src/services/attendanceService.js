import { supabase } from "../api/supabase";

// ============================
// PAGINATED SESSIONS (for list)
// ============================

export async function getAttendanceSessions({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("attendance_sessions")
    .select(
      `id, batch_id, attendance_date, topic_covered, batches(batch_name)`,
      { count: "exact" }
    )
    .order("attendance_date", { ascending: false })
    .range(from, to);

  if (filters.batchId) query = query.eq("batch_id", filters.batchId);
  if (filters.search) {
    query = query.or(
      `topic_covered.ilike.%${filters.search}%,attendance_date::text.ilike.%${filters.search}%`
    );
  }
  if (filters.startDate) query = query.gte("attendance_date", filters.startDate);
  if (filters.endDate) query = query.lte("attendance_date", filters.endDate);

  const { data, error, count } = await query;
  if (error) throw error;

  // Enrich with attendance counts
  const enriched = await Promise.all(
    data.map(async (session) => {
      const { data: presentRows } = await supabase
        .from("student_attendance")
        .select("id")
        .eq("session_id", session.id)
        .eq("status", "Present");

      const { data: allRows } = await supabase
        .from("student_attendance")
        .select("id")
        .eq("session_id", session.id);

      return {
        ...session,
        batch_name: session.batches?.batch_name,
        present_count: presentRows ? presentRows.length : 0,
        total_count: allRows ? allRows.length : 0,
      };
    })
  );

  return { data: enriched, count };
}

// Export for CSV (unpaginated, same filters)
export async function getAllAttendanceSessionsForExport(filters = {}) {
  let query = supabase
    .from("attendance_sessions")
    .select(`id, batch_id, attendance_date, topic_covered, batches(batch_name)`)
    .order("attendance_date", { ascending: false });

  if (filters.batchId) query = query.eq("batch_id", filters.batchId);
  if (filters.search) {
    query = query.or(
      `topic_covered.ilike.%${filters.search}%,attendance_date::text.ilike.%${filters.search}%`
    );
  }
  if (filters.startDate) query = query.gte("attendance_date", filters.startDate);
  if (filters.endDate) query = query.lte("attendance_date", filters.endDate);

  const { data, error } = await query;
  if (error) throw error;

  const enriched = await Promise.all(
    (data || []).map(async (session) => {
      const { data: presentRows } = await supabase
        .from("student_attendance")
        .select("id")
        .eq("session_id", session.id)
        .eq("status", "Present");

      const { data: allRows } = await supabase
        .from("student_attendance")
        .select("id")
        .eq("session_id", session.id);

      return {
        ...session,
        batch_name: session.batches?.batch_name,
        present_count: presentRows ? presentRows.length : 0,
        total_count: allRows ? allRows.length : 0,
      };
    })
  );

  return enriched;
}

// ============================
// CRUD
// ============================

export async function createAttendanceSession(payload) {
  // Use the provided created_by, or null if not present
  const { created_by, ...rest } = payload;

  const { data, error } = await supabase
    .from("attendance_sessions")
    .insert([{ ...rest, created_by: created_by || null }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAttendanceSession(id, payload) {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAttendanceSession(id) {
  const { error } = await supabase
    .from("attendance_sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ============================
// MARKING ATTENDANCE HELPERS
// ============================

export async function getStudentsByBatch(batchId) {
  const { data, error } = await supabase
    .from("student_batches")
    .select(`
      student_id,
      students!inner( id, first_name, last_name, admission_no )
    `)
    .eq("batch_id", batchId)
    .eq("status", "active");

  if (error) throw error;

  return data.map((item) => ({
    student_id: item.student_id,
    ...item.students,
  }));
}

export async function getMarkedAttendance(sessionId) {
  const { data, error } = await supabase
    .from("student_attendance")
    .select("*")
    .eq("session_id", sessionId);

  if (error) throw error;
  return data;
}

export async function saveAttendance(sessionId, records) {
  const { error: deleteError } = await supabase
    .from("student_attendance")
    .delete()
    .eq("session_id", sessionId);
  if (deleteError) throw deleteError;

  if (records.length === 0) return;

  const payload = records.map((r) => ({
    session_id: sessionId,
    student_id: r.student_id,
    status: r.status,
    remarks: r.remarks || "",
  }));

  const { error: insertError } = await supabase
    .from("student_attendance")
    .insert(payload);
  if (insertError) throw insertError;
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