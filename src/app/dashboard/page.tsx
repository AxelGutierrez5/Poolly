'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ars, formatFechaCorta } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Link2, TrendingUp, Coins, CheckCircle, Users, Loader2 } from 'lucide-react'

const estadoBadge: Record<string, 'success' | 'secondary' | 'destructive'> = {
  activo: 'success', completado: 'secondary', cancelado: 'destructive',
}

export default function DashboardPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [grupos, setGrupos]   = useState<any[]>([])
  const [userId, setUserId]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async (uid: string) => {
    const { data: memberships } = await supabase
      .from('participantes').select('grupo_id').eq('user_id', uid)
    const grupoIds = memberships?.map((m: any) => m.grupo_id) ?? []
    if (!grupoIds.length) { setGrupos([]); setLoading(false); return }
    const { data } = await supabase
      .from('grupos')
      .select('*, participantes(user_id)')
      .in('id', grupoIds)
      .order('created_at', { ascending: false })
    setGrupos(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      cargar(user.id)
    })
  }, [])

  // RealTime — escuchar cambios en grupos y participantes
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grupos' }, () => cargar(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participantes' }, () => cargar(userId))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, cargar])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  const activos     = grupos.filter(g => g.estado === 'activo').length
  const completados = grupos.filter(g => g.estado === 'completado').length
  const totalARS    = grupos.reduce((s, g) => s + Number(g.monto_total), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis grupos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {grupos.length
              ? `${activos} activo${activos !== 1 ? 's' : ''} · ${grupos.length} total`
              : 'Creá tu primera junta'}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild className="hidden sm:flex">
            <Link href="/unirse"><Link2 className="h-3.5 w-3.5" />Unirse</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/grupos/nuevo"><Plus className="h-3.5 w-3.5" />Nuevo</Link>
          </Button>
        </div>
      </div>

      {grupos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp,   label: 'Capital',     value: ars(totalARS) },
            { icon: Coins,        label: 'Activos',     value: String(activos) },
            { icon: CheckCircle,  label: 'Completados', value: String(completados) },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                </div>
                <p className="text-base sm:text-xl font-bold tracking-tight truncate">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button variant="outline" className="w-full sm:hidden" asChild>
        <Link href="/unirse"><Link2 className="h-4 w-4" />Unirse con código</Link>
      </Button>

      {!grupos.length && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center text-center gap-4 px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Coins className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base mb-1">Sin grupos todavía</h2>
              <p className="text-sm text-muted-foreground">Creá tu primera junta o unite con un código</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button asChild><Link href="/grupos/nuevo"><Plus className="h-4 w-4" />Crear grupo</Link></Button>
              <Button variant="outline" asChild><Link href="/unirse"><Link2 className="h-4 w-4" />Unirse</Link></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {grupos.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {grupos.map(g => {
            const esAdmin     = g.creado_por === userId
            const miembros    = g.participantes?.length ?? 0
            const completado  = g.estado === 'completado'
            return (
              <Link key={g.id} href={`/grupos/${g.id}`} className="block group">
                <Card className={`h-full transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5 ${
                  completado
                    ? 'border-primary/20 bg-primary/[0.02] group-hover:border-primary/40'
                    : 'group-hover:border-primary/30'
                }`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={estadoBadge[g.estado]}>
                          {completado ? '✓ completado' : g.estado}
                        </Badge>
                        {esAdmin && <Badge variant="outline" className="text-primary border-primary/30 text-xs">admin</Badge>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Users className="h-3 w-3" />{miembros}
                      </div>
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">{g.nombre}</h2>
                      <p className={`text-2xl font-bold tracking-tight ${completado ? 'text-muted-foreground' : 'text-primary'}`}>
                        {ars(g.monto_total)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t text-xs">
                      {[
                        ['Aporte', ars(g.aporte_por_numero)],
                        ['Números', g.cantidad_numeros],
                        ['Inicio', formatFechaCorta(g.fecha_inicio)],
                        ['Días', g.dias_juego.slice(0, 2).map((d: string) => d.slice(0, 3)).join(', ')],
                      ].map(([k, v]) => (
                        <div key={String(k)}>
                          <p className="text-muted-foreground">{k}</p>
                          <p className="font-medium text-foreground truncate">{v}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
