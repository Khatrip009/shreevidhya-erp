import { Routes, Route, useParams } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";

import Students from "./pages/Students";
import StudentProfile from "./pages/StudentProfile";
import Inquiries from "./pages/Inquiries";
import Courses from "./pages/Courses";
import Batches from "./pages/Batches";
import Teachers from "./pages/Teachers";
import Attendance from "./pages/Attendance";
import MarkAttendance from "./pages/MarkAttendance";
import FeeStructures from "./pages/FeeStructures";
import StudentFees from "./pages/StudentFees";
import Parents from "./pages/Parents";
import Exams from "./pages/Exams";
import Results from "./pages/Results";
import EnterResults from "./pages/EnterResults";
import ViewResults from "./pages/ViewResults";
import Income from "./pages/Income";
import Expenses from "./pages/Expenses";
import Homework from "./pages/Homework";
import Subjects from "./pages/Subjects";
import Receipts from "./pages/Receipts";
import Certificates from "./pages/Certificates";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import Notifications from "./pages/Notifications";
import StudentBatches from "./pages/StudentBatches";
import StudentDocuments from "./pages/StudentDocuments";
import AttendanceReports from "./pages/AttendanceReports";
import ProgressEvaluations from "./pages/ProgressEvaluations";
import StudentProgressReport from "./pages/StudentProgressReport";
import StudentDashboard from "./pages/StudentDashboard";
import Login from "./pages/Login";
import OrganizationSettings from "./pages/OrganizationSettings";
import TeacherWeeklyTimetable from "./components/TeacherWeeklyTimetable";
import AdminTimetable from "./pages/AdminTimetable";
import ProfitLoss from "./pages/ProfitLoss";
import LearningResources from "./pages/LearningResources";
import Mediums from "./pages/Mediums";
import TaxSettings from './pages/TaxSettings';
import TaxReport from './pages/TaxReport';

// Reports engine
import Reports from './pages/Reports';
import ReportPage from './components/ReportPage';
import DocumentReportPage from './components/DocumentReportPage';
import { getReportConfig } from './utils/reportConfig';

// Student pages
import StudentFeesPage from "./pages/StudentFeesPage";
import StudentBatchPage from "./pages/StudentBatchPage";
import StudentAttendancePage from "./pages/StudentAttendancePage";
import StudentHomeworkPage from "./pages/StudentHomeworkPage";
import StudentResultsPage from "./pages/StudentResultsPage";
import StudentCertificatesPage from "./pages/StudentCertificatesPage";
import PersonalTimetable from "./pages/PersonalTimetable";
import StudentExamsPage from "./pages/StudentExamsPage";
import StudentNotifications from "./pages/StudentNotifications";

// Teacher & HR pages
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherProfile from "./pages/TeacherProfile";
import MySalary from "./pages/MySalary";
import MyLeaves from "./pages/MyLeaves";
import SalaryPayments from "./pages/SalaryPayments";
import LeaveManagement from "./pages/LeaveManagement";
import TeacherTimetable from "./pages/TeacherTimetable";
import ProtectedRoute from "./routes/ProtectedRoute";
import StudentLearningResources from "./pages/StudentLearningResources";
import TeacherLearningResources from "./pages/TeacherLearningResources";

// AI Chat
import AIChat from "./components/AIChat/AIChat";

// Online Classes
import OnlineClassList from "./pages/OnlineClassList";
import CreateOnlineClass from "./components/CreateOnlineClass";
import JoinOnlineClass from "./components/JoinOnlineClass";
import AdminLayout from "./layouts/AdminLayout";
// Accounting Routes
import ChartOfAccounts from "./pages/ChartOfAccounts";
import JournalEntry from "./pages/JournalEntry";
import Ledger from "./pages/Ledger";
import TrialBalance from "./pages/TrialBalance";
import IssueInventory from "./pages/IssueInventory";
import Vouchers from "./pages/Vouchers";
import PaymentVoucher from "./pages/PaymentVoucher";
import ReceiptVoucher from "./pages/ReceiptVoucher";
import ContraVoucher from "./pages/ContraVoucher";
import AccountingHub from "./pages/AccountingHub";
import VoucherDetail from "./pages/VoucherDetail";
import BalanceSheet from "./pages/BalanceSheet";
import CashBook from "./pages/CashBook";
import DayBook from "./pages/DayBook";
import AgedReceivables from "./pages/AgedReceivables";
import BankReconciliation from "./pages/BankReconciliation";
import Budgets from "./pages/Budgets";
import BudgetVsActual from "./pages/BudgetVsActual";
import FixedAssets from "./pages/FixedAssets";
import BillWiseEntries from "./pages/BillWiseEntries";
import GSTReport from "./pages/GSTReport";
import InventoryItems from "./pages/InventoryItems";
import InventoryTransactions from "./pages/InventoryTransactions";
import AddStock from "./pages/AddStock";
import StockDashboard from "./pages/StockDashboard";
import PurchaseOrders from "./pages/PurchaseOrders";
import POForm from "./pages/POForm";
import PODetail from "./pages/PODetail";

