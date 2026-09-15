export type CompanyResult = {
  finCode: string;
  company: string;
};

export type ExchangeQuote = {
  currentPrice: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  volume: number | null;
};

export type SmartQuoteResult = {
  finCode: string;
  company: string | null;
  nseSymbol: string | null;
  bseCode: string | null;
  isin: string | null;
  industry: string | null;
  nse: ExchangeQuote;
  bse: ExchangeQuote;
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(
  value: string | null | undefined
): number | null {
  if (!value) {
    return null;
  }

  const cleaned = value
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/%/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

function parseCompanyResults(
  html: string
): CompanyResult[] {
  const results: CompanyResult[] = [];

  const regex =
    /SetCompanyFINCODE\((\d+),'([^']+)'\)/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const finCode = match[1];
    const company = decodeHtml(match[2]);

    const alreadyExists = results.some(
      (result) => result.finCode === finCode
    );

    if (!alreadyExists) {
      results.push({
        finCode,
        company,
      });
    }
  }

  return results;
}

function extractFirst(
  html: string,
  regex: RegExp
): string | null {
  const match = regex.exec(html);

  if (!match?.[1]) {
    return null;
  }

  return decodeHtml(match[1]);
}

function extractExchangeBlock(
  html: string,
  exchange: "NSE" | "BSE"
) {
  const regex = new RegExp(
    `<section[^>]*id=["']${exchange}["'][^>]*>([\\s\\S]*?)(?=<section|$)`,
    "i"
  );

  const match = regex.exec(html);

  return match?.[1] || "";
}

function extractMetric(
  block: string,
  labelPattern: string
): number | null {
  if (!block) {
    return null;
  }

  const regex = new RegExp(
    `${labelPattern}[\\s\\S]*?<h3[^>]*>\\s*([^<]+)`,
    "i"
  );

  const value = extractFirst(block, regex);

  return toNumber(value);
}

function parseCurrentExchangePrice(
  html: string,
  exchange: "NSE" | "BSE"
) {
  const regex = new RegExp(
    `<h2[^>]*>\\s*${exchange}\\s*</h2>[\\s\\S]*?` +
      `<h3[^>]*>\\s*([+-]?[\\d,.]+)\\s*\\(([+-]?[\\d,.]+)\\s*%\\)[\\s\\S]*?` +
      `<h2[^>]*current-value[^>]*>\\s*([\\d,.]+)`,
    "i"
  );

  const match = regex.exec(html);

  if (!match) {
    return {
      currentPrice: null,
      change: null,
      changePercent: null,
    };
  }

  return {
    change: toNumber(match[1]),
    changePercent: toNumber(match[2]),
    currentPrice: toNumber(match[3]),
  };
}

function parseSmartQuotes(
  html: string,
  finCode: string
): SmartQuoteResult {
  const company = extractFirst(
    html,
    /<h2[^>]*eqt-company-heading[^>]*>\s*([^<]+)\s*<\/h2>/i
  );

  const nseSymbol = extractFirst(
    html,
    /NSE\s*:\s*<span>\s*([^<]+)\s*<\/span>/i
  );

  const bseCode = extractFirst(
    html,
    /BSE\s*:\s*<span>\s*([^<]+)\s*<\/span>/i
  );

  const isin = extractFirst(
    html,
    /ISIN CODE\s*:\s*<span>\s*([^<]+)\s*<\/span>/i
  );

  const industry = extractFirst(
    html,
    /INDUSTRY\s*:\s*<span>\s*([^<]+)\s*<\/span>/i
  );

  const nseBlock = extractExchangeBlock(
    html,
    "NSE"
  );

  const bseBlock = extractExchangeBlock(
    html,
    "BSE"
  );

  const nseCurrent = parseCurrentExchangePrice(
    html,
    "NSE"
  );

  const bseCurrent = parseCurrentExchangePrice(
    html,
    "BSE"
  );

  return {
    finCode,
    company,
    nseSymbol,
    bseCode,
    isin,
    industry,

    nse: {
      currentPrice: nseCurrent.currentPrice,
      previousClose: extractMetric(
        nseBlock,
        `Prev\\s*Close(?:\\(₹\\))?`
      ),
      change: nseCurrent.change,
      changePercent: nseCurrent.changePercent,
      open: extractMetric(
        nseBlock,
        `Open\\s*Price(?:\\(₹\\))?`
      ),
      volume: extractMetric(
        nseBlock,
        "Volume"
      ),
    },

    bse: {
      currentPrice: bseCurrent.currentPrice,
      previousClose: extractMetric(
        bseBlock,
        `Prev\\s*Close(?:\\(₹\\))?`
      ),
      change: bseCurrent.change,
      changePercent: bseCurrent.changePercent,
      open: extractMetric(
        bseBlock,
        `Open\\s*Price(?:\\(₹\\))?`
      ),
      volume: extractMetric(
        bseBlock,
        "Volume"
      ),
    },
  };
}

function getHeaders() {
  return {
    "Content-Type":
      "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    Referer: "https://www.wealthstreet.in/Equity",
  };
}

const WEALTHSTREET_TIMEOUT_MS = 15000;

async function fetchWealthstreet(
  input: string,
  init: RequestInit
) {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, WEALTHSTREET_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        `Wealthstreet request timed out after ${
          WEALTHSTREET_TIMEOUT_MS / 1000
        } seconds`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function searchCompanies(
  query: string
): Promise<CompanyResult[]> {
  const body = new URLSearchParams();

  body.set("CompName", query);
  body.set("FinCode", "");
  body.set("CorpSel", "SmartQuotes");

  const response = await fetchWealthstreet(
    "https://www.wealthstreet.in/Equity/GetCompanyDetails",
    {
      method: "POST",
      headers: getHeaders(),
      body: body.toString(),
    }
  );

  const html = await response.text();

  if (!response.ok) {
    throw new Error(
      `Wealthstreet company search failed with ${response.status}`
    );
  }

  return parseCompanyResults(html);
}

export async function fetchSmartQuote(
  finCode: string
): Promise<SmartQuoteResult> {
  const body = new URLSearchParams();

  body.set("CompName", "");
  body.set("FinCode", finCode);
  body.set("CorpSel", "SmartQuotes");
  body.set("Exchange", "BSE");
  body.set("ModeSelection", "1");
  body.set("RsSelection", "1");
  body.set("profitlossModeSelection", "1");
  body.set("ProfitlossRs", "1");
  body.set("FRModeSelection", "1");
  body.set("PlotId", "");
  body.set("CompWith", "");
  body.set("PeriodSelPC", "");
  body.set("BSmode", "1");
  body.set("BSRSMode", "1");

  const response = await fetchWealthstreet(
    "https://www.wealthstreet.in/Equity/GetCompanyProfile",
    {
      method: "POST",
      headers: getHeaders(),
      body: body.toString(),
    }
  );

  const html = await response.text();

  if (!response.ok) {
    throw new Error(
      `Wealthstreet SmartQuotes failed with ${response.status}`
    );
  }

  return parseSmartQuotes(html, finCode);
}