import { topStocks } from "../data/sampleData";

function TopStockCards() {
  return (
    <div>
      <h2 style={{ marginTop: "40px", marginBottom: "20px" }}>
        Top MTF Stocks
      </h2>

      <div className="stocks-grid">
        {topStocks.map((stock) => (
          <div className="stock-card" key={stock.name}>
            <h3>{stock.name}</h3>
            <p>Price: {stock.price}</p>
            <p>Funded Value: {stock.fundedValue}</p>
            <p>Shares: {stock.shares}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TopStockCards;