type Metrics = {
    industryBook: number;
    positionsAdded: number;
    positionsLiquidated: number;
    netBook: number;
  };
  
  type MetricCardsProps = {
    metrics: Metrics;
  };
  
  function formatCr(value: number) {
    return `₹${value.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })} Cr`;
  }
  
  function MetricCards({ metrics }: MetricCardsProps) {
    return (
      <div className="metric-grid">
        <div className="metric-card">
          <p>Industry MTF Book</p>
          <h2>{formatCr(metrics.industryBook)}</h2>
        </div>
  
        <div className="metric-card">
          <p>Positions Added</p>
          <h2 className="green">{formatCr(metrics.positionsAdded)}</h2>
        </div>
  
        <div className="metric-card">
          <p>Positions Liquidated</p>
          <h2 className="red">{formatCr(metrics.positionsLiquidated)}</h2>
        </div>
  
        <div className="metric-card">
          <p>Net Book Added</p>
          <h2 className={metrics.netBook >= 0 ? "green" : "red"}>
            {formatCr(metrics.netBook)}
          </h2>
        </div>
      </div>
    );
  }
  
  export default MetricCards;