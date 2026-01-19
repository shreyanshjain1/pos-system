// Jest setup
jest.setTimeout(20000)

// Mock retail guard by default so server-side tests are not blocked by subscription checks.
jest.mock('@/lib/subscription/retailGuard', () => ({
	getRetailShopAndSubscriptionByShopId: async (id: string) => ({ allowed: true, subscription: { plan: 'advance' }, shop: { id } }),
	getRetailShopAndSubscriptionByStoreName: async (name: string) => ({ allowed: true, subscription: { plan: 'advance' }, shop: { name } })
}))
