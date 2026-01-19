"use client"
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { pageVariants, cardVariants, staggerContainer, listItem } from '@/lib/motion'
import PaymentModal from '@/components/ui/PaymentModal'

const PLANS: {
	key: string;
	name: string;
	monthlyPrice: string;
	annualPrice: string;
	description: string;
	features: Array<{ text: string; comingSoon?: boolean }>;
	highlight?: boolean;
	badge?: string;
	bullets?: string[];
}[] = [
	{
		key: 'basic',
		name: 'Basic',
		monthlyPrice: '₱399',
		annualPrice: '₱3,990',
		description: 'Perfect for getting started with essential POS features',
		features: [
			{ text: 'Basic POS checkout' },
			{ text: 'Up to 100 products' },
			{ text: 'Sales history (today)' },
			{ text: 'Manual stock adjustments' },
			{ text: 'Email support' }
		]
	},
	{
		key: 'pro',
		name: 'Pro',
		monthlyPrice: '₱899',
		annualPrice: '₱8,990',
		description: 'Advanced features for growing businesses',
		highlight: true,
		   features: [
			   { text: 'Everything in Basic' },
			   { text: 'Unlimited products' },
			   { text: 'Hardware barcode scanner support' },
			   { text: 'Multi-day sales reports & analytics' },
			   { text: 'Low-stock alerts & reorder tracking' },
			   { text: 'Supply planning & restock management' },
			   { text: 'Grocery list & reorder suggestions' },
			   { text: 'Update stock without purchasing' },
			   { text: 'Priority email support' },
			   { text: 'Product images & SKUs (early access)' }
		   ]
	},
	{
		key: 'advance',
		name: 'Advanced',
		monthlyPrice: '₱1,499',
		annualPrice: '₱14,990',
		description: 'For growing & multi-location businesses',
		   features: [
			   { text: 'Everything in Pro' },
			   { text: 'Managed purchasing (Buy for Me)' },
			   { text: 'Delivery coordination & service fee handling' },
			   { text: 'Supply order history & cost tracking' },
			   { text: 'Real-time inventory sync across devices' },
			   { text: 'Unlimited sales & audit history' },
			   { text: 'Unlimited CSV exports' },
			   { text: 'Extended audit logs & activity tracking' },
			   { text: 'Dedicated priority support & escalation' },
			   { text: 'Early access to upcoming enterprise features' },
		   ],
		   bullets: [
			   'Advanced analytics & forecasting',
			   'Role-based access control (RBAC)',
			   'API integrations',
			   'Scheduled & custom reports'
		   ]
	}
]

