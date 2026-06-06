import { supabase } from "../api/supabase";

// ========================
// INCOME (paginated)
// ========================

export async function getIncomes({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("income")
    .select("*", { count: "exact" })
    .order("income_date", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `category.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }
  if (filters.startDate) query = query.gte("income_date", filters.startDate);
  if (filters.endDate) query = query.lte("income_date", filters.endDate);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function getAllIncomesForExport(filters = {}) {
  let query = supabase
    .from("income")
    .select("*")
    .order("income_date", { ascending: false });

  if (filters.search) {
    query = query.or(
      `category.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }
  if (filters.startDate) query = query.gte("income_date", filters.startDate);
  if (filters.endDate) query = query.lte("income_date", filters.endDate);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createIncome(payload) {
  const { data, error } = await supabase
    .from("income")
    .insert([{ ...payload, created_by: 1 }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateIncome(id, payload) {
  const { data, error } = await supabase
    .from("income")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteIncome(id) {
  const { error } = await supabase
    .from("income")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ========================
// EXPENSES (paginated)
// ========================

export async function getExpenses({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("expenses")
    .select("*", { count: "exact" })
    .order("expense_date", { ascending: false })
    .range(from, to);

  if (filters.search) {
    query = query.or(
      `category.ilike.%${filters.search}%,description.ilike.%${filters.search}%,bill_number.ilike.%${filters.search}%`
    );
  }
  if (filters.startDate) query = query.gte("expense_date", filters.startDate);
  if (filters.endDate) query = query.lte("expense_date", filters.endDate);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function getAllExpensesForExport(filters = {}) {
  let query = supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false });

  if (filters.search) {
    query = query.or(
      `category.ilike.%${filters.search}%,description.ilike.%${filters.search}%,bill_number.ilike.%${filters.search}%`
    );
  }
  if (filters.startDate) query = query.gte("expense_date", filters.startDate);
  if (filters.endDate) query = query.lte("expense_date", filters.endDate);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createExpense(payload) {
  const { data, error } = await supabase
    .from("expenses")
    .insert([{ ...payload, created_by: 1 }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id, payload) {
  const { data, error } = await supabase
    .from("expenses")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id) {
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id);
  if (error) throw error;
}