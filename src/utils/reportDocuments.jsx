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
export function AdmissionFormDocument({ data, org }) {
  const student = data;
  const parents = student.parents || [];
  const batches = student.batches || [];
  const fees = student.fees || [];
  const totalFee = fees.reduce((s, f) => s + (f.final_fee || 0), 0);
  const paidFee = fees.reduce((s, f) => s + (f.paid || 0), 0);
  const pendingFee = totalFee - paidFee;

  return (
    <div style={styles.container} className="print-area">
      <ReportHeader org={org} />
      <div style={styles.title}>ADMISSION FORM</div>

      <div style={styles.photoFrame}>
        {student.photo_url ? <img src={student.photo_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : 'Photo'}
      </div>

      <table style={styles.table}>
        <tbody>
          <tr><td style={styles.th}>Admission No</td><td style={styles.td}>{student.admission_no?.toUpperCase()}</td></tr>
          <tr><td style={styles.th}>Name</td><td style={styles.td}>{student.first_name?.toUpperCase()} {student.last_name?.toUpperCase()}</td></tr>
          <tr><td style={styles.th}>Gender</td><td style={styles.td}>{student.gender}</td></tr>
          <tr><td style={styles.th}>Date of Birth</td><td style={styles.td}>{student.dob}</td></tr>
          <tr><td style={styles.th}>Mobile</td><td style={styles.td}>{student.mobile}</td></tr>
          <tr><td style={styles.th}>WhatsApp</td><td style={styles.td}>{student.whatsapp || '-'}</td></tr>
          <tr><td style={styles.th}>Email</td><td style={styles.td}>{student.email || '-'}</td></tr>
          <tr><td style={styles.th}>Address</td><td style={styles.td}>{student.address}, {student.city} {student.pincode}</td></tr>
          <tr><td style={styles.th}>School</td><td style={styles.td}>{student.school_name} (Board: {student.board}, Class: {student.standard})</td></tr>
          <tr><td style={styles.th}>Joining Date</td><td style={styles.td}>{student.joining_date}</td></tr>
          <tr><td style={styles.th}>Medium</td><td style={styles.td}>{student.mediums?.name}</td></tr>
        </tbody>
      </table>

      {parents.map((p, i) => (
        <div key={i}>
          <h4 style={{ color:'#0D47A1', marginBottom:5 }}>Parent / Guardian {i+1}</h4>
          <table style={styles.table}>
            <tbody>
              <tr><td style={styles.th}>Father Name</td><td style={styles.td}>{p.father_name?.toUpperCase()}</td></tr>
              <tr><td style={styles.th}>Mother Name</td><td style={styles.td}>{p.mother_name?.toUpperCase()}</td></tr>
              <tr><td style={styles.th}>Mobile</td><td style={styles.td}>{p.mobile}</td></tr>
              <tr><td style={styles.th}>WhatsApp</td><td style={styles.td}>{p.whatsapp || '-'}</td></tr>
              <tr><td style={styles.th}>Email</td><td style={styles.td}>{p.email || '-'}</td></tr>
              <tr><td style={styles.th}>Occupation</td><td style={styles.td}>{p.occupation?.toUpperCase()}</td></tr>
              <tr><td style={styles.th}>Address</td><td style={styles.td}>{p.address?.toUpperCase()}</td></tr>
            </tbody>
          </table>
        </div>
      ))}

      {batches.length > 0 && (
        <>
          <h4 style={{ color:'#0D47A1' }}>Enrolled Batches</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Batch Name</th>
                <th style={styles.th}>Course</th>
                <th style={styles.th}>Enrollment Date</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b, i) => (
                <tr key={i}>
                  <td style={styles.td}>{b.batches?.batch_name}</td>
                  <td style={styles.td}>{b.batches?.courses?.course_name}</td>
                  <td style={styles.td}>{b.enrollment_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h4 style={{ color:'#0D47A1' }}>Fee Summary</h4>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Total Fee</th>
            <th style={styles.th}>Paid</th>
            <th style={styles.th}>Pending</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.td}>₹{totalFee.toLocaleString()}</td>
            <td style={styles.td}>₹{paidFee.toLocaleString()}</td>
            <td style={styles.td}>₹{pendingFee.toLocaleString()}</td>
            <td style={styles.td}>{pendingFee <= 0 ? 'PAID' : 'PENDING'}</td>
          </tr>
        </tbody>
      </table>

      <div style={styles.signatureLine}>
        <div>Authorised Signatory</div>
        <div>Parent / Guardian</div>
      </div>
      <ReportFooter />
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