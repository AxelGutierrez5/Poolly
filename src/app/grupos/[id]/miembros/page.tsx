'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Modal } from '@/components/ui/Modal'
import { ArrowLeft, UserX, Loader2, Hash } from 'lucide-react'

export default function MiembrosPage() {
  const { id: grupoId } = useParams() as { id: string }
  const supabase = createClient()

  const [grupo, setGrupo]       = useState<any>(null)
  const [miembros, setMiembros] = useState<any[]>([])
  const [userId, setUserId]     = useState('')
  const [esAdmin, setEsAdmin]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [showConNumero, setShowConNumero] = useState<string | null>(null)

  useEffect(() => { cargar() }, [])

  // RealTime
  useEffect(() => {
    const channel = supabase.channel('miembros-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participantes', filter: `grupo_id=eq.${grupoId}` }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'numeros_asignados', filter: `grupo_id=eq.${grupoId}` }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [grupoId])

  async function cargar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setUserId(user.id)

    const { data: g } = await supabase
      .from('grupos').select('nombre, creado_por').eq('id', grupoId).single()
    setGrupo(g)
    if (g && user) setEsAdmin(g.creado_por === user.id)

    const { data: parts } = await supabase
      .from('participantes')
      .select('id, user_id, rol, created_at')
      .eq('grupo_id', grupoId)
      .order('created_at')

    if (!parts || parts.length === 0) { setMiembros([]); setLoading(false); return }

    const userIds = parts.map(p => p.user_id).filter(Boolean)
    const [{ data: perfiles }, { data: numerosAsig }] = await Promise.all([
      supabase.from('perfiles').select('id, nombre, apellido, telefono').in('id', userIds),
      supabase.from('numeros_asignados').select('participante_id').eq('grupo_id', grupoId),
    ])

    const perfilMap: Record<string, any> = {}
    perfiles?.forEach(p => { perfilMap[p.id] = p })

    const conNumero = new Set(numerosAsig?.map((n: any) => n.participante_id) ?? [])

    setMiembros(parts.map(p => ({
      ...p,
      perfil: perfilMap[p.user_id] || null,
      tieneNumero: conNumero.has(p.id),
    })))
    setLoading(false)
  }

  async function remover(id: string, nombre: string, tieneNumero: boolean) {
    if (tieneNumero) { setShowConNumero(nombre); return }
    if (!confirm(`¿Quitar a ${nombre} del grupo?`)) return
    setRemoving(id)
    const { error } = await supabase.from('participantes').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Miembro removido'); cargar() }
    setRemoving(null)
  }

  if (loading) return (
    <div className="max-w-lg mx-auto pt-12 flex justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <>
      <div className="max-w-lg mx-auto space-y-5">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 text-muted-foreground">
            <Link href={`/grupos/${grupoId}`}><ArrowLeft className="h-4 w-4" />Volver</Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Miembros</h1>
          {grupo && <p className="text-sm text-muted-foreground mt-0.5">{grupo.nombre}</p>}
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
            {miembros.length} miembro{miembros.length !== 1 ? 's' : ''}
          </p>
          <Card>
            <CardContent className="p-0">
              {miembros.length === 0 ? (
                <p className="text-center text-muted-foreground py-10 text-sm">Sin miembros</p>
              ) : miembros.map((m, i) => {
                const nombre = [m.perfil?.nombre, m.perfil?.apellido].filter(Boolean).join(' ') || 'Sin nombre'
                const inicial = nombre.charAt(0).toUpperCase()
                return (
                  <div key={m.id}>
                    <div className="flex items-center justify-between px-4 py-3.5 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{inicial}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm truncate">{nombre}</p>
                            {m.user_id === userId && <span className="text-[10px] text-muted-foreground">(vos)</span>}
                          </div>
                          <Badge variant={m.rol === 'admin' ? 'success' : 'secondary'} className="text-[10px] mt-0.5">
                            {m.rol}
                          </Badge>
                          {esAdmin && m.perfil?.telefono && m.perfil.telefono !== '' && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{m.perfil.telefono}</p>
                          )}
                        </div>
                      </div>
                      {esAdmin && m.user_id !== userId && m.rol !== 'admin' && (
                        <Button variant="ghost" size="icon"
                          className={m.tieneNumero
                            ? "h-8 w-8 text-muted-foreground/40 shrink-0 cursor-default"
                            : "h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10 shrink-0"}
                          onClick={() => remover(m.id, nombre, m.tieneNumero)}
                          disabled={removing === m.id}>
                          {removing === m.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <UserX className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                    </div>
                    {i < miembros.length - 1 && <Separator />}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal open={!!showConNumero} onClose={() => setShowConNumero(null)} title="No se puede eliminar">
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
            <Hash className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold">{showConNumero}</span> ya tiene un número asignado en este grupo. Para eliminarlo primero debés reasignar o quitar su número.
            </p>
          </div>
          <Button className="w-full" onClick={() => setShowConNumero(null)}>Entendido</Button>
        </div>
      </Modal>
    </>
  )
}
