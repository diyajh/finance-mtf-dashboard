type Metrics = {
    industryBook: number;
    positionsAdded: number;
    positionsLiquidated: number;
    netBook: number;
  };
  
  type MetricCardsProps = {
    metrics: Metrics;
    reportDate?: string;
  };
  
  function formatCr(value: number) {
    return `₹${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })} Cr`;
  }
  
  function formatDate(value?: string) {
    if (!value) return "-";
  
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  
  function MetricCards({ metrics, reportDate }: MetricCardsProps) {
    const netBookIsPositive = metrics.netBook >= 0;
    const netBookSign = netBookIsPositive ? "+" : "-";
    const netBookColor = netBookIsPositive ? "#16a34a" : "#dc2626";
  
    return (
      <div className="metric-grid">
        <div className="metric-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >
            <p>Industry MTF Book</p>
  
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "#6b7280",
                whiteSpace: "nowrap",
              }}
            >
              as of {formatDate(reportDate)}
            </span>
          </div>
  
          <h2>{formatCr(metrics.industryBook)}</h2>
        </div>
  
        <div className="metric-card">
          <p>Positions Added</p>
  
          <h2
            style={{
              color: "#16a34a",
              fontWeight: 700,
            }}
          >
            {formatCr(metrics.positionsAdded)}
          </h2>
        </div>
  
        <div className="metric-card">
          <p>Positions Liquidated</p>
  
          <h2
            style={{
              color: "#dc2626",
              fontWeight: 700,
            }}
          >
            {formatCr(metrics.positionsLiquidated)}
          </h2>
        </div>
  
        <div className="metric-card">
          <p>{netBookIsPositive ? "Net Book Added" : "Net Book Liquidated"}</p>
  
          <h2
            style={{
              color: netBookColor,
              fontWeight: 700,
            }}
          >
            {netBookSign}
            {formatCr(Math.abs(metrics.netBook))}
          </h2>
        </div>
      </div>
    );
  }
  
  export default MetricCards;