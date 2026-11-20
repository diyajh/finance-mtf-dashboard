# Finance MTF Dashboard

A web dashboard that turns weekly Margin Trading Facility (MTF) holding reports into stock rankings, summary metrics, and per-stock history. Built for an enterprise client, it replaces manually reviewing report spreadsheets with a searchable view of the latest positions and how they change over time.

The dataset covers about 3.24 million holding records across 3,303 stocks and 2,041 weekly reports (January 2018 to June 2026).

## Features

- **Summary metrics:** industry book, positions added, positions liquidated, and net book for the latest report date.
- **Top stocks:** cards for the five largest positions, linked to each stock's detail page.
- **MTF table:** search by stock, sort by name or amount, and switch between overall, added, and liquidated views, with optional weekly or monthly change comparison.
- **Stock detail page:** a line chart of a stock's MTF history with a month and year range filter and a "show all history" option.
- **Report upload:** drag in a CSV or Excel file (.csv, .xlsx, .xls). It is parsed in the browser, and the stocks and holdings are written to Supabase in batches.
- **Upload history:** a list of every report that has been uploaded.
- **Bulk historical import:** a Node script that loads a ZIP of past weekly reports in batches.

## Tech Stack

| Area | Tools |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Charts | Recharts |
| File parsing | PapaParse (CSV), SheetJS (Excel), adm-zip |
| Backend and database | Supabase (PostgreSQL) |
| Tooling | ESLint, typescript-eslint |

## Project Structure

```
src/
  components/   UI: Header, MetricCards, TopStockCards, MtfTable,
                StockDetailPage, FileUpload, UploadPage, UploadHistoryPage
  services/     Data access and calculations: dashboardService,
                stockHistoryService, comparisonService
  lib/          Supabase client
scripts/
  importHistoricalZip.mjs   Bulk import of historical reports
```

## Data Model

| Table | Purpose |
|---|---|
| `stocks` | One row per stock symbol |
| `weekly_reports` | One row per uploaded report and its report date |
| `mtf_holdings` | Holding amounts per stock per report |
| `uploaded_files` | Record of each uploaded file |

## Getting Started

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/diyajh/finance-mtf-dashboard.git
   cd finance-mtf-dashboard
   npm install
   ```

2. Create a `.env` file in the project root with your Supabase project details:

   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Optional: import historical reports from a ZIP file:

   ```bash
   node scripts/importHistoricalZip.mjs ./path/to/reports.zip
   ```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
