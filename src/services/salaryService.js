import { supabase } from "../api/supabase";

// Get all salary payments (admin) or filtered by teacher
export async function getSalaryPayments({ teacherId = null, pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("salary_payments")
    .select(`*, teachers(first_name, last_name, employee_code)`, { count: "exact" })
    .order("payment_date", { ascending: false })
    .range(from, to);

  if (teacherId) query = query.eq("teacher_id", teacherId);
  if (filters.search) {
    query = query.or(`teachers.first_name.ilike.%${filters.search}%,teachers.last_name.ilike.%${filters.search}%`);
  }
  if (filters.startDate) query = query.gte("payment_date", filters.startDate);
  if (filters.endDate) query = query.lte("payment_date", filters.endDate);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

export async function createSalaryPayment(payload) {
  const { data, error } = await supabase
    .from("salary_payments")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSalaryPayment(id) {
  const { error } = await supabase.from("salary_payments").delete().eq("id", id);
  if (error) throw error;
}