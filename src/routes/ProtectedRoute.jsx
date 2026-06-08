import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PUBLIC_AUTH_ROUTES = ["/settings", "/login"];

const STUDENT_ROUTES = [
  "/student", "/student/fees", "/student/batch", "/student/attendance",
  "/student/homework", "/student/results", "/student/certificates", "/student/profile",
];

const TEACHER_ROUTES = [
  "/teacher", "/teacher/salary", "/teacher/leaves", "/teacher/profile", "/teacher/calendar", 
  "/attendance", "/attendance/mark/:sessionId", "/homework",
  "/exams", "/results", "/results/enter/:examId", "/results/view/:examId",
  "/teachers", "/settings", "/login",
];

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = profile?.role || "";
  const currentPath = location.pathname;

  // Public authenticated routes for all roles
  if (PUBLIC_AUTH_ROUTES.includes(currentPath)) {
    return children;
  }

  // Student routes
  if (role === "Student") {
    if (STUDENT_ROUTES.includes(currentPath)) return children;
    return <Navigate to="/student" replace />;
  }

  // Teacher routes
  if (role === "Teacher") {
    if (TEACHER_ROUTES.some((r) => currentPath.startsWith(r.split(":")[0]))) {
      return children;
    }
    return <Navigate to="/teacher" replace />;
  }

  // Admin / Super Admin have full access
  if (["Super Admin", "Admin"].includes(role)) {
    return children;
  }

  // Fallback
  return <Navigate to="/login" replace />;
}