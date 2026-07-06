import type { DashboardRow } from "../services/dashboardService";

type TopStockCardsProps = {
  rows: DashboardRow[];
  onStockClick: (stock: DashboardRow) => void;
};

function formatCr(value: number | null) {
  if (value === null || value === undefined) return "-";

  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })} Cr`;
}

function formatQty(value: number | null) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("en-IN");
}

function TopStockCards({ rows, onStockClick }: TopStockCardsProps) {
  return (
    <div>
      <h2 style={{ marginTop: "40px", marginBottom: "20px" }}>
        Top MTF Stocks
      </h2>

      <div className="stocks-grid">
        {rows.map((stock) => (
          <button
            key={stock.company}
            className="stock-card"
            onClick={() => onStockClick(stock)}
            style={{
              textAlign: "left",
              cursor: "pointer",
              border: "none",
            }}
          >
            <h3>{stock.company}</h3>
            <p>Funded Value: {formatCr(stock.fundedAmount)}</p>
            <p>Shares: {formatQty(stock.fundedQty)}</p>
            <p style={{ marginTop: "12px", fontWeight: 700 }}>
              View details →
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default TopStockCards;