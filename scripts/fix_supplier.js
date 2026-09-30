import fs from 'fs';
const text = fs.readFileSync('src/routes/suppliers/[id]/+page.svelte', 'utf-8');
const searchString = `				<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
					Recent Purchases Activity
				</h3>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm text-gray-500 dark:text-gray-400">
					<thead
						class="bg-gray-50 text-xs text-gray-700 uppercase dark:bg-gray-700/50 dark:text-gray-400"
					>
						<tr>
							<th class="border-b px-4 py-2 dark:border-gray-700">Inv No</th>
							<th class="border-b px-4 py-2 dark:border-gray-700">Date</th>
							<th class="border-b px-4 py-2 text-right dark:border-gray-700">Amount</th>
							<th class="border-b px-4 py-2 text-right dark:border-gray-700">Balance Due</th>
						</tr>
					</thead>
					<tbody>
						{#if recentActivity.length === 0}
							<tr>
								<td colspan="4" class="px-4 py-6 text-center">No recent purchases from this supplier.</td
								>
							</tr>
						{:else}
							{#each recentActivity as purchase (purchase.id)}
								<tr
									class="border-b last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-700/30"
								>
									<td class="px-4 py-3">
										<a href="/purchases/{purchase.id}" class="text-primary-600 hover:underline"
											>{purchase.invoiceNumber}</a
										>
									</td>
									<td class="px-4 py-3">{new Date(purchase.invoiceDate).toLocaleDateString('en-IN')}</td>
									<td
										class="px-4 py-3 text-right font-medium text-gray-900 tabular-nums dark:text-gray-100"
										>₹{purchase.grandTotal.toFixed(2)}</td
									>
									<td
										class="px-4 py-3 text-right tabular-nums {purchase.dueAmount > 0
											? 'text-orange-600 dark:text-orange-400'
											: 'text-gray-500'}">₹{purchase.dueAmount.toFixed(2)}</td
									>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>`;

const replaceString = `				<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
					Recent Account Activity
				</h3>
				<Button variant="ghost" size="sm" onclick={() => goto(\`/payments/pay?supplierId=\${supplier?.id}\`)}>Record Payment</Button>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm text-gray-500 dark:text-gray-400">
					<thead
						class="bg-gray-50 text-xs text-gray-700 uppercase dark:bg-gray-700/50 dark:text-gray-400"
					>
						<tr>
							<th class="border-b px-4 py-2 dark:border-gray-700">Date</th>
							<th class="border-b px-4 py-2 dark:border-gray-700">Type</th>
							<th class="border-b px-4 py-2 dark:border-gray-700">Particulars</th>
							<th class="border-b px-4 py-2 text-right dark:border-gray-700">Debit (₹)</th>
							<th class="border-b px-4 py-2 text-right dark:border-gray-700">Credit (₹)</th>
							<th class="border-b px-4 py-2 text-right dark:border-gray-700">Balance</th>
						</tr>
					</thead>
					<tbody>
						{#if recentActivity.length === 0}
							<tr>
								<td colspan="6" class="px-4 py-6 text-center">No recent activity for this supplier.</td
								>
							</tr>
						{:else}
							{#each recentActivity as entry (entry.id)}
								<tr
									class="border-b last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-700/30"
								>
									<td class="px-4 py-3 whitespace-nowrap">{new Date(entry.date).toLocaleDateString('en-IN')}</td>
									<td class="px-4 py-3 capitalize">{entry.type.replace('-', ' ')}</td>
									<td class="px-4 py-3">
										{#if entry.type === 'purchase'}
											<a href="/purchases/{entry.reference}" class="text-primary-600 hover:underline">{entry.particulars}</a>
										{:else}
											{entry.particulars}
										{/if}
									</td>
									<td class="px-4 py-3 text-right tabular-nums text-gray-900 dark:text-gray-100">{entry.debit ? entry.debit.toFixed(2) : '-'}</td>
									<td class="px-4 py-3 text-right tabular-nums text-blue-600 dark:text-blue-500">{entry.credit ? entry.credit.toFixed(2) : '-'}</td>
									<td class="px-4 py-3 text-right tabular-nums font-semibold {entry.balance > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'}">{entry.balance.toFixed(2)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>`;

fs.writeFileSync(
	'src/routes/suppliers/[id]/+page.svelte',
	text.replace(searchString, replaceString)
);
