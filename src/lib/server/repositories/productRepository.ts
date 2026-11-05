import type { ProductRepository } from '$lib/repositories/productRepository.js';
import type { Product, CreateProductInput } from '$lib/types/index.js';
import { productsTable, productUnitsTable, storesTable } from '../db/schema.js';
import { eq, and, ilike, or, sql } from 'drizzle-orm';
import { mapToProduct } from '../db/mappers.js';
import { v4 as uuidv4 } from 'uuid';
import { db as pgDb } from '../db/index.js';
import { logSyncOutbox } from '../db/sync/outbox.js';

export class DbProductRepository implements ProductRepository {
	private _db;

	constructor(database: any) {
		this._db = database;
	}

	async getPaginated(opts: {
		page?: number;
		limit?: number;
		search?: string;
		category?: string;
		storeId?: string;
	}): Promise<{ items: Product[]; total: number; page: number; limit: number; totalPages: number }> {
		const page = Math.max(1, opts.page || 1);
		const limit = Math.max(1, Math.min(100, opts.limit || 50));
		const offset = (page - 1) * limit;

		const conditions = [eq(productsTable.isActive, true)];
		if (opts.storeId) {
			conditions.push(eq(productsTable.storeId, opts.storeId));
		}
		if (opts.category && opts.category !== "all") {
			conditions.push(eq(productsTable.category, opts.category));
		}
		if (opts.search) {
			const s = `%${opts.search}%`;
			const searchCond = or(
				ilike(productsTable.name, s),
				ilike(productsTable.genericName, s),
				ilike(productsTable.manufacturer, s),
				ilike(productsTable.barcode, s)
			);
			if (searchCond) conditions.push(searchCond);
		}

		const [countRow] = await this._db
			.select({ count: sql<number>`count(*)::int` })
			.from(productsTable)
			.where(and(...conditions));
		const total = Number(countRow?.count || 0);

		const rows = await this._db
			.select()
			.from(productsTable)
			.where(and(...conditions))
			.orderBy(productsTable.name)
			.limit(limit)
			.offset(offset);

		return {
			items: rows.map(mapToProduct),
			total,
			page,
			limit,
			totalPages: Math.ceil(total / limit) || 1
		};
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

		let storeId = (input as any).storeId;
		if (!storeId || storeId === '00000000-0000-0000-0000-000000000000') {
			const [firstStore] = await this._db.select({ id: storesTable.id }).from(storesTable).limit(1);
			storeId = firstStore?.id;
		}

		const values = {
			id,
			storeId,
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
						ilike(productsTable.category, search),
						ilike(productsTable.barcode, search)
					)
				)
			);
		return rows.map(mapToProduct);
	}

	async getByBarcode(barcode: string, storeId?: string): Promise<Product | null> {
		const conditions = [
			eq(productsTable.isActive, true),
			eq(productsTable.barcode, barcode)
		];
		if (storeId) {
			conditions.push(eq(productsTable.storeId, storeId));
		}
		const rows = await this._db
			.select()
			.from(productsTable)
			.where(and(...conditions))
			.limit(1);
		if (rows.length === 0) return null;
		return mapToProduct(rows[0]);
	}
}
