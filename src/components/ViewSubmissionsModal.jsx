import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { X, FileText, Clock, User, CheckCircle2, AlertCircle, Upload } from "lucide-react";
import {
  getSubmissionsByHomework,
  updateSubmission,
  getBatchStudents,
} from "../services/homeworkService";
import { supabase } from "../api/supabase";   // ← added
import { useOrgDarkLogo } from "../hooks/useOrgDarkLogo";
import { useOrg } from "../context/OrganizationContext";
import { useTheme } from "../context/ThemeContext";

export default function ViewSubmissionsModal({ homework, onClose }) {
  const darkLogo = useOrgDarkLogo();
  const { branch, selectedFinancialYear } = useOrg();
  const theme = useTheme();
  const branchId = branch?.id;
  const financialYearId = selectedFinancialYear?.id;

  const headingFont = theme?.font_heading || "Righteous";
  const bodyFont = theme?.font_body || "Montserrat";

  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [marksInput, setMarksInput] = useState({});
  const [remarksInput, setRemarksInput] = useState({});

  useEffect(() => {
    if (!homework?.id || !branchId || !financialYearId) return;
    loadData();
  }, [homework?.id, branchId, financialYearId]);

  async function loadData() {
    setLoading(true);
    try {
      const [allStudents, allSubs] = await Promise.all([
        getBatchStudents(homework.batch_id, branchId, financialYearId),
        getSubmissionsByHomework(homework.id, branchId, financialYearId),
      ]);
      setStudents(allStudents);
      setSubmissions(allSubs);

      const marksMap = {};
      const remarksMap = {};
      allSubs.forEach((sub) => {
        marksMap[sub.student_id] = sub.marks || "";
        remarksMap[sub.student_id] = sub.remarks || "";
      });
      setMarksInput(marksMap);
      setRemarksInput(remarksMap);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveMarks(studentId) {
    const existing = submissions.find((s) => s.student_id === studentId);
    const marks = Number(marksInput[studentId]) || 0;
    const remarks = remarksInput[studentId] || "";
    const status = existing?.status === "Graded" ? "Graded" : (existing ? existing.status : "Pending");

    try {
      if (existing) {
        // Update existing submission
        const { error } = await supabase
          .from("homework_submissions")
          .update({ marks, remarks, status })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new submission with marks (student didn't submit file)
        const { error } = await supabase
          .from("homework_submissions")
          .insert({
            homework_id: homework.id,
            student_id: studentId,
            marks,
            remarks,
            status,
            submission_file: null,
            branch_id: branchId,
            financial_year_id: financialYearId,
          });
        if (error) throw error;
      }
      toast.success("Marks saved");
      loadData();   // refresh the list
    } catch (err) {
      toast.error("Save failed: " + err.message);
    }
  }

  const findSubmission = (studentId) =>
    submissions.find((s) => s.student_id === studentId);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl border border-primary-bg">
        {/* Header unchanged */}
        <div className="sticky top-0 bg-white border-b border-primary-bg px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
          <div className="flex items-center gap-3">
            <img src={darkLogo} alt="ShreeVidhya Academy" className="h-10 w-auto" />
            <div>
              <h2 className="text-xl font-bold text-primary" style={{ fontFamily: headingFont }}>
                Submissions
              </h2>
              <p className="text-sm text-primary-dark mt-1" style={{ fontFamily: bodyFont }}>
                {homework.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-primary-bg rounded-lg transition">
            <X size={20} className="text-primary-dark" />
          </button>
        </div>

        <div className="px-6 pt-4 flex flex-wrap gap-2 items-center text-sm text-primary-dark" style={{ fontFamily: bodyFont }}>
          <span className="flex items-center gap-1"><User size={14} /> {homework.batches?.batch_name}</span>
          {homework.batches?.mediums?.name && (
            <span className="bg-primary-bg text-primary px-2 py-0.5 rounded-full text-xs">{homework.batches.mediums.name}</span>
          )}
          <span className="text-primary-dark/40">|</span>
          <span className="flex items-center gap-1"><FileText size={14} /> {homework.subjects?.subject_name}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-primary-dark/60" style={{ fontFamily: bodyFont }}>Loading submissions...</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-primary-dark/60" style={{ fontFamily: bodyFont }}>No students enrolled in this batch.</div>
        ) : (
          <div className="overflow-x-auto p-4">
            <table className="w-full min-w-[800px]">
              <thead className="bg-primary-bg">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-primary-dark uppercase"><User size={14} /> Student</th>
                  <th className="text-left p-3 text-sm font-medium text-primary-dark uppercase"><Upload size={14} /> File</th>
                  <th className="text-left p-3 text-sm font-medium text-primary-dark uppercase"><Clock size={14} /> Submitted</th>
                  <th className="text-left p-3 text-sm font-medium text-primary-dark uppercase">Marks</th>
                  <th className="text-left p-3 text-sm font-medium text-primary-dark uppercase">Remarks</th>
                  <th className="text-left p-3 text-sm font-medium text-primary-dark uppercase">Status</th>
                  <th className="text-left p-3 text-sm font-medium text-primary-dark uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const sub = findSubmission(student.id);
                  return (
                    <tr key={student.id} className="border-b border-primary-bg hover:bg-primary-bg transition">
                      <td className="p-3">
                        <p className="font-medium text-primary-dark" style={{ fontFamily: bodyFont }}>{student.first_name} {student.last_name}</p>
                        <p className="text-xs text-primary-dark/60">{student.admission_no}</p>
                      </td>
                      <td>
                        {sub?.submission_file ? (
                          <a href={sub.submission_file} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            <FileText size={14} /> View
                          </a>
                        ) : (
                          <span className="text-primary-dark/60 flex items-center gap-1"><AlertCircle size={14} /> No file</span>
                        )}
                      </td>
                      <td className="text-sm text-primary-dark">
                        {sub?.submitted_at
                          ? new Date(sub.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </td>
                      <td>
                        <input
                          type="number"
                          value={marksInput[student.id] || ""}
                          onChange={(e) => setMarksInput((prev) => ({ ...prev, [student.id]: e.target.value }))}
                          className="border border-primary-bg rounded p-2 w-20 text-center focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm bg-white text-primary-dark"
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={remarksInput[student.id] || ""}
                          onChange={(e) => setRemarksInput((prev) => ({ ...prev, [student.id]: e.target.value }))}
                          className="border border-primary-bg rounded p-2 w-32 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm bg-white text-primary-dark"
                          placeholder="Remark"
                        />
                      </td>
                      <td>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          sub?.status === "Graded"
                            ? "bg-primary-bg text-primary-dark"
                            : sub?.status === "Submitted"
                            ? "bg-accent-bg text-accent-dark"
                            : "bg-primary-bg/50 text-primary-dark/60"
                        }`}>
                          {sub?.status || "Not Submitted"}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleSaveMarks(student.id)}
                          className="bg-primary hover:bg-primary-light text-white px-3 py-1.5 rounded text-sm font-medium transition flex items-center gap-1"
                          style={{ fontFamily: bodyFont }}
                        >
                          <CheckCircle2 size={14} /> Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}