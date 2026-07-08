import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import type { DashboardRow } from "../services/dashboardService";
import {
  getStockHistory,
  type StockHistoryRow,
} from "../services/stockHistoryService";

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
  const [history, setHistory] = useState<StockHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getStockHistory(stock.company);
        setHistory(data.history);
      } catch (error) {
        console.error("Stock history load failed:", error);
        setErrorMessage("Could not load stock history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [stock.company]);

  const latest = history[history.length - 1];

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

      <div className="metric-card" style={{ marginBottom: "28px" }}>
        <p>Stock Detail</p>
        <h1>{stock.company}</h1>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <p>Latest Funded Amount</p>
          <h2>{formatCr(latest?.fundedAmount ?? stock.fundedAmount)}</h2>
        </div>

        <div className="metric-card">
          <p>Latest Funded Qty</p>
          <h2>{formatNumber(latest?.fundedQty ?? stock.fundedQty)}</h2>
        </div>

        <div className="metric-card">
          <p>Current Exposure</p>
          <h2>{stock.exposure ?? "-"}%</h2>
        </div>

        <div className="metric-card">
          <p>LTP</p>
          <h2>-</h2>
        </div>
      </div>

      <div className="table-section" style={{ marginTop: "32px" }}>
        <h2>Funded Amount History</h2>

        {loading && <p>Loading stock history...</p>}

        {errorMessage && (
          <p style={{ color: "#dc2626", fontWeight: 700 }}>
            {errorMessage}
          </p>
        )}

        {!loading && !errorMessage && (
          <div style={{ width: "100%", height: "360px" }}>
            <ResponsiveContainer>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="reportDate"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("en-IN", {
                      month: "short",
                      year: "2-digit",
                    })
                  }
                />

                <YAxis />
                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="fundedAmount"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default StockDetailPage;