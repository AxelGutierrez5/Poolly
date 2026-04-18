
export type EstadoGrupo = 'activo' | 'completado' | 'cancelado'
export type TipoAsignacion = 'manual' | 'aleatorio'
export type EstadoTurno = 'pendiente' | 'cobrado'
export type EstadoPago = 'pendiente' | 'pagado' | 'atrasado'

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miércoles'
  | 'jueves'
  | 'viernes'
  | 'sábado'
  | 'domingo'

// ─── Tablas ──────────────────────────────────────────────────────────────────
export interface Grupo {
  id: string
  nombre: string
  monto_total: number
  cantidad_numeros: number
  aporte_por_numero: number
  dias_juego: DiaSemana[]
  fecha_inicio: string
  estado: EstadoGrupo
  creado_por: string
  created_at: string
}

export interface Participante {
  id: string
  grupo_id: string
  nombre: string
  telefono: string | null
  user_id: string | null
  created_at: string
}

export interface NumeroAsignado {
  id: string
  grupo_id: string
  participante_id: string
  numero: number
  tipo_asignacion: TipoAsignacion
  created_at: string
  // joins
  participante?: Participante
}

export interface Turno {
  id: string
  grupo_id: string
  fecha: string
  numero_asignado_id: string | null
  orden: number
  estado: EstadoTurno
  created_at: string
  // joins
  numero_asignado?: NumeroAsignado & { participante: Participante }
}

export interface Pago {
  id: string
  turno_id: string
  participante_id: string
  numero_asignado_id: string
  monto: number
  fecha_pago: string | null
  estado: EstadoPago
  created_at: string
  // joins
  participante?: Participante
  numero_asignado?: NumeroAsignado
}

// ─── Form types ───────────────────────────────────────────────────────────────
export interface CrearGrupoForm {
  nombre: string
  monto_total: number
  cantidad_numeros: number
  dias_juego: DiaSemana[]
  fecha_inicio: string
}
