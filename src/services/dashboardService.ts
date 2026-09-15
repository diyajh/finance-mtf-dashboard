import { supabase } from "../lib/supabase";
import type {
  ViewMode,
  ChangeMode,
} from "../components/MtfTable";

export const PAGE_SIZE = 150;

export type DashboardRow = {
  stockId: string;
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

  qtyChangePercent: number | null;
  amountChangePercent: number | null;
};

export type DashboardPagination = {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  from: number;
  to: number;
};

type WeeklyReport = {
  id: string;
  report_date: string;
  file_name: string | null;
  uploaded_by: string | null;
  created_at: string;
};

type HoldingSummaryRaw = {
  stock_id: string;
  funded_qty: number | null;
  funded_amount_cr: number | null;
};

type HoldingDetailRaw = {
  stock_id: string;
  funded_qty: number | null;
  funded_amount_cr: number | null;
  ltp: number | null;
  price_with_mtf: number | null;
  margin_multiple: number | null;
};

type HoldingSummary = {
  stockId: string;
  fundedQty: number;
  fundedAmount: number;
};

type HoldingDetail = {
  stockId: string;
  fundedQty: number;
  fundedAmount: number;
  ltp: number | null;
  priceWithMtf: number | null;
  margin: number | null;
};

type ReportSummary = {
  report: WeeklyReport;
  rows: HoldingSummary[];
  totalBook: number;
};

type ComparisonRow = {
  stockId: string;

  currentQty: number;
  previousQty: number;
  qtyChange: number;
  qtyChangePercent: number | null;

  currentAmount: number;
  previousAmount: number;
  amountChange: number;
  amountChangePercent: number | null;

  currentExposure: number;
  previousExposure: number;
  exposureChange: number;
};

function toNumber(
  value: number | null | undefined
) {
  return value ?? 0;
}

function calculatePercentageChange(
  currentValue: number,
  previousValue: number
): number | null {
  if (previousValue === 0) {
    return null;
  }

  return Number(
    (
      ((currentValue - previousValue) /
        Math.abs(previousValue)) *
      100
    ).toFixed(2)
  );
}

function chunkArray<T>(
  array: T[],
  size: number
) {
  const chunks: T[][] = [];

  for (
    let index = 0;
    index < array.length;
    index += size
  ) {
    chunks.push(
      array.slice(
        index,
        index + size
      )
    );
  }

  return chunks;
}

function calculateTotalBook(
  rows: HoldingSummary[]
) {
  return rows.reduce(
    (sum, row) =>
      sum +
      toNumber(
        row.fundedAmount
      ),
    0
  );
}

function calculateExposure(
  fundedAmount: number,
  totalBook: number
) {
  if (totalBook <= 0) {
    return 0;
  }

  return Number(
    (
      (fundedAmount /
        totalBook) *
      100
    ).toFixed(2)
  );
}

async function getHoldingSummaryForReport(
  reportId: string
): Promise<HoldingSummary[]> {
  const batchSize = 1000;

  let from = 0;
  let hasMore = true;

  const allRows: HoldingSummary[] = [];

  while (hasMore) {
    const to =
      from +
      batchSize -
      1;

    const {
      data,
      error,
    } = await supabase
      .from("mtf_holdings")
      .select(`
        stock_id,
        funded_qty,
        funded_amount_cr
      `)
      .eq(
        "report_id",
        reportId
      )
      .range(
        from,
        to
      );

    if (error) {
      throw error;
    }

    const batch =
      (data ||
        []) as HoldingSummaryRaw[];

    allRows.push(
      ...batch.map(
        (row) => ({
          stockId:
            row.stock_id,

          fundedQty:
            toNumber(
              row.funded_qty
            ),

          fundedAmount:
            toNumber(
              row.funded_amount_cr
            ),
        })
      )
    );

    if (
      batch.length <
      batchSize
    ) {
      hasMore =
        false;
    } else {
      from +=
        batchSize;
    }
  }

  return allRows;
}

async function getHoldingDetailsForStocks(
  reportId: string,
  stockIds: string[]
): Promise<
  Map<
    string,
    HoldingDetail
  >
