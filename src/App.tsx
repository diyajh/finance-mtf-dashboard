import "./App.css";
import { useState } from "react";

import Header from "./components/Header";
import MetricCards from "./components/MetricCards";
import TopStockCards from "./components/TopStockCards";
import MtfTable from "./components/MtfTable";
import UploadPage from "./components/UploadPage";

function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState("dashboard");

  if (currentPage === "upload") {
    return <UploadPage setCurrentPage={setCurrentPage} />;
  }

  return (
    <div className="page">
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setCurrentPage={setCurrentPage}
      />

      <MetricCards />
      <TopStockCards />
      <MtfTable searchTerm={searchTerm} />
    </div>
  );
}

export default App;