import { metrics } from "../data/sampleData";

function MetricCards() {
  return (
    <div className="metric-grid">
      <div className="metric-card">
        <p>Industry MTF Book</p>
        <h2>{metrics.industryBook}</h2>
      </div>

      <div className="metric-card">
        <p>Positions Added</p>
        <h2 className="green">{metrics.positionsAdded}</h2>
      </div>

      <div className="metric-card">
        <p>Positions Liquidated</p>
        <h2 className="red">{metrics.positionsLiquidated}</h2>
      </div>

      <div className="metric-card">
        <p>Net Book Added</p>
        <h2 className="green">{metrics.netBook}</h2>
      </div>
    </div>
  );
}

export default MetricCards;