import AdmissionsHub from "./pages/AdmissionsHub";
import AcademicsHub from "./pages/AcademicsHub";
import HRHub from "./pages/HRHub";
import CommunicationHub from "./pages/CommunicationHub";
import SettingsHub from "./pages/SettingsHub";

import TeacherSalarySettings from './pages/TeacherSalarySettings';
import GenerateSalaries from './pages/GenerateSalaries';
import SalarySetup from "./pages/SalarySetup";
import TeacherAttendance from "./pages/TeacherAttendance";
import SalaryReport from "./pages/SalaryReport";

import GSTSettings from "./pages/GSTSettings";
import Vendors from "./pages/Vendors";
import Invoices from "./pages/Invoices";
import InvoiceForm from "./pages/InvoiceForm";
import InvoiceView from "./pages/InvoiceView";

import GSTR3BSummary from "./pages/GSTR3BSummary";
import CreditNotes from "./pages/CreditNotes";
import DebitNotes from "./pages/DebitNotes";
import PurchaseRegister from "./pages/PurchaseRegister";

import PurchaseInvoices from "./pages/PurchaseInvoices";
import PurchaseInvoiceForm from "./pages/PurchaseInvoiceForm";
import PurchaseInvoiceView from "./pages/PurchaseInvoiceView";
import TeacherAttendanceReport from "./pages/TeacherAttendanceReport";
import TeacherDailyAttendanceReport from "./pages/TeacherDailyAttendanceReport";
import TeacherLectureReport from "./pages/TeacherLectureReport";
import TeacherLectureCountReport from "./pages/TeacherLectureCountReport";

// Theme Settings
import ThemeSettings from "./pages/ThemeSettings";

