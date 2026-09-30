// Dev-only: connect Reticle on the client. SvelteKit renders via app.html, so the Vite-plugin
// index.html injection doesn't fire — connect from this client hook instead.
if (import.meta.env.DEV) {
	void import('@reticlehq/browser').then(({ reticle }) => {
		// No React adapter here: the sensor has no install() to call.
		// The bridge requires the pairing token even on localhost. Nothing in a browser can read the
		// file it lives in, so @reticlehq/vite-plugin inlines it here at build time. Without it the
		// console reads "bridge refused the connection: authentication failed" and no session appears.
		const token = typeof __RETICLE_TOKEN__ !== 'undefined' ? __RETICLE_TOKEN__ : '';
		const root = typeof __RETICLE_ROOT__ !== 'undefined' ? __RETICLE_ROOT__ : '';
		const sdkVersion =
			typeof __RETICLE_SDK_VERSION__ !== 'undefined' ? __RETICLE_SDK_VERSION__ : '';
		reticle.connect({
			projectId: 'build-medical-ccbae641',
			...(token.length > 0 ? { token } : {}),
			...(root.length > 0 ? { root } : {}),
			...(sdkVersion.length > 0 ? { sdkVersion } : {})
		});
	});
}

declare const __RETICLE_TOKEN__: string | undefined;
declare const __RETICLE_ROOT__: string | undefined;
declare const __RETICLE_SDK_VERSION__: string | undefined;
