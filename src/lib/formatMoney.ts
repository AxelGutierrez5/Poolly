/**
 * Formatea un número como moneda argentina con separadores de miles
 * mientras el usuario escribe.
 * Ej: "1500000" → "1.500.000"
 */
export function formatInputMoney(raw: string): string {
  // Solo dígitos
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  // Agregar puntos cada 3 desde la derecha
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Parsea el valor formateado de vuelta a número */
export function parseInputMoney(formatted: string): number {
  return Number(formatted.replace(/\./g, ''))
}

/** Display final con símbolo $ */
export function displayARS(value: number): string {
  if (!value && value !== 0) return ''
  return '$ ' + value.toLocaleString('es-AR')
}
