const MAX_CANDIDATES_TO_CHECK = 10;
import {
  getSmartQuoteWithCache,
  getSupabaseAdmin,
} from "./cache.ts";

import {
  searchCompanies,
  type CompanyResult,
  type SmartQuoteResult,
} from "./wealthstreet.ts";

const MAX_BATCH_SIZE = 25;
const QUERY_CHUNK_SIZE = 150;

export type StockRow = {
  id: string;
  company_name: string;
  symbol: string | null;

  wealthstreet_fin_code:
    string | null;

  nse_symbol:
    string | null;

  isin:
    string | null;

  wealthstreet_mapping_status:
    string | null;

  wealthstreet_mapping_checked_at:
    string | null;
};

function normalizeCompanyName(
  value: string
) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(
      /\b(limited|ltd|company|co|corporation|corp|inc)\b/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSymbol(
  value:
    | string
    | null
    | undefined
) {
  return (
    value || ""
  )
    .trim()
    .toUpperCase();
}

function chunkArray<T>(
  values: T[],
  size: number
) {
  const chunks: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    chunks.push(
      values.slice(
        index,
        index + size
      )
    );
  }

  return chunks;
}

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error ===
    "string"
  ) {
    return error;
  }

  try {
    return JSON.stringify(
      error
    );
  } catch {
    return "Unknown error";
  }
}

async function getCandidates(
  stock: StockRow
) {
  let candidates =
    await searchCompanies(
      stock.company_name
    );

  /*
   * Symbol fallback.
   */
  if (
    candidates.length === 0 &&
    stock.symbol
  ) {
    candidates =
      await searchCompanies(
        stock.symbol
      );
  }

  return candidates;
}

async function chooseBestMatch(
  stock: StockRow,
  candidates: CompanyResult[]
) {
  const expectedSymbol =
    normalizeSymbol(
      stock.symbol
    );

  /*
   * Priority 1:
   * existing NSE symbol.
   */
  if (expectedSymbol) {
    const matches: {
      candidate:
        CompanyResult;

      quote:
        SmartQuoteResult;
    }[] = [];

    for (const candidate of candidates.slice(
      0,
      MAX_CANDIDATES_TO_CHECK
    )) {
      try {
        const quoteResult =
          await getSmartQuoteWithCache(
            candidate.finCode
          );

        if (
          normalizeSymbol(
            quoteResult.quote
              .nseSymbol
          ) ===
          expectedSymbol
        ) {
          matches.push({
            candidate,
            quote:
              quoteResult.quote,
          });
        }
      } catch {
        // Ignore one bad candidate.
      }
    }

    if (
      matches.length === 1
    ) {
      return {
        status:
          "symbol-match" as const,

        match:
          matches[0].candidate,

        quote:
          matches[0].quote,
      };
    }

    if (
      matches.length > 1
    ) {
      return {
        status:
          "review" as const,

        reason:
          "multiple-symbol-matches",

        matches:
          matches.map(
            (item) => ({
              finCode:
                item.candidate
                  .finCode,

              company:
                item.candidate
                  .company,

              nseSymbol:
                item.quote
                  .nseSymbol,
            })
          ),
      };
    }
  }

  /*
   * Priority 2:
   * normalized company name.
   */
  const expectedCompany =
    normalizeCompanyName(
      stock.company_name
    );

    const nameMatches =
    candidates
      .slice(0, MAX_CANDIDATES_TO_CHECK)
      .filter(
      (candidate) =>
        normalizeCompanyName(
          candidate.company
        ) ===
        expectedCompany
    );

  if (
    nameMatches.length === 1
  ) {
    const candidate =
      nameMatches[0];

    const quoteResult =
      await getSmartQuoteWithCache(
        candidate.finCode
      );

    return {
      status:
        "company-name-match" as const,

      match:
        candidate,

      quote:
        quoteResult.quote,
    };
  }

  if (
    nameMatches.length > 1
  ) {
    return {
      status:
        "review" as const,

      reason:
        "multiple-company-name-matches",

      matches:
        nameMatches,
    };
  }

  return {
    status:
      "no_match" as const,

    candidates:
      candidates.slice(
        0,
        10
      ),
  };
}

