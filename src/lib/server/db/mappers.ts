// Drizzle queries will replace these.
export const mapToCustomer = (dbRow: any) => {
	return {
		id: dbRow.id,
		name: dbRow.name,
		code: dbRow.code || '',
		phone: dbRow.contactPhone || dbRow.phone || '',
		email: dbRow.email || '',
		address: dbRow.address || '',
		gstin: dbRow.gstin || '',
		creditLimit: dbRow.creditLimit ? Number(dbRow.creditLimit) : 0,
		outstandingBalance: dbRow.outstandingBalance || 0, // Mocked for now
		active: dbRow.isDeleted === false || dbRow.active === true,
		createdAt: dbRow.createdAt ? new Date(dbRow.createdAt).toISOString() : new Date().toISOString(),
		updatedAt: dbRow.updatedAt ? new Date(dbRow.updatedAt).toISOString() : new Date().toISOString()
	};
};

export const mapToSupplier = (dbRow: any) => {
	return {
		id: dbRow.id,
		name: dbRow.name,
		code: dbRow.code || '',
		phone: dbRow.contactPhone || dbRow.phone || '',
		email: dbRow.email || '',
		address: dbRow.address || '',
		gstin: dbRow.gstin || '',
		outstandingBalance: Number(dbRow.outstandingBalance) || 0,
		active: dbRow.isDeleted === false || dbRow.active === true,
		createdAt: dbRow.createdAt ? new Date(dbRow.createdAt).toISOString() : new Date().toISOString(),
		updatedAt: dbRow.updatedAt ? new Date(dbRow.updatedAt).toISOString() : new Date().toISOString()
	};
};

export const mapToProduct = (dbRow: any) => {
	return {
		id: dbRow.id,
		name: dbRow.name,
		genericName: dbRow.genericName || '',
		manufacturer: dbRow.manufacturer || '',
		category: dbRow.category || '',
		hsn: dbRow.hsnCode || dbRow.hsn || '',
		gstRate: dbRow.gstRate ? Number(dbRow.gstRate) : 0,
		mrp: dbRow.mrp ? Number(dbRow.mrp) : 0,
		sellingRate: dbRow.sellingRate ? Number(dbRow.sellingRate) : 0,
		purchaseRate: dbRow.purchaseRate ? Number(dbRow.purchaseRate) : 0,
		packSize: dbRow.packSize || 1,
		drugSchedule: dbRow.drugSchedule || 'none',
		active: dbRow.isActive === false ? false : dbRow.active !== false,
		createdAt: dbRow.createdAt ? new Date(dbRow.createdAt).toISOString() : new Date().toISOString(),
		updatedAt: dbRow.updatedAt ? new Date(dbRow.updatedAt).toISOString() : new Date().toISOString()
	};
};

export const mapToBatch = (dbRow: any) => {
	return {
		id: dbRow.id,
		productId: dbRow.productId,
		productName: dbRow.productName || 'Unknown Product',
		batchNumber: dbRow.batchNo || dbRow.batchNumber,
		expiryDate: dbRow.expiryDate,
		quantity:
			dbRow.quantityRemaining !== undefined
				? Number(dbRow.quantityRemaining)
				: Number(dbRow.quantity || 0),
		mrp: dbRow.mrp ? Number(dbRow.mrp) : 0,
		purchaseRate: dbRow.purchasePrice
			? Number(dbRow.purchasePrice)
			: dbRow.purchaseRate
				? Number(dbRow.purchaseRate)
				: 0,
		sellingRate: dbRow.sellingRate
			? Number(dbRow.sellingRate)
			: dbRow.baseUnitRetailPrice
				? Number(dbRow.baseUnitRetailPrice)
				: 0,
		supplierId: dbRow.supplierId || undefined,
		supplierName: dbRow.supplierName || undefined,
		status: dbRow.status || 'healthy', // Maybe compute status dynamically based on expiry date
		createdAt: dbRow.createdAt ? new Date(dbRow.createdAt).toISOString() : new Date().toISOString()
	};
};
