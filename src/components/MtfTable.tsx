import { mtfRows } from "../data/sampleData";

function MtfTable() {
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
          {mtfRows.map((row) => (
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