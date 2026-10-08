import type { RequestHandler } from './$types.js';
import { jsonResponse, errorResponse } from '$lib/server/apiUtils.js';
import { getNetworkTopology } from '$lib/server/network/pairing.js';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const portParam = url.searchParams.get('port');
		const ipParam = url.searchParams.get('ip') || undefined;

		const port = portParam
			? parseInt(portParam, 10)
			: url.port
				? parseInt(url.port, 10)
				: Number(process.env.PORT || 3000);

		const topology = await getNetworkTopology(port, ipParam);
		return jsonResponse(topology);
	} catch (err: any) {
		console.error('Failed to get network topology:', err);
		return errorResponse('NETWORK_TOPOLOGY_ERROR', err.message || 'Failed to query network interfaces', 500);
	}
};