export default function PlansPage() {
	const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
	const [paymentModal, setPaymentModal] = useState<{ isOpen: boolean; plan: string; price: string }>({
		isOpen: false,
		plan: '',
		price: ''
	})

	const handleGetStarted = (planName: string, price: string) => {
		setPaymentModal({ isOpen: true, plan: planName, price })
	}

	return (
		<motion.div
			variants={pageVariants}
			initial="hidden"
			animate="visible"
		>
			<div className="mb-6 sm:mb-8">
				<h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Choose Your Plan</h2>
				<p className="text-sm sm:text-base text-stone-600 mt-2">Select the perfect plan for your business needs. Upgrade or downgrade anytime.</p>
				
				{/* Billing Period Toggle */}
				<div className="flex items-center justify-center gap-3 mt-6 bg-stone-100 rounded-xl p-1.5 max-w-xs mx-auto">
					<button
						onClick={() => setBillingPeriod('monthly')}
						className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
							billingPeriod === 'monthly'
								? 'bg-white text-emerald-700 shadow-sm'
								: 'text-stone-600 hover:text-stone-900'
						}`}
					>
						Monthly
					</button>
					<button
						onClick={() => setBillingPeriod('annual')}
						className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all relative ${
							billingPeriod === 'annual'
								? 'bg-white text-emerald-700 shadow-sm'
								: 'text-stone-600 hover:text-stone-900'
						}`}
					>
						Annual
						<span className="ml-1.5 text-xs text-emerald-600 font-bold">Save 17%</span>
					</button>
				</div>
			</div>

			<motion.div 
				className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
				variants={staggerContainer}
				initial="hidden"
				animate="visible"
			>
				{PLANS.map(plan => (
					<motion.div
						key={plan.key}
						variants={listItem}
						whileHover={{ y: -8 }}
						className={`relative ${plan.highlight ? 'lg:scale-105' : ''}`}
					>
						<motion.div
							className={`h-full bg-white rounded-2xl p-8 border-2 shadow-sm hover:shadow-xl transition-all ${
								plan.highlight 
									? 'border-emerald-500 shadow-emerald-100' 
									: 'border-stone-200'
							}`}
							variants={cardVariants}
						>
							{plan.highlight && (
								<div className="absolute -top-4 left-1/2 -translate-x-1/2">
									<span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md">
										MOST POPULAR
									</span>
								</div>
							)}


							<div className="mb-6">
								<h3 className="text-2xl font-bold text-stone-900 mb-2">{plan.name}</h3>
								<p className="text-sm text-stone-500 mb-4">{plan.description}</p>
							<div className="flex items-baseline gap-1">
								<span className="text-4xl font-extrabold text-stone-900">
									{billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice}
								</span>
								<span className="text-sm text-stone-500">
									/{billingPeriod === 'monthly' ? 'month' : 'year'}
								</span>
							</div>
						</div>

						<ul className="space-y-3 mb-8">
							   {plan.features.map((feature, i) => (
								   <li key={i} className="flex items-start gap-3 text-sm text-stone-700">
									   <svg 
										   className={`w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500`}
										   viewBox="0 0 24 24" 
										   fill="none" 
										   stroke="currentColor" 
										   strokeWidth="2.5"
									   >
										   <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
									   </svg>
									   <span className="flex-1">{feature.text}</span>
								   </li>
							   ))}
							   {/* Bulleted list for Advanced plan */}
							   {plan.key === 'advance' && plan.bullets && plan.bullets.length > 0 && (
								   <ul className="mt-3 mb-2 ml-7 list-disc text-sm text-stone-600 space-y-1">
									   {plan.bullets.map((bullet, idx) => (
										   <li key={idx}>{bullet}</li>
									   ))}
								   </ul>
							   )}
							</ul>

							<motion.button
								className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${
									plan.highlight
										? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md hover:shadow-lg hover:from-emerald-600 hover:to-emerald-700'
										: 'bg-stone-100 text-stone-900 hover:bg-stone-200'
								}`}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
							onClick={() => handleGetStarted(plan.name, billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice)}
							>
								{plan.highlight ? 'Get Started' : 'Choose Plan'}
							</motion.button>
						</motion.div>
					</motion.div>
				))}
			</motion.div>

			<motion.div 
				className="mt-12 bg-gradient-to-r from-stone-50 to-stone-100 rounded-2xl p-8 border border-stone-200"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.4 }}
			>
				<div className="max-w-3xl mx-auto text-center">
					<h3 className="text-2xl font-bold text-stone-900 mb-3">Need help choosing?</h3>
					<p className="text-stone-600 mb-6">
						All plans include secure cloud storage, automatic updates, and access to our comprehensive help center. 
						Start with any plan and upgrade as your business grows.
					</p>
					<div className="flex flex-wrap gap-4 justify-center text-sm">
						<div className="flex items-center gap-2 text-stone-700">
							<svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
							No setup fees
						</div>
						<div className="flex items-center gap-2 text-stone-700">
							<svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
							Cancel anytime
						</div>

					</div>
				</div>
			</motion.div>

			<PaymentModal
				isOpen={paymentModal.isOpen}
				onClose={() => setPaymentModal({ isOpen: false, plan: '', price: '' })}
				amount={paymentModal.price}
				title={`Subscribe to ${paymentModal.plan}`}
				description="Complete your payment and message us on Facebook to activate your subscription"
			/>
		</motion.div>
	)
}
