import type { DashboardRow } from "../services/dashboardService";

type TopStockCardsProps = {
  rows: DashboardRow[];
};

function formatCr(value: number | null) {
  if (value === null) return "-";

  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })} Cr`;
}

function formatQty(value: number | null) {
  if (value === null) return "-";

  return value.toLocaleString("en-IN");
}

function TopStockCards({ rows }: TopStockCardsProps) {
  return (
    <div>
      <h2 style={{ marginTop: "40px", marginBottom: "20px" }}>
        Top MTF Stocks
      </h2>

      <div className="stocks-grid">
        {rows.map((stock) => (
          <div className="stock-card" key={stock.company}>
            <h3>{stock.company}</h3>
            <p>Funded Value: {formatCr(stock.fundedAmount)}</p>
            <p>Shares: {formatQty(stock.fundedQty)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopStockCards;