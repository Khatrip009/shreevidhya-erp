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
       ),
       fee_payments ( amount, base_amount, tax_amount ),
       fee_installments ( id, installment_number, amount, due_date, status )`,
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

  const enriched = data.map((fee) => {
    const payments = fee.fee_payments || [];
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalBasePaid = payments.reduce((sum, p) => sum + Number(p.base_amount || 0), 0);
    const totalTaxPaid = payments.reduce((sum, p) => sum + Number(p.tax_amount || 0), 0);
    const pending = Math.max(Number(fee.final_fee) - totalPaid, 0);
    const installments = [...(fee.fee_installments || [])].sort(
      (a, b) => a.installment_number - b.installment_number
    );
    return {
      ...fee,
      total_paid: totalPaid,
      total_base_paid: totalBasePaid,
      total_tax_paid: totalTaxPaid,
      pending,
      installments,
    };
  });

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
       ),
       fee_payments ( amount )`
    )
    .order("id", { ascending: false });

  if (filters.search) {
    query = query.or(
      `students.first_name.ilike.%${filters.search}%,students.last_name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map((fee) => {
    const totalPaid = (fee.fee_payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const pending = Math.max(Number(fee.final_fee) - totalPaid, 0);
    return { ...fee, total_paid: totalPaid, pending };
  });
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

// ─── INTERNAL: Update fee status after payment ──────────────

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

// ─── PUBLIC: Collect payment (supports optional invoice linkage) ──

export async function collectPayment(paymentPayload, studentId, invoiceId = null) {
  if (invoiceId) {
    return collectPaymentWithInvoice(paymentPayload, studentId, invoiceId);
  }

  // Fallback: no invoice (original behavior)
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

// ─── Helper: Collect payment linked to an invoice ────────────

export async function collectPaymentWithInvoice(paymentPayload, studentId, invoiceId) {
  // Insert payment with invoice_id
  const { data: payment, error } = await supabase
    .from("fee_payments")
    .insert([{ ...paymentPayload, invoice_id: invoiceId }])
    .select()
    .single();
  if (error) throw error;

  // Update invoice paid amount and status
  const { data: invoice } = await supabase
    .from("invoices")
    .select("grand_total, paid_amount, balance_due, status")
    .eq("id", invoiceId)
    .single();

  const newPaid = (invoice.paid_amount || 0) + paymentPayload.amount;
  const balance = invoice.grand_total - newPaid;
  let newStatus = invoice.status;
  if (balance <= 0) newStatus = "Paid";
  else if (newPaid > 0) newStatus = "Partially Paid";

  await supabase
    .from("invoices")
    .update({
      paid_amount: newPaid,
      balance_due: balance,
      status: newStatus,
      updated_at: new Date(),
    })
    .eq("id", invoiceId);

  // Auto-receipt will be created by trigger (trg_receipt_auto)
  // but we also need to update fee status (installment tracking)
  await updateFeeStatusAutomatically(paymentPayload.student_fee_id);

  return payment;
}

// ─── Get remaining balance for an invoice ────────────────────

export async function getInvoiceBalance(invoiceId) {
  const { data, error } = await supabase
    .from("invoices")
    .select("grand_total, paid_amount, balance_due")
    .eq("id", invoiceId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Submit online payment request (student portal) ─────────

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
// src/services/feeService.js (append)

/**
 * Generate a single invoice for the entire student fee.
 * Optionally, you can specify installmentId to generate an invoice for a specific installment.
 */
export async function generateInvoiceFromStudentFee(studentFeeId, installmentId = null) {
  // 1. Fetch student fee with components and tax details
  const { data: fee, error } = await supabase
    .from("student_fees")
    .select(`
      *,
      students(id, first_name, last_name, admission_no, gstin, state_code, billing_address),
      fee_structures(
        id,
        tax_rate_id,
        tax_inclusive,
        tax_rates(id, name, rate),
        fee_structure_components(component_name, amount, is_taxable, tax_rate_id)
      )
    `)
    .eq("id", studentFeeId)
    .single();
  if (error) throw error;

  // 2. Determine the amount to invoice
  let amount = 0;
  let components = [];
  if (installmentId) {
    // Fetch installment
    const { data: installment } = await supabase
      .from("fee_installments")
      .select("*")
      .eq("id", installmentId)
      .single();
    if (!installment) throw new Error("Installment not found");
    amount = installment.amount;
    // For components, we need to split the installment amount proportionally? Or just use total fee? 
    // Simpler: use the entire fee structure components, but scale amounts to installment amount.
    // We'll use the fee structure components and scale proportionally.
    const totalFee = fee.final_fee || fee.fee_structures.fee_amount;
    const ratio = amount / totalFee;
    components = fee.fee_structures.fee_structure_components.map(comp => ({
      ...comp,
      amount: comp.amount * ratio,
    }));
  } else {
    // Full fee – use all components
    amount = fee.final_fee;
    components = fee.fee_structures.fee_structure_components;
  }

  // 3. Build invoice items from components
  const invoiceItems = components.map(comp => ({
    item_type: "fee_component",
    item_id: comp.id,
    description: comp.component_name,
    quantity: 1,
    unit_price: comp.amount,
    tax_rate_id: comp.tax_rate_id || fee.fee_structures.tax_rate_id,
  }));

  // 4. Use createInvoice service to create the invoice
  const invoicePayload = {
    student_id: fee.student_id,
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: installmentId ? new Date(Date.now() + 30*24*60*60*1000).toISOString().split("T")[0] : null,
    payment_terms: "Standard",
    gst_applicable: !!fee.students.gstin,
    place_of_supply: fee.students.state_code || "",
    reverse_charge: false,
    items: invoiceItems,
  };

  // 5. Create the invoice and link it to the student fee (or installment)
  const invoice = await createInvoice(invoicePayload);

  // 6. Store the invoice_id on the student_fee or installment
  if (installmentId) {
    await supabase
      .from("fee_installments")
      .update({ invoice_id: invoice.id })
      .eq("id", installmentId);
  } else {
    // Optionally store on student_fee
    await supabase
      .from("student_fees")
      .update({ invoice_id: invoice.id })
      .eq("id", studentFeeId);
  }

  return invoice;
}

/**
 * Generate invoices for all installments of a student fee.
 */
export async function generateInvoicesForInstallments(studentFeeId) {
  const { data: installments } = await supabase
    .from("fee_installments")
    .select("id, amount, due_date")
    .eq("student_fee_id", studentFeeId)
    .order("installment_number");
  if (!installments || installments.length === 0) {
    throw new Error("No installments found for this fee");
  }

  const results = [];
  for (const inst of installments) {
    const invoice = await generateInvoiceFromStudentFee(studentFeeId, inst.id);
    results.push(invoice);
  }
  return results;
}