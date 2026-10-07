<script lang="ts">
	import { page } from '$app/state';
	import {
		Plus,
		ShieldCheck,
		CheckCircle2,
		Activity,
		Calendar,
		Clock,
		Phone,
		Mail,
		MapPin,
		ArrowRight,
		Star,
		Users,
		Award,
		FileText,
		Check,
		Send,
		Building2,
		Shield,
		Menu,
		X,
		ShoppingCart,
		Warehouse,
		Package,
		Receipt,
		Monitor,
		Cpu,
		Printer,
		AlertTriangle,
		Truck,
		CreditCard,
		Undo2,
		BarChart3
	} from '@lucide/svelte';
	import { addToast } from '$lib/stores/toastStore.svelte.js';

	let user = $derived(page.data?.user);
	let mobileMenuOpen = $state(false);

	// Store Setup & Counter Hardware Audit Form State
	let storeName = $state('');
	let contactName = $state('');
	let contactPhone = $state('');
	let storeType = $state('Wholesale + Retail (Dual Counter)');
	let terminalCount = $state('2–4 Billing Terminals (LAN Server)');
	let drugLicenseNo = $state('');
	let existingHardware = $state('');
	let isSubmitting = $state(false);
	let auditSubmitted = $state(false);

	function handleStoreAuditRequest(e: Event) {
		e.preventDefault();
		if (!storeName.trim() || !contactPhone.trim() || !contactName.trim()) {
			addToast('warning', 'Please provide store name, contact person, and phone number.');
			return;
		}

		isSubmitting = true;
		setTimeout(() => {
			isSubmitting = false;
			auditSubmitted = true;
			addToast('success', `Store audit requested for "${storeName}". Our engineering team will contact you at ${contactPhone}!`);
		}, 600);
	}

	const rolesList = [
		{
			name: 'Store Owner / Administrator',
			role: 'Proprietor & Financial Controller',
			image: '/images/hero-doctor.jpg',
			badge: 'Admin / Superuser',
			access: 'Full Access',
			metric: 'Live Margins & Khata',
			desc: 'Complete oversight of inventory valuation, gross margins, customer credit limits, supplier payables, and GST tax filings.'
		},
		{
			name: 'Counter Biller / Cashier',
			role: 'Front-Desk Retail & B2B Billing',
			image: '/images/doctor-2.jpg',
			badge: 'High-Speed POS',
			access: '< 2s Billing',
			metric: '500+ Bills / Day',
			desc: 'Keyboard-first POS terminal, rapid barcode scanning, hold/park bills (F6), and split tender payments (Cash/UPI/Khata).'
		},
		{
			name: 'Store & Warehouse Manager',
			role: 'Procurement & Batch Auditor',
			image: '/images/doctor-1.jpg',
			badge: 'Inventory Controller',
			access: 'FEFO Enforced',
			metric: 'Zero Stock Loss',
			desc: 'Handles supplier inward GRN, records batch numbers and expiry dates, manages strip-to-box conversions, and damage write-offs.'
		},
		{
			name: 'B2B Wholesale Retailer Client',
			role: 'Independent Chemist & Stockist',
			image: '/images/doctor-3.jpg',
			badge: 'Wholesale Khata',
			access: 'GST & DL Verified',
			metric: '30-Day Credit Terms',
			desc: 'Wholesale customer with registered Drug License, receiving itemized GST invoices, monthly khata statements, and credit terms.'
		}
	];

	const modules = [
		{
			title: 'High-Speed POS & Billing',
			desc: 'Sub-2-second bill creation with F2 search, barcode scanning, F6 park/hold bills, and split retail payment (Cash/UPI).',
			icon: ShoppingCart,
			tag: 'FR-SAL-001',
			href: '/sales/new',
			active: false
		},
		{
			title: 'FEFO Batch & Expiry Control',
			desc: 'First-Expiry-First-Out auto-selection across batches. Expired lots are hard-locked from dispensing to ensure zero compliance risks.',
			icon: Warehouse,
			tag: 'FR-INV-004',
			href: '/inventory',
			active: true // Highlighted in reference
		},
		{
			title: 'Wholesale Khata & Credit Ledger',
			desc: 'Running chronological debtor ledger for retailer clients, configurable credit limits, aging analysis, and partial payments.',
			icon: Users,
			tag: 'FR-CUS-002',
			href: '/customers',
			active: false
		},
		{
			title: 'Procurement & Inward GRN',
			desc: 'Direct supplier purchase entry recording batch code, expiry, MRP, purchase cost, and automatic credit to supplier payables.',
			icon: Package,
			tag: 'FR-PUR-001',
			href: '/purchases',
			active: false
		},
		{
			title: 'Schedule H1 & Drug Registers',
			desc: 'Statutory Form 35 Schedule H, H1 and X narcotic logs with patient address, prescriber MCI number, and inspectorate exports.',
			icon: ShieldCheck,
			tag: 'FR-RPT-002',
			href: '/reports',
			active: false
		},
		{
			title: 'GST Invoicing & Audit Trails',
			desc: 'Itemized CGST/SGST/IGST breakdown, HSN-coded thermal invoices, sequential non-colliding numbering, and immutable audit logs.',
			icon: FileText,
			tag: 'FR-RPT-001',
			href: '/reports',
			active: false
		}
	];

	const facilities = [
		{
			title: 'LAN Store Server (Offline-First)',
			desc: 'Authoritative local PostgreSQL engine ensures 4–10 counter terminals bill at zero latency with 100% uptime during broadband outages.',
			tag: 'OFFLINE FIRST'
		},
		{
			title: 'Low-Spec Hardware Optimization',
			desc: 'Tuned for legacy dual-core desktop PCs with 4GB RAM (<300MB RAM footprint), eliminating expensive computer hardware upgrades.',
			tag: 'PERFORMANCE'
		},
		{
			title: 'ESC/POS Thermal & Barcode Setup',
			desc: 'Direct USB/LAN ESC/POS thermal receipt printing (80mm/58mm), electronic cash drawer kicks, and instant barcode scanner wedges.',
			tag: 'HARDWARE READY'
		},
		{
			title: 'Reliable Cloud Outbox Sync',
			desc: 'Deterministic outbox changelog pattern safely backs up transactional data to cloud storage as soon as internet connectivity resumes.',
			tag: 'SECURITY & CLOUD'
		}
	];
