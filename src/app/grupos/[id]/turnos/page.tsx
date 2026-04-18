'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatFecha } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, CheckCircle2, Clock, Calendar, List, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageLoader } from '@/components/ui/SkeletonCard'

type Vista = 'lista' | 'calendario'
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export default function TurnosPage() {
  const { id: grupoId } = useParams() as { id: string }
  const supabase = createClient()
  const [grupo, setGrupo]   = useState<any>(null)
  const [turnos, setTurnos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista]   = useState<Vista>('lista')
  const [mesActual, setMes] = useState(() => {
    const hoy = new Date()
    return { year: hoy.getFullYear(), month: hoy.getMonth() }
  })
  const [turnoSel, setTurnoSel] = useState<any>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [{ data: g }, { data: t }] = await Promise.all([
      supabase.from('grupos').select('nombre').eq('id', grupoId).single(),
      supabase.from('turnos')
        .select('*, numero_asignado:numeros_asignados(numero, participante:participantes(id, user_id))')
        .eq('grupo_id', grupoId).order('orden'),
    ])
    setGrupo(g)

    if (t && t.length > 0) {
      // Recopilar todos los user_ids de participantes asignados
      const userIds = t
        .map((tu: any) => tu.numero_asignado?.participante?.user_id)
        .filter(Boolean)

      const { data: perfiles } = await supabase
        .from('perfiles').select('id, nombre, apellido').in('id', userIds)
      const pm: Record<string, string> = {}
      perfiles?.forEach(p => { pm[p.id] = [p.nombre, p.apellido].filter(Boolean).join(' ') || 'Sin nombre' })

      // Enriquecer turnos con nombre del participante
      const turnosEnriquecidos = t.map((tu: any) => ({
        ...tu,
        participanteNombre: tu.numero_asignado?.participante?.user_id
          ? pm[tu.numero_asignado.participante.user_id] || 'Sin nombre'
          : null,
      }))
      setTurnos(turnosEnriquecidos)
    } else {
      setTurnos([])
    }
    setLoading(false)
  }

  if (loading) return <PageLoader text="Cargando turnos..." />

  const cobrados = turnos.filter(t => t.estado === 'cobrado').length
  const total    = turnos.length
  const turnosPorFecha: Record<string, any> = {}
  turnos.forEach(t => { turnosPorFecha[t.fecha] = t })

  function renderCalendario() {
    const { year, month } = mesActual
    const totalDias = new Date(year, month + 1, 0).getDate()
    const startDay  = new Date(year, month, 1).getDay()
    const celdas: (null | number)[] = [
      ...Array(startDay).fill(null),
      ...Array.from({ length: totalDias }, (_, i) => i + 1),
    ]
    while (celdas.length % 7 !== 0) celdas.push(null)
    const hoyStr = new Date().toISOString().split('T')[0]
    const turnosEsteMes = turnos.filter(t => {
      const d = new Date(t.fecha + 'T00:00:00')
      return d.getFullYear() === year && d.getMonth() === month
    })

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setMes(p => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="font-semibold">{MESES[month]} {year}</p>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setMes(p => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7">
          {DIAS_SHORT.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-lg overflow-hidden">
          {celdas.map((dia, i) => {
            if (!dia) return <div key={i} className="bg-background min-h-[60px]" />
            const fechaStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`
            const turno    = turnosPorFecha[fechaStr]
            const esHoy    = fechaStr === hoyStr
            const selected = turnoSel?.fecha === fechaStr
            return (
              <div key={i} onClick={() => turno && setTurnoSel(selected ? null : turno)}
                className={cn('bg-background min-h-[60px] p-1.5 flex flex-col transition-colors',
                  turno && 'cursor-pointer hover:bg-accent/50',
                  selected && 'bg-primary/5 ring-1 ring-inset ring-primary/30')}>
                <span className={cn('text-xs font-medium self-end w-5 h-5 flex items-center justify-center rounded-full mb-1',
                  esHoy ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground')}>
                  {dia}
                </span>
                {turno && (
                  <div className={cn('flex-1 rounded px-1 py-0.5 text-[10px] font-semibold leading-tight',
                    turno.estado === 'cobrado'
                      ? 'bg-primary/15 text-primary'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300')}>
                    <div>Turno #{turno.orden}</div>
                    {turno.numero_asignado && <div className="font-normal opacity-80">nº {turno.numero_asignado.numero}</div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {turnoSel && (
          <Card className="border-primary/30 bg-primary/[0.03]">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Turno #{turnoSel.orden}</p>
                  <p className="font-semibold text-sm capitalize">{formatFecha(turnoSel.fecha)}</p>
                  {turnoSel.participanteNombre ? (
                    <div className="space-y-0.5">
                      <p className="text-sm text-muted-foreground">
                        Cobra: <span className="font-semibold text-foreground">{turnoSel.participanteNombre}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Número: <span className="font-medium">#{turnoSel.numero_asignado?.numero}</span></p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Sin números asignados</p>
                  )}
                </div>
                <Badge variant={turnoSel.estado === 'cobrado' ? 'success' : 'secondary'}>{turnoSel.estado}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {turnosEsteMes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {turnosEsteMes.length} turno{turnosEsteMes.length !== 1 ? 's' : ''} en {MESES[month]}
            </p>
            <div className="space-y-1.5">
              {turnosEsteMes.map(t => (
                <div key={t.id} onClick={() => setTurnoSel(turnoSel?.id === t.id ? null : t)}
                  className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors',
                    turnoSel?.id === t.id ? 'bg-primary/10 border-primary/30' : 'bg-card hover:bg-accent/50 border-border')}>
                  <div className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0',
                    t.estado === 'cobrado' ? 'bg-primary/15 text-primary' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300')}>
                    {t.orden}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium capitalize truncate">
                      {new Date(t.fecha + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' })}
                    </p>
                    {t.participanteNombre && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {t.participanteNombre} · nº {t.numero_asignado?.numero}
                      </p>
                    )}
                  </div>
                  {t.estado === 'cobrado' ? (
                    <div className="flex items-center gap-1 text-primary shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-medium">Cobrado</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Pendiente</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {turnosEsteMes.length === 0 && <p className="text-center text-sm text-muted-foreground py-2">Sin turnos en este mes</p>}
        <div className="flex gap-4 text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary/15" />Cobrado</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-900/30" />Pendiente</div>
        </div>
      </div>
    )
  }

  function renderLista() {
    return (
      <Card>
        <CardContent className="p-0">
          {!turnos.length ? (
            <p className="text-center text-muted-foreground py-10 text-sm">Sin turnos</p>
          ) : turnos.map((t, i) => {
            return (
              <div key={t.id} className={cn('flex items-center gap-3 px-4 py-3.5',
                i < turnos.length - 1 && 'border-b border-border')}>
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0',
                  t.estado === 'cobrado' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                  {t.orden}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize truncate">{formatFecha(t.fecha)}</p>
                  {t.participanteNombre
                    ? <p className="text-xs text-muted-foreground">{t.participanteNombre} · nº {t.numero_asignado?.numero}</p>
                    : <p className="text-xs text-muted-foreground">Sin asignar</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {t.estado === 'cobrado' ? (
                    <div className="flex items-center gap-1 text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-medium">Cobrado</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Pendiente</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 text-muted-foreground">
          <Link href={`/grupos/${grupoId}`}><ArrowLeft className="h-4 w-4" />Volver</Link>
        </Button>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Turnos</h1>
            {grupo && <p className="text-sm text-muted-foreground mt-0.5">{grupo.nombre}</p>}
          </div>
          <div className="flex rounded-lg border bg-muted p-1 gap-1">
            {(['lista', 'calendario'] as Vista[]).map(v => (
              <button key={v} onClick={() => setVista(v)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                  vista === v ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {v === 'lista' ? <><List className="h-3.5 w-3.5" />Lista</> : <><Calendar className="h-3.5 w-3.5" />Calendario</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {total > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{cobrados} de {total} cobrados</span>
              <span className="font-semibold">{Math.round((cobrados / total) * 100)}%</span>
            </div>
            <Progress value={(cobrados / total) * 100} />
          </CardContent>
        </Card>
      )}

      {vista === 'calendario'
        ? <Card><CardContent className="p-4">{renderCalendario()}</CardContent></Card>
        : renderLista()}
    </div>
  )
}
