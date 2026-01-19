/**
 * Form validation utilities for POS system
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * Validate product creation/edit form
 */
export function validateProductForm(data: {
  name?: string
  price?: string | number
  cost?: string | number
  stock?: string | number
  minStock?: string | number
  maxStock?: string | number
  barcode?: string
}): ValidationResult {
  const errors: ValidationError[] = []

  // Name validation
  if (!data.name || String(data.name).trim() === '') {
    errors.push({ field: 'name', message: 'Product name is required' })
  } else if (String(data.name).length > 100) {
    errors.push({ field: 'name', message: 'Product name must be under 100 characters' })
  }

  // Price validation
  if (data.price === undefined || data.price === '') {
    errors.push({ field: 'price', message: 'Price is required' })
  } else {
    const priceNum = parseFloat(String(data.price))
    if (isNaN(priceNum) || priceNum < 0) {
      errors.push({ field: 'price', message: 'Price must be a valid positive number' })
    }
  }

  // Cost validation (optional)
  if (data.cost !== undefined && data.cost !== '') {
    const costNum = parseFloat(String(data.cost))
    if (isNaN(costNum) || costNum < 0) {
      errors.push({ field: 'cost', message: 'Cost must be a valid positive number' })
    }
  }

  // Stock validation
  if (data.stock === undefined || data.stock === '') {
    errors.push({ field: 'stock', message: 'Stock quantity is required' })
  } else {
    const stockNum = parseInt(String(data.stock), 10)
    if (isNaN(stockNum) || stockNum < 0) {
      errors.push({ field: 'stock', message: 'Stock must be a valid positive number' })
    }
  }

  // Min/Max stock validation (optional but if provided, must be valid)
  if (data.minStock !== undefined && data.minStock !== '') {
    const minNum = parseInt(String(data.minStock), 10)
    if (isNaN(minNum) || minNum < 0) {
      errors.push({ field: 'minStock', message: 'Min stock must be a valid positive number' })
    }
  }

  if (data.maxStock !== undefined && data.maxStock !== '') {
    const maxNum = parseInt(String(data.maxStock), 10)
    if (isNaN(maxNum) || maxNum < 0) {
      errors.push({ field: 'maxStock', message: 'Max stock must be a valid positive number' })
    }
  }

  // Barcode validation (optional, but if provided, should be reasonably short)
  if (data.barcode && String(data.barcode).length > 100) {
    errors.push({ field: 'barcode', message: 'Barcode must be under 100 characters' })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate checkout/payment form
 */
export function validateCheckoutForm(data: {
  paymentAmount?: string | number
  total?: number
}): ValidationResult {
  const errors: ValidationError[] = []

  if (data.paymentAmount === undefined || data.paymentAmount === '') {
    errors.push({ field: 'paymentAmount', message: 'Payment amount is required' })
  } else {
    const amount = parseFloat(String(data.paymentAmount))
    if (isNaN(amount) || amount < 0) {
      errors.push({ field: 'paymentAmount', message: 'Payment amount must be a valid positive number' })
    } else if (data.total && amount < data.total) {
      errors.push({
        field: 'paymentAmount',
        message: `Payment amount (${amount}) must be at least the total (${data.total})`,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate barcode input
 */
export function validateBarcode(barcode?: string): ValidationResult {
  const errors: ValidationError[] = []

  if (!barcode || barcode.trim() === '') {
    errors.push({ field: 'barcode', message: 'Barcode cannot be empty' })
  } else if (barcode.length > 100) {
    errors.push({ field: 'barcode', message: 'Barcode must be under 100 characters' })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get error message for a specific field
 */
export function getFieldError(errors: ValidationError[], field: string): string | null {
  const error = errors.find((e) => e.field === field)
  return error ? error.message : null
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) return ''
  if (errors.length === 1) return errors[0].message
  return errors.map((e) => `${e.field}: ${e.message}`).join('\n')
}
