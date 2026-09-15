import {
  searchCompanies,
} from "./wealthstreet.ts";

import {
  getSmartQuoteWithCache,
  getSupabaseAdmin,
} from "./cache.ts";

import {
  getStockById,
  mapCurrentStocks,
  mapSingleStock,
} from "./mapping.ts";

function jsonResponse(
  body: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(
      body,
      null,
      2
    ),
    {
      status,
      headers: {
        "Content-Type":
          "application/json",
      },
    }
  );
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

async function getBulkQuotes(
  stockIds: string[]
) {
  const supabase =
    getSupabaseAdmin();

  if (
    !Array.isArray(stockIds) ||
    stockIds.length === 0
  ) {
    return [];
  }

  /*
   * Keep this capped.
   * Your dashboard only shows 150 rows anyway.
   */
  const safeStockIds =
    stockIds.slice(
      0,
      150
    );

  const stockResult =
    await supabase
      .from("stocks")
      .select(`
        id,
        company_name,
        symbol,
        wealthstreet_fin_code,
        nse_symbol,
        isin
      `)
      .in(
        "id",
        safeStockIds
      );

  if (stockResult.error) {
    throw new Error(
      stockResult.error.message
    );
  }

  const stocks =
    stockResult.data || [];

  const finCodes =
    stocks
      .map(
        (stock) =>
          stock.wealthstreet_fin_code
      )
      .filter(
        (
          finCode
        ): finCode is string =>
          Boolean(finCode)
      );

  if (
    finCodes.length === 0
  ) {
    return stocks.map(
      (stock) => ({
        stockId:
          stock.id,

        company:
          stock.company_name,

        symbol:
          stock.symbol,

        finCode:
          stock.wealthstreet_fin_code,

        mapped:
          false,

        ltp:
          null,

        previousClose:
          null,

        fetchedAt:
          null,
      })
    );
  }

  const quoteResult =
    await supabase
      .from(
        "market_quotes"
      )
      .select(`
        fin_code,
        nse_current_price,
        nse_previous_close,
        fetched_at
      `)
      .in(
        "fin_code",
        finCodes
      );

  if (quoteResult.error) {
    throw new Error(
      quoteResult.error.message
    );
  }

  const quoteByFinCode =
    new Map(
      (quoteResult.data || []).map(
        (quote) => [
          quote.fin_code,
          quote,
        ]
      )
    );

  return stocks.map(
    (stock) => {
      const finCode =
        stock.wealthstreet_fin_code;

      const quote =
        finCode
          ? quoteByFinCode.get(
              finCode
            )
          : null;

      return {
        stockId:
          stock.id,

        company:
          stock.company_name,

        symbol:
          stock.symbol,

        finCode,

        mapped:
          Boolean(finCode),

        ltp:
          quote?.nse_current_price ??
          null,

        previousClose:
          quote?.nse_previous_close ??
          null,

        fetchedAt:
          quote?.fetched_at ??
          null,
      };
    }
  );
}

Deno.serve(
  async (request) => {
    try {
      if (
        request.method !==
        "POST"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Method not allowed.",
          },
          405
        );
      }

      let body: {
        action?: string;
        query?: string;
        finCode?: string;
        stockId?: string;
        forceRefresh?: boolean;
        limit?: number;
        stockIds?: string[];
      };

      try {
        body =
          await request.json();
      } catch {
        return jsonResponse(
          {
            success: false,
            error:
              "Request body must be valid JSON.",
          },
          400
        );
      }

      if (
        body.action ===
        "search-company"
      ) {
        const query =
          body.query?.trim() ||
          "";

        if (
          query.length < 2
        ) {
          return jsonResponse(
            {
              success: false,
              error:
                "Search query must contain at least 2 characters.",
            },
            400
          );
        }

        const companies =
          await searchCompanies(
            query
          );

        return jsonResponse({
          success: true,
          action:
            "search-company",
          query,
          count:
            companies.length,
          companies,
        });
      }

      if (
        body.action ===
        "smart-quotes"
      ) {
        const finCode =
          body.finCode?.trim() ||
          "";

        if (
          !/^\d+$/.test(
            finCode
          )
        ) {
          return jsonResponse(
            {
              success: false,
              error:
                "Valid numeric finCode is required.",
            },
            400
          );
        }

        const result =
          await getSmartQuoteWithCache(
            finCode,
            body.forceRefresh ===
              true
          );

        return jsonResponse({
          success: true,

          action:
            "smart-quotes",

          source:
            result.source,

          fetchedAt:
            result.fetchedAt,

          quote:
            result.quote,

          ...(
            "warning" in result
              ? {
                  warning:
                    result.warning,
                }
              : {}
          ),
        });
      }

      if (
        body.action ===
        "map-stock"
      ) {
        const stockId =
          body.stockId?.trim() ||
          "";

        if (!stockId) {
          return jsonResponse(
            {
              success: false,
              error:
                "stockId is required.",
            },
            400
          );
        }

        const stock =
          await getStockById(
            stockId
          );

        if (!stock) {
          return jsonResponse(
            {
              success: false,
              error:
                "Stock not found.",
            },
            404
          );
        }

        const result =
          await mapSingleStock(
            stock
          );

        return jsonResponse({
          success: true,
          action:
            "map-stock",
          result,
        });
      }

      if (
        body.action ===
        "map-current-stocks"
      ) {
        const result =
          await mapCurrentStocks(
            body.limit ?? 5
          );

        return jsonResponse({
          success: true,

          action:
            "map-current-stocks",

          reportDate:
            result.reportDate,

          currentReportStockCount:
            result.currentReportStockCount,

          remainingUnchecked:
            result.remainingUnchecked,

          count:
            result.results.length,

          results:
            result.results,
        });
      }

      if (
        body.action ===
        "bulk-quotes"
      ) {
        const stockIds =
          Array.isArray(
            body.stockIds
          )
            ? body.stockIds
            : [];

        if (
          stockIds.length === 0
        ) {
          return jsonResponse(
            {
              success: false,
              error:
                "stockIds must contain at least one stock id.",
            },
            400
          );
        }

        const quotes =
          await getBulkQuotes(
            stockIds
          );

        return jsonResponse({
          success: true,

          action:
            "bulk-quotes",

          count:
            quotes.length,

          quotes,
        });
      }

      return jsonResponse(
        {
          success: false,

          error:
            "Unknown action.",

          supportedActions: [
            "search-company",
            "smart-quotes",
            "map-stock",
            "map-current-stocks",
            "bulk-quotes",
          ],
        },
        400
      );
    } catch (error) {
      console.error(
        "market-data error:",
        error
      );

      return jsonResponse(
        {
          success: false,

          error:
            getErrorMessage(
              error
            ),
        },
        500
      );
    }
  }
);