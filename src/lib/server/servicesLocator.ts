import { DbCustomerRepository } from './repositories/customerRepository.js';
import { DbSupplierRepository } from './repositories/supplierRepository.js';
import { DbProductRepository } from './repositories/productRepository.js';
import { DbBatchRepository } from './repositories/batchRepository.js';
import { DbSaleRepository } from './repositories/saleRepository.js';
import { DbPurchaseRepository } from './repositories/purchaseRepository.js';
import { DbPaymentRepository } from './repositories/paymentRepository.js';
import { DbLedgerRepository } from './repositories/ledgerRepository.js';
import { db } from '$lib/server/db/index.js';

import { createCustomerService } from '$lib/services/customerService.js';
import { createSupplierService } from '$lib/services/supplierService.js';
import { createProductService } from '$lib/services/productService.js';
import { createBatchService } from '$lib/services/batchService.js';
import { createSaleService } from '$lib/services/saleService.js';
import { createPurchaseService } from '$lib/services/purchaseService.js';
import { createPaymentService } from '$lib/services/paymentService.js';
import { createLedgerService } from '$lib/services/ledgerService.js';

// Setup repositories with db
const customerRepo = new DbCustomerRepository(db);
const supplierRepo = new DbSupplierRepository(db);
const productRepo = new DbProductRepository(db);
const batchRepo = new DbBatchRepository(db);
const saleRepo = new DbSaleRepository(db);
const purchaseRepo = new DbPurchaseRepository(db);
const paymentRepo = new DbPaymentRepository(db);
const ledgerRepo = new DbLedgerRepository(db);

// Setup services
export const customerService = createCustomerService(customerRepo);
export const supplierService = createSupplierService(supplierRepo);
export const productService = createProductService(productRepo);
export const inventoryService = createBatchService(batchRepo);
export const ledgerService = createLedgerService(ledgerRepo);

export const salesService = createSaleService(saleRepo, customerService, inventoryService);

export const purchaseService = createPurchaseService(
	purchaseRepo,
	supplierService,
	inventoryService
);

export const paymentService = createPaymentService(
	paymentRepo,
	customerService,
	supplierService,
	salesService,
	purchaseService,
	ledgerService
);