function ReportPageWrapper() {
  const { reportId } = useParams();
  const config = getReportConfig(reportId);
  if (!config) return <NotFound />;
  if (config.reportType === 'document') {
    return <DocumentReportPage reportId={reportId} />;
  }
  return <ReportPage reportId={reportId} />;
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/organization-settings" element={<ProtectedRoute><OrganizationSettings /></ProtectedRoute>} />

        {/* Student routes */}
        <Route path="/student" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/fees" element={<ProtectedRoute><StudentFeesPage /></ProtectedRoute>} />
        <Route path="/student/batch" element={<ProtectedRoute><StudentBatchPage /></ProtectedRoute>} />
        <Route path="/student/attendance" element={<ProtectedRoute><StudentAttendancePage /></ProtectedRoute>} />
        <Route path="/student/homework" element={<ProtectedRoute><StudentHomeworkPage /></ProtectedRoute>} />
        <Route path="/student/results" element={<ProtectedRoute><StudentResultsPage /></ProtectedRoute>} />
        <Route path="/student/certificates" element={<ProtectedRoute><StudentCertificatesPage /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
        <Route path="/student/timetable" element={<ProtectedRoute><PersonalTimetable /></ProtectedRoute>} />
        <Route path="/student/exams" element={<ProtectedRoute><StudentExamsPage /></ProtectedRoute>} />
        <Route path="/student/resources" element={<ProtectedRoute><StudentLearningResources /></ProtectedRoute>} />
        <Route path="/student/notifications" element={<ProtectedRoute><StudentNotifications /></ProtectedRoute>} />

        {/* Teacher routes */}
        <Route path="/teacher" element={<ProtectedRoute><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher/salary" element={<ProtectedRoute><MySalary /></ProtectedRoute>} />
        <Route path="/teacher/leaves" element={<ProtectedRoute><MyLeaves /></ProtectedRoute>} />
        <Route path="/teacher/profile" element={<ProtectedRoute><TeacherProfile /></ProtectedRoute>} />
        <Route path="/teacher/calendar" element={<ProtectedRoute><TeacherWeeklyTimetable /></ProtectedRoute>}/>
        <Route path="/teacher/timetable" element={<ProtectedRoute><TeacherTimetable /></ProtectedRoute>} />
        <Route path="/teacher/resources" element={<ProtectedRoute><TeacherLearningResources /></ProtectedRoute>} />

        {/* Admin/Teacher shared routes */}
        <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
        <Route path="/students/:id" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
        <Route path="/inquiries" element={<ProtectedRoute><Inquiries /></ProtectedRoute>} />
        <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
        <Route path="/batches" element={<ProtectedRoute><Batches /></ProtectedRoute>} />
        <Route path="/teachers" element={<ProtectedRoute><Teachers /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path="/attendance/mark/:sessionId" element={<ProtectedRoute><MarkAttendance /></ProtectedRoute>} />
        <Route path="/fees/structures" element={<ProtectedRoute><FeeStructures /></ProtectedRoute>} />
        <Route path="/fees" element={<ProtectedRoute><StudentFees /></ProtectedRoute>} />
        <Route path="/parents" element={<ProtectedRoute><Parents /></ProtectedRoute>} />
        <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
        <Route path="/results/enter/:examId" element={<ProtectedRoute><EnterResults /></ProtectedRoute>} />
        <Route path="/results/view/:examId" element={<ProtectedRoute><ViewResults /></ProtectedRoute>} />
        <Route path="/income" element={<ProtectedRoute><Income /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
        <Route path="/homework" element={<ProtectedRoute><Homework /></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute><Subjects /></ProtectedRoute>} />
        <Route path="/receipts" element={<ProtectedRoute><Receipts /></ProtectedRoute>} />
        <Route path="/certificates" element={<ProtectedRoute><Certificates /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/student-batches" element={<ProtectedRoute><StudentBatches /></ProtectedRoute>} />
        <Route path="/student-documents" element={<ProtectedRoute><StudentDocuments /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><ProgressEvaluations /></ProtectedRoute>} />
        <Route path="/student-progress" element={<ProtectedRoute><StudentProgressReport /></ProtectedRoute>} />
        <Route path="/attendance/reports" element={<ProtectedRoute><AttendanceReports /></ProtectedRoute>} />
        <Route path="/profit-loss" element={<ProtectedRoute><ProfitLoss /></ProtectedRoute>} />
        <Route path="/learning-resources" element={<ProtectedRoute><LearningResources /></ProtectedRoute>} />
        <Route path="/mediums" element={<ProtectedRoute><Mediums /></ProtectedRoute>} />
        <Route path="/tax-settings" element={<ProtectedRoute><TaxSettings /></ProtectedRoute>} />
        <Route path="/tax-report" element={<ProtectedRoute><TaxReport /></ProtectedRoute>} />

        {/* Accounting Routes */}
        <Route path="/chart-of-accounts" element={<ProtectedRoute><ChartOfAccounts /></ProtectedRoute>} />
        <Route path="/journal-entry" element={<ProtectedRoute><JournalEntry /></ProtectedRoute>} />
        <Route path="/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
        <Route path="/trial-balance" element={<ProtectedRoute><TrialBalance /></ProtectedRoute>} />
        <Route path="/inventory-issue" element={<ProtectedRoute><IssueInventory /></ProtectedRoute>} />
        <Route path="/vouchers" element={<ProtectedRoute><Vouchers /></ProtectedRoute>} />
        <Route path="/payment-voucher" element={<ProtectedRoute><PaymentVoucher /></ProtectedRoute>} />
        <Route path="/receipt-voucher" element={<ProtectedRoute><ReceiptVoucher /></ProtectedRoute>} />
        <Route path="/contra-voucher" element={<ProtectedRoute><ContraVoucher /></ProtectedRoute>} />
        <Route path="/accounting" element={<ProtectedRoute><AccountingHub /></ProtectedRoute>} />
        <Route path="/vouchers/:id" element={<ProtectedRoute><VoucherDetail /></ProtectedRoute>} />
        <Route path="/balance-sheet" element={<ProtectedRoute><BalanceSheet /></ProtectedRoute>} />
        <Route path="/cash-book" element={<ProtectedRoute><CashBook /></ProtectedRoute>} />
        <Route path="/day-book" element={<ProtectedRoute><DayBook /></ProtectedRoute>} />
        <Route path="/aged-receivables" element={<ProtectedRoute><AgedReceivables /></ProtectedRoute>} />
        <Route path="/bank-reconciliation" element={<ProtectedRoute><BankReconciliation /></ProtectedRoute>} />
        <Route path="/budgets" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
        <Route path="/budget-vs-actual" element={<ProtectedRoute><BudgetVsActual /></ProtectedRoute>} />
        <Route path="/fixed-assets" element={<ProtectedRoute><FixedAssets /></ProtectedRoute>} />
        <Route path="/bill-wise" element={<ProtectedRoute><BillWiseEntries /></ProtectedRoute>} />
        <Route path="/gst-report" element={<ProtectedRoute><GSTReport /></ProtectedRoute>} />

        {/* Inventory Routes */}
        <Route path="/inventory-items" element={<ProtectedRoute><InventoryItems /></ProtectedRoute>} />
        <Route path="/inventory-transactions" element={<ProtectedRoute><InventoryTransactions /></ProtectedRoute>} />
        <Route path="/add-stock" element={<ProtectedRoute><AddStock /></ProtectedRoute>} />
        <Route path="/stock-dashboard" element={<ProtectedRoute><StockDashboard /></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
        <Route path="/purchase-orders/new" element={<ProtectedRoute><POForm /></ProtectedRoute>} />
        <Route path="/purchase-orders/:id/edit" element={<ProtectedRoute><POForm /></ProtectedRoute>} />
        <Route path="/purchase-orders/:id" element={<ProtectedRoute><PODetail /></ProtectedRoute>} />

        {/* Hub Routes */}
        <Route path="/admissions-hub" element={<ProtectedRoute><AdmissionsHub /></ProtectedRoute>} />
        <Route path="/academics-hub" element={<ProtectedRoute><AcademicsHub /></ProtectedRoute>} />
        <Route path="/hr-hub" element={<ProtectedRoute><HRHub /></ProtectedRoute>} />
        <Route path="/communication-hub" element={<ProtectedRoute><CommunicationHub /></ProtectedRoute>} />
        <Route path="/settings-hub" element={<ProtectedRoute><SettingsHub /></ProtectedRoute>} />

        {/* HR & Salary Routes */}
        <Route path="/teachers/:id/salary" element={<ProtectedRoute><TeacherSalarySettings /></ProtectedRoute>} />
        <Route path="/generate-salaries" element={<ProtectedRoute><GenerateSalaries /></ProtectedRoute>} />
        <Route path="/salary-payments" element={<ProtectedRoute><SalaryPayments /></ProtectedRoute>} />
        <Route path="/salary-setup" element={<ProtectedRoute><SalarySetup /></ProtectedRoute>} />
        <Route path="/teacher-attendance" element={<ProtectedRoute><TeacherAttendance /></ProtectedRoute>} />
        <Route path="/salary-report" element={<ProtectedRoute><SalaryReport /></ProtectedRoute>} />

        {/* GST & Invoicing Routes */}
        <Route path="/gst-settings" element={<ProtectedRoute><GSTSettings /></ProtectedRoute>} />
        <Route path="/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
        <Route path="/invoices/new" element={<ProtectedRoute><InvoiceForm /></ProtectedRoute>} />
        <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceView /></ProtectedRoute>} />
        <Route path="/invoices/:id/edit" element={<ProtectedRoute><InvoiceForm /></ProtectedRoute>} />
        <Route path="/gstr-3b-summary" element={<ProtectedRoute><GSTR3BSummary /></ProtectedRoute>} />
        <Route path="/credit-notes" element={<ProtectedRoute><CreditNotes /></ProtectedRoute>} />
        <Route path="/debit-notes" element={<ProtectedRoute><DebitNotes /></ProtectedRoute>} />
        <Route path="/purchase-register" element={<ProtectedRoute><PurchaseRegister /></ProtectedRoute>} />
        <Route path="/purchase-invoices" element={<ProtectedRoute><PurchaseInvoices /></ProtectedRoute>} />
        <Route path="/purchase-invoices/new" element={<ProtectedRoute><PurchaseInvoiceForm /></ProtectedRoute>} />
        <Route path="/purchase-invoices/:id" element={<ProtectedRoute><PurchaseInvoiceView /></ProtectedRoute>} />
        <Route path="/purchase-invoices/:id/edit" element={<ProtectedRoute><PurchaseInvoiceForm /></ProtectedRoute>} />

        <Route path="/teacher-attendance-report" element={<ProtectedRoute><TeacherAttendanceReport /></ProtectedRoute>} />
        <Route path="/teacher-daily-attendance-report" element={<ProtectedRoute><TeacherDailyAttendanceReport /></ProtectedRoute>} />
        <Route path="/teacher-lecture-report" element={<ProtectedRoute><TeacherLectureReport /></ProtectedRoute>} />
        <Route path="/teacher-lecture-count" element={<ProtectedRoute><TeacherLectureCountReport /></ProtectedRoute>} />

        {/* Theme Settings (NEW) */}
        <Route path="/theme-settings" element={<ProtectedRoute><ThemeSettings /></ProtectedRoute>} />

        {/* ── Report Engine ── */}
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route
          path="/reports/:reportId"
          element={
            <ProtectedRoute>
              <AdminLayout>
                <ReportPageWrapper />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Master Timetable */}
        <Route path="/timetable" element={<ProtectedRoute><AdminTimetable /></ProtectedRoute>} />

        {/* Admin-only HR routes */}
        <Route path="/leave-management" element={<ProtectedRoute><LeaveManagement /></ProtectedRoute>} />

        {/* Online Classes */}
        <Route path="/online-classes" element={<ProtectedRoute><OnlineClassList /></ProtectedRoute>} />
        <Route path="/online-classes/create" element={<ProtectedRoute><CreateOnlineClass /></ProtectedRoute>} />
        <Route path="/online-classes/join/:classId" element={<ProtectedRoute><JoinOnlineClass /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <AIChat />
    </ErrorBoundary>
  );
}

export default App;