import { supabase } from "../api/supabase";

// Get all assets
export async function getFixedAssets() {
  const { data, error } = await supabase
    .from("fixed_assets")
    .select("*")
    .order("asset_name");
  if (error) throw error;
  return data || [];
}

// Create asset
export async function createFixedAsset(payload) {
  // Calculate initial book value (cost)
  payload.current_book_value = payload.purchase_cost;
  const { data, error } = await supabase
    .from("fixed_assets")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update asset
export async function updateFixedAsset(id, payload) {
  const { data, error } = await supabase
    .from("fixed_assets")
    .update({ ...payload, updated_at: new Date() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Delete asset
export async function deleteFixedAsset(id) {
  const { error } = await supabase.from("fixed_assets").delete().eq("id", id);
  if (error) throw error;
}

// Calculate monthly depreciation for all active assets
export async function calculateMonthlyDepreciation() {
  // 1. Fetch all active assets
  const { data: assets } = await supabase
    .from("fixed_assets")
    .select("*")
    .eq("status", "Active");
  if (!assets) return [];

  const results = [];
  const now = new Date();
  for (const asset of assets) {
    // months since purchase
    const purchaseDate = new Date(asset.purchase_date);
    const monthsElapsed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
                          (now.getMonth() - purchaseDate.getMonth());
    if (monthsElapsed <= 0) continue;

    let monthlyDep = 0;
    if (asset.depreciation_method === "straight_line") {
      const depreciableAmount = asset.purchase_cost - asset.salvage_value;
      monthlyDep = depreciableAmount / asset.useful_life_months;
    } else {
      // Declining balance (10% of current book value per month)
      monthlyDep = (asset.current_book_value * 0.1);
    }

    // Ensure we don't drop below salvage value
    const newBookValue = asset.current_book_value - monthlyDep;
    if (newBookValue < asset.salvage_value) {
      monthlyDep = asset.current_book_value - asset.salvage_value;
    }

    if (monthlyDep > 0) {
      results.push({
        id: asset.id,
        asset_name: asset.asset_name,
        monthly_depreciation: monthlyDep,
        new_book_value: asset.current_book_value - monthlyDep,
      });

      // Update book value in DB (optional – we'll do it on posting)
    }
  }

  return results;
}

// Post depreciation as journal entry (Debit Depreciation Expense, Credit Accumulated Depreciation)
export async function postDepreciation(monthlyDepList) {
  const totalDep = monthlyDepList.reduce((s, a) => s + a.monthly_depreciation, 0);
  if (totalDep === 0) return;

  // 1. Create journal entry
  const { data: journal } = await supabase
    .from("journal_entries")
    .insert({
      entry_date: new Date().toISOString().split("T")[0],
      reference: "Monthly Depreciation",
      description: "Auto‑calculated depreciation",
      is_posted: true,
    })
    .select()
    .single();

  // 2. Debit Depreciation Expense (5004)
  const { data: depExpAccount } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("account_code", "5004")
    .single();

  // 3. Credit Accumulated Depreciation (we need to create this account if not exists)
  let accDepAccount = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("account_code", "1009")
    .single();

  if (!accDepAccount.data) {
    // Create Accumulated Depreciation account
    const { data: newAcc } = await supabase
      .from("chart_of_accounts")
      .insert({
        account_code: "1009",
        account_name: "Accumulated Depreciation",
        account_type: "asset",
      })
      .select()
      .single();
    accDepAccount = { data: newAcc };
  }

  // 4. Insert journal lines
  const lines = [
    {
      journal_entry_id: journal.id,
      account_id: depExpAccount.id,
      debit: totalDep,
      credit: 0,
      description: "Depreciation expense",
    },
    {
      journal_entry_id: journal.id,
      account_id: accDepAccount.data.id,
      debit: 0,
      credit: totalDep,
      description: "Accumulated depreciation",
    },
  ];
  await supabase.from("journal_entry_lines").insert(lines);

  // 5. Update asset book values
  for (const item of monthlyDepList) {
    await supabase
      .from("fixed_assets")
      .update({ current_book_value: item.new_book_value, updated_at: new Date() })
      .eq("id", item.id);
  }

  return totalDep;
}