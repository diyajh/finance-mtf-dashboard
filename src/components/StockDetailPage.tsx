import type { DashboardRow } from "../services/dashboardService";

type StockDetailPageProps = {
  stock: DashboardRow;
  setCurrentPage: (page: string) => void;
};

function formatCr(value: number | null) {
  if (value === null || value === undefined) return "-";

  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })} Cr`;
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return "-";

  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function StockDetailPage({ stock, setCurrentPage }: StockDetailPageProps) {
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
        }}
      >
        ← Back to Dashboard
      </button>

      <div className="metric-card" style={{ marginBottom: "28px" }}>
        <p>Stock Detail</p>
        <h1>{stock.company}</h1>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <p>Funded Amount</p>
          <h2>{formatCr(stock.fundedAmount)}</h2>
        </div>

        <div className="metric-card">
          <p>Funded Qty</p>
          <h2>{formatNumber(stock.fundedQty)}</h2>
        </div>

        <div className="metric-card">
          <p>Exposure</p>
          <h2>{stock.exposure ?? "-"}%</h2>
        </div>

        <div className="metric-card">
          <p>LTP</p>
          <h2>{formatNumber(stock.ltp)}</h2>
        </div>
      </div>

      <div className="table-section" style={{ marginTop: "32px" }}>
        <h2>Historical Analytics</h2>
        <p style={{ opacity: 0.7 }}>
          Charts, weekly movement, monthly movement, and full stock history will
          be added here next.
        </p>
      </div>
    </div>
  );
}

export default StockDetailPage;