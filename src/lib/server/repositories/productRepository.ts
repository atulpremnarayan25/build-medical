import type { ProductRepository } from '$lib/repositories/productRepository.js';
import type { Product, CreateProductInput } from '$lib/types/index.js';
import { productsTable, productUnitsTable } from '../db/schema.js';
import { eq, and, ilike, or } from 'drizzle-orm';
import { mapToProduct } from '../db/mappers.js';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '../db/index.js';
import { logSyncOutbox } from '../db/sync/outbox.js';

export class DbProductRepository implements ProductRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	async getAll(): Promise<Product[]> {
		const rows = await this._db
			.select()
			.from(productsTable)
			.where(eq(productsTable.isActive, true));

		return rows.map(mapToProduct);
	}

	async getById(id: string): Promise<Product | null> {
		const rows = await this._db
			.select()
			.from(productsTable)
			.where(eq(productsTable.id, id))
			.limit(1);
		if (rows.length === 0) return null;
		return mapToProduct(rows[0]);
	}

	async create(input: CreateProductInput): Promise<Product> {
		const id = uuidv4();
		const now = new Date();
		const unitId = uuidv4();

		const values = {
			id,
			storeId: '00000000-0000-0000-0000-000000000000',
			originNode: 'local',
			name: input.name,
			genericName: input.genericName || '',
			manufacturer: input.manufacturer || '',
			category: input.category || '',
			hsnCode: input.hsn || '',
			mrp: input.mrp !== undefined ? String(input.mrp) : '0',
			sellingRate: input.sellingRate !== undefined ? String(input.sellingRate) : '0',
			purchaseRate: input.purchaseRate !== undefined ? String(input.purchaseRate) : '0',
			packSize: input.packSize !== undefined ? input.packSize : 1,
			drugSchedule: input.drugSchedule || 'none',
			gstRate: input.gstRate ? String(input.gstRate) : '0',
			isActive: true,
			updatedAt: now
		};

		const baseUnitValues = {
			id: unitId,
			productId: id,
			unitName: 'Unit',
			conversionToBase: '1',
			wholesalePrice: String(input.sellingRate || 0),
			retailPrice: String(input.sellingRate || input.mrp || 0),
			isBaseUnit: true,
			originNode: 'local',
			createdAt: now,
			updatedAt: now
		};

		await pgDb.transaction(async (tx) => {
			await tx.insert(productsTable).values(values as any);
			await tx.insert(productUnitsTable).values(baseUnitValues as any);
			await logSyncOutbox(tx, 'products', id, 'insert', values);
			await logSyncOutbox(tx, 'product_units', unitId, 'insert', baseUnitValues);
		});

		return this.getById(id) as Promise<Product>;
	}

	async update(id: string, input: Partial<CreateProductInput>): Promise<Product> {
		const updateData: any = { updatedAt: new Date() };
		if (input.name !== undefined) updateData.name = input.name;
		if (input.genericName !== undefined) updateData.genericName = input.genericName;
		if (input.manufacturer !== undefined) updateData.manufacturer = input.manufacturer;
		if (input.category !== undefined) updateData.category = input.category;
		if (input.hsn !== undefined) updateData.hsnCode = input.hsn;
		if (input.mrp !== undefined) updateData.mrp = String(input.mrp);
		if (input.sellingRate !== undefined) updateData.sellingRate = String(input.sellingRate);
		if (input.purchaseRate !== undefined) updateData.purchaseRate = String(input.purchaseRate);
		if (input.packSize !== undefined) updateData.packSize = input.packSize;
		if (input.drugSchedule !== undefined) updateData.drugSchedule = input.drugSchedule;
		if (input.gstRate !== undefined) updateData.gstRate = String(input.gstRate);
		if (input.active !== undefined) updateData.isActive = input.active;

		await pgDb.transaction(async (tx) => {
			await tx.update(productsTable).set(updateData).where(eq(productsTable.id, id));

			// Re-fetch to get complete payload for outbox
			const updated = await tx
				.select()
				.from(productsTable)
				.where(eq(productsTable.id, id))
				.limit(1);
			if (updated.length > 0) {
				await logSyncOutbox(tx, 'products', id, 'update', updated[0]);
			}
		});

		return this.getById(id) as Promise<Product>;
	}

	async delete(id: string): Promise<void> {
		const updateData = {
			isActive: false,
			updatedAt: new Date()
		} as any;

		await pgDb.transaction(async (tx) => {
			await tx.update(productsTable).set(updateData).where(eq(productsTable.id, id));

			// Re-fetch to get complete payload for outbox
			const updated = await tx
				.select()
				.from(productsTable)
				.where(eq(productsTable.id, id))
				.limit(1);
			if (updated.length > 0) {
				await logSyncOutbox(tx, 'products', id, 'update', updated[0]);
			}
		});
	}

	async search(query: string): Promise<Product[]> {
		const search = `%${query}%`;
		const rows = await this._db
			.select()
			.from(productsTable)
			.where(
				and(
					eq(productsTable.isActive, true),
					or(
						ilike(productsTable.name, search),
						ilike(productsTable.genericName, search),
						ilike(productsTable.manufacturer, search),
						ilike(productsTable.category, search)
					)
				)
			);
		return rows.map(mapToProduct);
	}
}
