import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ars, formatFecha, formatFechaCorta } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DeleteGroupButton } from '@/components/grupos/DeleteGroupButton'
import { EditGroupName } from '@/components/grupos/EditGroupName'
import { InvitePanel } from '@/components/grupos/InvitePanel'
import { ArrowLeft, Users, Hash, CalendarDays, Wallet, AlertTriangle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const estadoBadge: Record<string, 'success' | 'secondary' | 'destructive'> = {
  activo: 'success', completado: 'secondary', cancelado: 'destructive',
}
const estadoLabel: Record<string, string> = {
  activo: 'activo', completado: '✓ completado', cancelado: 'cancelado',
}

export default async function GrupoPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: grupo } = await supabase.from('grupos').select('*').eq('id', params.id).single()
  if (!grupo) notFound()

  // Traer miembros del grupo
  const { data: miembros } = await supabase
    .from('participantes').select('user_id').eq('grupo_id', params.id)

  // Traer turnos — sin join a nombre (fue eliminado)
  const { data: turnos } = await supabase
    .from('turnos')
    .select('*, numero_asignado:numeros_asignados(numero, participante:participantes(id, user_id))')
    .eq('grupo_id', params.id)
    .order('orden')

  const { data: invitacion } = await supabase
    .from('invitaciones').select('codigo, id, usos')
    .eq('grupo_id', params.id).eq('activa', true)
    .limit(1).maybeSingle()

  const esAdmin        = grupo.creado_por === user.id
  const proximoTurno   = turnos?.find(t => t.estado === 'pendiente')
  const turnosCobrados = turnos?.filter(t => t.estado === 'cobrado').length ?? 0
  const totalTurnos    = turnos?.length ?? 0
  const progreso       = totalTurnos > 0 ? Math.round((turnosCobrados / totalTurnos) * 100) : 0

  // Resolver nombre del participante del próximo turno vía perfiles
  let proximoNombre: string | null = null
  if (proximoTurno?.numero_asignado?.participante?.user_id) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('nombre, apellido')
      .eq('id', proximoTurno.numero_asignado.participante.user_id)
      .single()
    if (perfil) {
      proximoNombre = [perfil.nombre, perfil.apellido].filter(Boolean).join(' ') || null
    }
  }

  const hoy           = new Date().toISOString().split('T')[0]
  const proximoEsHoy  = proximoTurno?.fecha === hoy

  const tabs = [
    { href: 'miembros', label: 'Miembros',  icon: Users,        info: `${miembros?.length ?? 0} en el grupo` },
    { href: 'numeros',  label: 'Números',   icon: Hash,         info: `${grupo.cantidad_numeros} en total` },
    { href: 'turnos',   label: 'Turnos',    icon: CalendarDays, info: `${turnosCobrados}/${totalTurnos} cobrados` },
    ...(esAdmin ? [{ href: 'pagos', label: 'Pagos', icon: Wallet, info: 'Registrar y gestionar pagos' }] : []),
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Volver</Link>
      </Button>

      {/* Hero */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={estadoBadge[grupo.estado]}>{estadoLabel[grupo.estado] ?? grupo.estado}</Badge>
                {esAdmin && <Badge variant="outline" className="text-primary border-primary/30 text-xs">admin</Badge>}
              </div>
              {esAdmin
                ? <EditGroupName grupoId={params.id} nombreActual={grupo.nombre} />
                : <h1 className="text-xl font-bold tracking-tight">{grupo.nombre}</h1>}
              <p className="text-3xl font-bold text-primary tracking-tight">{ars(grupo.monto_total)}</p>
            </div>
            {esAdmin && <DeleteGroupButton grupoId={params.id} grupoNombre={grupo.nombre} />}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {[
              ['Aporte', ars(grupo.aporte_por_numero) + '/núm.'],
              ['Números', grupo.cantidad_numeros],
              ['Inicio', formatFechaCorta(grupo.fecha_inicio)],
              ['Días', grupo.dias_juego.join(', ')],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{k}</span>
                <span className="font-medium truncate text-right">{v}</span>
              </div>
            ))}
          </div>

          {totalTurnos > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{turnosCobrados} de {totalTurnos} turnos cobrados</span>
                <span className="font-semibold text-foreground">{progreso}%</span>
              </div>
              <Progress value={progreso} className="h-2" />
            </div>
          )}

          {esAdmin && invitacion && (
            <InvitePanel
              codigo={invitacion.codigo}
              invitacionId={invitacion.id}
              grupoId={params.id}
              usos={invitacion.usos ?? 0}
            />
          )}
        </CardContent>
      </Card>

      {/* Secciones */}
      <Card>
        <CardContent className="p-0">
          {tabs.map(({ href, label, icon: Icon, info }, i) => (
            <Link key={href} href={`/grupos/${params.id}/${href}`}
              className={`flex items-center gap-3 px-5 py-4 transition-colors hover:bg-accent/60 group ${i < tabs.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{info}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Próximo turno */}
      {proximoTurno && (
        <Card className={cn(
          'border-l-4',
          proximoEsHoy
            ? 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
            : 'border-l-primary'
        )}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <p className={cn(
                'text-xs font-semibold uppercase tracking-wide',
                proximoEsHoy ? 'text-amber-600 dark:text-amber-400' : 'text-primary'
              )}>
                Próximo turno #{proximoTurno.orden}
              </p>
              {proximoEsHoy && (
                <Badge className="bg-amber-500 text-white border-0 text-[10px]">
                  HOY
                </Badge>
              )}
            </div>

            <p className="font-semibold capitalize">{formatFecha(proximoTurno.fecha)}</p>

            {proximoNombre ? (
              <p className="text-sm text-muted-foreground">
                Cobra: <span className="font-semibold text-foreground">{proximoNombre}</span>
                {' · '}nº {proximoTurno.numero_asignado.numero}
              </p>
            ) : proximoTurno.numero_asignado ? (
              <p className="text-sm text-muted-foreground">
                Número {proximoTurno.numero_asignado.numero} asignado
              </p>
            ) : (
              <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />Sin números asignados aún
              </div>
            )}

            {esAdmin && (
              <div className="flex gap-2">
                <Button size="sm" asChild>
                  <Link href={`/grupos/${params.id}/pagos`}>
                    <Wallet className="h-3.5 w-3.5" />Registrar pagos
                  </Link>
                </Button>
                {!proximoTurno.numero_asignado && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/grupos/${params.id}/numeros`}>
                      <Hash className="h-3.5 w-3.5" />Asignar números
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!proximoTurno && totalTurnos > 0 && (
        <Card>
          <CardContent className="p-4 text-center text-sm font-medium text-primary">
            ✓ Todos los turnos cobrados
          </CardContent>
        </Card>
      )}
    </div>
  )
}
