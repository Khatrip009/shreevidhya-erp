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
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ========================
// STUDENT FEES (with pagination & installments)
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

  if (filters.search) {
    query = query.or(
      `students.first_name.ilike.%${filters.search}%,students.last_name.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

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

      const { data: installments } = await supabase
        .from("fee_installments")
        .select("*")
        .eq("student_fee_id", fee.id)
        .order("installment_number");

      return {
        ...fee,
        total_paid: totalPaid,
        pending: pending,
        installments: installments || [],
      };
    })
  );

  return { data: enriched, count };
}

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
  const { installment_data, ...feeData } = payload;

  const { data: fee, error } = await supabase
    .from("student_fees")
    .insert([feeData])
    .select()
    .single();
  if (error) throw error;

  if (installment_data && installment_data.length > 0) {
    const inserts = installment_data.map((inst) => ({
      student_fee_id: fee.id,
      installment_number: inst.installment_number,
      amount: inst.amount,
      due_date: inst.due_date || null,
      status: "Pending",
    }));
    const { error: instError } = await supabase
      .from("fee_installments")
      .insert(inserts);
    if (instError) throw instError;
  }

  return fee;
}

export async function updateStudentFee(id, payload) {
  const { installment_data, ...feeData } = payload;

  const { data: fee, error } = await supabase
    .from("student_fees")
    .update(feeData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;

  if (installment_data !== undefined) {
    await supabase
      .from("fee_installments")
      .delete()
      .eq("student_fee_id", id);

    if (installment_data && installment_data.length > 0) {
      const inserts = installment_data.map((inst) => ({
        student_fee_id: id,
        installment_number: inst.installment_number,
        amount: inst.amount,
        due_date: inst.due_date || null,
        status: "Pending",
      }));
      const { error: instError } = await supabase
        .from("fee_installments")
        .insert(inserts);
      if (instError) throw instError;
    }
  }

  return fee;
}

export async function deleteStudentFee(id) {
  const { error } = await supabase
    .from("student_fees")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ========================
// PAYMENTS & RECEIPTS
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
  // 1. Insert payment
  const { data: payment, error } = await supabase
    .from("fee_payments")
    .insert([paymentPayload])
    .select()
    .single();
  if (error) throw error;

  // 2. Generate receipt
  const receiptNo = "RCPT-" + Date.now();
  await supabase.from("receipts").insert([
    {
      receipt_no: receiptNo,
      student_id: studentId,
      payment_id: payment.id,
      receipt_date: paymentPayload.payment_date,
      amount: paymentPayload.amount,
      generated_by: null,
    },
  ]);

  // 3. Record in income
  await supabase.from("income").insert([
    {
      income_date: paymentPayload.payment_date,
      category: "Student Fees",
      amount: paymentPayload.amount,
      payment_mode: paymentPayload.payment_mode,
      description: `Payment for Student Fee ID ${paymentPayload.student_fee_id} — Auto receipt ${receiptNo}`,
    },
  ]);

  // 4. Update fee status and installments
  await updateFeeStatusAutomatically(paymentPayload.student_fee_id);

  return payment;
}

async function updateFeeStatusAutomatically(studentFeeId) {
  const { data: payments } = await supabase
    .from("fee_payments")
    .select("amount")
    .eq("student_fee_id", studentFeeId);
  const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

  const { data: fee } = await supabase
    .from("student_fees")
    .select("final_fee")
    .eq("id", studentFeeId)
    .single();
  if (!fee) return;

  const newStatus = totalPaid >= Number(fee.final_fee) ? "Paid" : "Pending";
  await supabase
    .from("student_fees")
    .update({ status: newStatus })
    .eq("id", studentFeeId);

  // Update individual installment statuses
  const { data: installments } = await supabase
    .from("fee_installments")
    .select("*")
    .eq("student_fee_id", studentFeeId)
    .order("installment_number");

  if (installments && installments.length > 0) {
    let runningTotal = 0;
    for (const inst of installments) {
      const alreadyAccounted = installments
        .filter((_, i) => i < installments.indexOf(inst))
        .reduce((s, i) => s + Number(i.amount), 0);
      const remaining = totalPaid - alreadyAccounted;
      const newInstStatus = remaining >= Number(inst.amount) ? "Paid" : "Pending";

      if (inst.status !== newInstStatus) {
        await supabase
          .from("fee_installments")
          .update({ status: newInstStatus })
          .eq("id", inst.id);
      }
    }
  }
}

// ------------------------------
// NEW: Student payment request
// ------------------------------
export async function submitPaymentRequest({ student_fee_id, amount, transaction_no, remarks, installment_id }) {
  const { data, error } = await supabase
    .from("fee_payments")
    .insert([
      {
        student_fee_id,
        payment_date: new Date().toISOString().split("T")[0],
        amount: Number(amount),
        payment_mode: "Online",
        transaction_no,
        remarks,
        status: "Pending",
        installment_id: installment_id || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}