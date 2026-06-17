import "./App.css";
import Header from "./components/Header";
import MetricCards from "./components/MetricCards";
import TopStockCards from "./components/TopStockCards";
import MtfTable from "./components/MtfTable";
function App() {
  return (
    <div className="page">
      <Header />
      <MetricCards />
      <TopStockCards />
      <MtfTable />
    </div>
  );
}

export default App;

