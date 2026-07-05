import { supabase } from "../api/supabase";

// Get voucher types
export async function getVoucherTypes() {
  const { data, error } = await supabase.from("voucher_types").select("*").order("id");
  if (error) throw error;
  return data || [];
}

// Get vouchers with filters
export async function getVouchers(filters = {}) {
  let query = supabase
    .from("vouchers")
    .select("*, voucher_types(name, abbreviation), journal_entries(id)")
    .order("entry_date", { ascending: false })
    .order("voucher_no", { ascending: false });

  if (filters.start_date) query = query.gte("entry_date", filters.start_date);
  if (filters.end_date) query = query.lte("entry_date", filters.end_date);
  if (filters.voucher_type_id) query = query.eq("voucher_type_id", filters.voucher_type_id);
  if (filters.search) query = query.or(`voucher_no.ilike.%${filters.search}%,reference.ilike.%${filters.search}%`);

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data || [];
}

// Create a manual voucher (for Payment, Receipt, Contra, Journal)
export async function createVoucher(payload) {
  const { voucher_type_code, entry_date, reference, description, lines } = payload;
  // 1. Get voucher type id
  const { data: vtype } = await supabase.from("voucher_types").select("id, abbreviation").eq("code", voucher_type_code).single();
  if (!vtype) throw new Error("Invalid voucher type");

  // 2. Generate voucher number
  const { data: voucherSeq } = await supabase.rpc("generate_voucher_no", { voucher_abbr: vtype.abbreviation });
  const voucherNo = voucherSeq;

  // 3. Create journal entry
  const { data: journal } = await supabase
    .from("journal_entries")
    .insert({ entry_date, reference, description, is_posted: true })
    .select()
    .single();

  // 4. Insert journal lines
  const lineInserts = lines.map(line => ({
    journal_entry_id: journal.id,
    account_id: line.account_id,
    debit: line.debit || 0,
    credit: line.credit || 0,
    description: line.description,
  }));
  await supabase.from("journal_entry_lines").insert(lineInserts);

  // 5. Create voucher record
  const { data: voucher } = await supabase
    .from("vouchers")
    .insert({
      voucher_no: voucherNo,
      voucher_type_id: vtype.id,
      entry_date,
      reference,
      description,
      journal_entry_id: journal.id,
    })
    .select()
    .single();

  return voucher;
}

// Get a single voucher with its journal lines
export async function getVoucherById(voucherId) {
  const { data: voucher, error } = await supabase
    .from("vouchers")
    .select("*, voucher_types(*), journal_entries(entry_date, reference, description, journal_entry_lines(*))")
    .eq("id", voucherId)
    .single();
  if (error) throw error;

  // Fetch account names for each line
  if (voucher?.journal_entries?.journal_entry_lines) {
    const accountIds = voucher.journal_entries.journal_entry_lines.map(line => line.account_id);
    const { data: accounts } = await supabase
      .from("chart_of_accounts")
      .select("id, account_code, account_name")
      .in("id", accountIds);
    const accountMap = {};
    accounts?.forEach(a => accountMap[a.id] = a);
    voucher.journal_entries.journal_entry_lines = voucher.journal_entries.journal_entry_lines.map(line => ({
      ...line,
      account: accountMap[line.account_id] || null,
    }));
  }
  return voucher;
}

// Update a voucher (header + lines)
export async function updateVoucher(voucherId, payload) {
  const { entry_date, reference, description, lines } = payload;

  // 1. Update journal entry header
  const { data: voucher } = await supabase
    .from("vouchers")
    .select("journal_entry_id")
    .eq("id", voucherId)
    .single();

  await supabase
    .from("journal_entries")
    .update({ entry_date, reference, description })
    .eq("id", voucher.journal_entry_id);

  // 2. Delete old lines and insert new ones
  await supabase
    .from("journal_entry_lines")
    .delete()
    .eq("journal_entry_id", voucher.journal_entry_id);

  const lineInserts = lines.map(line => ({
    journal_entry_id: voucher.journal_entry_id,
    account_id: line.account_id,
    debit: line.debit || 0,
    credit: line.credit || 0,
    description: line.description,
  }));
  await supabase.from("journal_entry_lines").insert(lineInserts);

  // 3. Update voucher header (if needed)
  await supabase
    .from("vouchers")
    .update({ entry_date, reference, description })
    .eq("id", voucherId);

  return { success: true };
}