export type AdjustmentType =
	'damage' | 'expired' | 'missing' | 'correction' | 'opening-stock' | 'other';

export interface StockAdjustment {
	id: string;
	productId: string;
	productName: string;
	batchId: string;
	batchNumber: string;
	adjustmentType: AdjustmentType;
	/** Positive for increase, negative for decrease */
	quantity: number;
	previousQuantity: number;
	newQuantity: number;
	reason: string;
	notes?: string;
	createdBy: string;
	createdAt: string;
}

export type CreateStockAdjustmentInput = Omit<
	StockAdjustment,
	'id' | 'previousQuantity' | 'newQuantity' | 'productName' | 'batchNumber' | 'createdAt'
>;
