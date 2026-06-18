import { useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { supabase } from "../lib/supabase";

type RawRow = string[];

function FileUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setSelectedFile(file);
      setUploaded(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setUploaded(false);
  };

  const cleanNumber = (value: unknown) => {
    if (value === undefined || value === null || value === "") return null;

    const cleaned = String(value).replace(/,/g, "").trim();
    const numberValue = Number(cleaned);

    return Number.isNaN(numberValue) ? null : numberValue;
  };

  const chunkArray = <T,>(array: T[], size: number) => {
    const chunks: T[][] = [];

    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }

    return chunks;
  };

  const parseReportDate = (rows: RawRow[]) => {
    const firstLine = rows[0]?.[0] || "";
    const match = firstLine.match(/(\d{2})-([A-Z]{3})-(\d{4})/);

    if (!match) {
      return new Date().toISOString().slice(0, 10);
    }

    const [, day, monthText, year] = match;

    const months: Record<string, string> = {
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

    return `${year}-${months[monthText]}-${day}`;
  };

  const parseFile = async (file: File): Promise<RawRow[]> => {
    if (file.name.toLowerCase().endsWith(".csv")) {
      return new Promise((resolve, reject) => {
        Papa.parse<string[]>(file, {
          header: false,
          skipEmptyLines: false,
          complete: (results) => resolve(results.data as RawRow[]),
          error: (error) => reject(error),
        });
      });
    }

    const fileBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    return XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    }) as RawRow[];
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setLoading(true);

      const rows = await parseFile(selectedFile);

      console.log("Raw rows:", rows.slice(0, 20));

      const headerIndex = rows.findIndex(
        (row) => String(row[0]).trim().toLowerCase() === "symbol"
      );

      if (headerIndex === -1) {
        alert("Could not find Symbol row in file.");
        return;
      }

      const reportDate = parseReportDate(rows);

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

      console.log("Clean stock rows:", stockRows.slice(0, 10));
      console.log("Total stock rows:", stockRows.length);

      const { data: reportData, error: reportError } = await supabase
        .from("weekly_reports")
        .insert([
          {
            report_date: reportDate,
            file_name: selectedFile.name,
            uploaded_by: "admin",
          },
        ])
        .select()
        .single();

      if (reportError) throw reportError;

      const { error: fileError } = await supabase.from("uploaded_files").insert([
        {
          report_id: reportData.id,
          file_name: selectedFile.name,
          file_type: selectedFile.type || "csv/excel",
          file_size: selectedFile.size,
        },
      ]);

      if (fileError) throw fileError;

      const stockInsertRows = stockRows.map((row) => ({
        symbol: row.symbol,
        company_name: row.company_name,
      }));

      const allStocks: { id: string; symbol: string }[] = [];

      for (const chunk of chunkArray(stockInsertRows, 500)) {
        const { data, error } = await supabase
          .from("stocks")
          .upsert(chunk, { onConflict: "symbol" })
          .select("id, symbol");

        if (error) throw error;

        allStocks.push(...(data || []));
      }

      const stockIdBySymbol = new Map(
        allStocks.map((stock) => [stock.symbol, stock.id])
      );

      const holdingRows = stockRows
        .map((row) => {
          const stockId = stockIdBySymbol.get(row.symbol);

          if (!stockId) return null;

          return {
            report_id: reportData.id,
            stock_id: stockId,
            status: "overall",
            funded_qty: row.funded_qty,
            funded_amount_cr: row.funded_amount_cr,
          };
        })
        .filter(Boolean);

      for (const chunk of chunkArray(holdingRows, 500)) {
        const { error } = await supabase.from("mtf_holdings").insert(chunk);

        if (error) throw error;
      }

      setUploaded(true);
      alert(`File uploaded successfully. Stocks inserted: ${stockRows.length}`);
    } catch (error) {
      console.error(error);
      alert("Upload failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-box">
      <div className="upload-icon">⇩</div>

      <h2>{selectedFile ? selectedFile.name : "Drop files or click to upload"}</h2>

      <p>Supported formats: .xlsx, .xls, .csv</p>

      {!selectedFile && (
        <label className="browse-button">
          Browse File
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            onChange={handleFileChange}
          />
        </label>
      )}

      {selectedFile && (
        <>
          <p style={{ marginTop: "16px", fontWeight: 600 }}>
            Selected file: {selectedFile.name}
          </p>

          <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
            <button className="cancel-btn" onClick={handleCancel}>
              Cancel Upload
            </button>

            <button className="upload-btn" onClick={handleUpload} disabled={loading}>
              {loading ? "Adding..." : "Add Data For Analysis"}
            </button>
          </div>
        </>
      )}

      {uploaded && (
        <p style={{ marginTop: "18px", color: "#16a34a", fontWeight: 700 }}>
          ✓ Stock data saved to database successfully
        </p>
      )}
    </div>
  );
}

export default FileUpload;