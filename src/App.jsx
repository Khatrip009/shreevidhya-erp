import { Routes, Route } from "react-router-dom";
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

// Student pages
import StudentFeesPage from "./pages/StudentFeesPage";
import StudentBatchPage from "./pages/StudentBatchPage";
import StudentAttendancePage from "./pages/StudentAttendancePage";
import StudentHomeworkPage from "./pages/StudentHomeworkPage";
import StudentResultsPage from "./pages/StudentResultsPage";
import StudentCertificatesPage from "./pages/StudentCertificatesPage";
import PersonalTimetable from "./pages/PersonalTimetable";
import StudentExamsPage from "./pages/StudentExamsPage";

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
        <Route path="/attendance-reports" element={<ProtectedRoute><AttendanceReports /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><ProgressEvaluations /></ProtectedRoute>} />
        <Route path="/student-progress" element={<ProtectedRoute><StudentProgressReport /></ProtectedRoute>} />
        <Route path="/attendance/reports" element={<ProtectedRoute><AttendanceReports /></ProtectedRoute>} />
        <Route path="/profit-loss" element={<ProtectedRoute><ProfitLoss /></ProtectedRoute>} />
        <Route path="/learning-resources" element={<ProtectedRoute><LearningResources /></ProtectedRoute>} />
        <Route path="/mediums" element={<ProtectedRoute><Mediums /></ProtectedRoute>} />

        {/* Admin Master Timetable */}
        <Route path="/timetable" element={<ProtectedRoute><AdminTimetable /></ProtectedRoute>} />

        {/* Admin-only HR routes */}
        <Route path="/salary-payments" element={<ProtectedRoute><SalaryPayments /></ProtectedRoute>} />
        <Route path="/leave-management" element={<ProtectedRoute><LeaveManagement /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;