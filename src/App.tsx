import "./App.css";
import { useEffect, useState } from "react";

import Header from "./components/Header";
import MetricCards from "./components/MetricCards";
import TopStockCards from "./components/TopStockCards";
import MtfTable from "./components/MtfTable";
import UploadPage from "./components/UploadPage";
import {
  getLatestDashboardData,
  type DashboardRow,
} from "./services/dashboardService";

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [metrics, setMetrics] = useState({
    industryBook: 0,
    positionsAdded: 0,
    positionsLiquidated: 0,
    netBook: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getLatestDashboardData();
        setRows(data.rows);
        setMetrics(data.metrics);
      } catch (error) {
        console.error("Dashboard load failed:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (currentPage === "upload") {
    return <UploadPage setCurrentPage={setCurrentPage} />;
  }

  return (
    <div className="page">
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setCurrentPage={setCurrentPage}
      />

      {loading && <p>Loading latest dashboard data...</p>}

      {!loading && (
        <>
          <MetricCards metrics={metrics} />
          <TopStockCards rows={rows.slice(0, 5)} />
          <MtfTable rows={rows} searchTerm={searchTerm} />
        </>
      )}
    </div>
  );
}

export default App;