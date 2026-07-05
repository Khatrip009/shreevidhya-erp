// src/services/salaryService.js
import { supabase } from '../api/supabase';

// ─── GET SALARY PAYMENTS (with optional filters) ──────────
export async function getSalaryPayments(filters = {}) {
  let query = supabase
    .from('salary_payments')
    .select('*, teachers(first_name, last_name, employee_code)')
    .order('payment_date', { ascending: false });

  if (filters.teacher_id) query = query.eq('teacher_id', filters.teacher_id);
  if (filters.start_date) query = query.gte('payment_date', filters.start_date);
  if (filters.end_date) query = query.lte('payment_date', filters.end_date);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ─── CHECK EXISTING PAYMENTS FOR A MONTH ──────────────────
export async function getExistingSalaryPayments(month, year) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('salary_payments')
    .select('teacher_id')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate);
  if (error) throw error;
  return data || [];
}

// ─── GENERATE SALARY FOR A SINGLE TEACHER ─────────────────
export async function generateTeacherSalary(teacherId, month, year) {
  // 1. Get teacher details
  const { data: teacher, error: tErr } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', teacherId)
    .single();
  if (tErr) throw tErr;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // last day

  let grossAmount = 0;
  let totalLectures = 0;

  if (teacher.salary_type === 'fixed') {
    grossAmount = teacher.monthly_salary || 0;
  } else if (teacher.salary_type === 'lecture_based') {
    // Count lectures via RPC
    const { data: lectureCount, error: lErr } = await supabase
      .rpc('count_teacher_lectures', {
        p_teacher_id: teacherId,
        p_start: startDate,
        p_end: endDate,
      });
    if (lErr) throw lErr;
    totalLectures = lectureCount || 0;
    grossAmount = totalLectures * (teacher.per_lecture_rate || 0);
  }

  const tdsPercent = teacher.tds_percentage || 10;
  const tdsAmount = (grossAmount * tdsPercent) / 100;
  const netAmount = grossAmount - tdsAmount;

  // 2. Insert salary payment
  const { data: payment, error: pErr } = await supabase
    .from('salary_payments')
    .insert({
      teacher_id: teacherId,
      payment_date: `${year}-${String(month).padStart(2, '0')}-15`,
      amount: grossAmount,
      tds_percentage: tdsPercent,
      tds_amount: tdsAmount,
      net_amount: netAmount,
      total_lectures: totalLectures,
      payment_type: teacher.salary_type,
      payment_mode: 'Bank Transfer',
      remarks: `Salary for ${month}/${year}`,
    })
    .select()
    .single();
  if (pErr) throw pErr;
  return payment;
}

// ─── BULK GENERATE SALARIES FOR ALL ACTIVE TEACHERS ──────
export async function generateAllSalaries(month, year) {
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('id')
    .eq('status', 'active');
  if (error) throw error;

  const results = [];
  for (const t of teachers) {
    try {
      const result = await generateTeacherSalary(t.id, month, year);
      results.push({ ...result, error: null });
    } catch (err) {
      results.push({ teacher_id: t.id, error: err.message });
    }
  }
  return results;
}

// ─── GET ACTIVE TEACHERS WITH SALARY SETTINGS ─────────────
export async function getTeachersForSalary() {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, first_name, last_name, employee_code, salary_type, monthly_salary, per_lecture_rate, tds_percentage')
    .eq('status', 'active')
    .order('first_name');
  if (error) throw error;
  return data || [];
}

// ─── ALIAS for SalarySetup (same as getTeachersForSalary) ──
export async function getActiveTeachers() {
  return getTeachersForSalary();
}

// ─── UPDATE TEACHER SALARY SETTINGS (used in SalarySetup) ──
export async function updateTeacherSalary(teacherId, payload) {
  const { data, error } = await supabase
    .from('teachers')
    .update({
      salary_type: payload.salary_type,
      monthly_salary: payload.monthly_salary,
      per_lecture_rate: payload.per_lecture_rate,
      tds_percentage: payload.tds_percentage,
    })
    .eq('id', teacherId)
    .select()
    .single();
  if (error) throw error;
  return data;
}