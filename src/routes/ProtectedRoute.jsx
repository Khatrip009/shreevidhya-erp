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

function normaliseRole(rawRole) {
  // Convert "Super Admin" → "super_admin"
  return (rawRole || "").toLowerCase().replace(/\s+/g, "_");
}

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Wait for profile before making any decision
  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>;
  }

  const role = normaliseRole(profile.role);
  const currentPath = location.pathname;

  // Public authenticated routes (all roles)
  if (PUBLIC_AUTH_ROUTES.includes(currentPath)) {
    return children;
  }

  // Student
  if (role === "student") {
    if (STUDENT_ROUTES.includes(currentPath)) return children;
    return <Navigate to="/student" replace />;
  }

  // Teacher
  if (role === "teacher") {
    if (TEACHER_ROUTES.some((r) => currentPath.startsWith(r.split(":")[0]))) {
      return children;
    }
    return <Navigate to="/teacher" replace />;
  }

  // Admin / Super Admin – full access
  if (role === "super_admin" || role === "admin") {
    return children;
  }

  // Unknown role – do NOT redirect, show a clear error
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-red-600">Access Error</h1>
        <p className="text-red-500 mt-2">
          Your account role (<code>{profile.role}</code>) is not recognised.
          <br />
          Please contact the administrator.
        </p>
      </div>
    </div>
  );
}