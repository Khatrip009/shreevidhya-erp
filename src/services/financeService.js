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
  // Do NOT force created_by – it defaults to null
  const { data, error } = await supabase
    .from("income")
    .insert([payload])
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
    .update({ deleted_at: new Date().toISOString() })
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
  // Do NOT force created_by – it defaults to null
  const { data, error } = await supabase
    .from("expenses")
    .insert([payload])
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
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getProfitLossSummary(startDate, endDate) {
  const { data: incomes, error: incomeError } = await supabase
    .from("income")
    .select("amount")
    .gte("income_date", startDate)
    .lte("income_date", endDate);

  if (incomeError) throw incomeError;

  const { data: expenses, error: expenseError } = await supabase
    .from("expenses")
    .select("amount")
    .gte("expense_date", startDate)
    .lte("expense_date", endDate);

  if (expenseError) throw expenseError;

  const totalIncome = (incomes || []).reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpense = (expenses || []).reduce((sum, r) => sum + Number(r.amount), 0);
  const profit = totalIncome - totalExpense;

  return { totalIncome, totalExpense, profit };
}