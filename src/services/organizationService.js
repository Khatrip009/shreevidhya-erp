import { supabase } from "../api/supabase";

export async function getOrganization() {
  // 1. Fetch basic org details
  const { data: org, error } = await supabase
    .from("organization")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) throw error;

  // 2. Fetch mediums linked to this organization (via organization_mediums)
  const { data: links, error: linksError } = await supabase
    .from("organization_mediums")
    .select("medium_id, mediums(name)")
    .eq("org_id", 1);

  if (linksError) throw linksError;

  const mediums = (links || []).map((om) => ({
    id: om.medium_id,
    name: om.mediums?.name || "",
  }));

  return { ...org, mediums };
}

export async function updateOrganization(payload) {
  const { mediums, ...orgData } = payload;   // mediums: array of medium ids (e.g., [1, 2])

  // 1. Update the organization record
  const { data: org, error } = await supabase
    .from("organization")
    .update({ ...orgData, updated_at: new Date() })
    .eq("id", 1)
    .select()
    .single();

  if (error) throw error;

  // 2. Sync mediums if provided
  if (mediums !== undefined) {
    // Delete existing links
    await supabase
      .from("organization_mediums")
      .delete()
      .eq("org_id", 1);

    // Insert new links
    if (mediums.length > 0) {
      const links = mediums.map((mid) => ({
        org_id: 1,
        medium_id: mid,
      }));
      const { error: linkError } = await supabase
        .from("organization_mediums")
        .insert(links);
      if (linkError) throw linkError;
    }
  }

  return org;
}