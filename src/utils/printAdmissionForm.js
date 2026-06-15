import { supabase } from "../api/supabase";

export async function printAdmissionForm(studentId) {
  // 1. Fetch organization details
  const { data: org } = await supabase
    .from("organization")
    .select("logo_dark_url, company_name, address, phone, email")
    .eq("id", 1)
    .single();

  const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
  const academyName = org?.company_name || "ShreeVidhya Academy";
  const address = org?.address || "";
  const phone = org?.phone || "";
  const email = org?.email || "";

  // 2. Fetch student with medium
  const { data: student } = await supabase
    .from("students")
    .select("*, mediums(name)")
    .eq("id", studentId)
    .single();
  if (!student) throw new Error("Student not found");

  const mediumName = student.mediums?.name || "";

  // 3. Parents
  const { data: parentLinks } = await supabase
    .from("student_parents")
    .select("parent_id, relation, parents(*)")
    .eq("student_id", studentId);
  const parents = parentLinks?.map((l) => l.parents) || [];

  // 4. Batches
  const { data: batches } = await supabase
    .from("student_batches")
    .select(`batch_id, batches(course_id, courses(course_name), batch_name)`)
    .eq("student_id", studentId)
    .eq("status", "active");

  // 5. Fee summary
  const { data: fees } = await supabase
    .from("student_fees")
    .select("final_fee, status, fee_structures(fee_amount)")
    .eq("student_id", studentId);
  let totalFee = 0;
  let paidAmount = 0;
  if (fees) {
    for (const f of fees) {
      totalFee += Number(f.final_fee);
      const { data: payments } = await supabase
        .from("fee_payments")
        .select("amount")
        .eq("student_fee_id", f.id);
      paidAmount += payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
    }
  }
  const pending = totalFee - paidAmount;

  // ─── Build HTML ──────────────────────────────────────────────────────────
  const html = `
    <html>
    <head>
      <title>Admission Form</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          padding: 20px;
          max-width: 1000px;
          margin: auto;
          font-size: 13px;
        }
        /* ---------- Header (light background) ---------- */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #E3F2FD;   /* light blue */
          padding: 15px 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .header img.logo {
          height: 60px;
        }
        .academy-details h1 {
          margin: 0;
          font-size: 22px;
          color: #0D47A1;
          font-weight: 700;
        }
        .academy-details p {
          margin: 2px 0;
          font-size: 11px;
          color: #1A237E;
        }
        .header-right {
          font-size: 16px;
          font-weight: 600;
          color: #0D47A1;
          text-align: right;
        }
        /* ---------- Main Grid (student info + photo) ---------- */
        .main-grid {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .info-section {
          flex: 1 1 60%;
          min-width: 300px;
        }
        .photo-section {
          flex: 0 0 120px;
          text-align: center;
        }
        .student-photo {
          width: 110px;
          height: 110px;
          border: 2px solid #0D47A1;
          border-radius: 6px;
          object-fit: cover;
          margin-bottom: 8px;
        }
        /* ---------- Section headings ---------- */
        .section-title {
          font-size: 15px;
          font-weight: 600;
          color: #0D47A1;
          border-bottom: 1px solid #ccc;
          padding-bottom: 3px;
          margin: 15px 0 8px 0;
        }
        /* ---------- Info rows (key-value) ---------- */
        .info-row {
          display: flex;
          margin-bottom: 5px;
          break-inside: avoid;
        }
        .info-label {
          width: 130px;
          font-weight: 600;
          color: #555;
        }
        .info-value {
          flex: 1;
          word-wrap: break-word;
        }
        /* ---------- Tables ---------- */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
          font-size: 12px;
        }
        th, td {
          padding: 6px 8px;
          border: 1px solid #ddd;
          text-align: left;
          vertical-align: top;
        }
        th {
          background-color: #0D47A1;
          color: white;
          font-weight: 600;
        }
        tr:nth-child(even) td {
          background-color: #F5F8FF;
        }
        /* ---------- Footer ---------- */
        .footer {
          text-align: center;
          font-size: 10px;
          color: #999;
          margin-top: 25px;
        }
        @media print {
          .no-print { display: none; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <img src="${logoUrl}" alt="Logo" class="logo" />
          <div class="academy-details">
            <h1>${academyName}</h1>
            ${address ? `<p>${address}</p>` : ""}
            ${phone ? `<p>📞 ${phone}</p>` : ""}
            ${email ? `<p>✉️ ${email}</p>` : ""}
          </div>
        </div>
        <div class="header-right">Admission Form</div>
      </div>

      <!-- Main Content -->
      <div class="main-grid">
        <div class="info-section">
          <div class="section-title">Student Information</div>
          <div class="info-row"><div class="info-label">Admission No</div><div class="info-value">${student.admission_no || '-'}</div></div>
          <div class="info-row"><div class="info-label">Name</div><div class="info-value">${student.first_name} ${student.last_name}</div></div>
          <div class="info-row"><div class="info-label">Gender</div><div class="info-value">${student.gender || '-'}</div></div>
          <div class="info-row"><div class="info-label">Date of Birth</div><div class="info-value">${student.dob || '-'}</div></div>
          <div class="info-row"><div class="info-label">Mobile</div><div class="info-value">${student.mobile}</div></div>
          <div class="info-row"><div class="info-label">WhatsApp</div><div class="info-value">${student.whatsapp || '-'}</div></div>
          <div class="info-row"><div class="info-label">Email</div><div class="info-value">${student.email || '-'}</div></div>
          <div class="info-row"><div class="info-label">Address</div><div class="info-value">${[student.address, student.city, student.state, student.pincode].filter(Boolean).join(', ')}</div></div>
          <div class="info-row"><div class="info-label">School</div><div class="info-value">${student.school_name || '-'}</div></div>
          <div class="info-row"><div class="info-label">Board</div><div class="info-value">${student.board || '-'}</div></div>
          <div class="info-row"><div class="info-label">Standard</div><div class="info-value">${student.standard || '-'}</div></div>
          <div class="info-row"><div class="info-label">Joining Date</div><div class="info-value">${student.joining_date || '-'}</div></div>
          ${mediumName ? `<div class="info-row"><div class="info-label">Medium</div><div class="info-value">${mediumName}</div></div>` : ''}
          <div class="info-row"><div class="info-label">Status</div><div class="info-value">${student.status}</div></div>
        </div>

        <div class="photo-section">
          ${student.photo_url ? `<img src="${student.photo_url}" alt="Student Photo" class="student-photo" />` : ''}
        </div>
      </div>

      <!-- Parents -->
      ${parents.length > 0 ? `
      <div class="section-title">Parent / Guardian Details</div>
      ${parents.map(p => `
        <div style="display:flex; flex-wrap:wrap; gap:20px; margin-bottom:10px; border:1px solid #ddd; padding:10px; border-radius:6px;">
          <div style="flex:1 1 45%;">
            <div class="info-row"><div class="info-label">Father Name</div><div class="info-value">${p.father_name || '-'}</div></div>
            <div class="info-row"><div class="info-label">Mother Name</div><div class="info-value">${p.mother_name || '-'}</div></div>
            <div class="info-row"><div class="info-label">Mobile</div><div class="info-value">${p.mobile || '-'}</div></div>
          </div>
          <div style="flex:1 1 45%;">
            <div class="info-row"><div class="info-label">WhatsApp</div><div class="info-value">${p.whatsapp || '-'}</div></div>
            <div class="info-row"><div class="info-label">Email</div><div class="info-value">${p.email || '-'}</div></div>
            <div class="info-row"><div class="info-label">Occupation</div><div class="info-value">${p.occupation || '-'}</div></div>
            <div class="info-row"><div class="info-label">Address</div><div class="info-value">${p.address || '-'}</div></div>
          </div>
        </div>
      `).join('')}
      ` : ''}

      <!-- Batches -->
      ${batches?.length ? `
      <div class="section-title">Enrolled Batches</div>
      <table>
        <tr><th>Batch Name</th><th>Course</th></tr>
        ${batches.map(b => `<tr><td>${b.batches?.batch_name}</td><td>${b.batches?.courses?.course_name || '-'}</td></tr>`).join('')}
      </table>
      ` : ''}

      <!-- Fee Summary -->
      <div class="section-title">Fee Summary</div>
      <table>
        <tr><th>Total Fee</th><td>Rs. ${totalFee.toLocaleString()}</td></tr>
        <tr><th>Paid</th><td>Rs. ${paidAmount.toLocaleString()}</td></tr>
        <tr><th>Pending</th><td>Rs. ${pending.toLocaleString()}</td></tr>
        <tr><th>Status</th><td>${pending <= 0 ? 'Paid' : 'Pending'}</td></tr>
      </table>

      <div class="footer">
        Computer-generated admission form – ${academyName}
      </div>

      <div class="no-print" style="text-align:center; margin-top:20px;">
        <button onclick="window.print()" style="padding:10px 20px; background:#0D47A1; color:#fff; border:none; border-radius:4px; cursor:pointer;">Print Form</button>
      </div>
      <script>window.print();</script>
    </body>
    </html>
  `;

  // Open print window
  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  printWindow.document.write(html);
  printWindow.document.close();
}