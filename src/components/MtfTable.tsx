import { useState, type Dispatch, type SetStateAction } from "react";
import type { DashboardRow } from "../services/dashboardService";

export type ViewMode = "overall" | "added" | "liquidated";
export type ChangeMode = "none" | "weekly" | "monthly";

type SortMode =
  | "none"
  | "stock-asc"
  | "stock-desc"
  | "amount-asc"
  | "amount-desc";

type MtfTableProps = {
  rows: DashboardRow[];
  searchTerm: string;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  changeMode: ChangeMode;
  setChangeMode: Dispatch<SetStateAction<ChangeMode>>;
  onStockClick: (stock: DashboardRow) => void;
};

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return "-";

  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null) {
  if (value === null || value === undefined) return "-";
  return `${value}%`;
}

function MtfTable({
  rows,
  searchTerm,
  viewMode,
  setViewMode,
  changeMode,
  setChangeMode,
  onStockClick,
}: MtfTableProps) {
  const [sortMode, setSortMode] = useState<SortMode>("none");

  const filteredRows = rows.filter((row) =>
    row.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedRows = [...filteredRows];

  if (sortMode !== "none") {
    sortedRows.sort((a, b) => {
      if (sortMode === "stock-asc") {
        return a.company.localeCompare(b.company);
      }

      if (sortMode === "stock-desc") {
        return b.company.localeCompare(a.company);
      }

      if (sortMode === "amount-asc") {
        return (a.fundedAmount ?? 0) - (b.fundedAmount ?? 0);
      }

      return (b.fundedAmount ?? 0) - (a.fundedAmount ?? 0);
    });
  }

  return (
    <div className="table-section">
      <div
        className="table-controls"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "18px",
        }}
      >
        <div className="tabs">
          <button
            className={viewMode === "overall" ? "active-tab" : ""}
            onClick={() => setViewMode("overall")}
          >
            Overall
          </button>

          <button
            className={viewMode === "added" ? "active-tab" : ""}
            onClick={() => setViewMode("added")}
          >
            Positions Added
          </button>

          <button
            className={viewMode === "liquidated" ? "active-tab" : ""}
            onClick={() => setViewMode("liquidated")}
          >
            Positions Liquidated
          </button>
        </div>

        <div
          className="change-controls"
          style={{
            display: "flex",
            gap: "20px",
            alignItems: "center",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={changeMode === "weekly"}
              onChange={() =>
                setChangeMode(changeMode === "weekly" ? "none" : "weekly")
              }
            />
            Weekly Change
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={changeMode === "monthly"}
              onChange={() =>
                setChangeMode(changeMode === "monthly" ? "none" : "monthly")
              }
            />
            Monthly Change
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600, color: "#243B8A" }}>Sort</span>

            <select
              value={sortMode}
              onChange={(event) =>
                setSortMode(event.target.value as SortMode)
              }
              style={{
                height: "36px",
                padding: "0 12px",
                borderRadius: "8px",
                border: "1px solid #d5dbe6",
                background: "white",
                cursor: "pointer",
                fontSize: "14px",
                color: "#111827",
              }}
            >
              <option value="none">None</option>
              <option value="stock-asc">Stock Name Ascending</option>
              <option value="stock-desc">Stock Name Descending</option>
              <option value="amount-asc">Funded Amount Ascending</option>
              <option value="amount-desc">Funded Amount Descending</option>
            </select>
          </div>
        </div>
      </div>

      <table className="mtf-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>
              {viewMode === "added"
                ? "Added Qty"
                : viewMode === "liquidated"
                ? "Liquidated Qty"
                : "Funded Qty"}
            </th>
            <th>
              {viewMode === "added"
                ? "Added Amount (Cr)"
                : viewMode === "liquidated"
                ? "Liquidated Amount (Cr)"
                : "Funded Amount (Cr)"}
            </th>
            <th>Exposure</th>
            <th>LTP</th>
            <th>Price with MTF</th>
            <th>Margin on Wealthstreet</th>
          </tr>
        </thead>

        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={row.company}
              onClick={() => onStockClick(row)}
              style={{ cursor: "pointer", color: "#111827" }}
            >
              <td style={{ color: "#111827" }}>
                <strong style={{ color: "#111827" }}>{row.company}</strong>
              </td>

              <td style={{ color: "#111827" }}>
                {formatNumber(row.fundedQty)}
              </td>

              <td style={{ color: "#111827" }}>
                {formatNumber(row.fundedAmount)}
              </td>

              <td style={{ color: "#111827" }}>
                {formatPercent(row.exposure)}
              </td>

              <td style={{ color: "#111827" }}>{formatNumber(row.ltp)}</td>

              <td style={{ color: "#111827" }}>
                {formatNumber(row.priceWithMtf)}
              </td>

              <td style={{ color: "#111827" }}>
                {formatNumber(row.margin)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MtfTable;