import { supabase } from "../api/supabase";

export async function getOrganization() {
  const { data, error } = await supabase
    .from("organization")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrganization(payload) {
  const { data, error } = await supabase
    .from("organization")
    .update({ ...payload, updated_at: new Date() })
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return data;
}