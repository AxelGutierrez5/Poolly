import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const ars = (amount: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)

export const DIAS_SEMANA = [
  'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo',
] as const

export function generarFechasTurnos(fechaInicio: string, diasJuego: string[], n: number): Date[] {
  // MAP_JS: valor getDay() de JS (domingo=0)
  const MAP_JS: Record<string, number> = {
    domingo: 0, lunes: 1, martes: 2, 'miércoles': 3, jueves: 4, viernes: 5, sábado: 6,
  }
  // MAP_ORD: orden visual lunes→domingo
  const MAP_ORD: Record<string, number> = {
    lunes: 0, martes: 1, 'miércoles': 2, jueves: 3, viernes: 4, sábado: 5, domingo: 6,
  }

  // Ordenar los días seleccionados por orden visual lunes→domingo
  const diasOrdenados = [...diasJuego].sort((a, b) => MAP_ORD[a] - MAP_ORD[b])
  const diasJS = diasOrdenados.map(d => MAP_JS[d])

  const fechas: Date[] = []
  const inicio = new Date(fechaInicio + 'T00:00:00')
  const diaSemanaInicio = inicio.getDay()
  const cursor = new Date(inicio)

  // Regla: si desde la fecha de inicio hay al menos un día seleccionado disponible
  // en la misma semana (es decir, con getDay() >= diaSemanaInicio), empezar desde ahí.
  // Si todos los días ya pasaron en esta semana, saltar al lunes siguiente.
  const hayDiaDisponible = diasJS.some(d => d >= diaSemanaInicio)
  if (!hayDiaDisponible) {
    const diasHastaLunes = diaSemanaInicio === 1 ? 7 : (8 - diaSemanaInicio) % 7 || 7
    cursor.setDate(cursor.getDate() + diasHastaLunes)
  }

  while (fechas.length < n) {
    if (diasJS.includes(cursor.getDay())) fechas.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return fechas
}

export function formatFecha(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function formatFechaCorta(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatInputMoney(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function parseInputMoney(formatted: string): number {
  return Number(formatted.replace(/\./g, ''))
}
