import { supabase } from "../lib/supabase";
import type { ViewMode, ChangeMode } from "../components/MtfTable";

export type DashboardRow = {
  company: string;
  fundedQty: number | null;
  fundedAmount: number | null;
  exposure: number | null;
  ltp: number | null;
  priceWithMtf: number | null;
  margin: number | null;
};

type HoldingRaw = {
  stock_id: string;
  funded_qty: number | null;
  funded_amount_cr: number | null;
  ltp: number | null;
  price_with_mtf: number | null;
  margin_multiple: number | null;
};

function toNumber(value: number | null | undefined) {
  return value ?? 0;
}

function chunkArray<T>(array: T[], size: number) {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

function addExposure(rows: DashboardRow[]) {
  const totalBook = rows.reduce(
    (sum, row) => sum + toNumber(row.fundedAmount),
    0
  );

  const rowsWithExposure = rows.map((row) => ({
    ...row,
    exposure:
      totalBook > 0
        ? Number(((toNumber(row.fundedAmount) / totalBook) * 100).toFixed(2))
        : 0,
  }));

  return { totalBook, rowsWithExposure };
}

async function getRecentReports() {
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .order("report_date", { ascending: false })
    .limit(50);

  if (error) throw error;

  return data || [];
}

async function getHoldingsForReport(reportId: string): Promise<DashboardRow[]> {
  const { data: holdings, error: holdingsError } = await supabase
    .from("mtf_holdings")
    .select(`
      stock_id,
      funded_qty,
      funded_amount_cr,
      ltp,
      price_with_mtf,
      margin_multiple
    `)
    .eq("report_id", reportId)
    .order("funded_amount_cr", { ascending: false })
    .range(0, 3000);

  if (holdingsError) throw holdingsError;

  const holdingRows = (holdings || []) as HoldingRaw[];

  if (holdingRows.length === 0) {
    return [];
  }

  const stockIds = Array.from(
    new Set(holdingRows.map((row) => row.stock_id).filter(Boolean))
  );

  const stockNameById = new Map<string, string>();

  for (const chunk of chunkArray(stockIds, 300)) {
    const { data: stocks, error: stocksError } = await supabase
      .from("stocks")
      .select("id, company_name")
      .in("id", chunk);

    if (stocksError) throw stocksError;

    for (const stock of stocks || []) {
      stockNameById.set(stock.id, stock.company_name);
    }
  }

  return holdingRows.map((item) => ({
    company: stockNameById.get(item.stock_id) || "Unknown",
    fundedQty: item.funded_qty,
    fundedAmount: item.funded_amount_cr,
    exposure: null,
    ltp: item.ltp,
    priceWithMtf: item.price_with_mtf,
    margin: item.margin_multiple,
  }));
}

async function getLatestReportWithRows() {
  const reports = await getRecentReports();

  for (const report of reports) {
    const rows = await getHoldingsForReport(report.id);

    if (rows.length > 0) {
      return { report, rows };
    }
  }

  throw new Error("No report with holdings found");
}

async function getCompareReport(changeMode: ChangeMode, latestDate: string) {
  if (changeMode === "none") return null;

  const daysBack = changeMode === "weekly" ? 7 : 30;
  const target = new Date(latestDate);
  target.setDate(target.getDate() - daysBack);

  const { data, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .lte("report_date", target.toISOString().slice(0, 10))
    .order("report_date", { ascending: false })
    .limit(20);

  if (error) throw error;

  for (const report of data || []) {
    const rows = await getHoldingsForReport(report.id);

    if (rows.length > 0) {
      return { report, rows };
    }
  }

  return null;
}

export async function getLatestDashboardData(
  viewMode: ViewMode = "overall",
  changeMode: ChangeMode = "none"
) {
  const latest = await getLatestReportWithRows();

  const latestReport = latest.report;
  const latestRows = latest.rows;

  const { totalBook, rowsWithExposure } = addExposure(latestRows);

  if (changeMode === "none") {
    return {
      report: latestReport,
      rows: rowsWithExposure,
      metrics: {
        industryBook: totalBook,
        positionsAdded: 0,
        positionsLiquidated: 0,
        netBook: totalBook,
      },
    };
  }

  const compare = await getCompareReport(changeMode, latestReport.report_date);

  if (!compare) {
    return {
      report: latestReport,
      rows: rowsWithExposure,
      metrics: {
        industryBook: totalBook,
        positionsAdded: 0,
        positionsLiquidated: 0,
        netBook: totalBook,
      },
    };
  }

  const previousByCompany = new Map(
    compare.rows.map((row) => [row.company, row])
  );

  const comparisonRows: DashboardRow[] = latestRows
    .map((current) => {
      const previous = previousByCompany.get(current.company);

      const qtyChange =
        toNumber(current.fundedQty) - toNumber(previous?.fundedQty);

      const amountChange =
        toNumber(current.fundedAmount) - toNumber(previous?.fundedAmount);

      return {
        company: current.company,
        fundedQty: viewMode === "overall" ? current.fundedQty : qtyChange,
        fundedAmount:
          viewMode === "overall" ? current.fundedAmount : amountChange,
        exposure: null,
        ltp: current.ltp,
        priceWithMtf: current.priceWithMtf,
        margin: current.margin,
      };
    })
    .filter((row) => {
      if (viewMode === "added") return toNumber(row.fundedAmount) > 0;
      if (viewMode === "liquidated") return toNumber(row.fundedAmount) < 0;
      return true;
    })
    .sort(
      (a, b) =>
        Math.abs(toNumber(b.fundedAmount)) -
        Math.abs(toNumber(a.fundedAmount))
    );

  const positionsAdded = comparisonRows
    .filter((row) => toNumber(row.fundedAmount) > 0)
    .reduce((sum, row) => sum + toNumber(row.fundedAmount), 0);

  const positionsLiquidated = comparisonRows
    .filter((row) => toNumber(row.fundedAmount) < 0)
    .reduce((sum, row) => sum + Math.abs(toNumber(row.fundedAmount)), 0);

  const displayRows =
    viewMode === "overall"
      ? rowsWithExposure
      : addExposure(comparisonRows).rowsWithExposure;

  return {
    report: latestReport,
    rows: displayRows,
    metrics: {
      industryBook: totalBook,
      positionsAdded,
      positionsLiquidated,
      netBook: positionsAdded - positionsLiquidated,
    },
  };
}