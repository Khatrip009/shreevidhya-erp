import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Students from "../pages/Students";
import Teachers from "../pages/Teachers";
import Courses from "../pages/Courses";
import Batches from "../pages/Batches";
import Fees from "../pages/Fees";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/students" element={<Students />} />
      <Route path="/teachers" element={<Teachers />} />
      <Route path="/courses" element={<Courses />} />
      <Route path="/batches" element={<Batches />} />
      <Route path="/fees" element={<Fees />} />
    </Routes>
  );
}