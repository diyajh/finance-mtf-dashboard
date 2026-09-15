import fs from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path = ".env") {
  if (!fs.existsSync(path)) {
    throw new Error(`Could not find ${path}`);
  }

  const env = {};

  for (const rawLine of fs.readFileSync(path, "utf8").split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const env = loadEnvFile();

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is missing from .env");
}

if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY is missing from .env");
}

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

const BATCH_SIZE = 3;
const WAIT_BETWEEN_BATCHES_MS = 5000;
const WAIT_AFTER_ERROR_MS = 30000;
const MAX_CONSECUTIVE_ERRORS = 5;

let batchNumber = 0;
let consecutiveErrors = 0;

let totalMapped = 0;
let totalNoMatch = 0;
let totalReview = 0;
let totalErrors = 0;

console.log("Starting Wealthstreet mapping...");

while (true) {
  batchNumber += 1;

  console.log(`\nBatch ${batchNumber}`);

  try {
    const { data, error } =
      await supabase.functions.invoke("market-data", {
        body: {
          action: "map-current-stocks",
          limit: BATCH_SIZE,
        },
      });

    if (error) {
      throw error;
    }

    if (!data?.success) {
      throw new Error(
        data?.error || "Mapper returned success=false"
      );
    }

    consecutiveErrors = 0;

    const results = Array.isArray(data.results)
      ? data.results
      : [];

    let mapped = 0;
    let noMatch = 0;
    let review = 0;
    let errors = 0;

    for (const result of results) {
      if (result.status === "mapped") {
        mapped += 1;
      } else if (result.status === "no_match") {
        noMatch += 1;
      } else if (result.status === "review") {
        review += 1;
      } else if (result.status === "error") {
        errors += 1;
      }
    }

    totalMapped += mapped;
    totalNoMatch += noMatch;
    totalReview += review;
    totalErrors += errors;

    console.log(`Report: ${data.reportDate}`);
    console.log(`Processed: ${data.count}`);
    console.log(`Mapped: ${mapped}`);
    console.log(`No match: ${noMatch}`);
    console.log(`Review: ${review}`);
    console.log(`Errors: ${errors}`);
    console.log(
      `Remaining unchecked: ${data.remainingUnchecked}`
    );

    console.log(
      `Running totals -> mapped: ${totalMapped}, no_match: ${totalNoMatch}, review: ${totalReview}, errors: ${totalErrors}`
    );

    if (data.remainingUnchecked === 0) {
      console.log("\nMapping complete.");
      break;
    }

    if (data.count === 0) {
      console.log(
        "\nStopped because no rows were processed."
      );
      break;
    }

    await sleep(WAIT_BETWEEN_BATCHES_MS);
  } catch (error) {
    consecutiveErrors += 1;
    totalErrors += 1;

    console.error(
      `Batch ${batchNumber} failed:`,
      error
    );

    if (
      consecutiveErrors >= MAX_CONSECUTIVE_ERRORS
    ) {
      console.error(
        `\nStopping after ${MAX_CONSECUTIVE_ERRORS} consecutive failures.`
      );
      process.exit(1);
    }

    console.log(
      `Waiting ${WAIT_AFTER_ERROR_MS / 1000} seconds before retrying...`
    );

    await sleep(WAIT_AFTER_ERROR_MS);
  }
}

console.log("\nFinal totals:");

console.log({
  mapped: totalMapped,
  noMatch: totalNoMatch,
  review: totalReview,
  errors: totalErrors,
});