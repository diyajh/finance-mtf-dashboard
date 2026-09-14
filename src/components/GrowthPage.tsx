import { useEffect, useMemo, useState } from "react";
import type { DashboardRow } from "../services/dashboardService";

type GrowthRow = DashboardRow & {
  qtyChange?: number | null;
  amountChange?: number | null;
};

type GrowthPageProps = {
  rows: DashboardRow[];
  searchTerm: string;
  setCurrentPage: (page: string) => void;
};

type FilterState = {
  qtyChange: boolean;
  fundedAmount: boolean;
  ltp: boolean;
};

const PAGE_SIZE = 100;

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function formatSignedNumber(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  if (value > 0) {
    return `+${formatNumber(value)}`;
  }

  return formatNumber(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${formatNumber(value)}%`;
}

function getChangeColor(value: number | null | undefined) {
  if (value === null || value === undefined || value === 0) {
    return "#6b7280";
  }

  return value > 0 ? "#16a34a" : "#dc2626";
}

function GrowthPage({
  rows,
  searchTerm,
  setCurrentPage,
}: GrowthPageProps) {
  const [growthSearchTerm, setGrowthSearchTerm] =
    useState(searchTerm);

  const [filters, setFilters] = useState<FilterState>({
    qtyChange: false,
    fundedAmount: false,
    ltp: false,
  });

  const [qtyChangeThreshold, setQtyChangeThreshold] =
    useState("");

  const [fundedAmountThreshold, setFundedAmountThreshold] =
    useState("");

  const [ltpThreshold, setLtpThreshold] = useState("");

  const [currentPage, setGrowthPage] = useState(1);

  const filteredRows = useMemo(() => {
    const typedRows = rows as GrowthRow[];

    const qtyThreshold =
      qtyChangeThreshold.trim() === ""
        ? 0
        : Number(qtyChangeThreshold);

    const amountThreshold =
      fundedAmountThreshold.trim() === ""
        ? 0
        : Number(fundedAmountThreshold);

    const ltpValueThreshold =
      ltpThreshold.trim() === ""
        ? 0
        : Number(ltpThreshold);

    return typedRows
      .filter((row) =>
        row.company
          .toLowerCase()
          .includes(growthSearchTerm.toLowerCase())
      )
      .filter((row) => {
        const quantityChange = row.qtyChange ?? 0;
        const fundedAmount = row.fundedAmount ?? 0;
        const ltp = row.ltp ?? 0;

        const matchesQuantityChange =
          !filters.qtyChange ||
          Math.abs(quantityChange) >= qtyThreshold;

        const matchesFundedAmount =
          !filters.fundedAmount ||
          fundedAmount >= amountThreshold;

        const matchesLtp =
          !filters.ltp ||
          ltp >= ltpValueThreshold;

        return (
          matchesQuantityChange &&
          matchesFundedAmount &&
          matchesLtp
        );
      });
  }, [
    rows,
    growthSearchTerm,
    filters,
    qtyChangeThreshold,
    fundedAmountThreshold,
    ltpThreshold,
  ]);

  useEffect(() => {
    setGrowthPage(1);
  }, [
    growthSearchTerm,
    rows,
    filters,
    qtyChangeThreshold,
    fundedAmountThreshold,
    ltpThreshold,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE)
  );

  const visibleRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const toggleFilter = (filterName: keyof FilterState) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [filterName]: !currentFilters[filterName],
    }));
  };

  return (
    <div className="page">
      <button
        onClick={() => setCurrentPage("dashboard")}
        style={{
          marginBottom: "28px",
          padding: "12px 20px",
          borderRadius: "10px",
          border: "1px solid #d5e5f2",
          background: "white",
          color: "#243B8A",
          fontWeight: 700,
          fontSize: "15px",
          cursor: "pointer",
        }}
      >
        ← Back to Dashboard
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#243B8A",
              fontSize: "2.2rem",
            }}
          >
            Growth
          </h2>

          <p
            style={{
              marginTop: "8px",
              color: "#6b7280",
              fontSize: "16px",
            }}
          >
            Find stocks based on changes in MTF data.
          </p>
        </div>

        <input
          type="search"
          placeholder="Search stocks..."
          value={growthSearchTerm}
          onChange={(event) =>
            setGrowthSearchTerm(event.target.value)
          }
          style={{
            width: "260px",
            height: "42px",
            padding: "0 14px",
            borderRadius: "9px",
            border: "1px solid #d5dbe6",
            fontSize: "15px",
            background: "#ffffff",
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
          marginBottom: "30px",
        }}
      >
        <div className="growth-filter-box">
          <button
            className={
              filters.qtyChange
                ? "growth-filter-button active"
                : "growth-filter-button"
            }
            onClick={() => toggleFilter("qtyChange")}
          >
            Change in Funded Quantity
          </button>

          <input
            type="number"
            min="0"
            step="1"
            placeholder="Enter quantity change"
            value={qtyChangeThreshold}
            onChange={(event) =>
              setQtyChangeThreshold(event.target.value)
            }
          />

          <small>
            Shows increases or decreases by at least this amount.
          </small>
        </div>

        <div className="growth-filter-box">
          <button
            className={
              filters.fundedAmount
                ? "growth-filter-button active"
                : "growth-filter-button"
            }
            onClick={() => toggleFilter("fundedAmount")}
          >
            Funded Amount
          </button>

          <input
            type="number"
            min="0"
            step="1"
            placeholder="Enter amount in Cr"
            value={fundedAmountThreshold}
            onChange={(event) =>
              setFundedAmountThreshold(event.target.value)
            }
          />

          <small>
            Shows funded amounts equal to or above this value.
          </small>
        </div>

        <div className="growth-filter-box">
          <button
            className={
              filters.ltp
                ? "growth-filter-button active"
                : "growth-filter-button"
            }
            onClick={() => toggleFilter("ltp")}
          >
            LTP
          </button>

          <input
            type="number"
            min="0"
            step="1"
            placeholder="Enter LTP value"
            value={ltpThreshold}
            onChange={(event) =>
              setLtpThreshold(event.target.value)
            }
          />

          <small>
            Shows LTP values equal to or above this value.
          </small>
        </div>
      </div>

      <div
        style={{
          marginBottom: "14px",
          color: "#243B8A",
          fontWeight: 700,
        }}
      >
        {filteredRows.length.toLocaleString("en-IN")} stocks
        match your search
      </div>

      <div
        style={{
          overflowX: "auto",
          background: "white",
          borderRadius: "14px",
          boxShadow:
            "0 4px 18px rgba(36, 59, 138, 0.08)",
        }}
      >
        <table className="mtf-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Funded Qty</th>
              <th>Change in Funded Qty</th>
              <th>Funded Amount (Cr)</th>
              <th>Change in Amount</th>
              <th>Exposure</th>
              <th>LTP</th>
              <th>Price with MTF</th>
              <th>Margin on Wealthstreet</th>
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row) => {
              const growthRow = row as GrowthRow;

              return (
                <tr key={row.company}>
                  <td>
                    <strong>{row.company}</strong>
                  </td>

                  <td>{formatNumber(row.fundedQty)}</td>

                  <td
                    style={{
                      color: getChangeColor(
                        growthRow.qtyChange
                      ),
                      fontWeight: 700,
                    }}
                  >
                    {formatSignedNumber(growthRow.qtyChange)}
                  </td>

                  <td>{formatNumber(row.fundedAmount)}</td>

                  <td
                    style={{
                      color: getChangeColor(
                        growthRow.amountChange
                      ),
                      fontWeight: 700,
                    }}
                  >
                    {formatSignedNumber(
                      growthRow.amountChange
                    )}
                  </td>

                  <td>{formatPercent(row.exposure)}</td>

                  <td>{formatNumber(row.ltp)}</td>

                  <td>{formatNumber(row.priceWithMtf)}</td>

                  <td>{formatNumber(row.margin)}</td>
                </tr>
              );
            })}

            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    textAlign: "center",
                    padding: "36px",
                    color: "#6b7280",
                  }}
                >
                  No stocks match your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredRows.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            marginTop: "24px",
            marginBottom: "30px",
          }}
        >
          <button
            onClick={() =>
              setGrowthPage((page) => Math.max(page - 1, 1))
            }
            disabled={currentPage === 1}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #2684c2",
              background:
                currentPage === 1 ? "#e5e7eb" : "#2684c2",
              color:
                currentPage === 1 ? "#9ca3af" : "white",
              fontWeight: 700,
              cursor:
                currentPage === 1
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Previous
          </button>

          <span
            style={{
              color: "#243B8A",
              fontWeight: 700,
            }}
          >
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() =>
              setGrowthPage((page) =>
                Math.min(page + 1, totalPages)
              )
            }
            disabled={currentPage === totalPages}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #2684c2",
              background:
                currentPage === totalPages
                  ? "#e5e7eb"
                  : "#2684c2",
              color:
                currentPage === totalPages
                  ? "#9ca3af"
                  : "white",
              fontWeight: 700,
              cursor:
                currentPage === totalPages
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default GrowthPage;