> {
  const result =
    new Map<
      string,
      HoldingDetail
    >();

  if (
    stockIds.length ===
    0
  ) {
    return result;
  }

  for (
    const chunk of
    chunkArray(
      stockIds,
      300
    )
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "mtf_holdings"
      )
      .select(`
        stock_id,
        funded_qty,
        funded_amount_cr,
        ltp,
        price_with_mtf,
        margin_multiple
      `)
      .eq(
        "report_id",
        reportId
      )
      .in(
        "stock_id",
        chunk
      );

    if (error) {
      throw error;
    }

    for (
      const row of
      (data ||
        []) as HoldingDetailRaw[]
    ) {
      result.set(
        row.stock_id,
        {
          stockId:
            row.stock_id,

          fundedQty:
            toNumber(
              row.funded_qty
            ),

          fundedAmount:
            toNumber(
              row.funded_amount_cr
            ),

          ltp:
            row.ltp,

          priceWithMtf:
            row.price_with_mtf,

          margin:
            row.margin_multiple,
        }
      );
    }
  }

  return result;
}

async function getStockNames(
  stockIds: string[]
): Promise<
  Map<string, string>
> {
  const stockNameById =
    new Map<
      string,
      string
    >();

  if (
    stockIds.length ===
    0
  ) {
    return stockNameById;
  }

  for (
    const chunk of
    chunkArray(
      stockIds,
      300
    )
  ) {
    const {
      data,
      error,
    } = await supabase
      .from("stocks")
      .select(
        "id, company_name"
      )
      .in(
        "id",
        chunk
      );

    if (error) {
      throw error;
    }

    for (
      const stock of
      data || []
    ) {
      stockNameById.set(
        stock.id,
        stock.company_name ||
          "Unknown"
      );
    }
  }

  return stockNameById;
}

/*
 * GLOBAL SEARCH
 *
 * Searches the complete stocks table rather than
 * only the 150 rows currently visible.
 *
 * Searches both:
 * - company_name
 * - symbol
 */
async function getMatchingStockIds(
  searchTerm: string
): Promise<
  Set<string> | null
> {
  const cleaned =
    searchTerm.trim();

  if (!cleaned) {
    return null;
  }

  const [
    companyResult,
    symbolResult,
  ] =
    await Promise.all([
      supabase
        .from("stocks")
        .select("id")
        .ilike(
          "company_name",
          `%${cleaned}%`
        ),

      supabase
        .from("stocks")
        .select("id")
        .ilike(
          "symbol",
          `%${cleaned}%`
        ),
    ]);

  if (
    companyResult.error
  ) {
    throw companyResult.error;
  }

  if (
    symbolResult.error
  ) {
    throw symbolResult.error;
  }

  const ids =
    new Set<string>();

  for (
    const stock of
    companyResult.data ||
    []
  ) {
    ids.add(stock.id);
  }

  for (
    const stock of
    symbolResult.data ||
    []
  ) {
    ids.add(stock.id);
  }

  return ids;
}

async function getLatestTwoReportSummaries() {
  const {
    data: reports,
    error,
  } = await supabase
    .from(
      "weekly_reports"
    )
    .select("*")
    .order(
      "report_date",
      {
        ascending:
          false,
      }
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    )
    .limit(100);

  if (error) {
    throw error;
  }

  const found: ReportSummary[] =
    [];

  for (
    const report of
    (reports ||
      []) as WeeklyReport[]
  ) {
    const rows =
      await getHoldingSummaryForReport(
        report.id
      );

    if (
      rows.length >
      0
    ) {
      found.push({
        report,
        rows,

        totalBook:
          calculateTotalBook(
            rows
          ),
      });
    }

    if (
      found.length ===
      2
    ) {
      break;
    }
  }

  if (
    found.length ===
    0
  ) {
    throw new Error(
      "No report with holdings was found."
    );
  }

  return {
    latest:
      found[0],

    previous:
      found[1] ||
      null,
  };
}

