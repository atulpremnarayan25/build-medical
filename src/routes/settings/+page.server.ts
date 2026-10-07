import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { storesTable, usersTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	let store = await db.query.storesTable.findFirst({
		where: eq(storesTable.id, locals.user.storeId)
	});
	if (!store) {
		store = await db.query.storesTable.findFirst();
	}

	let users = await db
		.select({
			id: usersTable.id,
			storeId: usersTable.storeId,
			name: usersTable.name,
			username: usersTable.username,
			role: usersTable.role,
			isActive: usersTable.isActive,
			createdAt: usersTable.createdAt
		})
		.from(usersTable)
		.where(eq(usersTable.storeId, locals.user.storeId));

	if (users.length === 0) {
		users = await db
			.select({
				id: usersTable.id,
				storeId: usersTable.storeId,
				name: usersTable.name,
				username: usersTable.username,
				role: usersTable.role,
				isActive: usersTable.isActive,
				createdAt: usersTable.createdAt
			})
			.from(usersTable);
	}

	return {
		store: store || {
			id: '',
			name: '',
			address: '',
			phone: '',
			email: '',
			gstin: '',
			drugLicenseNo: '',
			drugLicenseNo2: '',
			invoicePrefix: 'INV',
			invoiceTerms: ''
		},
		users: users || [],
		currentUser: locals.user
	};
};
