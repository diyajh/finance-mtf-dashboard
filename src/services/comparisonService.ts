import type { DashboardRow } from "./dashboardService";

export type ComparedRow = DashboardRow & {
  previousFundedQty: number;
  previousFundedAmount: number;
  qtyChange: number;
  amountChange: number;
  amountChangePercent: number;
};

function safeNumber(value: number | null | undefined) {
  return value ?? 0;
}

export function compareRows(
  currentRows: DashboardRow[],
  previousRows: DashboardRow[]
) {
  const previousMap = new Map(
    previousRows.map((row) => [row.company, row])
  );

  const comparedRows: ComparedRow[] = currentRows.map((currentRow) => {
    const previousRow = previousMap.get(currentRow.company);

    const currentQty = safeNumber(currentRow.fundedQty);
    const previousQty = safeNumber(previousRow?.fundedQty);

    const currentAmount = safeNumber(currentRow.fundedAmount);
    const previousAmount = safeNumber(previousRow?.fundedAmount);

    const qtyChange = currentQty - previousQty;
    const amountChange = currentAmount - previousAmount;

    const amountChangePercent =
      previousAmount > 0
        ? Number(((amountChange / previousAmount) * 100).toFixed(2))
        : 0;

    return {
      ...currentRow,
      previousFundedQty: previousQty,
      previousFundedAmount: previousAmount,
      qtyChange,
      amountChange,
      amountChangePercent,
    };
  });

  const addedRows = comparedRows
    .filter((row) => row.amountChange > 0)
    .sort((a, b) => b.amountChange - a.amountChange);

  const liquidatedRows = comparedRows
    .filter((row) => row.amountChange < 0)
    .sort((a, b) => Math.abs(b.amountChange) - Math.abs(a.amountChange));

  const positionsAdded = addedRows.reduce(
    (sum, row) => sum + row.amountChange,
    0
  );

  const positionsLiquidated = liquidatedRows.reduce(
    (sum, row) => sum + Math.abs(row.amountChange),
    0
  );

  return {
    overallRows: comparedRows,
    addedRows,
    liquidatedRows,
    metrics: {
      positionsAdded,
      positionsLiquidated,
      netBook: positionsAdded - positionsLiquidated,
    },
  };
}