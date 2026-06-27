// src/services/feeService.js
import { supabase } from "../api/supabase";

// ========================
// HELPERS
// ========================

export function calculateFeeWithTax(amount, taxRateId, taxRates, taxInclusive = true) {
  if (!taxRateId) {
    return { baseAmount: amount, taxAmount: 0, total: amount };
  }

  const taxRate = taxRates.find(t => t.id === taxRateId);
  if (!taxRate) {
    return { baseAmount: amount, taxAmount: 0, total: amount };
  }

  const rate = taxRate.rate / 100;

  if (taxInclusive) {
    const baseAmount = amount / (1 + rate);
    const taxAmount = amount - baseAmount;
    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: amount,
    };
  } else {
    const baseAmount = amount;
    const taxAmount = amount * rate;
    return {
      baseAmount,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: amount + taxAmount,
    };
  }
}

// ========================
// TAX RATES
// ========================

export async function getTaxRates() {
  const { data, error } = await supabase
    .from("tax_rates")
    .select("*")
    .eq("is_active", true)
    .order("rate");
  if (error) throw error;
  return data;
}

export async function createTaxRate(payload) {
  const { data, error } = await supabase
    .from("tax_rates")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTaxRate(id, payload) {
  const { data, error } = await supabase
    .from("tax_rates")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTaxRate(id) {
  const { error } = await supabase
    .from("tax_rates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// ========================
// FEE STRUCTURES
// ========================

export async function getFeeStructures() {
  const { data, error } = await supabase
    .from("fee_structures")
    .select(`
      *,
      courses (
        id,
        course_name,
        medium_id,
        mediums ( name )
      ),
      tax_rates (
        id,
        name,
        rate
      )
    `)
    .order("id", { ascending: false });
  if (error) throw error;
  return data || [];
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
// STUDENT FEES (with tax AND course)
// ========================

export async function getStudentFees({ pageParam = 0, filters = {} } = {}) {
  const limit = 10;
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("student_fees")
    .select(
      `*,
       students(first_name, last_name, admission_no),
       fee_structures!inner (
         fee_amount,
         tax_rate_id,
         tax_inclusive,
         tax_rates ( name, rate ),
         courses ( course_name, medium_id, mediums ( name ) )
       )`,
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
        .select("amount, base_amount, tax_amount")
        .eq("student_fee_id", fee.id);

      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalBasePaid = payments?.reduce((sum, p) => sum + Number(p.base_amount || 0), 0) || 0;
      const totalTaxPaid = payments?.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0) || 0;

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
        total_base_paid: totalBasePaid,
        total_tax_paid: totalTaxPaid,
        pending,
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
      `*,
       students(first_name, last_name, admission_no),
       fee_structures!inner (
         fee_amount,
         tax_rate_id,
         tax_inclusive,
         tax_rates ( name, rate ),
         courses ( course_name )
       )`
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
        pending,
      };
    })
  );

  return enriched;
}

export async function createStudentFee(payload) {
  const { installment_data, ...feeData } = payload;

  // Fetch fee structure to get tax info
  const { data: feeStructure } = await supabase
    .from("fee_structures")
    .select(`
      tax_rate_id,
      tax_inclusive,
      tax_rates ( rate )
    `)
    .eq("id", feeData.fee_structure_id)
    .single();

  let baseAmount = Number(feeData.final_fee);
  let taxAmount = 0;

  if (feeStructure?.tax_rate_id) {
    const taxRates = feeStructure.tax_rates ? [feeStructure.tax_rates] : [];
    const result = calculateFeeWithTax(
      Number(feeData.final_fee),
      feeStructure.tax_rate_id,
      taxRates,
      feeStructure.tax_inclusive !== undefined ? feeStructure.tax_inclusive : true
    );
    baseAmount = result.baseAmount;
    taxAmount = result.taxAmount;
  }

  const { data: fee, error } = await supabase
    .from("student_fees")
    .insert([{
      student_id: feeData.student_id,
      fee_structure_id: feeData.fee_structure_id,
      total_fee: feeData.total_fee,
      discount: feeData.discount,
      final_fee: feeData.final_fee,
      status: feeData.status || "Pending",
      base_amount: baseAmount,
      tax_amount: taxAmount,
    }])
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

  // Recalculate tax
  let baseAmount = 0;
  let taxAmount = 0;
  if (feeData.fee_structure_id) {
    const { data: feeStructure } = await supabase
      .from("fee_structures")
      .select(`
        tax_rate_id,
        tax_inclusive,
        tax_rates ( rate )
      `)
      .eq("id", feeData.fee_structure_id)
      .single();

    if (feeStructure?.tax_rate_id) {
      const taxRates = feeStructure.tax_rates ? [feeStructure.tax_rates] : [];
      const result = calculateFeeWithTax(
        Number(feeData.final_fee),
        feeStructure.tax_rate_id,
        taxRates,
        feeStructure.tax_inclusive !== undefined ? feeStructure.tax_inclusive : true
      );
      baseAmount = result.baseAmount;
      taxAmount = result.taxAmount;
    }
  }

  const updateData = {
    student_id: feeData.student_id,
    fee_structure_id: feeData.fee_structure_id,
    total_fee: feeData.total_fee,
    discount: feeData.discount,
    final_fee: feeData.final_fee,
    status: feeData.status,
    base_amount: baseAmount,
    tax_amount: taxAmount,
  };

  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

  const { data: fee, error } = await supabase
    .from("student_fees")
    .update(updateData)
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
  const { data: payment, error } = await supabase
    .from("fee_payments")
    .insert([paymentPayload])
    .select()
    .single();
  if (error) throw error;

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

  await supabase.from("income").insert([
    {
      income_date: paymentPayload.payment_date,
      category: "Student Fees",
      amount: paymentPayload.amount,
      base_amount: paymentPayload.base_amount || 0,
      tax_amount: paymentPayload.tax_amount || 0,
      payment_mode: paymentPayload.payment_mode,
      description: `Payment for Student Fee ID ${paymentPayload.student_fee_id} — Auto receipt ${receiptNo}`,
    },
  ]);

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