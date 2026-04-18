'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Shuffle, Save, Check, Loader2 } from 'lucide-react'
import { PageLoader } from '@/components/ui/SkeletonCard'

interface Miembro { user_id: string; nombre: string }

export default function NumerosPage() {
  const { id: grupoId } = useParams() as { id: string }
  const supabase = createClient()

  const [grupo, setGrupo]       = useState<any>(null)
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [asig, setAsig]         = useState<Record<number, string>>({})      // num → user_id
  const [asigNombres, setAsigN] = useState<Record<number, string>>({})      // num → nombre display
  const [esAdmin, setEsAdmin]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const [{ data: g }, { data: parts }, { data: n }] = await Promise.all([
      supabase.from('grupos').select('nombre, cantidad_numeros, creado_por').eq('id', grupoId).single(),
      supabase.from('participantes').select('user_id, rol').eq('grupo_id', grupoId),
      supabase.from('numeros_asignados')
        .select('numero, participante_id, participante:participantes(user_id)')
        .eq('grupo_id', grupoId),
    ])

    setGrupo(g)
    if (g && user) setEsAdmin(g.creado_por === user.id)

    // Traer perfiles de todos los participantes
    if (parts && parts.length > 0) {
      const userIds = parts.map(p => p.user_id).filter(Boolean)
      const { data: perfiles } = await supabase
        .from('perfiles').select('id, nombre, apellido').in('id', userIds)

      const perfilMap: Record<string, string> = {}
      perfiles?.forEach(p => {
        perfilMap[p.id] = [p.nombre, p.apellido].filter(Boolean).join(' ') || 'Sin nombre'
      })

      setMiembros(parts.map(p => ({
        user_id: p.user_id,
        nombre: perfilMap[p.user_id] || 'Sin nombre',
      })))
    }

    // Cargar asignaciones existentes
    if (n && n.length > 0) {
      const initAsig: Record<number, string> = {}
      const initNombres: Record<number, string> = {}

      // Necesitamos user_id del participante para mapear
      const partIds = n.map((na: any) => na.participante_id)
      const { data: partsDetalle } = await supabase
        .from('participantes').select('id, user_id').in('id', partIds)
      const partIdToUserId: Record<string, string> = {}
      partsDetalle?.forEach(p => { partIdToUserId[p.id] = p.user_id })

      const userIdsN = Object.values(partIdToUserId)
      const { data: perfilesN } = await supabase
        .from('perfiles').select('id, nombre, apellido').in('id', userIdsN)
      const perfilMapN: Record<string, string> = {}
      perfilesN?.forEach(p => {
        perfilMapN[p.id] = [p.nombre, p.apellido].filter(Boolean).join(' ') || 'Sin nombre'
      })

      n.forEach((na: any) => {
        const uid = partIdToUserId[na.participante_id]
        initAsig[na.numero] = uid || ''
        initNombres[na.numero] = perfilMapN[uid] || '?'
      })
      setAsig(initAsig)
      setAsigN(initNombres)
      setSaved(true)
    }

    setLoading(false)
  }

  async function sortear() {
    if (!miembros.length) { toast.error('No hay miembros'); return }
    const nums = Array.from({ length: grupo.cantidad_numeros }, (_, i) => i + 1)
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]]
    }
    const nuevo: Record<number, string> = {}
    const nuevoN: Record<number, string> = {}
    nums.forEach((num, i) => {
      const m = miembros[i % miembros.length]
      nuevo[num] = m.user_id
      nuevoN[num] = m.nombre
    })
    setAsig(nuevo); setAsigN(nuevoN); setSaved(false)
    toast.success('Números sorteados. Guardá para confirmar.')
  }

  async function guardar() {
    const total = Object.values(asig).filter(Boolean).length
    if (total !== grupo.cantidad_numeros) { toast.error(`Asigná los ${grupo.cantidad_numeros} números`); return }
    setSaving(true)
    try {
      await supabase.from('numeros_asignados').delete().eq('grupo_id', grupoId)

      // Para cada asignación necesitamos el participante_id (no user_id directo)
      const rows = await Promise.all(
        Object.entries(asig).map(async ([num, userId]) => {
          const { data: part } = await supabase.from('participantes')
            .select('id').eq('grupo_id', grupoId).eq('user_id', userId).single()
          return {
            grupo_id: grupoId,
            participante_id: part!.id,
            numero: Number(num),
            tipo_asignacion: 'manual' as const,
          }
        })
      )

      const { error } = await supabase.from('numeros_asignados').insert(rows)
      if (error) throw error

      // Vincular turnos
      const { data: nums } = await supabase.from('numeros_asignados').select('id, numero').eq('grupo_id', grupoId)
      const { data: turnos } = await supabase.from('turnos').select('id, orden').eq('grupo_id', grupoId)
      if (nums && turnos) {
        await Promise.all(turnos.map(t => {
          const na = nums.find(n => n.numero === t.orden)
          return na ? supabase.from('turnos').update({ numero_asignado_id: na.id }).eq('id', t.id) : null
        }).filter(Boolean) as any)
      }

      // Actualizar nombres en UI
      const nuevoN: Record<number, string> = {}
      Object.entries(asig).forEach(([num, uid]) => {
        const m = miembros.find(x => x.user_id === uid)
        if (m) nuevoN[Number(num)] = m.nombre
      })
      setAsigN(nuevoN)
      toast.success('Asignaciones guardadas ✓')
      setSaved(true)
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <PageLoader text="Cargando números..." />
  if (!grupo) return null

  const asignados = Object.values(asig).filter(Boolean).length
  const conteo: Record<string, number> = {}
  Object.values(asig).forEach(uid => { if (uid) conteo[uid] = (conteo[uid] || 0) + 1 })

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 text-muted-foreground">
          <Link href={`/grupos/${grupoId}`}><ArrowLeft className="h-4 w-4" />Volver</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Números asignados</h1>
        {grupo && <p className="text-sm text-muted-foreground mt-0.5">{grupo.nombre}</p>}
      </div>

      {esAdmin && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={sortear} disabled={!miembros.length} className="flex-1">
            <Shuffle className="h-4 w-4" />Sortear
          </Button>
          <Button onClick={guardar} disabled={saving || asignados === 0} className="flex-1">
            {saving ? 'Guardando...' : saved ? <><Check className="h-4 w-4" />Guardado</> : <><Save className="h-4 w-4" />Guardar</>}
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{asignados}/{grupo.cantidad_numeros} asignados</span>
            <span className="font-semibold">{Math.round((asignados / grupo.cantidad_numeros) * 100)}%</span>
          </div>
          <Progress value={(asignados / grupo.cantidad_numeros) * 100} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {Array.from({ length: grupo.cantidad_numeros }, (_, i) => i + 1).map((num, idx) => {
            const uid = asig[num]
            const nombreGuardado = asigNombres[num]
            const nombreActual = uid ? (miembros.find(m => m.user_id === uid)?.nombre || nombreGuardado || '') : ''

            return (
              <div key={num} className={`flex items-center gap-3 px-4 py-3 ${idx < grupo.cantidad_numeros - 1 ? 'border-b' : ''}`}>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors ${uid ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {num}
                </div>

                {esAdmin ? (
                  <div className="flex-1 space-y-0.5">
                    <select
                      value={uid || ''}
                      onChange={e => {
                        const newUid = e.target.value
                        const nombre = miembros.find(m => m.user_id === newUid)?.nombre || ''
                        setAsig(prev => ({ ...prev, [num]: newUid }))
                        setAsigN(prev => ({ ...prev, [num]: nombre }))
                        setSaved(false)
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">— Sin asignar —</option>
                      {miembros.map(m => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.nombre}{conteo[m.user_id] > 1 ? ` (${conteo[m.user_id]} nros.)` : ''}
                        </option>
                      ))}
                    </select>
                    {saved && nombreGuardado && (
                      <p className="text-[11px] text-muted-foreground pl-1">
                        ✓ <span className="font-medium text-foreground">{nombreGuardado}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <span className="text-sm flex-1">
                    {nombreActual
                      ? <span className="font-medium">{nombreActual}</span>
                      : <span className="text-muted-foreground italic">Sin asignar</span>}
                  </span>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
