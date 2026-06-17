import { mtfRows } from "../data/sampleData";

type MtfTableProps = {
  searchTerm: string;
};

function MtfTable({ searchTerm }: MtfTableProps) {
  const filteredRows = mtfRows.filter((row) =>
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
              <td>{row.fundedQty}</td>
              <td>{row.fundedAmount}</td>
              <td>{row.exposure}</td>
              <td>{row.ltp}</td>
              <td>{row.priceWithMtf}</td>
              <td className="margin-value">{row.margin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MtfTable;