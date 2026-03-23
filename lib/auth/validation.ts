import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email address').transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  confirmPassword: z.string().min(8, 'Confirm your password')
}).refine((input) => input.password === input.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match'
});

export const onboardSchema = z.object({
  shopName: z.string().trim().min(2, 'Shop name is required').max(120),
  posType: z.enum(['RETAIL', 'COFFEE', 'FOOD', 'BUILDING_MATERIALS', 'SERVICES'])
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(60)
});

export const productSchema = z.object({
  categoryId: z.string().trim().optional().nullable(),
  sku: z.string().trim().max(50).optional().nullable(),
  barcode: z.string().trim().max(60).optional().nullable(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  cost: z.coerce.number().min(0),
  price: z.coerce.number().min(0),
  stockQty: z.coerce.number().int().min(0),
  reorderPoint: z.coerce.number().int().min(0),
  isActive: z.coerce.boolean().optional().default(true)
});

export const supplierSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactName: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable()
});

export const saleSchema = z.object({
  paymentMethod: z.string().trim().min(2).max(40),
  discountAmount: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(300).optional().nullable(),
  cashierName: z.string().trim().max(80).optional().nullable(),
  items: z.array(z.object({
    productId: z.string().trim().min(1),
    qty: z.coerce.number().int().positive()
  })).min(1)
});

export const purchaseSchema = z.object({
  supplierId: z.string().trim().min(1),
  notes: z.string().trim().max(300).optional().nullable(),
  items: z.array(z.object({
    productId: z.string().trim().min(1),
    qty: z.coerce.number().int().positive(),
    unitCost: z.coerce.number().min(0)
  })).min(1)
});

export const settingSchema = z.object({
  currencySymbol: z.string().trim().min(1).max(5),
  taxRate: z.coerce.number().min(0).max(100),
  receiptFooter: z.string().trim().max(300).optional().nullable(),
  lowStockEnabled: z.coerce.boolean(),
  lowStockThreshold: z.coerce.number().int().min(0).max(9999)
});
