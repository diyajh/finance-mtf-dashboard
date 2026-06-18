import type { DashboardRow } from "../services/dashboardService";

type MtfTableProps = {
  rows: DashboardRow[];
  searchTerm: string;
};

function formatNumber(value: number | null) {
  if (value === null) return "-";

  return value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null) {
  if (value === null) return "-";
  return `${value}%`;
}

function MtfTable({ rows, searchTerm }: MtfTableProps) {
  const filteredRows = rows.filter((row) =>
    row.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="table-section">
      <div className="tabs">
        <button className="active-tab">Overall</button>
        <button>Positions Added</button>
        <button>Positions Liquidated</button>
      </div>

      <table className="mtf-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Funded Qty</th>
            <th>Funded Amount (Cr)</th>
            <th>Exposure</th>
            <th>LTP</th>
            <th>Price with MTF</th>
            <th>Margin on Dhan</th>
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