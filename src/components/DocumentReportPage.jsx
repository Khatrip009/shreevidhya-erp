import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Printer, Download, List } from 'lucide-react';
import { getReportConfig } from '../utils/reportConfig';
import { getOrganization } from '../services/organizationService';
import { supabase } from '../api/supabase';
import AdminLayout from '../layouts/AdminLayout';

export default function DocumentReportPage({ reportId }) {
  const config = getReportConfig(reportId);
  const { data: org } = useQuery({ queryKey: ['organization'], queryFn: getOrganization });

  const [records, setRecords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const query = config.recordQuery({});
      const { data, error } = await query;
      if (!error && data) {
        const transformed = data.map(row => config.recordTransform(row));
        setRecords(transformed);
      }
      setLoading(false);
    })();
  }, [reportId, config]);

  const currentRecord = records[currentIndex] || null;

  const goTo = (index) => {
    if (index >= 0 && index < records.length) setCurrentIndex(index);
  };

  const handlePrev = () => goTo(currentIndex - 1);
  const handleNext = () => goTo(currentIndex + 1);

  const handlePrint = () => window.print();
  const handlePDF = () => {
    const element = document.querySelector('.document-preview');
    if (element) {
      // you can use your exportToPDFFromHTML if implemented, else skip
      // Or just print to PDF using browser
    }
    window.print();
  };

  if (loading) return <div className="p-6 text-center">Loading records…</div>;
  if (records.length === 0) return <div className="p-6 text-center">No records found.</div>;

  const DocumentComponent = config.documentComponent;

  return (
    <AdminLayout>
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 print:hidden gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-righteous text-primary">{config.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {/* Record selector dropdown */}
          <div className="relative">
            <select
              value={currentIndex}
              onChange={(e) => goTo(Number(e.target.value))}
              className="appearance-none bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {records.map((rec, idx) => (
                <option key={idx} value={idx}>
                  {config.title === 'Admission Form' ? `${rec.admission_no} - ${rec.first_name} ${rec.last_name}` :
                   config.title === 'Fee Receipt' ? `RCP-${rec.id} - ${rec.student_name}` :
                   config.title === 'Salary Slip' ? `${rec.employee_code} - ${rec.teacher_name}` :
                   config.title === 'Certificate' ? `${rec.certificate_no} - ${rec.student_name}` :
                   `Record ${idx+1}`}
                </option>
              ))}
            </select>
            <List className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>

          {/* Navigation arrows */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-sm font-medium w-16 text-center">
              {currentIndex + 1} / {records.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex === records.length - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRight size={18} />
            </button>
          </div>

          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark">
            <Printer size={16} /> Print
          </button>
          <button onClick={handlePDF} className="flex items-center gap-2 px-4 py-2 bg-primary-light text-white rounded-lg hover:bg-primary-dark">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Document Preview */}
      <div className="document-preview bg-white shadow-xl rounded-2xl p-6 md:p-10 border">
        {currentRecord && <DocumentComponent data={currentRecord} org={org} />}
      </div>
    </div>
    </AdminLayout>
  );
}