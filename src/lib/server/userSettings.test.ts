import { describe, it, expect, beforeAll } from 'vitest';
import { db } from './db/index.js';
import { storesTable, usersTable } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { GET as getSettings, POST as postSettings } from '../../routes/api/settings/+server.js';
import { GET as getUsers, POST as postUsers } from '../../routes/api/users/+server.js';
import { PATCH as patchUser } from '../../routes/api/users/[id]/+server.js';
import { verifyPassword } from './auth/index.js';

describe('Phase 1: Settings & User Management', () => {
	let storeId: string;
	let adminUser: any;

	beforeAll(async () => {
		// Ensure store and admin exist
		const stores = await db.select().from(storesTable).limit(1);
		if (stores.length === 0) {
			const [s] = await db
				.insert(storesTable)
				.values({
					name: 'Main Medical Store',
					address: '123 Health Ave',
					gstin: '29ABCDE1234F1Z5',
					drugLicenseNo: 'DL-001',
					drugLicenseNo2: 'DL-002',
					phone: '9876543210',
					email: 'contact@store.com',
					invoicePrefix: 'INV',
					invoiceTerms: 'Terms and conditions'
				})
				.returning();
			storeId = s.id;
		} else {
			storeId = stores[0].id;
		}

		const admins = await db
			.select()
			.from(usersTable)
			.where(eq(usersTable.username, 'admin'))
			.limit(1);

		adminUser = admins[0];
	});

	it('should read and update store profile via /api/settings', async () => {
		const mockEventGet: any = {
			locals: { user: adminUser }
		};

		const getRes = await getSettings(mockEventGet);
		const getBody = await getRes.json();
		expect(getBody.data).toBeDefined();

		const updatePayload = {
			name: 'City Medical Hall',
			address: 'Station Road, Ballia, UP',
			phone: '9988776655',
			email: 'citymed@example.com',
			gstin: '09AABBC1234D1Z5',
			drugLicenseNo: 'UP-BALLIA-20B-9988',
			drugLicenseNo2: 'UP-BALLIA-21B-9988',
			invoicePrefix: 'CMH',
			invoiceTerms: '1. No returns without bill.\n2. Consult registered doctor.'
		};

		const mockEventPost: any = {
			locals: { user: adminUser },
			request: {
				json: async () => updatePayload
			}
		};

		const postRes = await postSettings(mockEventPost);
		const postBody = await postRes.json();
		expect(postRes.status).toBe(200);
		expect(postBody.data.name).toBe('City Medical Hall');
		expect(postBody.data.gstin).toBe('09AABBC1234D1Z5');
		expect(postBody.data.drugLicenseNo).toBe('UP-BALLIA-20B-9988');
		expect(postBody.data.drugLicenseNo2).toBe('UP-BALLIA-21B-9988');
		expect(postBody.data.invoicePrefix).toBe('CMH');

		// Verify directly in database
		const dbStore = await db.query.storesTable.findFirst({
			where: eq(storesTable.id, storeId)
		});
		expect(dbStore?.name).toBe('City Medical Hall');
		expect(dbStore?.gstin).toBe('09AABBC1234D1Z5');
		expect(dbStore?.drugLicenseNo).toBe('UP-BALLIA-20B-9988');
		expect(dbStore?.drugLicenseNo2).toBe('UP-BALLIA-21B-9988');
		expect(dbStore?.invoicePrefix).toBe('CMH');
		expect(dbStore?.invoiceTerms).toBe('1. No returns without bill.\n2. Consult registered doctor.');
	});

	it('should allow owner_admin to create user rajesh with role biller', async () => {
		// Cleanup rajesh if exists
		await db.delete(usersTable).where(eq(usersTable.username, 'rajesh'));

		const mockEvent: any = {
			locals: { user: adminUser },
			request: {
				json: async () => ({
					name: 'Rajesh Sharma',
					username: 'rajesh',
					role: 'biller',
					password: 'rajeshpassword123'
				})
			}
		};

		const res = await postUsers(mockEvent);
		const body = await res.json();
		expect(res.status).toBe(201);
		expect(body.data.username).toBe('rajesh');
		expect(body.data.role).toBe('biller');
		expect(body.data.isActive).toBe(true);

		// Verify password hash in DB
		const dbRajesh = await db.query.usersTable.findFirst({
			where: eq(usersTable.username, 'rajesh')
		});
		expect(dbRajesh).toBeDefined();
		const passwordMatches = await verifyPassword('rajeshpassword123', dbRajesh!.passwordHash);
		expect(passwordMatches).toBe(true);

		// Verify fetching users via GET /api/users
		const getEvent: any = { locals: { user: adminUser } };
		const usersRes = await getUsers(getEvent);
		const usersBody = await usersRes.json();
		const rajeshInList = usersBody.data.find((u: any) => u.username === 'rajesh');
		expect(rajeshInList).toBeDefined();
		expect(rajeshInList.name).toBe('Rajesh Sharma');
	});

	it('should allow owner_admin to toggle isActive and reset password', async () => {
		const rajesh = await db.query.usersTable.findFirst({
			where: eq(usersTable.username, 'rajesh')
		});
		expect(rajesh).toBeDefined();

		// Toggle to disabled
		const disableEvent: any = {
			locals: { user: adminUser },
			params: { id: rajesh!.id },
			request: {
				json: async () => ({ isActive: false })
			}
		};

		const disableRes = await patchUser(disableEvent);
		const disableBody = await disableRes.json();
		expect(disableBody.data.isActive).toBe(false);

		let dbRajesh = await db.query.usersTable.findFirst({
			where: eq(usersTable.id, rajesh!.id)
		});
		expect(dbRajesh?.isActive).toBe(false);

		// Reset password & re-enable
		const resetEvent: any = {
			locals: { user: adminUser },
			params: { id: rajesh!.id },
			request: {
				json: async () => ({
					password: 'newrajeshpass456',
					isActive: true
				})
			}
		};

		const resetRes = await patchUser(resetEvent);
		const resetBody = await resetRes.json();
		expect(resetBody.data.isActive).toBe(true);

		dbRajesh = await db.query.usersTable.findFirst({
			where: eq(usersTable.id, rajesh!.id)
		});
		expect(dbRajesh?.isActive).toBe(true);
		const newPassMatches = await verifyPassword('newrajeshpass456', dbRajesh!.passwordHash);
		expect(newPassMatches).toBe(true);
	});
});
