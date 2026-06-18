import { supabase } from "../lib/supabase";

export type DashboardRow = {
  company: string;
  fundedQty: number | null;
  fundedAmount: number | null;
  exposure: number | null;
  ltp: number | null;
  priceWithMtf: number | null;
  margin: number | null;
};

export async function getLatestDashboardData() {
  const { data: latestReport, error: reportError } = await supabase
    .from("weekly_reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (reportError) {
    throw reportError;
  }

  const { data: holdings, error: holdingsError } = await supabase
    .from("mtf_holdings")
    .select(`
      funded_qty,
      funded_amount_cr,
      exposure_percent,
      ltp,
      price_with_mtf,
      margin_multiple,
      stocks (
        company_name
      )
    `)
    .eq("report_id", latestReport.id)
    .order("funded_amount_cr", { ascending: false })
    .range(0, 3000);

  if (holdingsError) {
    throw holdingsError;
  }

  const rows: DashboardRow[] = (holdings || []).map((item: any) => ({
    company: item.stocks?.company_name || "Unknown",
    fundedQty: item.funded_qty,
    fundedAmount: item.funded_amount_cr,
    exposure: item.exposure_percent,
    ltp: item.ltp,
    priceWithMtf: item.price_with_mtf,
    margin: item.margin_multiple,
  }));

  const totalBook = rows.reduce(
    (sum, row) => sum + (row.fundedAmount || 0),
    0
  );

  return {
    report: latestReport,
    rows,
    metrics: {
      industryBook: totalBook,
      positionsAdded: 0,
      positionsLiquidated: 0,
      netBook: totalBook,
    },
  };
}