import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import type { DashboardRow } from "../services/dashboardService";
import {
  getStockHistory,
  type StockHistoryRow,
} from "../services/stockHistoryService";

type StockDetailPageProps = {
  stock: DashboardRow;
  setCurrentPage: (page: string) => void;
};

type MonthYearValue = {
  month: number;
  year: number;
};

const MONTHS = [
  { value: 1, label: "Jan" },
  { value: 2, label: "Feb" },
  { value: 3, label: "Mar" },
  { value: 4, label: "Apr" },
  { value: 5, label: "May" },
  { value: 6, label: "Jun" },
  { value: 7, label: "Jul" },
  { value: 8, label: "Aug" },
  { value: 9, label: "Sep" },
  { value: 10, label: "Oct" },
  { value: 11, label: "Nov" },
  { value: 12, label: "Dec" },
];

function formatCr(value: number | null) {
  if (value === null || value === undefined) return "-";

  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })} Cr`;
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return "-";

  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function parseReportDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function getMonthYear(value: string): MonthYearValue {
  const date = parseReportDate(value);

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

function StockDetailPage({
  stock,
  setCurrentPage,
}: StockDetailPageProps) {
  const [history, setHistory] = useState<StockHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [fromMonth, setFromMonth] = useState(1);
  const [fromYear, setFromYear] = useState(2018);

  const [toMonth, setToMonth] = useState(12);
  const [toYear, setToYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setErrorMessage("");

        const data = await getStockHistory(stock.company);
        setHistory(data.history);

        if (data.history.length > 0) {
          const first = getMonthYear(data.history[0].reportDate);
          const last = getMonthYear(
            data.history[data.history.length - 1].reportDate
          );

          setFromMonth(first.month);
          setFromYear(first.year);

          setToMonth(last.month);
          setToYear(last.year);
        }
      } catch (error) {
        console.error("Stock history load failed:", error);
        setErrorMessage("Could not load stock history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [stock.company]);

  const latest = history[history.length - 1];

  const earliestRange =
    history.length > 0 ? getMonthYear(history[0].reportDate) : null;

  const latestRange =
    history.length > 0
      ? getMonthYear(history[history.length - 1].reportDate)
      : null;

  const availableYears = useMemo(() => {
    if (!earliestRange || !latestRange) return [];

    const years: number[] = [];

    for (let year = earliestRange.year; year <= latestRange.year; year += 1) {
      years.push(year);
    }

    return years;
  }, [earliestRange?.year, latestRange?.year]);

  const filteredHistory = useMemo(() => {
    const startDate = new Date(fromYear, fromMonth - 1, 1);

    const endDate = new Date(
      toYear,
      toMonth,
      0,
      23,
      59,
      59,
      999
    );

    return history.filter((row) => {
      const rowDate = parseReportDate(row.reportDate);

      return rowDate >= startDate && rowDate <= endDate;
    });
  }, [history, fromMonth, fromYear, toMonth, toYear]);

  const selectedStart = new Date(fromYear, fromMonth - 1, 1);
  const selectedEnd = new Date(toYear, toMonth - 1, 1);
  const invalidRange = selectedStart > selectedEnd;

  function showAllHistory() {
    if (!earliestRange || !latestRange) return;

    setFromMonth(earliestRange.month);
    setFromYear(earliestRange.year);

    setToMonth(latestRange.month);
    setToYear(latestRange.year);
  }

  return (
    <div className="page">
      <button
        onClick={() => setCurrentPage("dashboard")}
        style={{
          marginBottom: "24px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontWeight: 700,
          color: "#243B8A",
        }}
      >
        ← Back to Dashboard
      </button>

      <div className="metric-card" style={{ marginBottom: "28px" }}>
        <p>Stock Detail</p>
        <h1>{stock.company}</h1>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <p>Latest Funded Amount</p>
          <h2>{formatCr(latest?.fundedAmount ?? stock.fundedAmount)}</h2>
        </div>

        <div className="metric-card">
          <p>Latest Funded Qty</p>
          <h2>{formatNumber(latest?.fundedQty ?? stock.fundedQty)}</h2>
        </div>

        <div className="metric-card">
          <p>Current Exposure</p>
          <h2>
            {stock.exposure === null || stock.exposure === undefined
              ? "-"
              : `${stock.exposure}%`}
          </h2>
        </div>

        <div className="metric-card">
          <p>LTP</p>
          <h2>-</h2>
        </div>
      </div>

      <div className="table-section" style={{ marginTop: "32px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
            gap: "18px",
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0 }}>Funded Amount History</h2>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                color: "#243B8A",
                fontWeight: 700,
              }}
            >
              From
            </span>

            <select
              value={fromMonth}
              onChange={(event) => setFromMonth(Number(event.target.value))}
              style={selectStyle}
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={fromYear}
              onChange={(event) => setFromYear(Number(event.target.value))}
              style={selectStyle}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <span
              style={{
                color: "#243B8A",
                fontWeight: 700,
                marginLeft: "4px",
              }}
            >
              To
            </span>

            <select
              value={toMonth}
              onChange={(event) => setToMonth(Number(event.target.value))}
              style={selectStyle}
            >
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={toYear}
              onChange={(event) => setToYear(Number(event.target.value))}
              style={selectStyle}
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={showAllHistory}
              style={{
                height: "38px",
                padding: "0 15px",
                borderRadius: "8px",
                border: "1px solid #243B8A",
                background: "white",
                color: "#243B8A",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Show All
            </button>
          </div>
        </div>

        {loading && <p>Loading stock history...</p>}

        {errorMessage && (
          <p style={{ color: "#dc2626", fontWeight: 700 }}>
            {errorMessage}
          </p>
        )}

        {!loading && !errorMessage && invalidRange && (
          <p style={{ color: "#dc2626", fontWeight: 700 }}>
            The From month must be earlier than the To month.
          </p>
        )}

        {!loading &&
          !errorMessage &&
          !invalidRange &&
          filteredHistory.length === 0 && (
            <p>No data exists for the selected range.</p>
          )}

        {!loading &&
          !errorMessage &&
          !invalidRange &&
          filteredHistory.length > 0 && (
            <div style={{ width: "100%", height: "360px" }}>
              <ResponsiveContainer>
                <LineChart data={filteredHistory}>
                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="reportDate"
                    tickFormatter={(value) =>
                      parseReportDate(value).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "2-digit",
                      })
                    }
                  />

                  <YAxis />

                  <Tooltip
                    labelFormatter={(value) =>
                      parseReportDate(String(value)).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )
                    }
                    formatter={(value) => [
                      `${formatNumber(Number(value))} Cr`,
                      "Funded Amount",
                    ]}
                  />

                  <Line
                    type="monotone"
                    dataKey="fundedAmount"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
      </div>
    </div>
  );
}

const selectStyle = {
  height: "38px",
  padding: "0 12px",
  borderRadius: "8px",
  border: "1px solid #d5dbe6",
  background: "white",
  color: "#111827",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

export default StockDetailPage;