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

  qtyChange: number | null;
  amountChange: number | null;
  exposureChange: number | null;
};

type WeeklyReport = {
  id: string;
  report_date: string;
  file_name: string | null;
  uploaded_by: string | null;
  created_at: string;
};

type HoldingRaw = {
  stock_id: string;
  funded_qty: number | null;
  funded_amount_cr: number | null;
  ltp: number | null;
  price_with_mtf: number | null;
  margin_multiple: number | null;
};

type HoldingRow = DashboardRow & {
  stockId: string;
};

type ReportWithRows = {
  report: WeeklyReport;
  rows: HoldingRow[];
};

type ComparisonRow = {
  stockId: string;
  company: string;

  currentQty: number;
  previousQty: number;
  qtyChange: number;

  currentAmount: number;
  previousAmount: number;
  amountChange: number;

  currentExposure: number;
  previousExposure: number;
  exposureChange: number;

  ltp: number | null;
  priceWithMtf: number | null;
  margin: number | null;
};

function toNumber(value: number | null | undefined) {
  return value ?? 0;
}

function chunkArray<T>(array: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size));
  }

  return chunks;
}

function calculateExposure(rows: HoldingRow[]) {
  const totalBook = rows.reduce(
    (sum, row) => sum + toNumber(row.fundedAmount),
    0
  );

  const rowsWithExposure: HoldingRow[] = rows.map((row) => ({
    ...row,
    exposure:
      totalBook > 0
        ? Number(
            ((toNumber(row.fundedAmount) / totalBook) * 100).toFixed(2)
          )
        : 0,
  }));

  return {
    totalBook,
    rowsWithExposure,
  };
}

async function getHoldingsForReport(
  reportId: string
): Promise<HoldingRow[]> {
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

  if (holdingsError) {
    throw holdingsError;
  }

  const holdingRows = (holdings || []) as HoldingRaw[];

  if (holdingRows.length === 0) {
    return [];
  }

  const stockIds = Array.from(
    new Set(
      holdingRows
        .map((row) => row.stock_id)
        .filter((stockId): stockId is string => Boolean(stockId))
    )
  );

  const stockNameById = new Map<string, string>();

  for (const chunk of chunkArray(stockIds, 300)) {
    const { data: stocks, error: stocksError } = await supabase
      .from("stocks")
      .select("id, company_name")
      .in("id", chunk);

    if (stocksError) {
      throw stocksError;
    }

    for (const stock of stocks || []) {
      stockNameById.set(stock.id, stock.company_name);
    }
  }

  return holdingRows.map((holding) => ({
    stockId: holding.stock_id,
    company: stockNameById.get(holding.stock_id) || "Unknown",
    fundedQty: holding.funded_qty,
    fundedAmount: holding.funded_amount_cr,
    exposure: null,
    ltp: holding.ltp,
    priceWithMtf: holding.price_with_mtf,
    margin: holding.margin_multiple,
    qtyChange: null,
    amountChange: null,
    exposureChange: null,
  }));
}

