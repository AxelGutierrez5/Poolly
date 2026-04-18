'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { ars, formatFecha } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Modal } from '@/components/ui/Modal'
import { ArrowLeft, Hash, ClipboardCopy, CheckCircle2, Loader2 } from 'lucide-react'
import { PageLoader } from '@/components/ui/SkeletonCard'
import { cn } from '@/lib/utils'

export default function PagosPage() {
  const { id: grupoId } = useParams() as { id: string }
  const supabase = createClient()

  const [grupo, setGrupo]         = useState<any>(null)
  const [turnos, setTurnos]       = useState<any[]>([])
  const [turnoId, setTurnoId]     = useState('')
  const [pagos, setPagos]         = useState<any[]>([])
  const [loadingP, setLoadingP]   = useState<string | null>(null)
  const [generando, setGen]       = useState(false)
  const [baseLoad, setBase]       = useState(true)
  const [showCerrar, setShowCerrar] = useState(false)
  const [cerrando, setCerrando]     = useState(false)

  useEffect(() => { cargarBase() }, [])
  useEffect(() => { if (turnoId && grupo) cargarPagos() }, [turnoId])

  async function cargarBase() {
    const { data: g } = await supabase.from('grupos').select('*').eq('id', grupoId).single()
    setGrupo(g)
    const { data: t } = await supabase.from('turnos')
      .select('*, numero_asignado:numeros_asignados(numero, participante:participantes(user_id))')
      .eq('grupo_id', grupoId).order('orden')
    setTurnos(t || [])
    const pendiente = t?.find((x: any) => x.estado === 'pendiente')
    if (pendiente) setTurnoId(pendiente.id)
    else if (t?.[0]) setTurnoId(t[0].id)
    setBase(false)
  }

  async function cargarPagos() {
    // Pagos existentes
    const { data: ex } = await supabase.from('pagos')
      .select('*, participante:participantes(id, user_id), numero_asignado:numeros_asignados(numero)')
      .eq('turno_id', turnoId).order('created_at')

    if (ex && ex.length > 0) {
      // Enriquecer con nombre desde perfiles
      const userIds = ex.map((p: any) => p.participante?.user_id).filter(Boolean)
      const { data: perfiles } = await supabase.from('perfiles').select('id, nombre, apellido').in('id', userIds)
      const pm: Record<string, any> = {}
      perfiles?.forEach(p => { pm[p.id] = p })
      setPagos(ex.map((p: any) => ({
        ...p,
        perfil: pm[p.participante?.user_id] || null,
      })))
      return
    }

    // Generar pagos automáticamente
    setGen(true)
    const { data: nums } = await supabase.from('numeros_asignados')
      .select('id, participante_id, numero').eq('grupo_id', grupoId).order('numero')
    if (!nums?.length) { setPagos([]); setGen(false); return }
    const turno = turnos.find(t => t.id === turnoId)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const fechaTurno = turno ? new Date(turno.fecha + 'T00:00:00') : null
    // Atrasado solo si la fecha del turno es estrictamente anterior a hoy (no el mismo día)
    const esPasado = fechaTurno && fechaTurno < hoy && turno.estado !== 'cobrado'
    await supabase.from('pagos').insert(nums.map((na: any) => ({
      turno_id: turnoId, participante_id: na.participante_id,
      numero_asignado_id: na.id, monto: grupo.aporte_por_numero,
      estado: esPasado ? 'atrasado' : 'pendiente',
    })))
    setGen(false)
    cargarPagos()
  }

  async function togglePago(pagoId: string, estado: string) {
    setLoadingP(pagoId)
    const next = estado === 'pagado' ? 'pendiente' : 'pagado'
    await supabase.from('pagos').update({
      estado: next, fecha_pago: next === 'pagado' ? new Date().toISOString().split('T')[0] : null,
    }).eq('id', pagoId)
    toast.success(next === 'pagado' ? 'Pago registrado ✓' : 'Pago revertido')
    setLoadingP(null); cargarPagos()
  }

  async function confirmarCerrar() {
    setCerrando(true)
    await supabase.from('turnos').update({ estado: 'cobrado' }).eq('id', turnoId)
    toast.success('Turno cerrado 🎉')
    setCerrando(false); setShowCerrar(false); cargarBase()
  }

  function copiarResumen() {
    const t = turnos.find(x => x.id === turnoId)
    if (!t) return
    const getNombre = (p: any) => {
      if (p.perfil) return [p.perfil.nombre, p.perfil.apellido].filter(Boolean).join(' ')
      return 'Sin nombre'
    }
    const txt = [
      `Turno #${t.orden} — ${formatFecha(t.fecha)}`,
      `Grupo: ${grupo?.nombre}`, '',
      'PENDIENTES:', ...pagos.filter(p => p.estado !== 'pagado').map(p => `  ✗ ${getNombre(p)} — ${ars(p.monto)}`),
      '', 'PAGADOS:', ...pagos.filter(p => p.estado === 'pagado').map(p => `  ✓ ${getNombre(p)} — ${ars(p.monto)}`),
      '', `Total: ${ars(pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + Number(p.monto), 0))} / ${ars(pagos.reduce((s, p) => s + Number(p.monto), 0))}`,
    ].join('\n')
    navigator.clipboard.writeText(txt).then(() => toast.success('Resumen copiado'))
  }

  if (baseLoad) return <PageLoader text="Cargando pagos..." />

  const turnoActual = turnos.find(t => t.id === turnoId)
  const pagados  = pagos.filter(p => p.estado === 'pagado').length
  const total    = pagos.length
  const recaudado = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + Number(p.monto), 0)
  const montoTotal = pagos.reduce((s, p) => s + Number(p.monto), 0)
  const sinPagar = pagos.filter(p => p.estado !== 'pagado').length

  const getNombre = (p: any) => {
    if (p.perfil) return [p.perfil.nombre, p.perfil.apellido].filter(Boolean).join(' ') || 'Sin nombre'
    return 'Sin nombre'
  }

  const estadoPago = (e: string): { variant: 'success' | 'warning' | 'secondary'; label: string } => {
    if (e === 'pagado')   return { variant: 'success', label: 'Pagado' }
    if (e === 'atrasado') return { variant: 'warning', label: 'Atrasado' }
    return                       { variant: 'secondary', label: 'Pendiente' }
  }

  return (
    <>
      <div className="max-w-lg mx-auto space-y-5">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 text-muted-foreground">
            <Link href={`/grupos/${grupoId}`}><ArrowLeft className="h-4 w-4" />Volver</Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Pagos</h1>
          {grupo && <p className="text-sm text-muted-foreground mt-0.5">{grupo.nombre}</p>}
        </div>

        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Turno</p>
            <select value={turnoId} onChange={e => { setTurnoId(e.target.value); setPagos([]) }}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {turnos.map(t => (
                <option key={t.id} value={t.id}>
                  #{t.orden} · {new Date(t.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {t.estado === 'cobrado' ? ' ✅' : ''}
                </option>
              ))}
            </select>
            {turnoActual && (
              <p className="text-xs text-muted-foreground capitalize">
                📅 {formatFecha(turnoActual.fecha)}
              </p>
            )}
          </CardContent>
        </Card>

        {total > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Recaudado</p>
                  <p className="text-2xl font-bold text-primary tracking-tight">{ars(recaudado)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">de {ars(montoTotal)} · {pagados}/{total} pagos</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" onClick={copiarResumen}>
                    <ClipboardCopy className="h-3.5 w-3.5" />Copiar
                  </Button>
                  {turnoActual?.estado === 'pendiente' && (
                    <Button size="sm" onClick={() => setShowCerrar(true)}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {pagados === total ? 'Cerrar' : 'Cerrar igual'}
                    </Button>
                  )}
                </div>
              </div>
              <Progress value={total > 0 ? (pagados / total) * 100 : 0} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {generando ? (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />Generando pagos...
              </div>
            ) : !turnoId ? (
              <p className="text-center text-muted-foreground py-10 text-sm">Seleccioná un turno</p>
            ) : pagos.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-muted-foreground text-sm">Sin números asignados</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/grupos/${grupoId}/numeros`}><Hash className="h-4 w-4" />Asignar números</Link>
                </Button>
              </div>
            ) : (
              pagos.map((p, i) => {
                const cerrado = turnoActual?.estado === 'cobrado'
                const { variant, label } = estadoPago(p.estado)
                return (
                  <div key={p.id}>
                    <div className={cn('flex items-center gap-3 px-4 py-3.5', p.estado === 'atrasado' && 'bg-amber-50 dark:bg-amber-950/20')}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{getNombre(p)}</span>
                          <span className="text-xs text-muted-foreground font-mono">nº {p.numero_asignado?.numero}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {ars(p.monto)}
                        </p>
                      </div>
                      <button disabled={loadingP === p.id || cerrado}
                        onClick={() => !cerrado && togglePago(p.id, p.estado)} className="shrink-0">
                        {loadingP === p.id
                          ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          : <Badge variant={variant}
                              className={cn('cursor-pointer text-xs', cerrado && 'opacity-60 cursor-default')}>
                              {label}
                            </Badge>}
                      </button>
                    </div>
                    {i < pagos.length - 1 && <Separator />}
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Modal open={showCerrar} onClose={() => !cerrando && setShowCerrar(false)} title="Cerrar turno">
        <div className="space-y-4">
          {sinPagar > 0 ? (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                ⚠️ Hay {sinPagar} pago{sinPagar !== 1 ? 's' : ''} sin confirmar
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Podés cerrar el turno igualmente, quedará registrado con pagos pendientes.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Todos los pagos están confirmados. ¿Cerrar el turno como cobrado?</p>
          )}
          <div className="flex flex-col gap-2 pt-1">
            <Button className="w-full" onClick={confirmarCerrar} disabled={cerrando}>
              {cerrando ? <><Loader2 className="h-4 w-4 animate-spin" />Cerrando...</> : 'Sí, cerrar turno'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowCerrar(false)} disabled={cerrando}>Cancelar</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
