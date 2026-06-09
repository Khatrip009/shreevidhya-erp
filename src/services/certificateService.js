import { supabase } from "../api/supabase";

export async function getCertificates() {
  const { data, error } = await supabase
    .from("certificates")
    .select(`
      *,
      students ( first_name, last_name, admission_no ),
      courses ( course_name ),
      course_levels ( level_name )
    `)
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllCertificatesForExport() {
  const { data, error } = await supabase
    .from("certificates")
    .select(`
      *,
      students ( first_name, last_name, admission_no ),
      courses ( course_name ),
      course_levels ( level_name )
    `)
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCertificate(payload) {
  const { data, error } = await supabase
    .from("certificates")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCertificate(id) {
  const { error } = await supabase
    .from("certificates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getStudentOptions() {
  const { data, error } = await supabase
    .from("students")
    .select("id, first_name, last_name, admission_no")
    .order("first_name");
  if (error) throw error;
  return data;
}

export async function getCourseOptions() {
  const { data, error } = await supabase
    .from("courses")
    .select("id, course_name")
    .order("course_name");
  if (error) throw error;
  return data;
}

export async function getLevelsByCourse(courseId) {
  const { data, error } = await supabase
    .from("course_levels")
    .select("id, level_name")
    .eq("course_id", courseId)
    .order("level_number");
  if (error) throw error;
  return data;
}