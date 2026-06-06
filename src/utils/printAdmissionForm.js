import { supabase } from "../api/supabase";

export async function printAdmissionForm(studentId) {
  // Fetch organization details
  const { data: org } = await supabase
    .from("organization")
    .select("logo_dark_url, company_name")
    .eq("id", 1)
    .single();

  const logoUrl = org?.logo_dark_url || "/ShreeVidhyaDark.png";
  const academyName = org?.company_name || "ShreeVidhya Academy";

  // Fetch all student data
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();
  if (!student) throw new Error("Student not found");

  // Parents
  const { data: parentLinks } = await supabase
    .from("student_parents")
    .select("parent_id, relation, parents(*)")
    .eq("student_id", studentId);
  const parents = parentLinks?.map((l) => l.parents) || [];

  // Batches
  const { data: batches } = await supabase
    .from("student_batches")
    .select(`batch_id, batches(course_id, courses(course_name), batch_name)`)
    .eq("student_id", studentId)
    .eq("status", "active");

  // Fee summary
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

  // Build HTML with improved design
  const html = `
    <html>
    <head>
      <title>Admission Form</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          padding: 40px;
          max-width: 900px;
          margin: auto;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-bottom: 30px;
          border-bottom: 2px solid #0D47A1;
          padding-bottom: 20px;
        }
        .header img.logo {
          height: 70px;
        }
        .header .academy-name {
          font-size: 28px;
          font-weight: bold;
          color: #0D47A1;
        }
        .header .form-title {
          font-size: 18px;
          color: #555;
        }
        .student-photo {
          float: right;
          width: 100px;
          height: 100px;
          border: 2px solid #0D47A1;
          border-radius: 8px;
          object-fit: cover;
          margin-left: 20px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section h2 {
          font-size: 20px;
          color: #0D47A1;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          padding: 10px 12px;
          border: 1px solid #ddd;
          text-align: left;
          vertical-align: top;
        }
        th {
          background-color: #0D47A1;
          color: white;
          font-weight: 600;
          width: 30%;
        }
        tr:nth-child(even) td {
          background-color: #f9f9f9;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #999;
          margin-top: 30px;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoUrl}" alt="Academy Logo" class="logo" />
        <div>
          <div class="academy-name">${academyName}</div>
          <div class="form-title">Admission Form</div>
        </div>
      </div>

      ${student.photo_url ? `<img src="${student.photo_url}" alt="Student Photo" class="student-photo" />` : ''}

      <div class="section">
        <h2>Student Information</h2>
        <table>
          <tr><th>Admission No</th><td>${student.admission_no || '-'}</td></tr>
          <tr><th>Name</th><td>${student.first_name} ${student.last_name}</td></tr>
          <tr><th>Gender</th><td>${student.gender || '-'}</td></tr>
          <tr><th>Date of Birth</th><td>${student.dob || '-'}</td></tr>
          <tr><th>Mobile</th><td>${student.mobile}</td></tr>
          <tr><th>WhatsApp</th><td>${student.whatsapp || '-'}</td></tr>
          <tr><th>Email</th><td>${student.email || '-'}</td></tr>
          <tr><th>Address</th><td>${[student.address, student.city, student.state, student.pincode].filter(Boolean).join(', ')}</td></tr>
          <tr><th>School</th><td>${student.school_name || '-'}</td></tr>
          <tr><th>Board</th><td>${student.board || '-'}</td></tr>
          <tr><th>Standard</th><td>${student.standard || '-'}</td></tr>
          <tr><th>Joining Date</th><td>${student.joining_date || '-'}</td></tr>
          <tr><th>Status</th><td>${student.status}</td></tr>
        </table>
      </div>

      ${parents.length > 0 ? `
      <div class="section">
        <h2>Parent / Guardian Details</h2>
        <table>
          <tr><th>Father Name</th><th>Mother Name</th><th>Mobile</th><th>Email</th><th>Occupation</th></tr>
          ${parents.map(p => `<tr>
            <td>${p.father_name || '-'}</td>
            <td>${p.mother_name || '-'}</td>
            <td>${p.mobile || '-'}</td>
            <td>${p.email || '-'}</td>
            <td>${p.occupation || '-'}</td>
          </tr>`).join('')}
        </table>
      </div>` : ''}

      ${batches?.length ? `
      <div class="section">
        <h2>Enrolled Batches</h2>
        <table>
          <tr><th>Batch Name</th><th>Course</th></tr>
          ${batches.map(b => `<tr><td>${b.batches?.batch_name}</td><td>${b.batches?.courses?.course_name || '-'}</td></tr>`).join('')}
        </table>
      </div>` : ''}

      <div class="section">
        <h2>Fee Summary</h2>
        <table>
          <tr><th>Total Fee</th><td>Rs. ${totalFee.toLocaleString()}</td></tr>
          <tr><th>Paid</th><td>Rs. ${paidAmount.toLocaleString()}</td></tr>
          <tr><th>Pending</th><td>Rs. ${pending.toLocaleString()}</td></tr>
          <tr><th>Status</th><td>${pending <= 0 ? 'Paid' : 'Pending'}</td></tr>
        </table>
      </div>

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
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  printWindow.document.write(html);
  printWindow.document.close();
}