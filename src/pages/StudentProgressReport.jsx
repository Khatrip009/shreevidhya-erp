import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, TrendingUp, Download } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import AdminLayout from "../layouts/AdminLayout";
import { supabase } from "../api/supabase";
import { getStudentProgress } from "../services/examService";
import { generateProgressPdf } from "../utils/progressPdf";

export default function StudentProgressReport() {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Fetch students for autocomplete
  const { data: students = [] } = useQuery({
    queryKey: ["students-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name, admission_no, photo_url");
      return data || [];
    },
  });

  const filteredStudents = students.filter((s) =>
    `${s.first_name} ${s.last_name} ${s.admission_no}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Fetch progress for selected student
  const { data: progressData = [], isLoading } = useQuery({
    queryKey: ["student-progress", selectedStudent?.id],
    queryFn: () => getStudentProgress(selectedStudent.id),
    enabled: !!selectedStudent,
  });

  // Convert data for Recharts (last 5 exams per subject)
  const chartData = {};
  progressData.forEach((subject) => {
    const sorted = subject.exams.slice(-5); // latest 5 exams
    const series = sorted.map((e) => ({
      exam: e.exam_name,
      score: e.total_marks ? ((e.marks_obtained / e.total_marks) * 100).toFixed(1) : 0,
    }));
    chartData[subject.subject_name] = series;
  });

  async function handleExportPdf() {
    if (!selectedStudent) return;
    try {
      await generateProgressPdf(selectedStudent, progressData);
    } catch (err) {
      toast.error("Failed to generate PDF");
    }
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-righteous text-primary-dark">
          Student Progress Report
        </h1>
        <p className="text-sm text-secondary-dark font-montserrat mt-1">
          Subject‑wise exam performance & trends
        </p>
      </div>

      {/* Student Search */}
      <div className="relative mb-6 max-w-md">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
        />
        <input
          type="text"
          placeholder="Search student..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-secondary-light rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
        />
        {search && (
          <div className="absolute z-10 w-full bg-white border border-secondary-light rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
            {filteredStudents.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedStudent(s);
                  setSearch("");
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-primary-bg flex items-center gap-3"
              >
                <img
                  src={s.photo_url || ""}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <span>
                  {s.first_name} {s.last_name} ({s.admission_no})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected student info */}
      {selectedStudent && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6 flex items-center gap-4">
          <img
            src={selectedStudent.photo_url || ""}
            alt=""
            className="w-12 h-12 rounded-full object-cover border"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div>
            <h2 className="font-righteous text-primary-dark text-lg">
              {selectedStudent.first_name} {selectedStudent.last_name}
            </h2>
            <p className="text-sm text-secondary">{selectedStudent.admission_no}</p>
          </div>
          <button
            onClick={handleExportPdf}
            className="ml-auto bg-primary text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Download size={16} /> Export PDF
          </button>
        </div>
      )}

      {/* Charts */}
      {isLoading ? (
        <div className="text-center p-6 text-secondary">Loading progress…</div>
      ) : selectedStudent && progressData.length === 0 ? (
        <div className="text-center p-6 text-secondary">No exam data found for this student.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(chartData).map(([subject, data]) => (
            <div key={subject} className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-righteous text-primary-dark text-lg mb-2">{subject}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="exam" fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#0D47A1" name="Score %" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}