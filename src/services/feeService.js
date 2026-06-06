import { supabase } from "../api/supabase";

// ========================
// FEE STRUCTURES
// ========================

export async function getFeeStructures() {
  const { data, error } = await supabase
    .from("fee_structures")
    .select("*, courses(course_name)")
    .order("id", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createFeeStructure(payload) {
  const { data, error } = await supabase
    .from("fee_structures")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFeeStructure(id, payload) {
  const { data, error } = await supabase
    .from("fee_structures")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFeeStructure(id) {
  const { error } = await supabase
    .from("fee_structures")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ========================
// STUDENT FEES (with pagination)
// ========================

export async function getStudentFees({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("student_fees")
    .select(
      `*, students( first_name, last_name, admission_no ), fee_structures( fee_amount, courses(course_name) )`,
      { count: "exact" }
    )
    .order("id", { ascending: false })
    .range(from, to);

  // Filters: search by student name or course name
  if (filters.search) {
    query = query.or(
      `students.first_name.ilike.%${filters.search}%,students.last_name.ilike.%${filters.search}%`
    );
    // Note: course name filter would require a separate join logic, but we can do a post-filter in the frontend.
    // For simplicity, we'll keep the frontend filtering for course name.
  }

  const { data, error, count } = await query;
  if (error) throw error;

  // Enrich with payment totals (same as before)
  const enriched = await Promise.all(
    data.map(async (fee) => {
      const { data: payments } = await supabase
        .from("fee_payments")
        .select("amount")
        .eq("student_fee_id", fee.id);

      const totalPaid =
        payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const finalFee = Number(fee.final_fee);
      const pending = Math.max(finalFee - totalPaid, 0);

      return {
        ...fee,
        total_paid: totalPaid,
        pending: pending,
      };
    })
  );

  return { data: enriched, count };
}

/** Export all fee records matching filters (for CSV) */
export async function getAllStudentFeesForExport(filters = {}) {
  let query = supabase
    .from("student_fees")
    .select(
      `*, students( first_name, last_name, admission_no ), fee_structures( fee_amount, courses(course_name) )`
    )
    .order("id", { ascending: false });

  if (filters.search) {
    query = query.or(
      `students.first_name.ilike.%${filters.search}%,students.last_name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  // Enrich with payment totals
  const enriched = await Promise.all(
    data.map(async (fee) => {
      const { data: payments } = await supabase
        .from("fee_payments")
        .select("amount")
        .eq("student_fee_id", fee.id);

      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const finalFee = Number(fee.final_fee);
      const pending = Math.max(finalFee - totalPaid, 0);

      return {
        ...fee,
        total_paid: totalPaid,
        pending: pending,
      };
    })
  );

  return enriched;
}

export async function createStudentFee(payload) {
  const { data, error } = await supabase
    .from("student_fees")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStudentFee(id, payload) {
  const { data, error } = await supabase
    .from("student_fees")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStudentFee(id) {
  const { error } = await supabase
    .from("student_fees")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ========================
// PAYMENTS & RECEIPTS (unchanged)
// ========================

export async function getPayments(studentFeeId) {
  const { data, error } = await supabase
    .from("fee_payments")
    .select("*")
    .eq("student_fee_id", studentFeeId)
    .order("payment_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function collectPayment(paymentPayload, studentId) {
  const { data: payment, error } = await supabase
    .from("fee_payments")
    .insert([paymentPayload])
    .select()
    .single();
  if (error) throw error;

  // Auto-generate receipt
  const receiptNo = "RCPT-" + Date.now();
  await supabase.from("receipts").insert([
    {
      receipt_no: receiptNo,
      student_id: studentId,
      payment_id: payment.id,
      receipt_date: paymentPayload.payment_date,
      amount: paymentPayload.amount,
      generated_by: 1,
    },
  ]);

  // Auto-log income
  await supabase.from("income").insert([
    {
      income_date: paymentPayload.payment_date,
      category: "Student Fees",
      amount: paymentPayload.amount,
      payment_mode: paymentPayload.payment_mode,
      description: `Payment for Student Fee ID ${paymentPayload.student_fee_id} — Auto receipt ${receiptNo}`,
      created_by: 1,
    },
  ]);

  // Auto-update payment status
  await updateFeeStatusAutomatically(paymentPayload.student_fee_id);

  return payment;
}

export async function updateFeeStatusAutomatically(studentFeeId) {
  const { data: payments, error: sumError } = await supabase
    .from("fee_payments")
    .select("amount")
    .eq("student_fee_id", studentFeeId);
  if (sumError) return;

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const { data: fee, error: feeError } = await supabase
    .from("student_fees")
    .select("final_fee")
    .eq("id", studentFeeId)
    .single();
  if (feeError) return;

  const newStatus = totalPaid >= Number(fee.final_fee) ? "Paid" : "Pending";
  await supabase
    .from("student_fees")
    .update({ status: newStatus })
    .eq("id", studentFeeId);
}