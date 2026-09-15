import {
    createClient,
  } from "https://esm.sh/@supabase/supabase-js@2";

  import {
    fetchSmartQuote,
    type SmartQuoteResult,
  } from "./wealthstreet.ts";

  const CACHE_MINUTES = 5;

  let adminClient:
    ReturnType<typeof createClient> | null =
      null;

  export function getSupabaseAdmin() {
    if (adminClient) {
      return adminClient;
    }

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL"
      );

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      );

    if (
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error(
        "Supabase server credentials are missing."
      );
    }

    adminClient =
      createClient(
        supabaseUrl,
        serviceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

    return adminClient;
  }

  function numberOrNull(
    value: unknown
  ): number | null {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }

  function cacheRowToQuote(
    row: Record<string, unknown>
  ): SmartQuoteResult {
    return {
      finCode:
        String(row.fin_code),

      company:
        typeof row.company_name ===
        "string"
          ? row.company_name
          : null,

      nseSymbol:
        typeof row.nse_symbol ===
        "string"
          ? row.nse_symbol
          : null,

      bseCode:
        typeof row.bse_code ===
        "string"
          ? row.bse_code
          : null,

      isin:
        typeof row.isin ===
        "string"
          ? row.isin
          : null,

      industry:
        typeof row.industry ===
        "string"
          ? row.industry
          : null,

      nse: {
        currentPrice:
          numberOrNull(
            row.nse_current_price
          ),

        previousClose:
          numberOrNull(
            row.nse_previous_close
          ),

        change:
          numberOrNull(
            row.nse_change
          ),

        changePercent:
          numberOrNull(
            row.nse_change_percent
          ),

        open:
          numberOrNull(
            row.nse_open
          ),

        volume:
          numberOrNull(
            row.nse_volume
          ),
      },

      bse: {
        currentPrice:
          numberOrNull(
            row.bse_current_price
          ),

        previousClose:
          numberOrNull(
            row.bse_previous_close
          ),

        change:
          numberOrNull(
            row.bse_change
          ),

        changePercent:
          numberOrNull(
            row.bse_change_percent
          ),

        open:
          numberOrNull(
            row.bse_open
          ),

        volume:
          numberOrNull(
            row.bse_volume
          ),
      },
    };
  }

  function isFresh(
    fetchedAt: string
  ) {
    const timestamp =
      new Date(
        fetchedAt
      ).getTime();

    if (
      Number.isNaN(
        timestamp
      )
    ) {
      return false;
    }

    const maxAge =
      CACHE_MINUTES *
      60 *
      1000;

    return (
      Date.now() -
        timestamp <
      maxAge
    );
  }

  async function getCachedQuote(
    finCode: string
  ) {
    const supabase =
      getSupabaseAdmin();

    const result =
      await supabase
        .from("market_quotes")
        .select("*")
        .eq(
          "fin_code",
          finCode
        )
        .maybeSingle();

    if (!result) {
      throw new Error(
        "market_quotes query returned no result object."
      );
    }

    if (result.error) {
      throw new Error(
        result.error.message
      );
    }

    if (!result.data) {
      return null;
    }

    const fetchedAt =
      String(
        result.data.fetched_at
      );

    return {
      quote:
        cacheRowToQuote(
          result.data
        ),

      fetchedAt,

      fresh:
        isFresh(
          fetchedAt
        ),
    };
  }

  async function saveQuote(
    quote: SmartQuoteResult
  ) {
    const supabase =
      getSupabaseAdmin();

    const now =
      new Date()
        .toISOString();

    const result =
      await supabase
        .from("market_quotes")
        .upsert(
          {
            fin_code:
              quote.finCode,

            company_name:
              quote.company,

            nse_symbol:
              quote.nseSymbol,

            bse_code:
              quote.bseCode,

            isin:
              quote.isin,

            industry:
              quote.industry,

            nse_current_price:
              quote.nse.currentPrice,

            nse_previous_close:
              quote.nse.previousClose,

            nse_change:
              quote.nse.change,

            nse_change_percent:
              quote.nse.changePercent,

            nse_open:
              quote.nse.open,

            nse_volume:
              quote.nse.volume,

            bse_current_price:
              quote.bse.currentPrice,

            bse_previous_close:
              quote.bse.previousClose,

            bse_change:
              quote.bse.change,

            bse_change_percent:
              quote.bse.changePercent,

            bse_open:
              quote.bse.open,

            bse_volume:
              quote.bse.volume,

            fetched_at:
              now,

            updated_at:
              now,
          },
          {
            onConflict:
              "fin_code",
          }
        );

    if (!result) {
      throw new Error(
        "market_quotes upsert returned no result object."
      );
    }

    if (result.error) {
      throw new Error(
        result.error.message
      );
    }

    return now;
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

  export async function getSmartQuoteWithCache(
    finCode: string,
    forceRefresh = false
  ) {
    const cached =
      await getCachedQuote(
        finCode
      );

    if (
      cached &&
      cached.fresh &&
      !forceRefresh
    ) {
      return {
        source:
          "cache" as const,

        fetchedAt:
          cached.fetchedAt,

        quote:
          cached.quote,
      };
    }

    try {
      const quote =
        await fetchSmartQuote(
          finCode
        );

      const fetchedAt =
        await saveQuote(
          quote
        );

      return {
        source:
          "wealthstreet" as const,

        fetchedAt,

        quote,
      };
    } catch (error) {
      if (cached) {
        return {
          source:
            "stale-cache" as const,

          fetchedAt:
            cached.fetchedAt,

          quote:
            cached.quote,

          warning:
            getErrorMessage(
              error
            ),
        };
      }

      throw error;
    }
  }