</script>

<svelte:head>
	<title>MedERP — Wholesale & Retail Medical Store System</title>
	<meta
		name="description"
		content="MedERP is a purpose-built medical store and wholesale pharmacy ERP with First-Expiry-First-Out (FEFO) batch tracking, customer khata credit ledgers, and GST-compliant invoicing."
	/>
</svelte:head>

<div class="min-h-screen bg-white font-sans text-slate-900 selection:bg-teal-500 selection:text-white">
	<!-- Top Navigation Bar (Reference Style) -->
	<header class="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-2xs">
		<div class="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
			<!-- Brand Logo -->
			<a href="/" class="flex items-center gap-2.5 transition-opacity hover:opacity-90">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm ring-4 ring-teal-100"
				>
					<Plus size={22} strokeWidth={3} />
				</div>
				<div class="flex flex-col">
					<span class="text-2xl font-extrabold tracking-tight text-teal-800 leading-none">MedERP</span>
					<span class="text-[10px] font-bold text-teal-600 tracking-wider uppercase">Medical Store ERP</span>
				</div>
			</a>

			<!-- Center Nav Links -->
			<nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
				<a href="/" class="text-teal-600 font-semibold transition-colors hover:text-teal-700">Home</a>
				<a href="#about" class="transition-colors hover:text-teal-600">Overview</a>
				<a href="#modules" class="transition-colors hover:text-teal-600">ERP Modules</a>
				<a href="#workflow" class="transition-colors hover:text-teal-600">Workflow</a>
				<a href="#architecture" class="transition-colors hover:text-teal-600">Architecture</a>
				<a href="#audit" class="transition-colors hover:text-teal-600">Store Audit</a>
			</nav>

			<!-- Right CTA Actions -->
			<div class="flex items-center gap-2 sm:gap-3">
				<a
					href="/dashboard"
					class="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 sm:px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-100 hover:border-teal-300 transition-all min-h-[44px]"
					title="Enter MedERP Store Portal"
				>
					<span class="h-2 w-2 rounded-full bg-teal-600"></span>
					<span>Store Portal</span>
				</a>

				{#if user}
					<a
						href="/sales/new"
						class="hidden sm:inline-flex items-center rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-teal-700 active:scale-95 min-h-[44px]"
					>
						Launch Billing POS
					</a>
				{:else}
					<a
						href="/login"
						class="hidden sm:inline-flex items-center text-xs font-semibold text-slate-600 hover:text-teal-700 transition-colors min-h-[44px] px-2"
					>
						Sign In
					</a>
					<a
						href="/sales/new"
						class="hidden sm:inline-flex items-center rounded-xl bg-[#1d4ed8] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95 min-h-[44px]"
					>
						Launch Billing POS
					</a>
				{/if}

				<!-- Mobile Hamburger Button (44x44px touch target) -->
				<button
					type="button"
					class="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 md:hidden hover:bg-slate-100 transition-colors active:scale-95"
					onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
					aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
				>
					{#if mobileMenuOpen}
						<X size={20} />
					{:else}
						<Menu size={20} />
					{/if}
				</button>
			</div>
		</div>

		<!-- Mobile Navigation Sheet -->
		{#if mobileMenuOpen}
			<!-- Backdrop -->
			<div
				class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden"
				onclick={() => (mobileMenuOpen = false)}
				onkeydown={(e) => e.key === 'Escape' && (mobileMenuOpen = false)}
				role="button"
				tabindex="-1"
				aria-label="Close navigation overlay"
			></div>

			<!-- Sliding Drawer -->
			<div
				class="fixed top-0 right-0 bottom-0 z-50 flex w-72 max-w-[85vw] flex-col border-l border-slate-200 bg-white p-5 shadow-2xl md:hidden"
			>
				<div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
					<div class="flex items-center gap-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white">
							<Plus size={18} strokeWidth={3} />
						</div>
						<span class="text-lg font-extrabold text-teal-800">MedERP</span>
					</div>
					<button
						class="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
						onclick={() => (mobileMenuOpen = false)}
						aria-label="Close menu"
					>
						<X size={18} />
					</button>
				</div>

				<nav class="flex flex-col gap-1.5 overflow-y-auto">
					<a href="/" onclick={() => (mobileMenuOpen = false)} class="rounded-xl px-4 py-3 min-h-[44px] flex items-center text-sm font-semibold text-teal-700 bg-teal-50">Home</a>
					<a href="#about" onclick={() => (mobileMenuOpen = false)} class="rounded-xl px-4 py-3 min-h-[44px] flex items-center text-sm font-medium text-slate-700 hover:bg-slate-50">Overview</a>
					<a href="#modules" onclick={() => (mobileMenuOpen = false)} class="rounded-xl px-4 py-3 min-h-[44px] flex items-center text-sm font-medium text-slate-700 hover:bg-slate-50">ERP Modules</a>
					<a href="#workflow" onclick={() => (mobileMenuOpen = false)} class="rounded-xl px-4 py-3 min-h-[44px] flex items-center text-sm font-medium text-slate-700 hover:bg-slate-50">Workflow</a>
					<a href="#architecture" onclick={() => (mobileMenuOpen = false)} class="rounded-xl px-4 py-3 min-h-[44px] flex items-center text-sm font-medium text-slate-700 hover:bg-slate-50">Architecture</a>
					<a href="#audit" onclick={() => (mobileMenuOpen = false)} class="rounded-xl px-4 py-3 min-h-[44px] flex items-center text-sm font-medium text-slate-700 hover:bg-slate-50">Store Audit</a>
				</nav>

				<div class="mt-auto border-t border-slate-100 pt-4 flex flex-col gap-2.5">
					<a
						href="/dashboard"
						class="flex items-center justify-center rounded-xl bg-teal-600 py-3 text-xs font-bold text-white shadow-xs min-h-[44px]"
					>
						Enter MedERP Portal
					</a>
					<a
						href="/sales/new"
						onclick={() => (mobileMenuOpen = false)}
						class="flex items-center justify-center rounded-xl bg-[#1d4ed8] py-3 text-xs font-bold text-white shadow-xs min-h-[44px]"
					>
						Launch Billing POS
					</a>
				</div>
			</div>
		{/if}
	</header>

	<main>
		<!-- HERO SECTION (Teal / Cyan Gradient with Healthcare / Pharmacy Specialist) -->
		<section
			class="relative overflow-hidden bg-gradient-to-r from-[#196575] via-[#298699] to-[#61b6c6] text-white pt-12 pb-36 sm:pt-16 sm:pb-40 lg:pt-20 lg:pb-48"
		>
			<!-- Background Glow & Subtle Texture -->
			<div
				class="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-white/10 blur-3xl"
			></div>
			<div
				class="pointer-events-none absolute bottom-0 left-0 h-96 w-96 rounded-full bg-teal-900/20 blur-3xl"
			></div>

			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="grid items-center gap-12 lg:grid-cols-12">
					<!-- Hero Text -->
					<div class="lg:col-span-7 xl:col-span-7 z-10 text-center lg:text-left">
						<!-- Subheader Badge -->
						<div
							class="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold tracking-wider uppercase text-white backdrop-blur-xs border border-white/20"
						>
							<Shield size={14} class="text-teal-200" />
							<span>Dual Wholesale & Retail Medical ERP</span>
						</div>

						<!-- Main Headline -->
						<h1
							class="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-[1.12]"
						>
							Zero-Latency Pharmacy Billing & FEFO Batch Inventory.
						</h1>

						<!-- Subtext -->
						<p class="mt-6 text-sm sm:text-base leading-relaxed text-teal-50/90 max-w-xl mx-auto lg:mx-0">
							Purpose-built for wholesale medical stockists and retail chemist counters. Eliminate expired
							stock dispensing, automate customer khata credit ledgers, and maintain statutory Drug Schedule H1 registers.
						</p>

						<!-- Hero CTA Buttons -->
						<div
							class="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
						>
							<a
								href="/sales/new"
								class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#2dd4bf] px-7 py-3.5 text-sm font-bold text-slate-900 shadow-lg shadow-teal-900/30 transition-all hover:bg-teal-300 hover:shadow-xl active:scale-95"
							>
								<span>Launch Billing POS</span>
								<ArrowRight size={16} />
							</a>
							<a
								href="#modules"
								class="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-xs transition-all hover:bg-white/20 active:scale-95"
							>
								<span>Explore Store Modules</span>
							</a>
						</div>
					</div>

					<!-- Hero Visual Photo -->
					<div class="relative lg:col-span-5 xl:col-span-5 flex justify-center">
						<div class="relative max-w-md w-full">
							<!-- Radial Backlight behind visual -->
							<div
								class="absolute inset-0 rounded-full bg-teal-400/30 blur-2xl transform scale-110"
							></div>

							<img
								src="/images/hero-doctor.jpg"
								alt="Professional Pharmacist and Store Administrator at MedERP"
								class="relative z-10 w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/30"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- FLOATING 3-COLUMN HIGHLIGHT CARD (Overlapping Hero bottom) -->
		<section class="relative z-20 -mt-24 sm:-mt-28 px-4 sm:px-6 lg:px-8">
			<div
				class="mx-auto max-w-6xl rounded-3xl border border-slate-100 bg-white p-6 sm:p-10 shadow-2xl shadow-teal-900/10"
			>
				<div class="grid gap-8 divide-y divide-slate-100 sm:divide-y-0 sm:grid-cols-3 sm:divide-x">
					<!-- Highlight 1: FEFO Batch Enforcement -->
					<div class="flex flex-col items-center text-center px-4">
						<div
							class="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 shadow-2xs mb-4"
						>
							<Warehouse size={28} />
						</div>
						<div class="rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-1.5">
							FR-INV-004
						</div>
						<h3 class="text-lg font-bold text-slate-900">FEFO Batch Enforcement</h3>
						<p class="mt-2 text-xs leading-relaxed text-slate-500">
							System-driven First-Expiry-First-Out batch selection prioritizes nearest-expiry lots. Expired batches are hard-locked from dispensing.
						</p>
					</div>

					<!-- Highlight 2: Single Inventory Dual Billing -->
					<div class="flex flex-col items-center text-center px-4 pt-6 sm:pt-0">
						<div
							class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs mb-4"
						>
							<ShoppingCart size={28} />
						</div>
						<div class="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1.5">
							FR-SAL-001
						</div>
						<h3 class="text-lg font-bold text-slate-900">Dual Wholesale & Retail</h3>
						<p class="mt-2 text-xs leading-relaxed text-slate-500">
							Sell to walk-in consumers (cash/UPI) and wholesale retailer customers (khata credit ledger) from a single shared stock pool.
						</p>
					</div>

					<!-- Highlight 3: Statutory GST & Drug Compliance -->
					<div class="flex flex-col items-center text-center px-4 pt-6 sm:pt-0">
						<div
							class="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-2xs mb-4"
						>
							<ShieldCheck size={28} />
						</div>
						<div class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
							FR-RPT-002
						</div>
						<h3 class="text-lg font-bold text-slate-900">GST & Form 35 Compliance</h3>
						<p class="mt-2 text-xs leading-relaxed text-slate-500">
							Automated CGST/SGST/IGST breakdown, HSN-coded thermal invoices, and inspectorate-ready Drug Schedule H1 registers.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- ABOUT US / PLATFORM OVERVIEW SECTION -->
		<section id="about" class="py-20 sm:py-28 bg-white">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="grid items-center gap-12 lg:grid-cols-12">
					<!-- Left Content -->
					<div class="lg:col-span-7">
						<div class="flex items-center gap-2 text-xs font-bold tracking-widest text-teal-600 uppercase">
							<span class="h-0.5 w-6 bg-teal-500"></span>
							<span>Store Platform Overview</span>
						</div>
						<h2 class="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
							Purpose-Built for Indian Medical & Ayurvedic Stockists
						</h2>
						<p class="mt-4 text-sm leading-relaxed text-slate-600">
							MedERP replaces manual register books and bloated generic billing software with a high-velocity,
							pharma-specific operating system. Built for family-run retail chemists and wholesale stockists,
							it delivers sub-2-second counter billing, automated debtor khata ledgers, and zero-compromise statutory compliance.
						</p>

						<!-- Bullet Checklist -->
						<div class="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="flex items-center gap-3">
								<div class="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-teal-700">
									<Check size={16} strokeWidth={3} />
								</div>
								<span class="text-xs font-semibold text-slate-800">Sub-2-Second Counter Billing (Keyboard-First)</span>
							</div>
							<div class="flex items-center gap-3">
								<div class="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-teal-700">
									<Check size={16} strokeWidth={3} />
								</div>
								<span class="text-xs font-semibold text-slate-800">Multi-Device Concurrency (4–10 Terminals)</span>
							</div>
							<div class="flex items-center gap-3">
								<div class="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-teal-700">
									<Check size={16} strokeWidth={3} />
								</div>
								<span class="text-xs font-semibold text-slate-800">Automated Customer Khata & Partial Payments</span>
							</div>
							<div class="flex items-center gap-3">
								<div class="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-teal-700">
									<Check size={16} strokeWidth={3} />
								</div>
								<span class="text-xs font-semibold text-slate-800">Multi-Unit Conversions (Box / Strip / Tablet)</span>
							</div>
						</div>

						<div class="mt-8 flex items-center gap-4">
							<a
								href="#architecture"
								class="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition-all active:scale-95 min-h-[44px]"
							>
								<span>View System Architecture</span>
								<ArrowRight size={15} />
							</a>
							<a
								href="/dashboard"
								class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all min-h-[44px]"
							>
								<span>Explore Portal</span>
							</a>
						</div>
					</div>

					<!-- Right Image with Cyan Backdrop Frame -->
					<div class="relative lg:col-span-5 flex justify-center">
						<div class="relative">
							<!-- Decorative Cyan Frame Offset -->
							<div
								class="absolute -top-4 -right-4 h-full w-full rounded-3xl bg-[#61b6c6]/30 border border-teal-300"
							></div>

							<img
								src="/images/about-doctor.jpg"
								alt="Chemist inspecting batch expiry and pharmacy inventory"
								class="relative z-10 rounded-2xl object-cover shadow-xl max-w-sm w-full"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- BLUE STATISTICS BAR (PRD & SRS Key Metrics) -->
		<section class="bg-[#1d4ed8] text-white py-12 px-4 sm:px-6 lg:px-8 shadow-inner">
			<div class="mx-auto max-w-7xl">
				<div class="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
					<div>
						<div class="text-3xl font-extrabold sm:text-4xl tracking-tight">0</div>
						<div class="mt-1 text-xs font-medium text-blue-100 uppercase tracking-wider">
							Expired Batches Dispensed
						</div>
						<div class="mt-0.5 text-[11px] text-blue-200">System FEFO Enforcement</div>
					</div>
					<div>
						<div class="text-3xl font-extrabold sm:text-4xl tracking-tight">&lt; 2s</div>
						<div class="mt-1 text-xs font-medium text-blue-100 uppercase tracking-wider">
							Bill Creation & Print Speed
						</div>
						<div class="mt-0.5 text-[11px] text-blue-200">Target Low-End Hardware</div>
					</div>
					<div>
						<div class="text-3xl font-extrabold sm:text-4xl tracking-tight">100%</div>
						<div class="mt-1 text-xs font-medium text-blue-100 uppercase tracking-wider">
							LAN Billing Uptime
						</div>
						<div class="mt-0.5 text-[11px] text-blue-200">Zero Internet Dependency</div>
					</div>
					<div>
						<div class="text-3xl font-extrabold sm:text-4xl tracking-tight">4–10</div>
						<div class="mt-1 text-xs font-medium text-blue-100 uppercase tracking-wider">
							Concurrent Biller Terminals
						</div>
						<div class="mt-0.5 text-[11px] text-blue-200">&lt; 1 Unit Stock Discrepancy</div>
					</div>
				</div>
			</div>
		</section>

		<!-- ERP CORE MODULES GRID SECTION -->
		<section id="modules" class="py-20 sm:py-28 bg-slate-50/60">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="text-center max-w-2xl mx-auto">
					<div class="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-teal-600 uppercase">
						<span class="h-0.5 w-6 bg-teal-500"></span>
						<span>Core ERP Capabilities</span>
						<span class="h-0.5 w-6 bg-teal-500"></span>
					</div>
					<h2 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
						Modular Architecture for Total Pharmacy Operations
					</h2>
					<p class="mt-3 text-xs sm:text-sm text-slate-500 leading-relaxed">
						Fully interconnected workflows covering inventory, procurement, POS billing, customer credit ledgers,
						and statutory tax compliance.
					</p>
				</div>

				<!-- 6 Module Cards (3x2) -->
				<div class="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each modules as mod}
						<div
							class="group relative rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-1
							{mod.active
								? 'bg-white border-teal-500 shadow-xl shadow-teal-500/10 ring-2 ring-teal-500/20'
								: 'bg-white border-slate-200/80 hover:border-teal-400 hover:shadow-lg'}"
						>
							<div
								class="flex h-14 w-14 items-center justify-center rounded-2xl mb-5 transition-transform group-hover:scale-105
								{mod.active
									? 'bg-teal-600 text-white shadow-md'
									: 'bg-teal-50 text-teal-600'}"
							>
								<mod.icon size={26} />
							</div>

							<div class="flex items-center justify-between gap-2">
								<h3 class="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
									{mod.title}
								</h3>
								<span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600">
									{mod.tag}
								</span>
							</div>

							<p class="mt-2.5 text-xs text-slate-500 leading-relaxed">
								{mod.desc}
							</p>

							<div class="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
								<a
									href={mod.href}
									class="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-800 transition-colors min-h-[44px]"
								>
									<span>Open Module</span>
									<ArrowRight size={13} />
								</a>
								{#if mod.active}
									<span class="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700 uppercase">
										FEFO Core
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- WORK PROCESS (Three-Step Dispensing & Invoicing Workflow) -->
		<section id="workflow" class="py-20 bg-white">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
				<div class="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-teal-600 uppercase">
					<span class="h-0.5 w-6 bg-teal-500"></span>
					<span>End-to-End Workflow</span>
					<span class="h-0.5 w-6 bg-teal-500"></span>
				</div>
				<h2 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
					From Inward GRN to Statutory Tax Invoice
				</h2>
				<p class="mt-3 text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
					Streamlined operations designed for speed at the counter and strict compliance in the books.
				</p>

				<div class="mt-12 grid gap-8 sm:grid-cols-3">
					<!-- Step 1 -->
					<div class="flex flex-col items-center">
						<div
							class="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 mb-4"
						>
							<Package size={28} />
						</div>
						<div class="text-[11px] font-bold text-teal-600 uppercase tracking-wider mb-1">Step 1</div>
						<h3 class="text-base font-bold text-slate-900">Inward GRN & Batch Tagging</h3>
						<p class="mt-2 text-xs text-slate-500 max-w-xs leading-relaxed">
							Record supplier invoice with batch code, expiry date, purchase rate, MRP, and packaging conversion ratios.
						</p>
					</div>

					<!-- Step 2 -->
					<div class="flex flex-col items-center">
						<div
							class="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 mb-4"
						>
							<ShoppingCart size={28} />
						</div>
						<div class="text-[11px] font-bold text-teal-600 uppercase tracking-wider mb-1">Step 2</div>
						<h3 class="text-base font-bold text-slate-900">Fast FEFO POS Dispensing</h3>
						<p class="mt-2 text-xs text-slate-500 max-w-xs leading-relaxed">
							Scan barcode or search medicine name. MedERP auto-allocates stock from the nearest-expiry lot without manual lookup.
						</p>
					</div>

					<!-- Step 3 -->
					<div class="flex flex-col items-center">
						<div
							class="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-200 mb-4"
						>
							<Receipt size={28} />
						</div>
						<div class="text-[11px] font-bold text-teal-600 uppercase tracking-wider mb-1">Step 3</div>
						<h3 class="text-base font-bold text-slate-900">Settlement, Khata & GST Print</h3>
						<p class="mt-2 text-xs text-slate-500 max-w-xs leading-relaxed">
							Collect cash/UPI for retail or post to customer khata ledger; print statutory GST tax invoice with HSN breakdown in &lt;2s.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- SYSTEM ARCHITECTURE / HARDWARE COMPATIBILITY -->
		<section id="architecture" class="py-20 bg-slate-50/70 border-t border-slate-100">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="grid items-center gap-12 lg:grid-cols-12">
					<div class="lg:col-span-5">
						<div class="flex items-center gap-2 text-xs font-bold tracking-widest text-teal-600 uppercase">
							<span class="h-0.5 w-6 bg-teal-500"></span>
							<span>System Architecture</span>
						</div>
						<h2 class="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
							Engineered for Counter Speed & Zero Downtime
						</h2>
						<p class="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
							MedERP combines local LAN high-velocity transactional databases with background cloud backup.
							Designed to operate effortlessly on legacy dual-core desktop PCs without requiring expensive hardware replacements.
						</p>
						<div class="mt-6">
							<a
								href="#audit"
								class="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-teal-700 transition-all shadow-sm min-h-[44px]"
							>
								<span>Request Hardware Audit</span>
								<ArrowRight size={14} />
							</a>
						</div>
					</div>

					<div class="lg:col-span-7 grid gap-4 sm:grid-cols-2">
						{#each facilities as facility}
							<div
								class="rounded-2xl bg-gradient-to-br from-[#14b8a6] to-[#0d9488] p-6 text-white shadow-lg transition-transform hover:-translate-y-1"
							>
								<span
									class="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs"
								>
									{facility.tag}
								</span>
								<h3 class="mt-4 text-base font-bold">{facility.title}</h3>
								<p class="mt-2 text-xs text-teal-50 leading-relaxed">
									{facility.desc}
								</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<!-- ROLE-BASED ACCESS CONTROL / USER PERSONAS -->
		<section id="roles" class="py-20 sm:py-28 bg-white">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="text-center max-w-xl mx-auto">
					<div class="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-teal-600 uppercase">
						<span class="h-0.5 w-6 bg-teal-500"></span>
						<span>Role-Based Permissions</span>
						<span class="h-0.5 w-6 bg-teal-500"></span>
					</div>
					<h2 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
						Tailored for Every Pharmacy Role
					</h2>
					<p class="mt-2 text-xs text-slate-500">
						Dedicated permission tiers ensuring speed at the counter and complete financial control for the proprietor.
					</p>
				</div>

				<!-- Personas Cards Grid -->
				<div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{#each rolesList as role}
						<div
							class="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col"
						>
							<div class="aspect-square w-full overflow-hidden bg-teal-50">
								<img
									src={role.image}
									alt={role.name}
									class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
								/>
							</div>

							<div class="p-5 text-center flex-1 flex flex-col justify-between">
								<div>
									<span
										class="inline-block rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-bold text-teal-700 uppercase"
									>
										{role.badge}
									</span>
									<h3 class="mt-2 text-base font-bold text-slate-900">{role.name}</h3>
									<p class="text-xs text-teal-700 font-medium">{role.role}</p>
									<p class="mt-2 text-xs text-slate-500 leading-relaxed text-left line-clamp-3">
										{role.desc}
									</p>
								</div>

								<div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
									<div class="flex items-center gap-1 text-teal-700 font-bold text-[11px]">
										<ShieldCheck size={14} class="text-teal-600" />
										<span>{role.access}</span>
									</div>
									<div class="font-medium text-slate-600 text-[11px]">{role.metric}</div>
								</div>

								<a
									href="#audit"
									class="mt-4 block w-full rounded-xl bg-slate-50 py-2.5 text-xs font-semibold text-teal-700 hover:bg-teal-600 hover:text-white transition-colors min-h-[44px] flex items-center justify-center"
								>
									Configure Role
								</a>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- INTERACTIVE STORE ONBOARDING & HARDWARE AUDIT SECTION -->
		<section id="audit" class="py-20 bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 border-t border-teal-100">
			<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div class="grid items-center gap-12 lg:grid-cols-12">
					<!-- Left: Store Trust & Client Story -->
					<div class="lg:col-span-5">
						<div class="flex items-center gap-2 text-xs font-bold tracking-widest text-teal-600 uppercase">
							<span class="h-0.5 w-6 bg-teal-500"></span>
							<span>Verified Store Case Study</span>
						</div>
						<h2 class="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
							Zero Expired Losses & Instant Khata Balance
						</h2>
						<p class="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
							Read how high-volume medical stockists in Ballia, UP eliminated expired inventory write-offs
							and eliminated manual credit reconciliation using MedERP.
						</p>

						<!-- Testimonial Quote Card -->
						<div class="mt-8 rounded-2xl bg-white p-6 shadow-md border border-teal-100">
							<div class="flex items-center gap-1 text-amber-400 mb-3">
								{#each Array(5) as _}
									<Star size={16} class="fill-amber-400" />
								{/each}
							</div>
							<p class="text-xs italic text-slate-600 leading-relaxed">
								"MedERP completely eliminated expired medicine losses at our counter. The unified wholesale khata and retail billing on our existing desktop PCs saved our staff over 3 hours of manual register bookkeeping every single evening."
							</p>
							<div class="mt-4 flex items-center gap-3">
								<div class="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">
									RS
								</div>
								<div>
									<h4 class="text-xs font-bold text-slate-900">Rajesh K. Sharma</h4>
									<p class="text-[10px] text-slate-500">Managing Partner, Ballia Medical Agencies (UP)</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Right: Store Onboarding & Hardware Audit Form -->
					<div class="lg:col-span-7">
						<div class="rounded-3xl bg-white p-8 sm:p-10 shadow-xl border border-teal-100">
							<h3 class="text-2xl font-bold tracking-tight text-slate-900">Request Store Onboarding & Counter Audit</h3>
							<p class="mt-1 text-xs text-slate-500">
								Verify your pharmacy's existing PC hardware, thermal printers, barcode scanners, and multi-terminal LAN setup.
							</p>

							{#if auditSubmitted}
								<div class="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
									<div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white mb-3">
										<Check size={24} strokeWidth={3} />
									</div>
									<h4 class="text-base font-bold text-emerald-900">Store Audit Request Logged!</h4>
									<p class="mt-1 text-xs text-emerald-700">
										Thank you, <span class="font-semibold">{contactName}</span>. Your onboarding assessment for
										<span class="font-semibold">{storeName}</span> ({terminalCount}) has been scheduled.
										Our deployment team will reach out at <span class="font-semibold">{contactPhone}</span>.
									</p>
									<button
										type="button"
										onclick={() => (auditSubmitted = false)}
										class="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors min-h-[44px]"
									>
										Submit Another Store Request
									</button>
								</div>
							{:else}
								<form onsubmit={handleStoreAuditRequest} class="mt-6 space-y-4">
									<div class="grid gap-4 sm:grid-cols-2">
										<div>
											<label for="store_name" class="block text-xs font-semibold text-slate-700 mb-1">
												Medical Store / Agency Name *
											</label>
											<input
												id="store_name"
												type="text"
												bind:value={storeName}
												required
												placeholder="e.g. Ballia Medical & Ayurvedic Agencies"
												class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none min-h-[44px]"
											/>
										</div>

										<div>
											<label for="contact_name" class="block text-xs font-semibold text-slate-700 mb-1">
												Proprietor / Contact Name *
											</label>
											<input
												id="contact_name"
												type="text"
												bind:value={contactName}
												required
												placeholder="e.g. Rajesh Sharma"
												class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none min-h-[44px]"
											/>
										</div>
									</div>

									<div class="grid gap-4 sm:grid-cols-2">
										<div>
											<label for="contact_phone" class="block text-xs font-semibold text-slate-700 mb-1">
												Phone / WhatsApp Number *
											</label>
											<input
												id="contact_phone"
												type="tel"
												bind:value={contactPhone}
												required
												placeholder="+91 98765 43210"
												class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none min-h-[44px]"
											/>
										</div>

										<div>
											<label for="dl_no" class="block text-xs font-semibold text-slate-700 mb-1">
												Drug License Number (Optional)
											</label>
											<input
												id="dl_no"
												type="text"
												bind:value={drugLicenseNo}
												placeholder="e.g. 20B/21B-UP/BLA/2026/894"
												class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none min-h-[44px]"
											/>
										</div>
									</div>

									<div class="grid gap-4 sm:grid-cols-2">
										<div>
											<label for="store_type" class="block text-xs font-semibold text-slate-700 mb-1">
												Store Operation Type
											</label>
											<select
												id="store_type"
												bind:value={storeType}
												class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none min-h-[44px]"
											>
												<option value="Wholesale + Retail (Dual Counter)">Wholesale + Retail (Dual Counter)</option>
												<option value="Wholesale Stockist & Distributor">Wholesale Stockist & Distributor</option>
												<option value="Retail Chemist & Pharmacy">Retail Chemist & Pharmacy</option>
												<option value="Ayurvedic & General Store">Ayurvedic & General Store</option>
											</select>
										</div>

										<div>
											<label for="terminal_count" class="block text-xs font-semibold text-slate-700 mb-1">
												Billing Counter Concurrency
											</label>
											<select
												id="terminal_count"
												bind:value={terminalCount}
												class="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none min-h-[44px]"
											>
												<option value="1 Single Counter Terminal">1 Single Counter Terminal</option>
												<option value="2–4 Billing Terminals (LAN Server)">2–4 Billing Terminals (LAN Server)</option>
												<option value="5–10 Billing Terminals (Multi-User)">5–10 Billing Terminals (Multi-User)</option>
												<option value="Multi-Location Warehouse Node">Multi-Location Warehouse Node</option>
											</select>
										</div>
									</div>

									<div>
										<label for="hw_details" class="block text-xs font-semibold text-slate-700 mb-1">
											Existing PC Hardware & Printers (Optional)
										</label>
										<textarea
											id="hw_details"
											rows={3}
											bind:value={existingHardware}
											placeholder="e.g. 2 Dual-Core Desktop PCs with Windows 10, 80mm TVS thermal printer, USB Honeywell barcode scanner..."
											class="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
										></textarea>
									</div>

									<button
										type="submit"
										disabled={isSubmitting}
										class="w-full rounded-xl bg-[#1d4ed8] py-3.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
									>
										{#if isSubmitting}
											<span>Logging Store Audit Request...</span>
										{:else}
											<Send size={15} />
											<span>Submit Store Hardware Audit</span>
										{/if}
									</button>
								</form>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</section>
	</main>

	<!-- FOOTER SECTION (Deep Teal / Navy Theme) -->
	<footer class="bg-[#0b2930] text-slate-300 pt-16 pb-12 border-t border-teal-900">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
				<!-- Brand & Mission -->
				<div>
					<div class="flex items-center gap-2.5">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-white shadow-sm"
						>
							<Plus size={20} strokeWidth={3} />
						</div>
						<div class="flex flex-col">
							<span class="text-xl font-bold tracking-tight text-white leading-none">MedERP</span>
							<span class="text-[9px] font-bold text-teal-300 uppercase tracking-wider">Wholesale & Retail Pharmacy ERP</span>
						</div>
					</div>
					<p class="mt-4 text-xs leading-relaxed text-teal-100/70">
						Purpose-built pharmacy management software for family-owned chemist counters and wholesale distributors.
						Featuring FEFO batch control, dual khata ledgers, and zero-compromise GST compliance.
					</p>
					<div class="mt-4 flex items-center gap-2 text-xs text-teal-300 font-semibold">
						<Clock size={15} />
						<span>100% Offline-First LAN Uptime</span>
					</div>
				</div>

				<!-- Quick Links -->
				<div>
					<h4 class="text-xs font-bold uppercase tracking-wider text-white">Store Modules</h4>
					<ul class="mt-4 space-y-2 text-xs text-slate-300">
						<li><a href="/sales/new" class="hover:text-teal-400 transition-colors">High-Speed Billing POS</a></li>
						<li><a href="/inventory" class="hover:text-teal-400 transition-colors">FEFO Batch Inventory</a></li>
						<li><a href="/customers" class="hover:text-teal-400 transition-colors">Wholesale Khata Ledgers</a></li>
						<li><a href="/purchases" class="hover:text-teal-400 transition-colors">Inward GRN Procurement</a></li>
						<li><a href="/reports" class="hover:text-teal-400 transition-colors">GST & Schedule H1 Reports</a></li>
					</ul>
				</div>

				<!-- Statutory Compliance -->
				<div>
					<h4 class="text-xs font-bold uppercase tracking-wider text-white">Statutory & Registers</h4>
					<ul class="mt-4 space-y-2 text-xs text-slate-300">
						<li><a href="/reports" class="hover:text-teal-400 transition-colors">Drug Schedule H/H1 Register</a></li>
						<li><a href="/reports" class="hover:text-teal-400 transition-colors">Form 35 Narcotic Log</a></li>
						<li><a href="/reports" class="hover:text-teal-400 transition-colors">GSTR-1 Tax Liability Summary</a></li>
						<li><a href="/reports" class="hover:text-teal-400 transition-colors">HSN Code Tax Rate Mapping</a></li>
						<li><a href="/inventory/batches" class="hover:text-teal-400 transition-colors">Near-Expiry (&lt;90d) Alerts</a></li>
					</ul>
				</div>

				<!-- Contact & Store Deployment -->
				<div>
					<h4 class="text-xs font-bold uppercase tracking-wider text-white">Store Support & Setup</h4>
					<p class="mt-4 text-xs text-teal-100/70">
						Dedicated engineering support for store deployment and printer configuration:
					</p>
					<div class="mt-3 flex items-center gap-2.5 text-base font-bold text-teal-400">
						<Phone size={18} />
						<span>+91 98765 43210</span>
					</div>
					<div class="mt-2 flex items-center gap-2.5 text-xs text-slate-400">
						<Mail size={14} />
						<span>support@mederp-pharmacy.in</span>
					</div>
					<div class="mt-2 flex items-center gap-2.5 text-xs text-slate-400">
						<MapPin size={14} />
						<span>Ballia, Uttar Pradesh — India</span>
					</div>
				</div>
			</div>

			<!-- Bottom Copyright -->
			<div class="mt-12 pt-8 border-t border-teal-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
				<div>© 2026 MedERP System. All rights reserved. Indian Drugs & Cosmetics Act & GST Compliant.</div>
				<div class="flex items-center gap-6">
					<a href="/login" class="hover:text-teal-400 transition-colors">Staff Login</a>
					<a href="/sales/new" class="hover:text-teal-400 transition-colors">Counter POS</a>
					<a href="/dashboard" class="hover:text-teal-400 transition-colors">Store Portal</a>
					<a href="/settings" class="hover:text-teal-400 transition-colors">Settings</a>
				</div>
			</div>
		</div>
	</footer>
</div>
