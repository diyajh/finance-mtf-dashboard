import type { Dispatch, SetStateAction } from "react";
import type { DashboardRow } from "../services/dashboardService";

export type ViewMode = "overall" | "added" | "liquidated";
export type ChangeMode = "none" | "weekly" | "monthly";

type MtfTableProps = {
  rows: DashboardRow[];
  searchTerm: string;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  changeMode: ChangeMode;
  setChangeMode: Dispatch<SetStateAction<ChangeMode>>;
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
}: MtfTableProps) {
  const filteredRows = rows.filter((row) =>
    row.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          {filteredRows.map((row) => (
            <tr key={row.company}>
              <td>{row.company}</td>
              <td>{formatNumber(row.fundedQty)}</td>
              <td>{formatNumber(row.fundedAmount)}</td>
              <td>{formatPercent(row.exposure)}</td>
              <td>{formatNumber(row.ltp)}</td>
              <td>{formatNumber(row.priceWithMtf)}</td>
              <td className="margin-value">{formatNumber(row.margin)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MtfTable;