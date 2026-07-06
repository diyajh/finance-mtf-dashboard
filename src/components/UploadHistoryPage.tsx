import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type UploadHistoryPageProps = {
  setCurrentPage: (page: string) => void;
};

type ReportRow = {
  id: string;
  report_date: string;
  file_name: string;
  uploaded_by: string;
  created_at: string;
};

function UploadHistoryPage({ setCurrentPage }: UploadHistoryPageProps) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        setErrorMessage("");

        const { data, error } = await supabase
          .from("weekly_reports")
          .select("id, report_date, file_name, uploaded_by, created_at")
          .order("report_date", { ascending: false })
          .limit(100);

        if (error) throw error;

        setReports(data || []);
      } catch (error) {
        console.error("Upload history load failed:", error);
        setErrorMessage("Could not load upload history.");
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  return (
    <div className="page">
      <button
        onClick={() => setCurrentPage("dashboard")}
        style={{
          marginBottom: "24px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontWeight: 700,
          color: "#243B8A",
        }}
      >
        ← Back to Dashboard
      </button>

      <div className="metric-card">
        <p>Admin</p>
        <h1>Upload History</h1>
      </div>

      <div className="table-section" style={{ marginTop: "32px" }}>
        <h2>Uploaded Reports</h2>

        {loading && <p>Loading upload history...</p>}

        {errorMessage && (
          <p style={{ color: "#dc2626", fontWeight: 700 }}>{errorMessage}</p>
        )}

        {!loading && !errorMessage && (
          <table className="mtf-table">
            <thead>
              <tr>
                <th>Report Date</th>
                <th>File Name</th>
                <th>Uploaded By</th>
                <th>Created At</th>
              </tr>
            </thead>

            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.report_date}</td>
                  <td>{report.file_name}</td>
                  <td>{report.uploaded_by}</td>
                  <td>{new Date(report.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default UploadHistoryPage;