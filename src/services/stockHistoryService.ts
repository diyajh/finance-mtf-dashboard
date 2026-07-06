import { supabase } from "../lib/supabase";

export type StockHistoryRow = {
  reportDate: string;
  fundedQty: number | null;
  fundedAmount: number | null;
};

function chunkArray<T>(array: T[], size: number) {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

export async function getStockHistory(companyName: string) {
  const { data: stock, error: stockError } = await supabase
    .from("stocks")
    .select("id, symbol, company_name")
    .eq("company_name", companyName)
    .limit(1)
    .single();

  if (stockError) throw stockError;

  const { data: holdings, error: holdingsError } = await supabase
    .from("mtf_holdings")
    .select("report_id, funded_qty, funded_amount_cr")
    .eq("stock_id", stock.id)
    .range(0, 5000);

  if (holdingsError) throw holdingsError;

  const reportIds = Array.from(
    new Set((holdings || []).map((row) => row.report_id))
  );

  const reports: any[] = [];

  for (const chunk of chunkArray(reportIds, 200)) {
    const { data, error } = await supabase
      .from("weekly_reports")
      .select("id, report_date")
      .in("id", chunk);

    if (error) throw error;

    reports.push(...(data || []));
  }

  const reportDateById = new Map(
    reports.map((report) => [report.id, report.report_date])
  );

  const history: StockHistoryRow[] = (holdings || [])
    .map((holding) => ({
      reportDate: reportDateById.get(holding.report_id),
      fundedQty: holding.funded_qty,
      fundedAmount: holding.funded_amount_cr,
    }))
    .filter((row) => row.reportDate)
    .sort(
      (a, b) =>
        new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime()
    );

  return {
    stock,
    history,
  };
}