async function getReportNearTargetDate(
  targetDate: string
): Promise<ReportSummary | null> {
  const {
    data: reports,
    error,
  } = await supabase
    .from(
      "weekly_reports"
    )
    .select("*")
    .lte(
      "report_date",
      targetDate
    )
    .order(
      "report_date",
      {
        ascending:
          false,
      }
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    )
    .limit(30);

  if (error) {
    throw error;
  }

  for (
    const report of
    (reports ||
      []) as WeeklyReport[]
  ) {
    const rows =
      await getHoldingSummaryForReport(
        report.id
      );

    if (
      rows.length >
      0
    ) {
      return {
        report,
        rows,

        totalBook:
          calculateTotalBook(
            rows
          ),
      };
    }
  }

  return null;
}

async function getComparisonReport(
  changeMode: ChangeMode,
  latest: ReportSummary,
  immediatePrevious:
    | ReportSummary
    | null
) {
  if (
    changeMode ===
    "none"
  ) {
    return immediatePrevious;
  }

  const daysBack =
    changeMode ===
    "weekly"
      ? 7
      : 30;

  const targetDate =
    new Date(
      `${latest.report.report_date}T00:00:00`
    );

  targetDate.setDate(
    targetDate.getDate() -
      daysBack
  );

  return getReportNearTargetDate(
    targetDate
      .toISOString()
      .slice(0, 10)
  );
}

function compareReports(
  latest: ReportSummary,
  previous: ReportSummary
): ComparisonRow[] {
  const currentByStockId =
    new Map(
      latest.rows.map(
        (row) => [
          row.stockId,
          row,
        ]
      )
    );

  const previousByStockId =
    new Map(
      previous.rows.map(
        (row) => [
          row.stockId,
          row,
        ]
      )
    );

  const allStockIds =
    new Set([
      ...currentByStockId.keys(),
      ...previousByStockId.keys(),
    ]);

  const comparisonRows:
    ComparisonRow[] =
    [];

  for (
    const stockId of
    allStockIds
  ) {
    const current =
      currentByStockId.get(
        stockId
      );

    const previousRow =
      previousByStockId.get(
        stockId
      );

    const currentQty =
      current?.fundedQty ??
      0;

    const previousQty =
      previousRow?.fundedQty ??
      0;

    const currentAmount =
      current?.fundedAmount ??
      0;

    const previousAmount =
      previousRow?.fundedAmount ??
      0;

    const qtyChange =
      currentQty -
      previousQty;

    const amountChange =
      currentAmount -
      previousAmount;

    const currentExposure =
      calculateExposure(
        currentAmount,
        latest.totalBook
      );

    const previousExposure =
      calculateExposure(
        previousAmount,
        previous.totalBook
      );

    comparisonRows.push({
      stockId,

      currentQty,
      previousQty,
      qtyChange,

      qtyChangePercent:
        calculatePercentageChange(
          currentQty,
          previousQty
        ),

      currentAmount,
      previousAmount,
      amountChange,

      amountChangePercent:
        calculatePercentageChange(
          currentAmount,
          previousAmount
        ),

      currentExposure,
      previousExposure,

      exposureChange:
        Number(
          (
            currentExposure -
            previousExposure
          ).toFixed(2)
        ),
    });
  }

  return comparisonRows;
}

function clampPage(
  page: number,
  totalPages: number
) {
  if (
    totalPages <= 0
  ) {
    return 1;
  }

  return Math.min(
    Math.max(
      page,
      1
    ),
    totalPages
  );
}