async function getLatestTwoReportsWithRows() {
  const { data: reports, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  const reportsWithRows: ReportWithRows[] = [];

  for (const report of (reports || []) as WeeklyReport[]) {
    const rows = await getHoldingsForReport(report.id);

    if (rows.length > 0) {
      reportsWithRows.push({
        report,
        rows,
      });
    }

    if (reportsWithRows.length === 2) {
      break;
    }
  }

  if (reportsWithRows.length === 0) {
    throw new Error("No report with holdings was found.");
  }

  return {
    latest: reportsWithRows[0],
    previous: reportsWithRows[1] || null,
  };
}

async function getReportNearTargetDate(
  targetDate: string
): Promise<ReportWithRows | null> {
  const { data: reports, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .lte("report_date", targetDate)
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  for (const report of (reports || []) as WeeklyReport[]) {
    const rows = await getHoldingsForReport(report.id);

    if (rows.length > 0) {
      return {
        report,
        rows,
      };
    }
  }

  return null;
}

async function getComparisonReport(
  changeMode: ChangeMode,
  latest: ReportWithRows,
  immediatePrevious: ReportWithRows | null
) {
  if (changeMode === "none") {
    return immediatePrevious;
  }

  const daysBack = changeMode === "weekly" ? 7 : 30;
  const targetDate = new Date(`${latest.report.report_date}T00:00:00`);

  targetDate.setDate(targetDate.getDate() - daysBack);

  return getReportNearTargetDate(targetDate.toISOString().slice(0, 10));
}

function compareReports(
  latestRows: HoldingRow[],
  previousRows: HoldingRow[],
  latestRowsWithExposure: HoldingRow[],
  previousRowsWithExposure: HoldingRow[]
) {
  const currentByStockId = new Map(
    latestRows.map((row) => [row.stockId, row])
  );

  const previousByStockId = new Map(
    previousRows.map((row) => [row.stockId, row])
  );

  const currentExposureByStockId = new Map(
    latestRowsWithExposure.map((row) => [
      row.stockId,
      toNumber(row.exposure),
    ])
  );

  const previousExposureByStockId = new Map(
    previousRowsWithExposure.map((row) => [
      row.stockId,
      toNumber(row.exposure),
    ])
  );

  const allStockIds = new Set([
    ...currentByStockId.keys(),
    ...previousByStockId.keys(),
  ]);

  const comparisonRows: ComparisonRow[] = [];

  for (const stockId of allStockIds) {
    const current = currentByStockId.get(stockId);
    const previous = previousByStockId.get(stockId);

    const currentQty = toNumber(current?.fundedQty);
    const previousQty = toNumber(previous?.fundedQty);

    const currentAmount = toNumber(current?.fundedAmount);
    const previousAmount = toNumber(previous?.fundedAmount);

    const currentExposure =
      currentExposureByStockId.get(stockId) ?? 0;

    const previousExposure =
      previousExposureByStockId.get(stockId) ?? 0;

    comparisonRows.push({
      stockId,
      company: current?.company || previous?.company || "Unknown",

      currentQty,
      previousQty,
      qtyChange: currentQty - previousQty,

      currentAmount,
      previousAmount,
      amountChange: currentAmount - previousAmount,

      currentExposure,
      previousExposure,
      exposureChange: Number(
        (currentExposure - previousExposure).toFixed(2)
      ),

      ltp: current?.ltp ?? previous?.ltp ?? null,
      priceWithMtf:
        current?.priceWithMtf ?? previous?.priceWithMtf ?? null,
      margin: current?.margin ?? previous?.margin ?? null,
    });
  }

  return comparisonRows;
}

function getOverallRows(
  latestRowsWithExposure: HoldingRow[],
  comparisonRows: ComparisonRow[]
): DashboardRow[] {
  const comparisonByStockId = new Map(
    comparisonRows.map((row) => [row.stockId, row])
  );

  return latestRowsWithExposure.map((row) => {
    const comparison = comparisonByStockId.get(row.stockId);

    return {
      company: row.company,
      fundedQty: row.fundedQty,
      fundedAmount: row.fundedAmount,
      exposure: row.exposure,
      ltp: row.ltp,
      priceWithMtf: row.priceWithMtf,
      margin: row.margin,

      qtyChange: comparison?.qtyChange ?? 0,
      amountChange: comparison?.amountChange ?? 0,
      exposureChange: comparison?.exposureChange ?? 0,
    };
  });
}

function getAddedRows(
  comparisonRows: ComparisonRow[]
): DashboardRow[] {
  return comparisonRows
    .filter((row) => row.amountChange > 0)
    .sort((a, b) => b.amountChange - a.amountChange)
    .map((row) => ({
      company: row.company,

      fundedQty: row.qtyChange,
      fundedAmount: row.amountChange,
      exposure: row.currentExposure,

      ltp: row.ltp,
      priceWithMtf: row.priceWithMtf,
      margin: row.margin,

      qtyChange: row.qtyChange,
      amountChange: row.amountChange,
      exposureChange: row.exposureChange,
    }));
}

function getLiquidatedRows(
  comparisonRows: ComparisonRow[]
): DashboardRow[] {
  return comparisonRows
    .filter((row) => row.amountChange < 0)
    .sort(
      (a, b) =>
        Math.abs(b.amountChange) - Math.abs(a.amountChange)
    )
    .map((row) => ({
      company: row.company,

      fundedQty: row.qtyChange,
      fundedAmount: Math.abs(row.amountChange),
      exposure: row.currentExposure,

      ltp: row.ltp,
      priceWithMtf: row.priceWithMtf,
      margin: row.margin,

      qtyChange: row.qtyChange,
      amountChange: row.amountChange,
      exposureChange: row.exposureChange,
    }));
}

export async function getLatestDashboardData(
  viewMode: ViewMode = "overall",
  changeMode: ChangeMode = "none"
) {
  const { latest, previous } = await getLatestTwoReportsWithRows();

  const latestReport = latest.report;
  const latestRows = latest.rows;

  const {
    totalBook,
    rowsWithExposure: latestRowsWithExposure,
  } = calculateExposure(latestRows);

  const comparisonReport = await getComparisonReport(
    changeMode,
    latest,
    previous
  );

  if (!comparisonReport) {
    return {
      report: latestReport,
      comparisonReport: null,
      rows: latestRowsWithExposure,
      metrics: {
        industryBook: totalBook,
        positionsAdded: 0,
        positionsLiquidated: 0,
        netBook: 0,
      },
    };
  }

  const {
    rowsWithExposure: previousRowsWithExposure,
  } = calculateExposure(comparisonReport.rows);

  const comparisonRows = compareReports(
    latestRows,
    comparisonReport.rows,
    latestRowsWithExposure,
    previousRowsWithExposure
  );

  const overallRows = getOverallRows(
    latestRowsWithExposure,
    comparisonRows
  );

  const addedRows = getAddedRows(comparisonRows);
  const liquidatedRows = getLiquidatedRows(comparisonRows);

  const positionsAdded = addedRows.reduce(
    (sum, row) => sum + Math.abs(toNumber(row.amountChange)),
    0
  );

  const positionsLiquidated = liquidatedRows.reduce(
    (sum, row) => sum + Math.abs(toNumber(row.amountChange)),
    0
  );

  let displayRows: DashboardRow[] = overallRows;

  if (viewMode === "added") {
    displayRows = addedRows;
  }

  if (viewMode === "liquidated") {
    displayRows = liquidatedRows;
  }

  return {
    report: latestReport,
    comparisonReport: comparisonReport.report,
    rows: displayRows,
    metrics: {
      industryBook: totalBook,
      positionsAdded,
      positionsLiquidated,
      netBook: positionsAdded - positionsLiquidated,
    },
  };
}