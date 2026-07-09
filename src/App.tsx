import "./App.css";
import { useEffect, useState } from "react";

import Header from "./components/Header";
import MetricCards from "./components/MetricCards";
import TopStockCards from "./components/TopStockCards";
import MtfTable, {
  type ViewMode,
  type ChangeMode,
} from "./components/MtfTable";
import UploadPage from "./components/UploadPage";
import StockDetailPage from "./components/StockDetailPage";
import UploadHistoryPage from "./components/UploadHistoryPage";

import {
  getLatestDashboardData,
  type DashboardRow,
} from "./services/dashboardService";

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedStock, setSelectedStock] = useState<DashboardRow | null>(null);

  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [reportDate, setReportDate] = useState("");

  const [metrics, setMetrics] = useState({
    industryBook: 0,
    positionsAdded: 0,
    positionsLiquidated: 0,
    netBook: 0,
  });

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [viewMode, setViewMode] = useState<ViewMode>("overall");
  const [changeMode, setChangeMode] = useState<ChangeMode>("none");

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getLatestDashboardData(viewMode, changeMode);

        setRows(data.rows);
        setMetrics(data.metrics);
        setReportDate(data.report?.report_date || "");
      } catch (error) {
        console.error("Dashboard load failed:", error);
        setErrorMessage("Could not load dashboard data. Please refresh.");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [viewMode, changeMode]);

  const openStockPage = (stock: DashboardRow) => {
    setSelectedStock(stock);
    setCurrentPage("stock-detail");
  };

  if (currentPage === "upload") {
    return <UploadPage setCurrentPage={setCurrentPage} />;
  }

  if (currentPage === "upload-history") {
    return <UploadHistoryPage setCurrentPage={setCurrentPage} />;
  }

  if (currentPage === "stock-detail" && selectedStock) {
    return (
      <StockDetailPage
        stock={selectedStock}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  return (
    <div className="page">
      <Header setCurrentPage={setCurrentPage} />

      {loading && <p>Loading dashboard data...</p>}

      {errorMessage && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "14px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && (
        <>
          <MetricCards metrics={metrics} reportDate={reportDate} />

          <TopStockCards
            rows={rows.slice(0, 5)}
            onStockClick={openStockPage}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />

          <MtfTable
            rows={rows}
            searchTerm={searchTerm}
            viewMode={viewMode}
            setViewMode={setViewMode}
            changeMode={changeMode}
            setChangeMode={setChangeMode}
            onStockClick={openStockPage}
          />
        </>
      )}
    </div>
  );
}

export default App;