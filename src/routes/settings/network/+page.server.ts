import type { PageServerLoad } from './$types.js';
import { redirect } from '@sveltejs/kit';
import { getNetworkTopology } from '$lib/server/network/pairing.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const port = url.port ? parseInt(url.port, 10) : Number(process.env.PORT || 3000);
	const topology = await getNetworkTopology(port);

	return {
		topology,
		currentUser: locals.user
	};
};
