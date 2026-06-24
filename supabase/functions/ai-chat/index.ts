// supabase/functions/ai-chat/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ---------- HELPERS ----------
function extractPendingAction(text: string): any {
  const match = text.match(/<!-- action:([^|]+)\|([^>]+) -->/);
  if (!match) return null;
  const actionType = match[1];
  const params: Record<string, string> = {};
  match[2].split("|").forEach(pair => {
    const [key, value] = pair.split(":");
    params[key] = value;
  });
  return { actionType, ...params };
}

function getPreviousAssistantMessage(messages: any[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return messages[i].content;
  }
  return null;
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = now;
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getNextWeekRange() {
  const now = new Date();
  const start = now.toISOString().split("T")[0];
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  return {
    start,
    end: nextWeek.toISOString().split("T")[0],
  };
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

// ---------- BUILD SUGGESTIONS AND ACTIONS ----------
async function buildSuggestionsAndActions(supabaseClient: any, role: string, userId: string) {
  const isAdmin = role === "super_admin" || role === "admin";
  const isTeacher = role === "teacher";
  const isStudent = role === "student";

  const suggestions: string[] = [];
  const actions: { label: string; action: string; params?: any }[] = [];

  if (isAdmin) {
    const { count: pendingFees } = await supabaseClient
      .from("student_fees")
      .select("*", { count: "exact", head: false })
      .eq("status", "Pending");
    if (pendingFees > 0) {
      suggestions.push(`📌 **${pendingFees} students** have pending fees.`);
      actions.push({ label: "View Pending Fees", action: "query", params: { query: "Show pending fees" } });
    }

    const { count: pendingLeaves } = await supabaseClient
      .from("leaves")
      .select("*", { count: "exact", head: false })
      .eq("status", "Pending");
    if (pendingLeaves > 0) {
      suggestions.push(`🗓️ **${pendingLeaves} leave requests** are pending.`);
      actions.push({ label: "Review Leaves", action: "navigate", params: { path: "/leave-management" } });
    }

    const { count: pendingHW } = await supabaseClient
      .from("homework_submissions")
      .select("*", { count: "exact", head: false })
      .eq("status", "Pending");
    if (pendingHW > 0) {
      suggestions.push(`📄 **${pendingHW} students** have not submitted homework.`);
      actions.push({ label: "View Pending Homework", action: "query", params: { query: "Pending homework" } });
    }

    const { count: newInquiries } = await supabaseClient
      .from("inquiries")
      .select("*", { count: "exact", head: false })
      .eq("status", "New");
    if (newInquiries > 0) {
      suggestions.push(`🆕 **${newInquiries} new inquiries** await follow-up.`);
      actions.push({ label: "View Inquiries", action: "navigate", params: { path: "/inquiries" } });
    }

    actions.push({ label: "📊 Dashboard", action: "navigate", params: { path: "/" } });
    actions.push({ label: "💰 Pending Fees", action: "query", params: { query: "Show pending fees" } });
    actions.push({ label: "📈 Profit & Loss", action: "navigate", params: { path: "/profit-loss" } });
    actions.push({ label: "💡 Suggestions", action: "get_suggestions" });
  }

  if (isTeacher) {
    const { data: teacher } = await supabaseClient
      .from("teachers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (teacher) {
      const { data: batchTeachers } = await supabaseClient
        .from("batch_teachers")
        .select("batch_id")
        .eq("teacher_id", teacher.id);
      const batchIds = batchTeachers?.map(b => b.batch_id) || [];
      if (batchIds.length) {
        const { data: homeworks } = await supabaseClient
          .from("homework")
          .select("id")
          .in("batch_id", batchIds);
        const hwIds = homeworks?.map(h => h.id) || [];
        if (hwIds.length) {
          const { count: pendingSub } = await supabaseClient
            .from("homework_submissions")
            .select("*", { count: "exact", head: false })
            .in("homework_id", hwIds)
            .eq("status", "Pending");
          if (pendingSub > 0) {
            suggestions.push(`📄 **${pendingSub} students** have pending homework in your batches.`);
            actions.push({ label: "View Submissions", action: "navigate", params: { path: "/homework" } });
          }
        }
      }

      const { count: myPendingLeaves } = await supabaseClient
        .from("leaves")
        .select("*", { count: "exact", head: false })
        .eq("teacher_id", teacher.id)
        .eq("status", "Pending");
      if (myPendingLeaves > 0) {
        suggestions.push(`🗓️ You have **${myPendingLeaves} pending leave request(s)**.`);
        actions.push({ label: "My Leaves", action: "navigate", params: { path: "/teacher/leaves" } });
      }

      actions.push({ label: "🧑‍🏫 My Batches", action: "navigate", params: { path: "/teacher" } });
      actions.push({ label: "📋 Mark Attendance", action: "mark_attendance" });
      actions.push({ label: "💰 My Salary", action: "navigate", params: { path: "/teacher/salary" } });
      actions.push({ label: "💡 Suggestions", action: "get_suggestions" });
    }
  }

  if (isStudent) {
    const { data: student } = await supabaseClient
      .from("students")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (student) {
      const { data: submissions } = await supabaseClient
        .from("homework_submissions")
        .select("id")
        .eq("student_id", student.id)
        .eq("status", "Pending");
      if (submissions?.length) {
        suggestions.push(`📄 You have **${submissions.length} pending homework** submissions.`);
        actions.push({ label: "View Homework", action: "navigate", params: { path: "/student/homework" } });
      }

      const { data: fees } = await supabaseClient
        .from("student_fees")
        .select("id")
        .eq("student_id", student.id)
        .eq("status", "Pending");
      if (fees?.length) {
        suggestions.push(`💰 You have **${fees.length} pending fee** due.`);
        actions.push({ label: "View Fees", action: "navigate", params: { path: "/student/fees" } });
      }

      // Upcoming exams from student's batches
      const { data: studentBatches } = await supabaseClient
        .from("student_batches")
        .select("batch_id")
        .eq("student_id", student.id)
        .eq("status", "active");
      const batchIds = studentBatches?.map(sb => sb.batch_id) || [];
      if (batchIds.length > 0) {
        const { data: upcomingExams } = await supabaseClient
          .from("exams")
          .select("exam_name, exam_date, batch_id, batches(batch_name)")
          .in("batch_id", batchIds)
          .gte("exam_date", getTodayDate())
          .order("exam_date", { ascending: true })
          .limit(3);
        if (upcomingExams?.length) {
          const examsList = upcomingExams.map(e => `${e.exam_name} (${e.exam_date}) - ${e.batches?.batch_name || "N/A"}`).join(", ");
          suggestions.push(`📝 Upcoming exams: ${examsList}.`);
          actions.push({ label: "View Exams", action: "navigate", params: { path: "/student/exams" } });
        }
      }

      actions.push({ label: "📊 My Attendance", action: "navigate", params: { path: "/student/attendance" } });
      actions.push({ label: "📝 My Results", action: "navigate", params: { path: "/student/results" } });
      actions.push({ label: "💡 Suggestions", action: "get_suggestions" });
    }
  }

  if (suggestions.length === 0) {
    suggestions.push("✅ Everything looks good! No urgent action items at the moment.");
  }

  // Limit actions to 8
  const limitedActions = actions.slice(0, 8);
  return { suggestions, actions: limitedActions };
}

// ---------- MAIN HANDLER ----------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")?.split(" ")[1];
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: `Bearer ${authHeader}` } },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const userRole = profile?.role?.toLowerCase() || "student";
    const isAdmin = userRole === "super_admin" || userRole === "admin";
    const isTeacher = userRole === "teacher";
    const isStudent = userRole === "student";

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastUserMsg = messages.filter(m => m.role === "user").pop()?.content || "";
    const lowerMsg = lastUserMsg.toLowerCase();

    const prevAssistantMsg = getPreviousAssistantMessage(messages);
    const pendingAction = prevAssistantMsg ? extractPendingAction(prevAssistantMsg) : null;

    let dataContext = "";

    // ---------- CONFIRMATION HANDLING ----------
    if (pendingAction && (lowerMsg.includes("confirm") || lowerMsg.includes("yes") || lowerMsg.includes("proceed"))) {
      const action = pendingAction.actionType;

      if (action === "mark_attendance" && isTeacher) {
        const studentId = parseInt(pendingAction.student_id);
        const sessionId = parseInt(pendingAction.session_id);
        const status = pendingAction.status || "Present";

        const { data: existing } = await supabaseClient
          .from("student_attendance")
          .select("id")
          .eq("session_id", sessionId)
          .eq("student_id", studentId)
          .maybeSingle();

        if (existing) {
          await supabaseClient
            .from("student_attendance")
            .update({ status })
            .eq("id", existing.id);
        } else {
          await supabaseClient
            .from("student_attendance")
            .insert({ session_id: sessionId, student_id: studentId, status });
        }
        dataContext = `\n\n✅ **Attendance marked successfully!**\n- Student ID: ${studentId}\n- Session ID: ${sessionId}\n- Status: ${status}`;
      }

      if (action === "mark_fee_paid" && isAdmin) {
        const feeId = parseInt(pendingAction.fee_id);
        const amount = parseFloat(pendingAction.amount || "0");
        const paymentDate = pendingAction.payment_date || new Date().toISOString().split("T")[0];

        const { data: payment } = await supabaseClient
          .from("fee_payments")
          .insert({
            student_fee_id: feeId,
            payment_date: paymentDate,
            amount,
            payment_mode: "Cash",
            remarks: "Marked paid via AI Assistant",
          })
          .select()
          .single();

        const { data: allPayments } = await supabaseClient
          .from("fee_payments")
          .select("amount")
          .eq("student_fee_id", feeId);
        const totalPaid = allPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const { data: fee } = await supabaseClient
          .from("student_fees")
          .select("final_fee")
          .eq("id", feeId)
          .single();
        let newStatus = "Pending";
        if (fee && totalPaid >= Number(fee.final_fee)) newStatus = "Paid";
        await supabaseClient
          .from("student_fees")
          .update({ status: newStatus })
          .eq("id", feeId);

        await supabaseClient.from("income").insert({
          income_date: paymentDate,
          category: "Student Fees",
          amount,
          payment_mode: "Cash",
          description: `Fee payment recorded via AI (Fee ID: ${feeId})`,
        });

        dataContext = `\n\n✅ **Fee marked as paid!**\n- Payment ID: ${payment.id}\n- Amount: ₹ ${amount.toLocaleString()}\n- Fee Status: ${newStatus}`;
      }

      if (dataContext) {
        const { suggestions, actions } = await buildSuggestionsAndActions(supabaseClient, userRole, user.id);
        return new Response(
          JSON.stringify({
            reply: dataContext.trim(),
            suggestions,
            actions,
            usage: { prompt_tokens: 0, completion_tokens: 0 },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ---------- NEW ACTION REQUESTS ----------
    // Teacher: Mark Attendance
    if (isTeacher && (lowerMsg.includes("mark") && (lowerMsg.includes("present") || lowerMsg.includes("absent")) || lowerMsg.includes("mark attendance"))) {
      const nameMatch = lastUserMsg.match(/mark\s+(.+?)\s+(present|absent)/i);
      if (nameMatch) {
        const studentName = nameMatch[1].trim();
        const status = nameMatch[2] || "Present";
        const { data: students } = await supabaseClient
          .from("students")
          .select("id, first_name, last_name, admission_no")
          .ilike("first_name", `%${studentName}%`)
          .limit(1);

        if (students && students.length) {
          const student = students[0];
          const { data: batches } = await supabaseClient
            .from("student_batches")
            .select("batch_id")
            .eq("student_id", student.id)
            .eq("status", "active")
            .limit(1);

          if (batches && batches.length) {
            const batchId = batches[0].batch_id;
            const today = new Date().toISOString().split("T")[0];
            let { data: sessions } = await supabaseClient
              .from("attendance_sessions")
              .select("id")
              .eq("batch_id", batchId)
              .eq("attendance_date", today)
              .limit(1);

            let sessionId;
            if (sessions && sessions.length) {
              sessionId = sessions[0].id;
            } else {
              const { data: newSession } = await supabaseClient
                .from("attendance_sessions")
                .insert({ batch_id: batchId, attendance_date: today })
                .select()
                .single();
              sessionId = newSession.id;
            }

            const confirmMsg = `I found **${student.first_name} ${student.last_name}** (Adm: ${student.admission_no || "N/A"}).  
Ready to mark them **${status}** for today's session.  
Reply with **CONFIRM** to proceed. <!-- action:mark_attendance|student_id:${student.id}|session_id:${sessionId}|status:${status} -->`;

            return new Response(
              JSON.stringify({
                reply: confirmMsg,
                suggestions: ["✅ Confirm", "❌ Cancel"],
                actions: [{ label: "Confirm", action: "confirm" }, { label: "Cancel", action: "cancel" }],
                usage: { prompt_tokens: 0, completion_tokens: 0 },
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            dataContext = `\n\n❌ Student **${student.first_name}** is not in any active batch.`;
          }
        } else {
          dataContext = `\n\n❌ Student **${studentName}** not found.`;
        }
      }
    }

    // Admin: Mark Fee Paid
    if (isAdmin && (lowerMsg.includes("mark") && lowerMsg.includes("fee") && lowerMsg.includes("paid") || lowerMsg.includes("record payment"))) {
      const nameMatch = lastUserMsg.match(/mark\s+(.+?)\s+fee\s+paid/i) || lastUserMsg.match(/record payment for (.+)/i);
      if (nameMatch) {
        const studentName = nameMatch[1].trim();
        const { data: students } = await supabaseClient
          .from("students")
          .select("id, first_name, last_name, admission_no")
          .ilike("first_name", `%${studentName}%`)
          .limit(1);

        if (students && students.length) {
          const student = students[0];
          const { data: fees } = await supabaseClient
            .from("student_fees")
            .select("id, final_fee")
            .eq("student_id", student.id)
            .eq("status", "Pending")
            .limit(1);

          if (fees && fees.length) {
            const fee = fees[0];
            const today = new Date().toISOString().split("T")[0];
            const confirmMsg = `I found **${student.first_name} ${student.last_name}** (Adm: ${student.admission_no || "N/A"}).  
They have a pending fee of **₹ ${fee.final_fee}**.  
Ready to mark as **Paid**. Reply with **CONFIRM**. <!-- action:mark_fee_paid|student_id:${student.id}|fee_id:${fee.id}|amount:${fee.final_fee}|payment_date:${today} -->`;

            return new Response(
              JSON.stringify({
                reply: confirmMsg,
                suggestions: ["✅ Confirm", "❌ Cancel"],
                actions: [{ label: "Confirm", action: "confirm" }, { label: "Cancel", action: "cancel" }],
                usage: { prompt_tokens: 0, completion_tokens: 0 },
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            dataContext = `\n\n✅ Student **${student.first_name}** has no pending fees.`;
          }
        } else {
          dataContext = `\n\n❌ Student **${studentName}** not found.`;
        }
      }
    }

    // ---------- SUGGESTIONS ----------
    if (lowerMsg.includes("suggest") || lowerMsg.includes("recommend") ||
        lowerMsg.includes("advise") || lowerMsg.includes("what should i do") ||
        lowerMsg.includes("pending tasks") || lowerMsg.includes("action items") ||
        lowerMsg.includes("what's next") || lowerMsg.includes("any suggestions")) {
      const { suggestions, actions } = await buildSuggestionsAndActions(supabaseClient, userRole, user.id);
      dataContext += "\n\n💡 **Actionable Suggestions:**\n";
      suggestions.forEach((s, idx) => dataContext += `${idx+1}. ${s}\n`);
    }

    // ---------- ADMIN QUERIES ----------
    if (isAdmin) {
      // Pending fees (admin view)
      if (lowerMsg.includes("pending") || lowerMsg.includes("due") || lowerMsg.includes("outstanding") ||
          lowerMsg.includes("unpaid") || lowerMsg.includes("fee report") || lowerMsg.includes("show fees") ||
          lowerMsg.includes("fee defaulters") || lowerMsg.includes("balance")) {
        const { data: fees } = await supabaseClient
          .from("student_fees")
          .select(`id, final_fee, status, students(first_name, last_name, admission_no)`)
          .eq("status", "Pending")
          .limit(50);
        if (fees && fees.length) {
          dataContext += "\n\n📊 **Pending Fees:**\n";
          fees.forEach((f, i) => {
            const name = f.students ? `${f.students.first_name} ${f.students.last_name}` : "Unknown";
            dataContext += `${i+1}. **${name}** (${f.students?.admission_no || "N/A"}): ₹ ${f.final_fee}\n`;
          });
          dataContext += `\nTotal: ${fees.length} students`;
        } else {
          dataContext += "\n\n✅ No pending fees.";
        }
      }

      // Total income
      if (lowerMsg.includes("total income") || lowerMsg.includes("income this month") || lowerMsg.includes("fee collected")) {
        const { start, end } = getCurrentMonthRange();
        const { data: incomeData } = await supabaseClient
          .from("income")
          .select("amount")
          .gte("income_date", start)
          .lte("income_date", end);
        const total = incomeData?.reduce((s, i) => s + Number(i.amount), 0) || 0;
        dataContext += `\n\n💰 **Total Income (${start} to ${end}):** ₹ ${total.toLocaleString()}`;
      }

      // Total expenses
      if (lowerMsg.includes("total expenses") || lowerMsg.includes("expenses this month")) {
        const { start, end } = getCurrentMonthRange();
        const { data: expenses } = await supabaseClient
          .from("expenses")
          .select("amount, category")
          .gte("expense_date", start)
          .lte("expense_date", end);
        if (expenses?.length) {
          const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
          dataContext += `\n\n💸 **Total Expenses (${start} to ${end}):** ₹ ${total.toLocaleString()}\nBreakdown:\n`;
          const catMap = new Map();
          expenses.forEach(e => {
            const cat = e.category || "Uncategorized";
            catMap.set(cat, (catMap.get(cat) || 0) + Number(e.amount));
          });
          catMap.forEach((amt, cat) => dataContext += `- ${cat}: ₹ ${amt.toLocaleString()}\n`);
        }
      }

      // Profit & Loss
      if (lowerMsg.includes("profit") || lowerMsg.includes("loss") || lowerMsg.includes("p&l") || lowerMsg.includes("financial summary")) {
        const { start, end } = getCurrentMonthRange();
        const { data: incomes } = await supabaseClient.from("income").select("amount").gte("income_date", start).lte("income_date", end);
        const { data: expenses } = await supabaseClient.from("expenses").select("amount").gte("expense_date", start).lte("expense_date", end);
        const totalIncome = incomes?.reduce((s, i) => s + Number(i.amount), 0) || 0;
        const totalExpense = expenses?.reduce((s, e) => s + Number(e.amount), 0) || 0;
        const profit = totalIncome - totalExpense;
        dataContext += `\n\n📈 **P&L (${start} to ${end})**\nIncome: ₹ ${totalIncome.toLocaleString()}\nExpenses: ₹ ${totalExpense.toLocaleString()}\nNet ${profit >= 0 ? "Profit" : "Loss"}: ₹ ${Math.abs(profit).toLocaleString()}`;
      }

      // Attendance sessions
      if (lowerMsg.includes("attendance trend") || lowerMsg.includes("overall attendance") || lowerMsg.includes("batch attendance summary")) {
        const { data: sessions } = await supabaseClient
          .from("attendance_sessions")
          .select("id, attendance_date, batch_id")
          .order("attendance_date", { ascending: false })
          .limit(20);
        if (sessions?.length) {
          dataContext += "\n\n📋 **Recent Attendance Sessions:**\n";
          sessions.forEach(s => dataContext += `- ${s.attendance_date} | Batch ID: ${s.batch_id}\n`);
        }
      }

      // Student count
      if (lowerMsg.includes("how many students") || lowerMsg.includes("total enrollments") || lowerMsg.includes("student count")) {
        const { count } = await supabaseClient.from("students").select("*", { count: "exact", head: false });
        dataContext += `\n\n👩‍🎓 **Total students:** ${count || 0}`;
      }

      // List teachers
      if (lowerMsg.includes("list all teachers") || lowerMsg.includes("show teachers") || lowerMsg.includes("staff list")) {
        const { data: teachers } = await supabaseClient
          .from("teachers")
          .select("first_name, last_name, employee_code, courses(course_name)")
          .limit(30);
        if (teachers?.length) {
          dataContext += "\n\n👨‍🏫 **Teachers:**\n";
          teachers.forEach(t => {
            const name = `${t.first_name} ${t.last_name}`;
            dataContext += `- ${name} (${t.employee_code}) - ${t.courses?.course_name || "N/A"}\n`;
          });
        }
      }

      // Active batches count
      if (lowerMsg.includes("how many batches") || lowerMsg.includes("active batches") || lowerMsg.includes("batch count")) {
        const { count } = await supabaseClient.from("batches").select("*", { count: "exact", head: false }).eq("status", "active");
        dataContext += `\n\n📚 **Active batches:** ${count || 0}`;
      }

      // Exam performance
      if (lowerMsg.includes("exam performance") || lowerMsg.includes("top performers") || lowerMsg.includes("failed students")) {
        const { data: exams } = await supabaseClient.from("exams").select("id, exam_name, total_marks").order("exam_date", { ascending: false }).limit(3);
        if (exams?.length) {
          dataContext += "\n\n📝 **Exam Performance:**\n";
          for (const exam of exams) {
            const { data: results } = await supabaseClient
              .from("student_results")
              .select("marks_obtained")
              .eq("exam_id", exam.id);
            if (results?.length) {
              const marks = results.map(r => Number(r.marks_obtained));
              const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
              const passed = marks.filter(m => m >= exam.total_marks / 2).length;
              dataContext += `- ${exam.exam_name}: Avg ${avg.toFixed(1)}, Passed ${passed}/${marks.length}\n`;
            }
          }
        }
      }

      // Pending homework
      if (lowerMsg.includes("pending homework") || lowerMsg.includes("unsubmitted homework") || lowerMsg.includes("overdue assignments")) {
        const { data: submissions } = await supabaseClient
          .from("homework_submissions")
          .select("id, students(first_name, last_name)")
          .eq("status", "Pending")
          .limit(30);
        if (submissions?.length) {
          dataContext += `\n\n📄 **Pending Homework:** ${submissions.length} students\n`;
          submissions.forEach((s, i) => {
            const name = s.students ? `${s.students.first_name} ${s.students.last_name}` : "Unknown";
            dataContext += `${i+1}. ${name}\n`;
          });
        } else {
          dataContext += "\n\n✅ All homework submitted.";
        }
      }

      // Certificates count
      if (lowerMsg.includes("certificates issued") || lowerMsg.includes("certificate count") || lowerMsg.includes("how many certificates")) {
        const { count } = await supabaseClient.from("certificates").select("*", { count: "exact", head: false });
        dataContext += `\n\n📜 **Certificates issued:** ${count || 0}`;
      }

      // Inquiry conversion
      if (lowerMsg.includes("inquiry conversion") || lowerMsg.includes("leads") || lowerMsg.includes("new inquiries") || lowerMsg.includes("joined students")) {
        const { data: inquiries } = await supabaseClient.from("inquiries").select("status").limit(1000);
        if (inquiries?.length) {
          const total = inquiries.length;
          const joined = inquiries.filter(i => i.status === "Joined").length;
          const conversion = total > 0 ? ((joined / total) * 100).toFixed(1) : 0;
          dataContext += `\n\n📊 **Inquiries:** Total ${total}, Joined ${joined}, Conversion ${conversion}%`;
        }
      }

      // Pending leaves
      if (lowerMsg.includes("pending leaves") || lowerMsg.includes("leave requests") || lowerMsg.includes("teacher absences")) {
        const { data: leaves } = await supabaseClient
          .from("leaves")
          .select("id, start_date, end_date, teachers(first_name, last_name)")
          .eq("status", "Pending")
          .limit(30);
        if (leaves?.length) {
          dataContext += `\n\n🗓️ **Pending Leaves:** ${leaves.length}\n`;
          leaves.forEach((l, i) => {
            const name = l.teachers ? `${l.teachers.first_name} ${l.teachers.last_name}` : "Unknown";
            dataContext += `${i+1}. ${name}: ${l.start_date} to ${l.end_date}\n`;
          });
        } else {
          dataContext += "\n\n✅ No pending leaves.";
        }
      }

      // Salary paid
      if (lowerMsg.includes("salary payout") || lowerMsg.includes("total salary") || lowerMsg.includes("teacher salaries")) {
        const { start, end } = getCurrentMonthRange();
        const { data: salaries } = await supabaseClient
          .from("salary_payments")
          .select("amount")
          .gte("payment_date", start)
          .lte("payment_date", end);
        const total = salaries?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        dataContext += `\n\n💵 **Total salary paid (${start} to ${end}):** ₹ ${total.toLocaleString()}`;
      }

      // Revenue breakdown
      if (lowerMsg.includes("revenue breakdown") || lowerMsg.includes("income by category")) {
        const { start, end } = getCurrentMonthRange();
        const { data: incomeByCategory } = await supabaseClient
          .from("income")
          .select("category, amount")
          .gte("income_date", start)
          .lte("income_date", end);
        if (incomeByCategory?.length) {
          const catMap = new Map();
          incomeByCategory.forEach(i => {
            const cat = i.category || "Uncategorized";
            catMap.set(cat, (catMap.get(cat) || 0) + Number(i.amount));
          });
          dataContext += `\n\n📊 **Revenue by Category (${start} to ${end}):**\n`;
          catMap.forEach((amt, cat) => dataContext += `- ${cat}: ₹ ${amt.toLocaleString()}\n`);
        }
      }

      // Top students
      if (lowerMsg.includes("top students") || lowerMsg.includes("best performers")) {
        const { data: results } = await supabaseClient
          .from("student_results")
          .select("student_id, marks_obtained, exams(total_marks)")
          .limit(100);
        if (results?.length) {
          const studentMap = new Map();
          results.forEach(r => {
            const pct = r.exams?.total_marks ? (Number(r.marks_obtained) / Number(r.exams.total_marks)) * 100 : 0;
            if (!studentMap.has(r.student_id)) studentMap.set(r.student_id, []);
            studentMap.get(r.student_id).push(pct);
          });
          const avgMap = new Map();
          studentMap.forEach((marks, sid) => {
            const avg = marks.reduce((a, b) => a + b, 0) / marks.length;
            avgMap.set(sid, avg);
          });
          const sorted = Array.from(avgMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
          if (sorted.length) {
            dataContext += "\n\n🏆 **Top Students (by average marks):**\n";
            for (const [sid, avg] of sorted) {
              const { data: student } = await supabaseClient
                .from("students")
                .select("first_name, last_name")
                .eq("id", sid)
                .single();
              if (student) {
                dataContext += `- ${student.first_name} ${student.last_name}: ${avg.toFixed(1)}%\n`;
              }
            }
          }
        }
      }

      // ------ NEW ADMIN QUERIES ------
      // List all courses
      if (lowerMsg.includes("list all courses") || lowerMsg.includes("show courses") || lowerMsg.includes("all courses")) {
        const { data: courses } = await supabaseClient
          .from("courses")
          .select("id, course_name, status, duration_months")
          .order("course_name");
        if (courses && courses.length > 0) {
          dataContext += "\n\n📚 **All Courses:**\n";
          courses.forEach(c => {
            dataContext += `- ${c.course_name} (${c.duration_months || "N/A"} months) - ${c.status ? "Active" : "Inactive"}\n`;
          });
        } else {
          dataContext += "\n\nNo courses found.";
        }
      }

      // List all subjects
      if (lowerMsg.includes("list all subjects") || lowerMsg.includes("show subjects") || lowerMsg.includes("all subjects")) {
        const { data: subjects } = await supabaseClient
          .from("subjects")
          .select("id, subject_name, courses(course_name)")
          .order("subject_name");
        if (subjects && subjects.length > 0) {
          dataContext += "\n\n📖 **All Subjects:**\n";
          subjects.forEach(s => {
            dataContext += `- ${s.subject_name} (${s.courses?.course_name || "N/A"})\n`;
          });
        } else {
          dataContext += "\n\nNo subjects found.";
        }
      }

      // List all parents
      if (lowerMsg.includes("list all parents") || lowerMsg.includes("show parents") || lowerMsg.includes("all parents")) {
        const { data: parents } = await supabaseClient
          .from("parents")
          .select("id, father_name, mother_name, mobile, email")
          .limit(50);
        if (parents && parents.length > 0) {
          dataContext += "\n\n👨‍👩‍👧 **Parents:**\n";
          parents.forEach(p => {
            dataContext += `- ${p.father_name || "N/A"} & ${p.mother_name || "N/A"} (${p.mobile || "N/A"})\n`;
          });
        } else {
          dataContext += "\n\nNo parents found.";
        }
      }

      // List all batches with details
      if (lowerMsg.includes("list all batches") || lowerMsg.includes("show batches") || lowerMsg.includes("all batches")) {
        const { data: batches } = await supabaseClient
          .from("batches")
          .select("id, batch_name, courses(course_name), start_date, end_date, status")
          .order("batch_name");
        if (batches && batches.length > 0) {
          dataContext += "\n\n📋 **All Batches:**\n";
          batches.forEach(b => {
            dataContext += `- ${b.batch_name} (${b.courses?.course_name || "N/A"}) - ${b.status} (${b.start_date} to ${b.end_date})\n`;
          });
        } else {
          dataContext += "\n\nNo batches found.";
        }
      }
    }

    // ---------- TEACHER QUERIES ----------
    if (isTeacher) {
      const { data: teacher } = await supabaseClient
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (teacher) {
        // My batches
        if (lowerMsg.includes("my batches") || lowerMsg.includes("my classes") || lowerMsg.includes("assigned to me")) {
          const { data: batches } = await supabaseClient
            .from("batch_teachers")
            .select(`batch_id, batches(batch_name, start_time, end_time, days)`)
            .eq("teacher_id", teacher.id);
          if (batches?.length) {
            dataContext += "\n\n🧑‍🏫 **Your Batches:**\n";
            batches.forEach(b => {
              const name = b.batches?.batch_name || "N/A";
              dataContext += `- ${name}\n`;
            });
          } else {
            dataContext += "\n\nNo active batches assigned.";
          }
        }

        // My students
        if (lowerMsg.includes("my students") || lowerMsg.includes("students in my") || lowerMsg.includes("my class list")) {
          const { data: batchTeachers } = await supabaseClient
            .from("batch_teachers")
            .select("batch_id")
            .eq("teacher_id", teacher.id);
          const batchIds = batchTeachers?.map(b => b.batch_id) || [];
          if (batchIds.length) {
            const { data: students } = await supabaseClient
              .from("student_batches")
              .select(`student_id, students(first_name, last_name, admission_no)`)
              .in("batch_id", batchIds)
              .eq("status", "active");
            if (students?.length) {
              const unique = new Map();
              students.forEach(s => {
                if (s.students && !unique.has(s.student_id)) unique.set(s.student_id, s.students);
              });
              dataContext += "\n\n👨‍🎓 **Your Students:**\n";
              unique.forEach(s => dataContext += `- ${s.first_name} ${s.last_name} (${s.admission_no || "N/A"})\n`);
            }
          }
        }

        // My salary
        if (lowerMsg.includes("my salary") || lowerMsg.includes("salary this month") || lowerMsg.includes("my payment")) {
          const { data: salaries } = await supabaseClient
            .from("salary_payments")
            .select("amount, payment_date")
            .eq("teacher_id", teacher.id)
            .order("payment_date", { ascending: false })
            .limit(1);
          if (salaries?.length) {
            dataContext += `\n\n💰 **Last salary:** ₹ ${Number(salaries[0].amount).toLocaleString()} on ${salaries[0].payment_date}`;
          } else {
            dataContext += "\n\nNo salary records.";
          }
        }

        // My leaves
        if (lowerMsg.includes("my leaves") || lowerMsg.includes("my leave balance") || lowerMsg.includes("leave history")) {
          const { data: leaves } = await supabaseClient
            .from("leaves")
            .select("start_date, end_date, status, reason")
            .eq("teacher_id", teacher.id)
            .order("created_at", { ascending: false })
            .limit(10);
          if (leaves?.length) {
            dataContext += "\n\n🗓️ **Your Leaves:**\n";
            leaves.forEach(l => dataContext += `- ${l.start_date} to ${l.end_date}: ${l.status} (${l.reason || "N/A"})\n`);
          } else {
            dataContext += "\n\nNo leave records.";
          }
        }

        // Batch attendance
        if (lowerMsg.includes("batch attendance") || lowerMsg.includes("attendance for my batch")) {
          const { data: batchTeachers } = await supabaseClient
            .from("batch_teachers")
            .select("batch_id")
            .eq("teacher_id", teacher.id);
          const batchIds = batchTeachers?.map(b => b.batch_id) || [];
          if (batchIds.length) {
            const { data: sessions } = await supabaseClient
              .from("attendance_sessions")
              .select("id, attendance_date, batch_id")
              .in("batch_id", batchIds)
              .order("attendance_date", { ascending: false })
              .limit(10);
            if (sessions?.length) {
              dataContext += "\n\n📋 **Recent attendance for your batches:**\n";
              sessions.forEach(s => dataContext += `- ${s.attendance_date} | Batch ID: ${s.batch_id}\n`);
            }
          }
        }
      }
    }

    // ---------- STUDENT QUERIES ----------
    if (isStudent) {
      const { data: student } = await supabaseClient
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (student) {
        // Today's Homework
        if (lowerMsg.includes("today's homework") || lowerMsg.includes("homework today") || lowerMsg.includes("today homework") || lowerMsg.includes("what is my homework for today")) {
          const today = new Date().toISOString().split("T")[0];
          const { data: submissions, error } = await supabaseClient
            .from("homework_submissions")
            .select(`
              id,
              status,
              homework!inner (
                id,
                title,
                description,
                due_date,
                batch_id
              )
            `)
            .eq("student_id", student.id)
            .eq("homework.due_date", today)
            .limit(10);

          if (error) {
            console.error("Homework fetch error:", error);
            dataContext += "\n\n⚠️ Could not fetch your homework. Please try again later.";
          } else if (submissions && submissions.length > 0) {
            dataContext += "\n\n📚 **Today's Homework:**\n";
            submissions.forEach((sub, idx) => {
              const hw = sub.homework;
              dataContext += `${idx+1}. **${hw.title}** (Due: ${hw.due_date})\n`;
              dataContext += `   Status: ${sub.status}\n`;
              if (hw.description) dataContext += `   ${hw.description}\n`;
            });
          } else {
            dataContext += "\n\n✅ No homework due today. Enjoy your day! 🎉";
          }
        }

        // Attendance
        if (lowerMsg.includes("my attendance") || lowerMsg.includes("attendance percentage")) {
          const { data: studentBatches } = await supabaseClient
            .from("student_batches")
            .select("batch_id")
            .eq("student_id", student.id)
            .eq("status", "active");

          const batchIds = studentBatches?.map(sb => sb.batch_id) || [];
          if (batchIds.length > 0) {
            const { data: sessions } = await supabaseClient
              .from("attendance_sessions")
              .select("id")
              .in("batch_id", batchIds);
            const sessionIds = sessions?.map(s => s.id) || [];
            if (sessionIds.length > 0) {
              const { data: marks } = await supabaseClient
                .from("student_attendance")
                .select("status")
                .eq("student_id", student.id)
                .in("session_id", sessionIds);
              const present = marks?.filter(m => m.status === "Present").length || 0;
              const total = marks?.length || 0;
              const pct = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
              dataContext += `\n\n📊 **Your attendance:** ${pct}% (${present}/${total} sessions present)`;
            } else {
              dataContext += `\n\n📊 No attendance sessions found for your batches.`;
            }
          } else {
            dataContext += `\n\n📊 You are not enrolled in any active batch.`;
          }
        }

        // Results
        if (lowerMsg.includes("my results") || lowerMsg.includes("my marks") || lowerMsg.includes("how did i do")) {
          const { data: results } = await supabaseClient
            .from("student_results")
            .select(`marks_obtained, exams(exam_name, exam_date, total_marks)`)
            .eq("student_id", student.id)
            .order("exam_date", { ascending: false, foreignTable: "exams" })
            .limit(10);
          if (results?.length) {
            dataContext += "\n\n📝 **Your Exam Results:**\n";
            results.forEach(r => {
              const exam = r.exams;
              if (exam) {
                const pct = exam.total_marks > 0 ? ((r.marks_obtained / exam.total_marks) * 100).toFixed(1) : 0;
                dataContext += `- ${exam.exam_name} (${exam.exam_date}): ${r.marks_obtained}/${exam.total_marks} (${pct}%)\n`;
              }
            });
          } else {
            dataContext += "\n\nNo exam results found.";
          }
        }

        // Fees (including "pending fees")
        if (lowerMsg.includes("my fees") || lowerMsg.includes("fee due") || 
            lowerMsg.includes("how much do i owe") || lowerMsg.includes("pending fees")) {
          const { data: fees } = await supabaseClient
            .from("student_fees")
            .select("id, final_fee, status")
            .eq("student_id", student.id);
          if (fees && fees.length > 0) {
            let totalPending = 0;
            dataContext += "\n\n💰 **Your Fee Summary:**\n";
            for (const fee of fees) {
              const { data: payments } = await supabaseClient
                .from("fee_payments")
                .select("amount")
                .eq("student_fee_id", fee.id);
              const paid = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
              const pending = Number(fee.final_fee) - paid;
              totalPending += Math.max(pending, 0);
              dataContext += `- Total: ₹ ${fee.final_fee}, Paid: ₹ ${paid}, Balance: ₹ ${Math.max(pending, 0)} (${fee.status})\n`;
            }
            if (lowerMsg.includes("pending fees")) {
              dataContext += `\n**Your total pending fees: ₹ ${totalPending}**`;
            }
          } else {
            dataContext += "\n\n✅ No fee records found.";
          }
        }

        // Certificates
        if (lowerMsg.includes("my certificates") || lowerMsg.includes("do i have a certificate")) {
          const { data: certs } = await supabaseClient
            .from("certificates")
            .select("certificate_no, issue_date, courses(course_name)")
            .eq("student_id", student.id)
            .order("issue_date", { ascending: false });
          if (certs?.length) {
            dataContext += "\n\n📜 **Your Certificates:**\n";
            certs.forEach(c => dataContext += `- ${c.courses?.course_name || "Course"} (${c.certificate_no}) issued on ${c.issue_date}\n`);
          } else {
            dataContext += "\n\nNo certificates yet.";
          }
        }

        // General Homework
        if (lowerMsg.includes("my homework") || lowerMsg.includes("pending assignments") || lowerMsg.includes("homework for me")) {
          const { data: submissions } = await supabaseClient
            .from("homework_submissions")
            .select(`id, status, homework(title, due_date)`)
            .eq("student_id", student.id)
            .order("created_at", { ascending: false });
          if (submissions?.length) {
            dataContext += "\n\n📄 **Your Homework:**\n";
            submissions.forEach(s => {
              const title = s.homework?.title || "Untitled";
              const due = s.homework?.due_date || "No due date";
              dataContext += `- ${title} (Due: ${due}) - Status: ${s.status}\n`;
            });
          } else {
            dataContext += "\n\nNo homework submissions.";
          }
        }

        // Progress
        if (lowerMsg.includes("my progress") || lowerMsg.includes("how am i doing") || lowerMsg.includes("my performance")) {
          const { data: progress } = await supabaseClient
            .from("student_progress")
            .select("evaluation_date, attendance_percentage, performance_score, teacher_remarks")
            .eq("student_id", student.id)
            .order("evaluation_date", { ascending: false })
            .limit(1);
          if (progress?.length) {
            const p = progress[0];
            dataContext += `\n\n📈 **Latest Progress (${p.evaluation_date}):**\n`;
            dataContext += `- Attendance: ${p.attendance_percentage || "N/A"}%\n`;
            dataContext += `- Performance: ${p.performance_score || "N/A"}\n`;
            dataContext += `- Remarks: ${p.teacher_remarks || "None"}\n`;
          } else {
            dataContext += "\n\nNo progress evaluations.";
          }
        }

        // My Exams (fixed with batch_name)
        if (lowerMsg.includes("my exams") || lowerMsg.includes("upcoming exams") ||
            lowerMsg.includes("exam schedule") || lowerMsg.includes("exams in next week") ||
            (lowerMsg.includes("exam") && lowerMsg.includes("next week"))) {
          const { data: studentBatches } = await supabaseClient
            .from("student_batches")
            .select("batch_id")
            .eq("student_id", student.id)
            .eq("status", "active");
          const batchIds = studentBatches?.map(sb => sb.batch_id) || [];

          if (batchIds.length === 0) {
            dataContext += "\n\n📅 You are not enrolled in any active batch.";
          } else {
            const today = getTodayDate();
            let endDate = null;
            if (lowerMsg.includes("next week")) {
              const range = getNextWeekRange();
              endDate = range.end;
            }
            let query = supabaseClient
              .from("exams")
              .select("exam_name, exam_date, batch_id, batches(batch_name)")
              .in("batch_id", batchIds)
              .gte("exam_date", today)
              .order("exam_date", { ascending: true })
              .limit(20);

            if (endDate) {
              query = query.lte("exam_date", endDate);
            }

            const { data: exams, error } = await query;
            if (error) {
              console.error("Exam fetch error:", error);
              dataContext += "\n\n⚠️ Could not fetch exams. Please try again later.";
            } else if (exams && exams.length > 0) {
              dataContext += `\n\n📅 **${endDate ? "Exams in the next week" : "Upcoming Exams"}:**\n`;
              exams.forEach(e => {
                const batchName = e.batches?.batch_name || "N/A";
                dataContext += `- ${e.exam_name} on ${e.exam_date} (${batchName})\n`;
              });
            } else {
              dataContext += `\n\n✅ No${endDate ? " upcoming" : ""} exams found${endDate ? " in the next week" : ""}.`;
            }
          }
        }

        // My Timetable (today's classes)
        if (lowerMsg.includes("my timetable") || lowerMsg.includes("today's classes") || lowerMsg.includes("class schedule")) {
          const { data: studentBatches } = await supabaseClient
            .from("student_batches")
            .select("batch_id")
            .eq("student_id", student.id)
            .eq("status", "active");
          const batchIds = studentBatches?.map(sb => sb.batch_id) || [];

          if (batchIds.length === 0) {
            dataContext += "\n\n📅 You are not enrolled in any active batch.";
          } else {
            const today = new Date();
            const dayName = today.toLocaleString('en-US', { weekday: 'short' }); // 'Mon', 'Tue', ...
            const { data: batches } = await supabaseClient
              .from("batches")
              .select("batch_name, start_time, end_time, days")
              .in("id", batchIds)
              .ilike("days", `%${dayName}%`)
              .order("start_time");
            if (batches && batches.length > 0) {
              dataContext += `\n\n📋 **Today's Classes (${today.toLocaleDateString()}):**\n`;
              batches.forEach(b => {
                dataContext += `- ${b.batch_name}: ${b.start_time} - ${b.end_time}\n`;
              });
            } else {
              dataContext += `\n\n✅ No classes scheduled for today. Enjoy your day! 🎉`;
            }
          }
        }
      } else {
        dataContext += "\n\n⚠️ Your student profile could not be found. Please contact the administrator.";
      }
    }

    // ---------- SYSTEM PROMPT ----------
    let systemPrompt = "";
    if (isStudent) {
      systemPrompt = `You are VidhyaMitra, a friendly AI tutor. Help students with academic doubts and personal data queries. Use the data context to answer accurately. If the student asks for their attendance, fees, results, today's homework, upcoming exams, or timetable, use the provided data context. If no data is available, politely inform them. Always be encouraging and helpful.`;
    } else if (isTeacher) {
      systemPrompt = `You are VidhyaMitra, an AI teaching assistant. Help with quiz generation, lesson planning, marking attendance, and answering queries about your classes. Provide professional and supportive responses.`;
    } else if (isAdmin) {
      systemPrompt = `You are VidhyaMitra, an AI admin assistant. Provide data‑driven insights, fee summaries, financial reports, and actionable suggestions. Be precise and professional.`;
    }

    // ---------- GROQ API CALL ----------
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not set");
    }

    const finalMessages = [
      { role: "system", content: systemPrompt },
      ...(dataContext ? [{ role: "system", content: dataContext }] : []),
      ...messages,
    ];

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: finalMessages,
          temperature: 0.7,
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    const reply = groqData.choices[0]?.message?.content || "";

    // Build suggestions & actions for final response
    const { suggestions, actions } = await buildSuggestionsAndActions(supabaseClient, userRole, user.id);

    // Log usage
    await supabaseClient.from("ai_usage_logs").insert({
      user_id: user.id,
      user_email: user.email,
      prompt_tokens: groqData.usage?.prompt_tokens || 0,
      completion_tokens: groqData.usage?.completion_tokens || 0,
      total_tokens: groqData.usage?.total_tokens || 0,
      model: groqData.model,
      response: reply,
    });

    return new Response(
      JSON.stringify({
        reply,
        suggestions,
        actions,
        usage: groqData.usage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});