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

type HoldingRow = {
  company: string;
  fundedQty: number;
  fundedAmount: number;
  ltp: number | null;
  priceWithMtf: number | null;
  margin: number | null;
};

function toNumber(value: number | null | undefined) {
  return value ?? 0;
}

async function getReportByOffset(changeMode: ChangeMode) {
  const { data: latestReport, error: latestError } = await supabase
    .from("weekly_reports")
    .select("*")
    .order("report_date", { ascending: false })
    .limit(1)
    .single();

  if (latestError) throw latestError;

  if (changeMode === "none") {
    return { latestReport, compareReport: null };
  }

  const compareDays = changeMode === "weekly" ? 7 : 30;

  const latestDate = new Date(latestReport.report_date);
  latestDate.setDate(latestDate.getDate() - compareDays);

  const compareDate = latestDate.toISOString().slice(0, 10);

  const { data: compareReport, error: compareError } = await supabase
    .from("weekly_reports")
    .select("*")
    .lte("report_date", compareDate)
    .order("report_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (compareError) throw compareError;

  return { latestReport, compareReport };
}

async function getHoldingsForReport(reportId: string) {
  const { data, error } = await supabase
    .from("mtf_holdings")
    .select(`
      funded_qty,
      funded_amount_cr,
      ltp,
      price_with_mtf,
      margin_multiple,
      stocks (
        company_name
      )
    `)
    .eq("report_id", reportId)
    .order("funded_amount_cr", { ascending: false })
    .range(0, 5000);

  if (error) throw error;

  return (data || []).map((item: any): HoldingRow => ({
    company: item.stocks?.company_name || "Unknown",
    fundedQty: toNumber(item.funded_qty),
    fundedAmount: toNumber(item.funded_amount_cr),
    ltp: item.ltp,
    priceWithMtf: item.price_with_mtf,
    margin: item.margin_multiple,
  }));
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

export async function getLatestDashboardData(
  viewMode: ViewMode = "overall",
  changeMode: ChangeMode = "none"
) {
  const { latestReport, compareReport } = await getReportByOffset(changeMode);

  const latestRows = await getHoldingsForReport(latestReport.id);

  if (!compareReport || changeMode === "none") {
    const baseRows: DashboardRow[] = latestRows.map((row) => ({
      company: row.company,
      fundedQty: row.fundedQty,
      fundedAmount: row.fundedAmount,
      exposure: null,
      ltp: row.ltp,
      priceWithMtf: row.priceWithMtf,
      margin: row.margin,
    }));

    const { totalBook, rowsWithExposure } = addExposure(baseRows);

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

  const previousRows = await getHoldingsForReport(compareReport.id);

  const previousByCompany = new Map(
    previousRows.map((row) => [row.company, row])
  );

  const comparisonRows: DashboardRow[] = latestRows
    .map((current) => {
      const previous = previousByCompany.get(current.company);

      const qtyChange = current.fundedQty - toNumber(previous?.fundedQty);
      const amountChange =
        current.fundedAmount - toNumber(previous?.fundedAmount);

      return {
        company: current.company,
        fundedQty:
          viewMode === "overall" ? current.fundedQty : qtyChange,
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
    .sort((a, b) => Math.abs(toNumber(b.fundedAmount)) - Math.abs(toNumber(a.fundedAmount)));

  const { totalBook, rowsWithExposure } = addExposure(
    latestRows.map((row) => ({
      company: row.company,
      fundedQty: row.fundedQty,
      fundedAmount: row.fundedAmount,
      exposure: null,
      ltp: row.ltp,
      priceWithMtf: row.priceWithMtf,
      margin: row.margin,
    }))
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