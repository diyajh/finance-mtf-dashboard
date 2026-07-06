import "dotenv/config";
import AdmZip from "adm-zip";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const zipPath = process.argv[2];

if (!zipPath) {
  console.error("Usage: node scripts/importHistoricalZip.mjs ./path/to/2026.zip");
  process.exit(1);
}

const STOCK_BATCH_SIZE = 100;
const HOLDING_BATCH_SIZE = 150;

function cleanNumber(value) {
  if (value === undefined || value === null || value === "") return null;

  const cleaned = String(value).replace(/,/g, "").trim();
  const num = Number(cleaned);

  return Number.isNaN(num) ? null : num;
}

function parseDateFromText(text, fallbackFileName) {
  const match = String(text).match(/(\d{2})-([A-Z]{3})-(\d{4})/);

  if (match) {
    const [, day, mon, year] = match;

    const months = {
      JAN: "01",
      FEB: "02",
      MAR: "03",
      APR: "04",
      MAY: "05",
      JUN: "06",
      JUL: "07",
      AUG: "08",
      SEP: "09",
      OCT: "10",
      NOV: "11",
      DEC: "12",
    };

    return `${year}-${months[mon]}-${day}`;
  }

  const eightDigitMatch = fallbackFileName.match(/(\d{2})(\d{2})(\d{4})/);

  if (eightDigitMatch) {
    const [, dd, mm, yyyy] = eightDigitMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  const sixDigitMatch = fallbackFileName.match(/(\d{2})(\d{2})(\d{2})/);

  if (sixDigitMatch) {
    const [, dd, mm, yy] = sixDigitMatch;
    return `20${yy}-${mm}-${dd}`;
  }

  return null;
}

function chunkArray(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

function shouldSkipEntry(entryName) {
  return (
    entryName.startsWith("__MACOSX/") ||
    entryName.includes("__MACOSX") ||
    entryName.includes("/._") ||
    entryName.startsWith("._") ||
    entryName.endsWith("/")
  );
}

async function getOrCreateReport(reportDate, fileName) {
  const existing = await supabase
    .from("weekly_reports")
    .select("id")
    .eq("report_date", reportDate)
    .eq("file_name", fileName)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    const { count, error: countError } = await supabase
      .from("mtf_holdings")
      .select("*", { count: "exact", head: true })
      .eq("report_id", existing.data.id);

    if (countError) throw countError;

    if ((count || 0) > 0) {
      return { report: existing.data, alreadyImported: true };
    }

    return { report: existing.data, alreadyImported: false };
  }

  const { data, error } = await supabase
    .from("weekly_reports")
    .insert([
      {
        report_date: reportDate,
        file_name: fileName,
        uploaded_by: "historical-import",
      },
    ])
    .select("id")
    .single();

  if (error) throw error;

  return { report: data, alreadyImported: false };
}

async function processCsv(csvText, fileName) {
  const parsed = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: false,
  });

  const rows = parsed.data;
  const reportDate = parseDateFromText(rows[0]?.[0] || "", fileName);

  if (!reportDate) {
    console.log(`Skipped ${fileName}: could not detect report date`);
    return;
  }

  const headerIndex = rows.findIndex(
    (row) => String(row[0]).trim().toLowerCase() === "symbol"
  );

  if (headerIndex === -1) {
    console.log(`Skipped ${fileName}: Symbol row not found`);
    return;
  }

  const stockRows = rows
    .slice(headerIndex + 1)
    .filter((row) => row[0] && row[1])
    .map((row) => {
      const amountInLakhs = cleanNumber(row[3]);

      return {
        symbol: String(row[0]).trim(),
        company_name: String(row[1]).trim(),
        funded_qty: cleanNumber(row[2]),
        funded_amount_cr:
          amountInLakhs === null ? null : amountInLakhs / 100,
      };
    });

  const { report, alreadyImported } = await getOrCreateReport(
    reportDate,
    fileName
  );

  if (alreadyImported) {
    console.log(`Skipped duplicate: ${fileName}`);
    return;
  }

  await supabase.from("uploaded_files").insert([
    {
      report_id: report.id,
      file_name: fileName,
      file_type: "csv",
      file_size: csvText.length,
    },
  ]);

  const uniqueStockMap = new Map();

  for (const row of stockRows) {
    if (!uniqueStockMap.has(row.symbol)) {
      uniqueStockMap.set(row.symbol, {
        symbol: row.symbol,
        company_name: row.company_name,
      });
    }
  }

  const stockInsertRows = Array.from(uniqueStockMap.values());

  for (const chunk of chunkArray(stockInsertRows, STOCK_BATCH_SIZE)) {
    const { error } = await supabase
      .from("stocks")
      .upsert(chunk, { onConflict: "symbol" });

    if (error) throw error;
  }

  const stockIdBySymbol = new Map();

  for (const chunk of chunkArray(stockInsertRows, STOCK_BATCH_SIZE)) {
    const symbols = chunk.map((row) => row.symbol);

    const { data, error } = await supabase
      .from("stocks")
      .select("id, symbol")
      .in("symbol", symbols);

    if (error) throw error;

    for (const stock of data || []) {
      stockIdBySymbol.set(stock.symbol, stock.id);
    }
  }

  const holdingRows = stockRows
    .map((row) => {
      const stockId = stockIdBySymbol.get(row.symbol);

      if (!stockId) return null;

      return {
        report_id: report.id,
        stock_id: stockId,
        status: "overall",
        funded_qty: row.funded_qty,
        funded_amount_cr: row.funded_amount_cr,
      };
    })
    .filter(Boolean);

  for (const chunk of chunkArray(holdingRows, HOLDING_BATCH_SIZE)) {
    const { error } = await supabase.from("mtf_holdings").insert(chunk);
    if (error) throw error;
  }

  console.log(
    `Imported ${fileName} | ${reportDate} | ${holdingRows.length} holdings`
  );
}

async function processCsvEntry(entryName, entryData) {
  if (shouldSkipEntry(entryName)) return false;
  if (!entryName.toLowerCase().endsWith(".csv")) return false;

  const csvText = entryData.toString("utf8");

  try {
    await processCsv(csvText, entryName);
    return true;
  } catch (error) {
    console.error(`Failed file: ${entryName}`);
    throw error;
  }
}

async function main() {
  const outerZip = new AdmZip(zipPath);
  const entries = outerZip.getEntries();

  let processed = 0;

  for (const entry of entries) {
    const entryName = entry.entryName;

    if (shouldSkipEntry(entryName)) continue;

    if (entryName.toLowerCase().endsWith(".csv")) {
      const didProcess = await processCsvEntry(entryName, entry.getData());

      if (didProcess) {
        processed += 1;
      }

      continue;
    }

    if (!entryName.toLowerCase().endsWith(".zip")) continue;

    let innerZip;

    try {
      innerZip = new AdmZip(entry.getData());
    } catch {
      console.log(`Skipped invalid zip entry: ${entryName}`);
      continue;
    }

    const innerEntries = innerZip.getEntries();

    for (const innerEntry of innerEntries) {
      const innerName = innerEntry.entryName;

      if (shouldSkipEntry(innerName)) continue;
      if (!innerName.toLowerCase().endsWith(".csv")) continue;

      const didProcess = await processCsvEntry(innerName, innerEntry.getData());

      if (didProcess) {
        processed += 1;
      }
    }
  }

  console.log(`Done. Processed ${processed} CSV files.`);
}

main().catch((error) => {
  console.error("Import failed:", error);
  process.exit(1);
});