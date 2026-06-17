import "./App.css";
import { useState } from "react";

import Header from "./components/Header";
import MetricCards from "./components/MetricCards";
import TopStockCards from "./components/TopStockCards";
import MtfTable from "./components/MtfTable";

function App() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="page">
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      <MetricCards />
      <TopStockCards />
      <MtfTable searchTerm={searchTerm} />
    </div>
  );
}

export default App;