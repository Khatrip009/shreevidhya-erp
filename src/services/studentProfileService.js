import { supabase } from "../api/supabase";

export async function getStudent(id) {
  const { data, error } =
    await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();

  if (error) throw error;

  return data;
}