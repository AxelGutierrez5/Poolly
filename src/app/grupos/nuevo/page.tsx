'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generarFechasTurnos, ars, DIAS_SEMANA, formatFecha } from '@/lib/utils'
import MoneyInput from '@/components/ui/MoneyInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Loader2, CalendarDays, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import type { DiaSemana } from '@/types'
import Link from 'next/link'

export default function NuevoGrupoPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [nombre, setNombre]     = useState('')
  const [monto, setMonto]       = useState<number | ''>('')
  const [cantidad, setCantidad] = useState<number | ''>('')
  const [dias, setDias]         = useState<DiaSemana[]>([])
  const [fecha, setFecha]       = useState('')
  const [loading, setLoading]   = useState(false)

  const aporte  = monto !== '' && cantidad !== '' && Number(cantidad) > 0 ? Number(monto) / Number(cantidad) : null
  const preview = fecha && dias.length && cantidad !== '' && Number(cantidad) > 0
    ? generarFechasTurnos(fecha, dias, Math.min(Number(cantidad), 4)) : []

  function toggleDia(d: DiaSemana) {
    setDias(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dias.length) { toast.error('Seleccioná al menos un día'); return }
    if (monto === '' || Number(monto) <= 0) { toast.error('Ingresá el monto'); return }
    if (cantidad === '' || Number(cantidad) < 2) { toast.error('Mínimo 2 números'); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      // Verificar nombre duplicado
      const { data: existe } = await supabase
        .from('grupos')
        .select('id')
        .eq('nombre', nombre.trim())
        .eq('creado_por', user.id)
        .maybeSingle()
      if (existe) { toast.error(`Ya tenés un grupo llamado "${nombre.trim()}"`); setLoading(false); return }

      const { data: grupo, error: ge } = await supabase.from('grupos').insert({
        nombre: nombre.trim(), monto_total: Number(monto), cantidad_numeros: Number(cantidad),
        dias_juego: dias, fecha_inicio: fecha, creado_por: user.id,
      }).select().single()
      if (ge) throw ge

      // Creador como admin — sin nombre/telefono (vienen de perfiles vía user_id)
      await supabase.from('participantes').insert({
        grupo_id: grupo.id, user_id: user.id, rol: 'admin',
      })

      await supabase.rpc('crear_invitacion', { p_grupo_id: grupo.id, p_user_id: user.id })

      const fechas = generarFechasTurnos(fecha, dias, Number(cantidad))
      await supabase.from('turnos').insert(
        fechas.map((f, i) => ({ grupo_id: grupo.id, fecha: f.toISOString().split('T')[0], orden: i + 1, numero_asignado_id: null }))
      )

      toast.success(`Grupo "${nombre}" creado`)
      router.push(`/grupos/${grupo.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Error al crear')
    } finally { setLoading(false) }
  }

  const diasAbrev: Record<string, string> = {
    lunes: 'Lun', martes: 'Mar', 'miércoles': 'Mié',
    jueves: 'Jue', viernes: 'Vie', sábado: 'Sáb', domingo: 'Dom',
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2 text-muted-foreground">
          <Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Volver</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo grupo</h1>
        <p className="text-sm text-muted-foreground mt-1">Configurá tu junta e invitá miembros</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Información básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre del grupo *</Label>
              <Input id="nombre" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Junta del trabajo 2025" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monto total *</Label>
                <MoneyInput value={monto} onChange={setMonto} placeholder="1.500.000" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cant">Números *</Label>
                <Input id="cant" type="number" required min={2} max={100}
                  value={cantidad === '' ? '' : cantidad}
                  onChange={e => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="10" />
              </div>
            </div>
            {aporte && aporte > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium text-primary">Aporte por número</span>
                </div>
                <span className="text-lg font-bold text-primary">{ars(aporte)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fechas y días</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha de inicio *</Label>
              <Input id="fecha" type="date" required value={fecha}
                onChange={e => setFecha(e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="space-y-2">
              <Label>Días de juego *</Label>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map(dia => {
                  const on = dias.includes(dia as DiaSemana)
                  return (
                    <button key={dia} type="button" onClick={() => toggleDia(dia as DiaSemana)}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                        on ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                           : 'bg-background text-muted-foreground border-input hover:border-primary/50 hover:text-foreground'
                      )}>
                      {diasAbrev[dia]}
                    </button>
                  )
                })}
              </div>
              {dias.length > 0 && cantidad !== '' && Number(cantidad) > 0 && (
                <p className="text-xs text-muted-foreground">
                  ~{Math.ceil(Number(cantidad) / dias.length)} semanas · {cantidad} turnos en total
                </p>
              )}
            </div>
            {preview.length > 0 && (
              <div className="rounded-lg bg-muted/60 border p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />Primeros turnos
                </div>
                {preview.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-[10px] font-bold shrink-0">{i + 1}</div>
                    <span className="capitalize text-foreground/80">{formatFecha(f.toISOString().split('T')[0])}</span>
                  </div>
                ))}
                {Number(cantidad) > 4 && <p className="text-xs text-muted-foreground pl-7">+ {Number(cantidad) - 4} más</p>}
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Creando...</> : 'Crear grupo →'}
        </Button>
      </form>
    </div>
  )
}