async function setStatus(
  stockId: string,
  status:
    | "mapped"
    | "no_match"
    | "review"
) {
  const supabase =
    getSupabaseAdmin();

  const result =
    await supabase
      .from("stocks")
      .update({
        wealthstreet_mapping_status:
          status,

        wealthstreet_mapping_checked_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        stockId
      );

  if (result.error) {
    throw new Error(
      result.error.message
    );
  }
}

export async function mapSingleStock(
  stock: StockRow
) {
  if (
    stock.wealthstreet_fin_code
  ) {
    return {
      stockId:
        stock.id,

      company:
        stock.company_name,

      symbol:
        stock.symbol,

      status:
        "already-mapped",

      finCode:
        stock.wealthstreet_fin_code,

      nseSymbol:
        stock.nse_symbol,

      isin:
        stock.isin,
    };
  }

  const candidates =
    await getCandidates(stock);

  if (
    candidates.length === 0
  ) {
    await setStatus(
      stock.id,
      "no_match"
    );

    return {
      stockId:
        stock.id,

      company:
        stock.company_name,

      symbol:
        stock.symbol,

      status:
        "no_match",

      reason:
        "no-candidates",
    };
  }

  const selection =
    await chooseBestMatch(
      stock,
      candidates
    );

  if (
    selection.status ===
    "review"
  ) {
    await setStatus(
      stock.id,
      "review"
    );

    return {
      stockId:
        stock.id,

      company:
        stock.company_name,

      symbol:
        stock.symbol,

      status:
        "review",

      reason:
        selection.reason,

      matches:
        selection.matches,
    };
  }

  if (
    selection.status ===
    "no_match"
  ) {
    await setStatus(
      stock.id,
      "no_match"
    );

    return {
      stockId:
        stock.id,

      company:
        stock.company_name,

      symbol:
        stock.symbol,

      status:
        "no_match",

      candidates:
        selection.candidates,
    };
  }

  const supabase =
    getSupabaseAdmin();

  const result =
    await supabase
      .from("stocks")
      .update({
        wealthstreet_fin_code:
          selection.match.finCode,

        nse_symbol:
          selection.quote
            .nseSymbol,

        isin:
          selection.quote.isin,

        wealthstreet_mapping_status:
          "mapped",

        wealthstreet_mapping_checked_at:
          new Date()
            .toISOString(),
      })
      .eq(
        "id",
        stock.id
      );

  if (result.error) {
    throw new Error(
      result.error.message
    );
  }

  return {
    stockId:
      stock.id,

    company:
      stock.company_name,

    symbol:
      stock.symbol,

    status:
      "mapped",

    matchMethod:
      selection.status,

    finCode:
      selection.match.finCode,

    matchedCompany:
      selection.match.company,

    nseSymbol:
      selection.quote.nseSymbol,

    isin:
      selection.quote.isin,
  };
}

async function getLatestReportStockIds() {
  const supabase =
    getSupabaseAdmin();

  const reportResult =
    await supabase
      .from(
        "weekly_reports"
      )
      .select(
        "id, report_date, created_at"
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

  if (reportResult.error) {
    throw new Error(
      reportResult.error.message
    );
  }

  const reports =
    reportResult.data || [];

  for (
    const report of reports
  ) {
    const stockIds: string[] = [];

    const pageSize = 1000;
    let from = 0;

    while (true) {
      const holdingsResult =
        await supabase
          .from(
            "mtf_holdings"
          )
          .select(
            "stock_id"
          )
          .eq(
            "report_id",
            report.id
          )
          .range(
            from,
            from +
              pageSize -
              1
          );

      if (
        holdingsResult.error
      ) {
        throw new Error(
          holdingsResult
            .error
            .message
        );
      }

      const batch =
        holdingsResult.data ||
        [];

      for (
        const row of batch
      ) {
        if (
          row.stock_id
        ) {
          stockIds.push(
            row.stock_id
          );
        }
      }

      if (
        batch.length <
        pageSize
      ) {
        break;
      }

      from +=
        pageSize;
    }

    if (
      stockIds.length > 0
    ) {
      return {
        reportDate:
          report.report_date,

        stockIds:
          Array.from(
            new Set(
              stockIds
            )
          ),
      };
    }
  }

  throw new Error(
    "No report with holdings found."
  );
}

async function getUncheckedStocks(
  stockIds: string[]
) {
  const supabase =
    getSupabaseAdmin();

  const rows:
    StockRow[] = [];

  const chunks =
    chunkArray(
      stockIds,
      QUERY_CHUNK_SIZE
    );

  for (
    const chunk of chunks
  ) {
    const result =
      await supabase
        .from("stocks")
        .select(`
          id,
          company_name,
          symbol,
          wealthstreet_fin_code,
          nse_symbol,
          isin,
          wealthstreet_mapping_status,
          wealthstreet_mapping_checked_at
        `)
        .in(
          "id",
          chunk
        )
        .is(
          "wealthstreet_fin_code",
          null
        );

    if (result.error) {
      throw new Error(
        result.error.message
      );
    }

    rows.push(
      ...(
        (result.data ||
          []) as StockRow[]
      )
    );
  }

  return rows.filter(
    (row) =>
      !row.wealthstreet_mapping_status
  );
}

export async function mapCurrentStocks(
  requestedLimit = 5
) {
  const limit =
    Math.min(
      Math.max(
        Number(
          requestedLimit
        ) || 5,
        1
      ),
      MAX_BATCH_SIZE
    );

  const latest =
    await getLatestReportStockIds();

  const unchecked =
    await getUncheckedStocks(
      latest.stockIds
    );

  unchecked.sort(
    (a, b) =>
      a.company_name.localeCompare(
        b.company_name
      )
  );

  const stocks =
    unchecked.slice(
      0,
      limit
    );

    const results: unknown[] = [];

  for (
    const stock of stocks
  ) {
    try {
      const result =
        await mapSingleStock(
          stock
        );

      results.push(
        result
      );
    } catch (error) {
      results.push({
        stockId:
          stock.id,

        company:
          stock.company_name,

        symbol:
          stock.symbol,

        status:
          "error",

        error:
          getErrorMessage(
            error
          ),
      });
    }
  }

  return {
    reportDate:
      latest.reportDate,

    currentReportStockCount:
      latest.stockIds.length,

    remainingUnchecked:
      Math.max(
        unchecked.length -
          stocks.length,
        0
      ),

    results,
  };
}

export async function getStockById(
  stockId: string
): Promise<StockRow | null> {
  const supabase =
    getSupabaseAdmin();

  const result =
    await supabase
      .from("stocks")
      .select(`
        id,
        company_name,
        symbol,
        wealthstreet_fin_code,
        nse_symbol,
        isin,
        wealthstreet_mapping_status,
        wealthstreet_mapping_checked_at
      `)
      .eq(
        "id",
        stockId
      )
      .maybeSingle();

  if (result.error) {
    throw new Error(
      result.error.message
    );
  }

  return (
    result.data as
      | StockRow
      | null
  );
}