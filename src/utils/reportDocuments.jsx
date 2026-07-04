// src/utils/reportDocuments.jsx
import React from 'react';


/* ------------------------------------------------------------------ */
/*  Number‑to‑words helper (Indian English)                            */
/* ------------------------------------------------------------------ */
function numberToWords(num) {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function convert(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  return num === 0 ? "Zero" : convert(num);
}

const styles = {
  container: { maxWidth: '210mm', margin: '0 auto', padding: '20px', fontFamily: 'Montserrat, sans-serif', backgroundColor: '#fff' },
  header: { display: 'flex', alignItems: 'center', borderBottom: '2px solid #0D47A1', paddingBottom: '15px', marginBottom: '20px' },
  logo: { height: '60px', marginRight: '20px' },
  orgName: { fontSize: '22px', color: '#0D47A1', fontWeight: 'bold' },
  orgDetails: { fontSize: '10px', color: '#666', marginTop: '4px' },
  title: { fontSize: '20px', color: '#0D47A1', textAlign: 'center', margin: '20px 0', fontWeight: 'bold' },
  table: { width: '100%', borderCollapse: 'collapse', margin: '15px 0' },
  th: { border: '1px solid #ddd', padding: '8px', backgroundColor: '#E3F2FD', color: '#0D47A1', fontWeight: 'bold' },
  td: { border: '1px solid #ddd', padding: '8px' },
  footer: { marginTop: '30px', borderTop: '1px solid #ddd', paddingTop: '10px', fontSize: '9px', color: '#888', textAlign: 'center' },
  signatureLine: { marginTop: '30px', display: 'flex', justifyContent: 'space-between', padding: '0 20px' },
  photoFrame: { width: '25mm', height: '30mm', border: '1px solid #0D47A1', float: 'right', marginLeft: '15px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#aaa' },
};

// Shared Header
export function ReportHeader({ org }) {
  return (
    <div style={styles.header}>
      <img src={org?.logo_dark_url || '/ShreeVidhyaDark.png'} style={styles.logo} alt="Logo" />
      <div>
        <div style={styles.orgName}>{org?.company_name?.toUpperCase() || 'SHREEVIDHYA ACADEMY'}</div>
        <div style={styles.orgDetails}>
          {org?.address && <div>{org.address}</div>}
          {org?.phone && <div>Ph: {org.phone}</div>}
          {org?.email && <div>Email: {org.email}</div>}
        </div>
      </div>
    </div>
  );
}

export function ReportFooter() {
  return <div style={styles.footer}>This is a computer‑generated document. For any queries, contact the academy office.</div>;
}

// ---------- ADMISSION FORM ----------
// ---------- ADMISSION FORM (matches PDF layout) ----------
export function AdmissionFormDocument({ data, org }) {
  const student = data;
  const parents = student.parents || [];
  const batches = student.batches || [];
  const fees = student.fees || [];
  const totalFee = fees.reduce((s, f) => s + (f.final_fee || 0), 0);
  const paidFee = fees.reduce((s, f) => s + (f.paid || 0), 0);
  const pendingFee = totalFee - paidFee;

  // Base style (similar to PDF dimensions)
  const pageStyle = {
    maxWidth: '210mm',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Montserrat, sans-serif',
    backgroundColor: '#fff',
    position: 'relative',
  };

  const headerBg = { backgroundColor: '#E3F2FD', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px', marginBottom: '20px' };
  const sectionTitle = { fontSize: '16px', fontWeight: 'bold', color: '#0D47A1', borderBottom: '2px solid #0D47A1', paddingBottom: '4px', margin: '20px 0 10px' };

  return (
    <div style={pageStyle} className="print-area">
      {/* ── HEADER ── */}
      <div style={headerBg}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={org?.logo_dark_url || '/ShreeVidhyaDark.png'} style={{ height: '50px' }} alt="Logo" />
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', color: '#0D47A1', fontWeight: 'bold' }}>
              {org?.company_name?.toUpperCase() || 'SHREEVIDHYA ACADEMY'}
            </h1>
            <div style={{ fontSize: '10px', color: '#1A237E', marginTop: '4px' }}>
              {org?.address && <div>{org.address}</div>}
              {org?.phone && <div>Ph: {org.phone}</div>}
              {org?.email && <div>Email: {org.email}</div>}
            </div>
          </div>
        </div>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0D47A1' }}>Admission Form</div>
      </div>

      {/* ── STUDENT PHOTO (top right) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h2 style={sectionTitle}>Student Information</h2>
        </div>
        <div style={{ width: '100px', height: '120px', border: '2px solid #0D47A1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#aaa', marginLeft: '20px' }}>
          {student.photo_url ? <img src={student.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Student" /> : 'Photo'}
        </div>
      </div>

      {/* ── STUDENT DETAILS TABLE ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <tbody>
          <tr>
            <td style={{ width: '30%', fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Admission No</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.admission_no?.toUpperCase() || '-'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Name</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.first_name?.toUpperCase()} {student.last_name?.toUpperCase()}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Gender</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.gender || '-'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Date of Birth</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.dob || '-'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Mobile</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.mobile}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>WhatsApp</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.whatsapp || '-'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Email</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.email || '-'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Address</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>
              {[student.address, student.city, student.state, student.pincode].filter(Boolean).join(', ')}
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>School</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.school_name || '-'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Board</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.board || '-'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Standard</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.standard || '-'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Joining Date</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.joining_date || '-'}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Status</td>
            <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.status || '-'}</td>
          </tr>
          {student.mediums?.name && (
            <tr>
              <td style={{ fontWeight: 'bold', padding: '5px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Medium</td>
              <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{student.mediums.name}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ── PARENT / GUARDIAN DETAILS ── */}
      {parents.length > 0 && (
        <>
          <h2 style={sectionTitle}>Parent / Guardian Details</h2>
          {parents.map((p, i) => (
            <div key={i} style={{ marginBottom: '15px', border: '1px solid #ddd', padding: '10px', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '30%', fontWeight: 'bold', padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Father Name</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>{p.father_name?.toUpperCase() || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Mother Name</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>{p.mother_name?.toUpperCase() || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Mobile</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>{p.mobile || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>WhatsApp</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>{p.whatsapp || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Email</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>{p.email || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Occupation</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>{p.occupation?.toUpperCase() || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '4px 8px', border: '1px solid #ddd', backgroundColor: '#E3F2FD', color: '#0D47A1' }}>Address</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #ddd' }}>{p.address?.toUpperCase() || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </>
      )}

      {/* ── ENROLLED BATCHES ── */}
      {batches.length > 0 && (
        <>
          <h2 style={sectionTitle}>Enrolled Batches</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#0D47A1', color: '#fff' }}>
                <th style={{ padding: '6px', textAlign: 'left' }}>Batch Name</th>
                <th style={{ padding: '6px', textAlign: 'left' }}>Course</th>
                <th style={{ padding: '6px', textAlign: 'left' }}>Enrollment Date</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{b.batches?.batch_name?.toUpperCase() || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{b.batches?.courses?.course_name?.toUpperCase() || '-'}</td>
                  <td style={{ padding: '6px', border: '1px solid #ddd' }}>{b.enrollment_date || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ── FEE SUMMARY ── */}
      <h2 style={sectionTitle}>Fee Summary</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#0D47A1', color: '#fff' }}>
            <th style={{ padding: '6px' }}>Total Fee</th>
            <th style={{ padding: '6px' }}>Paid</th>
            <th style={{ padding: '6px' }}>Pending</th>
            <th style={{ padding: '6px' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '6px', border: '1px solid #ddd' }}>₹ {totalFee.toLocaleString()}</td>
            <td style={{ padding: '6px', border: '1px solid #ddd' }}>₹ {paidFee.toLocaleString()}</td>
            <td style={{ padding: '6px', border: '1px solid #ddd' }}>₹ {pendingFee.toLocaleString()}</td>
            <td style={{ padding: '6px', border: '1px solid #ddd', fontWeight: 'bold', color: pendingFee <= 0 ? 'green' : 'red' }}>
              {pendingFee <= 0 ? 'PAID' : 'PENDING'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── RULES & REGULATIONS ── */}
      <h2 style={sectionTitle}>Rules & Regulations</h2>
      <ol style={{ paddingLeft: '20px', fontSize: '13px', color: '#333' }}>
        <li>Minimum 75% attendance is mandatory to appear in exams.</li>
        <li>Fees must be paid on or before the 10th of every month.</li>
        <li>Mobile phones are strictly prohibited inside classrooms.</li>
        <li>Students must wear the prescribed uniform and carry ID card.</li>
        <li>Disciplinary action will be taken for any misconduct.</li>
        <li>Parents must attend parent-teacher meetings regularly.</li>
        <li>Any damage to institute property will be charged accordingly.</li>
        <li>The institute reserves the right to amend these rules at any time.</li>
      </ol>

      {/* ── SIGNATURES ── */}
      <h2 style={sectionTitle}>Signatures</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
        <div style={{ width: '40%', textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #0D47A1', marginBottom: '5px' }}></div>
          <p style={{ fontWeight: 'bold', fontSize: '13px' }}>Authorised Signatory</p>
        </div>
        <div style={{ width: '40%', textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #0D47A1', marginBottom: '5px' }}></div>
          <p style={{ fontWeight: 'bold', fontSize: '13px' }}>Parent / Guardian</p>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ marginTop: '30px', borderTop: '1px solid #ddd', paddingTop: '10px', fontSize: '9px', color: '#888', textAlign: 'center' }}>
        This is a computer-generated document issued by {org?.company_name || 'ShreeVidhya Academy'}.
      </div>
    </div>
  );
}
// ---------- FEE RECEIPT (professional invoice preview) ----------
export function FeeReceiptDocument({ data, org }) {
  const {
    receipt_no,
    payment_date,
    student_name,
    admission_no,
    base_amount = 0,
    tax_amount = 0,
    amount = 0,
    payment_mode,
    transaction_no,
    remarks,
    tax_rate_name,
    tax_rate_value,
    tax_inclusive,
    courseName,
  } = data;

  const totalDisplay = tax_rate_value > 0
    ? (tax_inclusive ? amount : base_amount + tax_amount)
    : amount;

  const amountWords = numberToWords(totalDisplay) + " Only";

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', maxWidth: '210mm', margin: '0 auto', backgroundColor: '#fff', padding: '20px' }}>
      <ReportHeader org={org} />
      <div style={{ textAlign: 'center', fontSize: '20px', fontWeight: 'bold', color: '#0D47A1', margin: '20px 0' }}>FEE RECEIPT</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <p style={{ fontWeight: 'bold', color: '#0D47A1' }}>Student Details</p>
          <p>Student: {student_name}</p>
          <p>Admission No: {admission_no}</p>
          {courseName && <p>Course: {courseName}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 'bold', color: '#0D47A1' }}>Receipt Details</p>
          <p>Receipt No: {receipt_no}</p>
          <p>Date: {payment_date}</p>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '15px 0' }}>
        <thead>
          <tr style={{ backgroundColor: '#0D47A1', color: '#fff' }}>
            <th style={{ padding: '8px', textAlign: 'center', width: '10%' }}>Sr.</th>
            <th style={{ padding: '8px', textAlign: 'left' }}>Description</th>
            <th style={{ padding: '8px', textAlign: 'right', width: '30%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
            <td style={{ padding: '8px', border: '1px solid #ddd' }}>Fee Payment</td>
            <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>₹{amount.toLocaleString('en-IN')}</td>
          </tr>
          {tax_rate_value > 0 && (
            <>
              <tr>
                <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}></td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>Base Amount ({tax_rate_name} {tax_rate_value}%)</td>
                <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>₹{base_amount.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}></td>
                <td style={{ padding: '8px', border: '1px solid #ddd' }}>Tax Amount</td>
                <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>₹{tax_amount.toLocaleString('en-IN')}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px', display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontWeight: 'bold', color: '#0D47A1', fontSize: '14px' }}>Total Amount Paid</p>
          <p style={{ fontSize: '16px', fontWeight: 'bold' }}>₹{totalDisplay.toLocaleString('en-IN')}</p>
          <p style={{ fontSize: '10px', color: '#555' }}>In Words: {amountWords}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p>Payment Mode: {payment_mode || 'N/A'}</p>
          <p>Transaction No: {transaction_no || '-'}</p>
          {remarks && <p>Remarks: {remarks}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
        <div style={{ width: '40%' }}>
          <div style={{ borderBottom: '1px solid #0D47A1', marginBottom: '5px' }}></div>
          <p style={{ textAlign: 'center', fontSize: '12px' }}>Authorised Signatory</p>
        </div>
        <div style={{ width: '40%' }}>
          <div style={{ borderBottom: '1px solid #0D47A1', marginBottom: '5px' }}></div>
          <p style={{ textAlign: 'center', fontSize: '12px' }}>Parent / Guardian</p>
        </div>
      </div>

      <ReportFooter />
    </div>
  );
}

// ---------- INCOME RECEIPT ----------
export function IncomeReceiptDocument({ data, org }) {
  return (
    <div style={styles.container} className="print-area">
      <ReportHeader org={org} />
      <div style={styles.title}>INCOME RECORD</div>
      <table style={styles.table}>
        <tbody>
          <tr><td style={styles.th}>ID</td><td style={styles.td}>INC-{data.id}</td></tr>
          <tr><td style={styles.th}>Date</td><td style={styles.td}>{data.income_date}</td></tr>
          <tr><td style={styles.th}>Category</td><td style={styles.td}>{data.category}</td></tr>
          <tr><td style={styles.th}>Base Amount</td><td style={styles.td}>₹{data.base_amount || data.amount}</td></tr>
          <tr><td style={styles.th}>Tax Amount</td><td style={styles.td}>₹{data.tax_amount || 0}</td></tr>
          <tr><td style={styles.th}>Total Amount</td><td style={styles.td}>₹{data.amount}</td></tr>
          <tr><td style={styles.th}>Payment Mode</td><td style={styles.td}>{data.payment_mode}</td></tr>
          <tr><td style={styles.th}>Description</td><td style={styles.td}>{data.description}</td></tr>
        </tbody>
      </table>
      <ReportFooter />
    </div>
  );
}

// ---------- EXPENSE VOUCHER ----------
export function ExpenseReceiptDocument({ data, org }) {
  return (
    <div style={styles.container} className="print-area">
      <ReportHeader org={org} />
      <div style={styles.title}>EXPENSE VOUCHER</div>
      <table style={styles.table}>
        <tbody>
          <tr><td style={styles.th}>Voucher No</td><td style={styles.td}>EXP-{data.id}</td></tr>
          <tr><td style={styles.th}>Date</td><td style={styles.td}>{data.expense_date}</td></tr>
          <tr><td style={styles.th}>Category</td><td style={styles.td}>{data.category}</td></tr>
          <tr><td style={styles.th}>Amount</td><td style={styles.td}>₹{data.amount}</td></tr>
          <tr><td style={styles.th}>Payment Mode</td><td style={styles.td}>{data.payment_mode}</td></tr>
          <tr><td style={styles.th}>Description</td><td style={styles.td}>{data.description}</td></tr>
        </tbody>
      </table>
      <div style={styles.signatureLine}>
        <div>Approved By</div>
        <div>Receiver Signature</div>
      </div>
      <ReportFooter />
    </div>
  );
}

// ---------- SALARY SLIP ----------
export function SalarySlipDocument({ data, org }) {
  return (
    <div style={styles.container} className="print-area">
      <ReportHeader org={org} />
      <div style={styles.title}>SALARY SLIP</div>
      <table style={styles.table}>
        <tbody>
          <tr><td style={styles.th}>Employee Code</td><td style={styles.td}>{data.employee_code}</td></tr>
          <tr><td style={styles.th}>Teacher Name</td><td style={styles.td}>{data.teacher_name}</td></tr>
          <tr><td style={styles.th}>Payment Date</td><td style={styles.td}>{data.payment_date}</td></tr>
          <tr><td style={styles.th}>Amount</td><td style={styles.td}>₹{data.amount}</td></tr>
          <tr><td style={styles.th}>Payment Mode</td><td style={styles.td}>{data.payment_mode}</td></tr>
          <tr><td style={styles.th}>Remarks</td><td style={styles.td}>{data.remarks || '-'}</td></tr>
        </tbody>
      </table>
      <div style={styles.signatureLine}>
        <div>Employee Signature</div>
        <div>Director Signature</div>
      </div>
      <ReportFooter />
    </div>
  );
}

// ---------- CERTIFICATE ----------
export function CertificateDocument({ data, org }) {
  return (
    <div style={{ ...styles.container, maxWidth:'297mm', padding:'30px' }} className="print-area">
      <div style={{ border:'2px solid #0D47A1', padding:'15px', position:'relative', minHeight:'180mm' }}>
        <div style={{ border:'1px solid #0D47A1', padding:'20px', height:'100%' }}>
          <div style={{ textAlign:'center', marginBottom:20 }}>
            {org?.logo_dark_url && <img src={org.logo_dark_url} style={{ height:'50px' }} alt="Logo" />}
            <h2 style={{ fontSize:28, color:'#0D47A1', margin:'10px 0 0' }}>{org?.company_name || 'ShreeVidhya Academy'}</h2>
            <p style={{ fontSize:18, color:'#444' }}>Certificate of Completion</p>
            <hr style={{ borderColor:'#0D47A1', width:'40%', margin:'10px auto' }} />
          </div>

          <p style={{ fontSize:16, textAlign:'center' }}>This is to certify that</p>
          <p style={{ fontSize:28, fontWeight:'bold', color:'#0D47A1', textAlign:'center', margin:'15px 0' }}>
            {data.student_name}
          </p>
          <p style={{ fontSize:16, textAlign:'center' }}>has successfully completed the course</p>
          <p style={{ fontSize:20, fontWeight:'bold', color:'#0D47A1', textAlign:'center' }}>
            {data.course_name}
          </p>
          {data.level_name && <p style={{ fontSize:14, color:'#555', textAlign:'center' }}>Level: {data.level_name}</p>}

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:'50px', padding:'0 30px' }}>
            <div>
              <p style={{ fontSize:12 }}>Issue Date: {data.issue_date}</p>
              <p style={{ fontSize:12 }}>Certificate No: {data.certificate_no}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ borderBottom:'1px solid #0D47A1', width:'150px', marginBottom:5 }}></div>
              <p style={{ fontSize:12 }}>Authorized Signatory</p>
            </div>
          </div>

          <div style={{ position:'absolute', bottom:'40px', left:'50%', transform:'translateX(-50%)' }}>
            <div style={{ width:80, height:80, border:'2px solid #0D47A1', borderRadius:'50%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:10, fontWeight:'bold', color:'#0D47A1' }}>SHREEVIDHYA</span>
              <span style={{ fontSize:10, color:'#0D47A1' }}>ACADEMY</span>
              <span style={{ fontSize:9, color:'#0D47A1' }}>SEAL</span>
            </div>
          </div>
        </div>
      </div>
      <ReportFooter />
    </div>
  );
}