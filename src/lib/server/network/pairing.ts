import os from 'os';
import QRCode from 'qrcode';
import { db } from '../db/index.js';
import { sessionsTable } from '../db/schema.js';
import { gt, count } from 'drizzle-orm';

export interface NetworkInterfaceInfo {
	name: string;
	address: string;
	netmask: string;
	mac: string;
	type: 'Ethernet' | 'Wi-Fi' | 'LAN' | 'Other';
}

export interface NetworkTopology {
	serverStatus: 'healthy' | 'degraded';
	hostname: string;
	port: number;
	primaryIp: string;
	pairingUrl: string;
	qrCodeSvg: string;
	interfaces: NetworkInterfaceInfo[];
	connectedDevicesCount: number;
	uptimeSeconds: number;
}

function classifyInterface(name: string): 'Ethernet' | 'Wi-Fi' | 'LAN' | 'Other' {
	const lower = name.toLowerCase();
	if (lower.includes('wl') || lower.includes('wi-fi') || lower.includes('wifi') || lower.startsWith('awdl')) {
		return 'Wi-Fi';
	}
	if (lower.includes('eth') || lower.startsWith('en')) {
		return 'Ethernet';
	}
	if (lower.includes('lan')) {
		return 'LAN';
	}
	return 'Other';
}

export async function getNetworkTopology(serverPort?: number, selectedIp?: string): Promise<NetworkTopology> {
	const port = serverPort || Number(process.env.PORT || 3000);
	const rawIfaces = os.networkInterfaces();
	const activeInterfaces: NetworkInterfaceInfo[] = [];

	for (const [name, details] of Object.entries(rawIfaces)) {
		if (!details) continue;
		for (const iface of details) {
			if (iface.family === 'IPv4' && !iface.internal) {
				activeInterfaces.push({
					name,
					address: iface.address,
					netmask: iface.netmask,
					mac: iface.mac,
					type: classifyInterface(name)
				});
			}
		}
	}

	// Determine primary IP
	let primaryIp = '127.0.0.1';
	if (selectedIp && activeInterfaces.some((i) => i.address === selectedIp)) {
		primaryIp = selectedIp;
	} else if (activeInterfaces.length > 0) {
		// Prioritize Ethernet/LAN or first available interface
		const eth = activeInterfaces.find((i) => i.type === 'Ethernet' || i.type === 'LAN');
		primaryIp = (eth || activeInterfaces[0]).address;
	}

	const pairingUrl = `http://${primaryIp}:${port}`;

	// Generate QR Code as clean, scalable SVG
	let qrCodeSvg = '';
	try {
		qrCodeSvg = await QRCode.toString(pairingUrl, {
			type: 'svg',
			margin: 2,
			width: 260,
			color: {
				dark: '#09090b',
				light: '#ffffff'
			}
		});
	} catch (err: any) {
		console.error('Failed to generate QR Code SVG:', err.message);
		qrCodeSvg = '';
	}

	// Count active connected devices/terminals
	let connectedDevicesCount = 1; // At least the local terminal is active
	try {
		const [sessionResult] = await db
			.select({ total: count() })
			.from(sessionsTable)
			.where(gt(sessionsTable.expiresAt, new Date()));
		const activeSessions = Number(sessionResult?.total || 0);
		connectedDevicesCount = Math.max(1, activeSessions);
	} catch (e) {
		// Fallback in case of temporary DB lock
		connectedDevicesCount = 1;
	}

	return {
		serverStatus: 'healthy',
		hostname: os.hostname(),
		port,
		primaryIp,
		pairingUrl,
		qrCodeSvg,
		interfaces: activeInterfaces,
		connectedDevicesCount,
		uptimeSeconds: Math.floor(process.uptime())
	};
}