export async function getLatestDashboardData(
  viewMode: ViewMode =
    "overall",

  changeMode: ChangeMode =
    "none",

  requestedPage = 1,

  searchTerm = ""
) {
  const {
    latest,
    previous,
  } =
    await getLatestTwoReportSummaries();

  const comparisonReport =
    await getComparisonReport(
      changeMode,
      latest,
      previous
    );

  let comparisonRows:
    ComparisonRow[] =
    [];

  if (
    comparisonReport
  ) {
    comparisonRows =
      compareReports(
        latest,
        comparisonReport
      );
  }

  const comparisonByStockId =
    new Map(
      comparisonRows.map(
        (row) => [
          row.stockId,
          row,
        ]
      )
    );

  /*
   * GLOBAL TOP 5
   *
   * Search and pagination do not affect these.
   */
  const topStockSummaries =
    [...latest.rows]
      .sort(
        (a, b) =>
          b.fundedAmount -
          a.fundedAmount
      )
      .slice(0, 5);

  const topStockIds =
    topStockSummaries.map(
      (row) =>
        row.stockId
    );

  const [
    topStockNames,
    topStockDetails,
  ] =
    await Promise.all([
      getStockNames(
        topStockIds
      ),

      getHoldingDetailsForStocks(
        latest.report.id,
        topStockIds
      ),
    ]);

  const topStocks:
    DashboardRow[] =
    topStockSummaries.map(
      (row) => {
        const detail =
          topStockDetails.get(
            row.stockId
          );

        const comparison =
          comparisonByStockId.get(
            row.stockId
          );

        return {
          stockId:
            row.stockId,

          company:
            topStockNames.get(
              row.stockId
            ) ||
            "Unknown",

          fundedQty:
            row.fundedQty,

          fundedAmount:
            row.fundedAmount,

          exposure:
            calculateExposure(
              row.fundedAmount,
              latest.totalBook
            ),

          ltp:
            detail?.ltp ??
            null,

          priceWithMtf:
            detail?.priceWithMtf ??
            null,

          margin:
            detail?.margin ??
            null,

          qtyChange:
            comparison?.qtyChange ??
            0,

          amountChange:
            comparison?.amountChange ??
            0,

          exposureChange:
            comparison?.exposureChange ??
            0,

          qtyChangePercent:
            comparison?.qtyChangePercent ??
            null,

          amountChangePercent:
            comparison?.amountChangePercent ??
            null,
        };
      }
    );

  let selectedRows: {
    stockId: string;

    fundedQty: number;
    fundedAmount: number;
    exposure: number;

    qtyChange:
      | number
      | null;

    amountChange:
      | number
      | null;

    exposureChange:
      | number
      | null;

    qtyChangePercent:
      | number
      | null;

    amountChangePercent:
      | number
      | null;
  }[] = [];

  if (
    viewMode ===
    "overall"
  ) {
    selectedRows =
      latest.rows
        .map(
          (row) => {
            const comparison =
              comparisonByStockId.get(
                row.stockId
              );

            return {
              stockId:
                row.stockId,

              fundedQty:
                row.fundedQty,

              fundedAmount:
                row.fundedAmount,

              exposure:
                calculateExposure(
                  row.fundedAmount,
                  latest.totalBook
                ),

              qtyChange:
                comparison?.qtyChange ??
                0,

              amountChange:
                comparison?.amountChange ??
                0,

              exposureChange:
                comparison?.exposureChange ??
                0,

              qtyChangePercent:
                comparison?.qtyChangePercent ??
                null,

              amountChangePercent:
                comparison?.amountChangePercent ??
                null,
            };
          }
        )
        .sort(
          (a, b) =>
            b.fundedAmount -
            a.fundedAmount
        );
  }

  if (
    viewMode ===
    "added"
  ) {
    selectedRows =
      comparisonRows
        .filter(
          (row) =>
            row.amountChange >
            0
        )
        .sort(
          (a, b) =>
            b.amountChange -
            a.amountChange
        )
        .map(
          (row) => ({
            stockId:
              row.stockId,

            fundedQty:
              row.qtyChange,

            fundedAmount:
              row.amountChange,

            exposure:
              row.currentExposure,

            qtyChange:
              row.qtyChange,

            amountChange:
              row.amountChange,

            exposureChange:
              row.exposureChange,

            qtyChangePercent:
              row.qtyChangePercent,

            amountChangePercent:
              row.amountChangePercent,
          })
        );
  }

  if (
    viewMode ===
    "liquidated"
  ) {
    selectedRows =
      comparisonRows
        .filter(
          (row) =>
            row.amountChange <
            0
        )
        .sort(
          (a, b) =>
            Math.abs(
              b.amountChange
            ) -
            Math.abs(
              a.amountChange
            )
        )
        .map(
          (row) => ({
            stockId:
              row.stockId,

            fundedQty:
              row.qtyChange,

            fundedAmount:
              row.amountChange,

            exposure:
              row.currentExposure,

            qtyChange:
              row.qtyChange,

            amountChange:
              row.amountChange,

            exposureChange:
              row.exposureChange,

            qtyChangePercent:
              row.qtyChangePercent,

            amountChangePercent:
              row.amountChangePercent,
          })
        );
  }

  /*
   * GLOBAL SEARCH FILTER
   *
   * This happens before pagination.
   */
  const matchingStockIds =
    await getMatchingStockIds(
      searchTerm
    );

  if (
    matchingStockIds !==
    null
  ) {
    selectedRows =
      selectedRows.filter(
        (row) =>
          matchingStockIds.has(
            row.stockId
          )
      );
  }

  /*
   * Pagination
   */
  const totalRows =
    selectedRows.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalRows /
          PAGE_SIZE
      )
    );

  const page =
    clampPage(
      requestedPage,
      totalPages
    );

  const startIndex =
    (page - 1) *
    PAGE_SIZE;

  const endIndex =
    startIndex +
    PAGE_SIZE;

  const pageRows =
    selectedRows.slice(
      startIndex,
      endIndex
    );

  const visibleStockIds =
    pageRows.map(
      (row) =>
        row.stockId
    );

  const [
    stockNames,
    latestDetails,
    previousDetails,
  ] =
    await Promise.all([
      getStockNames(
        visibleStockIds
      ),

      getHoldingDetailsForStocks(
        latest.report.id,
        visibleStockIds
      ),

      comparisonReport
        ? getHoldingDetailsForStocks(
            comparisonReport
              .report.id,
            visibleStockIds
          )
        : Promise.resolve(
            new Map<
              string,
              HoldingDetail
            >()
          ),
    ]);

  const dashboardRows:
    DashboardRow[] =
    pageRows.map(
      (row) => {
        const latestDetail =
          latestDetails.get(
            row.stockId
          );

        const previousDetail =
          previousDetails.get(
            row.stockId
          );

        const detail =
          latestDetail ??
          previousDetail;

        return {
          stockId:
            row.stockId,

          company:
            stockNames.get(
              row.stockId
            ) ||
            "Unknown",

          fundedQty:
            row.fundedQty,

          fundedAmount:
            row.fundedAmount,

          exposure:
            row.exposure,

          ltp:
            detail?.ltp ??
            null,

          priceWithMtf:
            detail?.priceWithMtf ??
            null,

          margin:
            detail?.margin ??
            null,

          qtyChange:
            row.qtyChange,

          amountChange:
            row.amountChange,

          exposureChange:
            row.exposureChange,

          qtyChangePercent:
            row.qtyChangePercent,

          amountChangePercent:
            row.amountChangePercent,
        };
      }
    );

  /*
   * Metrics remain GLOBAL.
   *
   * Search and pagination do not affect
   * dashboard metric cards.
   */
  const positionsAdded =
    comparisonRows.reduce(
      (
        sum,
        row
      ) =>
        sum +
        Math.max(
          row.amountChange,
          0
        ),
      0
    );

  const positionsLiquidated =
    comparisonRows.reduce(
      (
        sum,
        row
      ) =>
        sum +
        Math.abs(
          Math.min(
            row.amountChange,
            0
          )
        ),
      0
    );

  const pagination:
    DashboardPagination =
    {
      page,

      pageSize:
        PAGE_SIZE,

      totalRows,

      totalPages,

      from:
        totalRows ===
        0
          ? 0
          : startIndex +
            1,

      to:
        Math.min(
          startIndex +
            PAGE_SIZE,
          totalRows
        ),
    };

  return {
    report:
      latest.report,

    comparisonReport:
      comparisonReport?.report ??
      null,

    rows:
      dashboardRows,

    topStocks,

    pagination,

    metrics: {
      industryBook:
        latest.totalBook,

      positionsAdded,

      positionsLiquidated,

      netBook:
        positionsAdded -
        positionsLiquidated,
    },
  };
}