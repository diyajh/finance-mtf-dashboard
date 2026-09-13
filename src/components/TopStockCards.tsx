import type { DashboardRow } from "../services/dashboardService";

type TopStockCardsProps = {
  rows: DashboardRow[];
  onStockClick: (stock: DashboardRow) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
};

function formatCr(value: number | null) {
  if (value === null || value === undefined) return "-";

  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })} Cr`;
}

function formatQty(value: number |null) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("en-IN");
}

export default function TopStockCards({
  rows,
  onStockClick,
  searchTerm,
  setSearchTerm,
}: TopStockCardsProps) {
  return (
    <div style={{ marginTop: "40px" }}>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",          // <-- keeps search close to heading
          marginBottom: "20px",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "#243B8A",
            fontSize: "2rem",
          }}
        >
          Top MTF Stocks
        </h2>

        <input
          type="text"
          placeholder="Search stock..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "260px",
            height: "42px",
            padding: "0 16px",
            borderRadius: "10px",
            border: "1px solid #d5dbe6",
            fontSize: "15px",
          }}
        />
      </div>

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
            <h3 style={{ color: "#000" }}>{stock.company}</h3>

            <p style={{ color: "#000" }}>
              Funded Value: {formatCr(stock.fundedAmount)}
            </p>

            <p style={{ color: "#000" }}>
              Shares: {formatQty(stock.fundedQty)}
            </p>

            <p
              style={{
                marginTop: "12px",
                fontWeight: 700,
                color: "#000",
              }}
            >
              View details →
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}