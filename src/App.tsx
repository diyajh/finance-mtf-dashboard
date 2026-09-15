import "./App.css";

import {
  useEffect,
  useState,
} from "react";

import Header from "./components/Header";
import MetricCards from "./components/MetricCards";
import TopStockCards from "./components/TopStockCards";

import MtfTable, {
  type ViewMode,
  type ChangeMode,
} from "./components/MtfTable";

import UploadPage from "./components/UploadPage";
import StockDetailPage from "./components/StockDetailPage.tsx";
import UploadHistoryPage from "./components/UploadHistoryPage.tsx";

import {
  getLatestDashboardData,
  type DashboardRow,
  type DashboardPagination,
  PAGE_SIZE,
} from "./services/dashboardService";

function App() {
  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    debouncedSearchTerm,
    setDebouncedSearchTerm,
  ] = useState("");

  const [
    currentPage,
    setCurrentPage,
  ] = useState("dashboard");

  const [
    selectedStock,
    setSelectedStock,
  ] = useState<DashboardRow | null>(null);

  const [
    rows,
    setRows,
  ] = useState<DashboardRow[]>([]);

  const [
    topStocks,
    setTopStocks,
  ] = useState<DashboardRow[]>([]);

  const [
    reportDate,
    setReportDate,
  ] = useState("");

  const [
    metrics,
    setMetrics,
  ] = useState({
    industryBook: 0,
    positionsAdded: 0,
    positionsLiquidated: 0,
    netBook: 0,
  });

  /*
   * Full-page loading is only for the very first dashboard load.
   */
  const [
    initialLoading,
    setInitialLoading,
  ] = useState(true);

  /*
   * Background table loading is used for:
   * - search
   * - pagination
   * - tab changes
   * - weekly/monthly changes
   *
   * The existing table rows remain visible while this is true.
   */
  const [
    tableLoading,
    setTableLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    viewMode,
    setViewMode,
  ] = useState<ViewMode>("overall");

  const [
    changeMode,
    setChangeMode,
  ] = useState<ChangeMode>("none");

  const [
    tablePage,
    setTablePage,
  ] = useState(1);

  const [
    pagination,
    setPagination,
  ] = useState<DashboardPagination>({
    page: 1,
    pageSize: PAGE_SIZE,
    totalRows: 0,
    totalPages: 1,
    from: 0,
    to: 0,
  });

  /*
   * Debounce global search.
   *
   * Wait until the user stops typing for 550ms
   * before sending the Supabase query.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(
        searchTerm.trim()
      );

      /*
       * Every new search starts from page 1.
       */
      setTablePage(1);
    }, 550);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      const firstLoad =
        rows.length === 0 &&
        topStocks.length === 0;

      try {
        if (firstLoad) {
          setInitialLoading(true);
        } else {
          setTableLoading(true);
        }

        setErrorMessage("");

        const data =
          await getLatestDashboardData(
            viewMode,
            changeMode,
            tablePage,
            debouncedSearchTerm
          );

        if (cancelled) {
          return;
        }

        /*
         * Keep old rows visible until new request finishes.
         * Only replace them here, after successful response.
         */
        setRows(data.rows);

        setTopStocks(data.topStocks);

        setMetrics(data.metrics);

        setReportDate(
          data.report?.report_date || ""
        );

        setPagination(
          data.pagination
        );

        /*
         * dashboardService clamps invalid pages.
         */
        if (
          data.pagination.page !==
          tablePage
        ) {
          setTablePage(
            data.pagination.page
          );
        }
      } catch (error) {
        console.error(
          "Dashboard load failed:",
          error
        );

        if (!cancelled) {
          setErrorMessage(
            "Could not load dashboard data. Please refresh."
          );
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
          setTableLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [
    viewMode,
    changeMode,
    tablePage,
    debouncedSearchTerm,
  ]);

  const openStockPage = (
    stock: DashboardRow
  ) => {
    setSelectedStock(stock);
    setCurrentPage("stock-detail");
  };

  const handleTablePageChange = (
    page: number
  ) => {
    if (tableLoading) {
      return;
    }

    if (
      page < 1 ||
      page > pagination.totalPages
    ) {
      return;
    }

    setTablePage(page);
  };

  if (currentPage === "upload") {
    return (
      <UploadPage
        setCurrentPage={setCurrentPage}
      />
    );
  }

  if (
    currentPage ===
    "upload-history"
  ) {
    return (
      <UploadHistoryPage
        setCurrentPage={setCurrentPage}
      />
    );
  }

  if (
    currentPage === "stock-detail" &&
    selectedStock
  ) {
    return (
      <StockDetailPage
        stock={selectedStock}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  return (
    <div className="page">
      <Header
        setCurrentPage={setCurrentPage}
      />

      {initialLoading && (
        <p>
          Loading dashboard data...
        </p>
      )}

      {errorMessage && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "14px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      {!initialLoading &&
        !errorMessage && (
          <>
            <MetricCards
              metrics={metrics}
              reportDate={reportDate}
            />

            <TopStockCards
              rows={topStocks}
              onStockClick={openStockPage}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />

            <MtfTable
              rows={rows}
              viewMode={viewMode}
              setViewMode={setViewMode}
              changeMode={changeMode}
              setChangeMode={setChangeMode}
              onStockClick={openStockPage}
              pagination={pagination}
              onPageChange={handleTablePageChange}
              loading={tableLoading}
            />
          </>
        )}
    </div>
  );
}

export default App;