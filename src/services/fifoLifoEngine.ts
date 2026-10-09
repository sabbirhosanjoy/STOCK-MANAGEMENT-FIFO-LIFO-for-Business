import { InventoryItem, InventoryBatch, BatchDeductionRecord, ValuationMethod } from '../types';

/**
 * Deducts requested quantity from item batches using either FIFO or LIFO.
 * - FIFO: Uses oldest batch first (by purchaseDate ascending, then batch order).
 * - LIFO: Uses newest batch first (by purchaseDate descending, then reverse order).
 */
export function deductStock(
  item: InventoryItem,
  quantityToDeduct: number
): {
  success: boolean;
  error?: string;
  updatedBatches: InventoryBatch[];
  deductions: BatchDeductionRecord[];
  totalCost: number;
  averageUnitCost: number;
} {
  const totalAvailable = item.batches.reduce((sum, b) => sum + b.remainingQty, 0);
  if (totalAvailable < quantityToDeduct) {
    return {
      success: false,
      error: `পর্যাপ্ত স্টক নেই! অবশিষ্ট স্টক: ${totalAvailable} পিস, প্রয়োজন: ${quantityToDeduct} পিস।`,
      updatedBatches: item.batches,
      deductions: [],
      totalCost: 0,
      averageUnitCost: 0,
    };
  }

  // Clone batches
  const batches = item.batches.map((b) => ({ ...b }));

  // Sort batches based on valuation method
  // FIFO: oldest purchase date first
  // LIFO: newest purchase date first
  const sortedBatchIndices = batches
    .map((b, idx) => ({ ...b, originalIdx: idx }))
    .sort((a, b) => {
      const timeA = new Date(a.purchaseDate).getTime();
      const timeB = new Date(b.purchaseDate).getTime();
      if (item.valuationMethod === 'FIFO') {
        return timeA - timeB;
      } else {
        return timeB - timeA;
      }
    });

  let remainingNeeded = quantityToDeduct;
  const deductions: BatchDeductionRecord[] = [];
  let totalCost = 0;

  for (const entry of sortedBatchIndices) {
    if (remainingNeeded <= 0) break;
    const batch = batches[entry.originalIdx];
    if (batch.remainingQty <= 0) continue;

    const takeQty = Math.min(batch.remainingQty, remainingNeeded);
    batch.remainingQty -= takeQty;
    remainingNeeded -= takeQty;

    const cost = takeQty * batch.unitCostPrice;
    totalCost += cost;

    deductions.push({
      itemId: item.id,
      batchId: batch.batchId,
      batchCode: batch.batchCode,
      qtyDeducted: takeQty,
      unitCostPrice: batch.unitCostPrice,
    });
  }

  const averageUnitCost = quantityToDeduct > 0 ? totalCost / quantityToDeduct : 0;

  return {
    success: true,
    updatedBatches: batches,
    deductions,
    totalCost,
    averageUnitCost,
  };
}

/**
 * Restores stock back into item batches when an order is returned or cancelled.
 */
export function restoreStock(
  item: InventoryItem,
  deductions: BatchDeductionRecord[]
): InventoryBatch[] {
  const batches = item.batches.map((b) => ({ ...b }));
  const relevantDeductions = deductions.filter((d) => d.itemId === item.id);

  for (const ded of relevantDeductions) {
    const target = batches.find((b) => b.batchId === ded.batchId);
    if (target) {
      target.remainingQty += ded.qtyDeducted;
    } else {
      // If original batch was somehow removed, append a restoration lot
      batches.push({
        batchId: ded.batchId || `restored-${Date.now()}`,
        batchCode: `${ded.batchCode || 'RET'}-Restored`,
        purchaseDate: new Date().toISOString().split('T')[0],
        unitCostPrice: ded.unitCostPrice,
        defaultSellingPrice: item.defaultSellingPrice,
        initialQty: ded.qtyDeducted,
        remainingQty: ded.qtyDeducted,
        supplier: 'Order Return / Cancelled',
      });
    }
  }

  return batches;
}

/**
 * Calculates current total quantity and valuation of an inventory item.
 */
export function calculateItemStock(item: InventoryItem): {
  totalQty: number;
  totalValuation: number;
  averageCostPrice: number;
} {
  const totalQty = item.batches.reduce((sum, b) => sum + Math.max(0, b.remainingQty), 0);
  const totalValuation = item.batches.reduce(
    (sum, b) => sum + Math.max(0, b.remainingQty) * b.unitCostPrice,
    0
  );
  const averageCostPrice = totalQty > 0 ? totalValuation / totalQty : 0;

  return {
    totalQty,
    totalValuation,
    averageCostPrice,
  };
}
