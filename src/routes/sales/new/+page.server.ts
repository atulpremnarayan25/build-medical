import type { PageServerLoad } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { storesTable } from '$lib/server/db/schema.js';
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

	return {
		store: store || {
			id: '',
			name: 'MedStock Pharmacy',
			address: '123 Health Ave',
			phone: '',
			email: '',
			gstin: '',
			drugLicenseNo: '',
			drugLicenseNo2: '',
			invoicePrefix: 'INV',
			invoiceTerms: '1. No returns without bill.\n2. Consult registered doctor before taking medicine.'
		},
		currentUser: locals.user
	};
};
