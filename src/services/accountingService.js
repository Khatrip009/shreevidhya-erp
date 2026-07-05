// src/services/accountingService.js
import { supabase } from "../api/supabase";

// Chart of Accounts
export async function getChartOfAccounts() {
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .select("*")
    .order("account_code");
  if (error) throw error;
  return data || [];
}

// Journal Entry creation (manual)
export async function createJournalEntry(entry) {
  const { date, reference, description, lines } = entry;
  const { data: journal, error } = await supabase
    .from("journal_entries")
    .insert({ entry_date: date, reference, description, is_posted: true })
    .select()
    .single();
  if (error) throw error;

  const lineInserts = lines.map(line => ({
    journal_entry_id: journal.id,
    account_id: line.account_id,
    debit: line.debit || 0,
    credit: line.credit || 0,
    description: line.description,
  }));
  const { error: lineError } = await supabase.from("journal_entry_lines").insert(lineInserts);
  if (lineError) throw lineError;
  return journal;
}

// Ledger: all lines for an account
export async function getAccountLedger(accountId, startDate, endDate) {
  let query = supabase
    .from("journal_entry_lines")
    .select("debit, credit, description, journal_entries(entry_date, reference)")
    .eq("account_id", accountId)
    .order("id", { ascending: true });          // ← uses existing 'id' column (no created_at)

  if (startDate) {
    query = query.gte("journal_entries.entry_date", startDate);
  }
  if (endDate) {
    query = query.lte("journal_entries.entry_date", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Trial Balance
export async function getTrialBalance(asOfDate) {
  const { data, error } = await supabase
    .rpc("get_trial_balance", { as_of_date: asOfDate });
  if (error) throw error;
  return data || [];
}

// Create a new account
export async function createAccount(payload) {
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update an account
export async function updateAccount(id, payload) {
  const { data, error } = await supabase
    .from("chart_of_accounts")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Delete an account
export async function deleteAccount(id) {
  const { error } = await supabase
    .from("chart_of_accounts")
    .delete()
    .eq("id", id);
  if (error) throw error;
}