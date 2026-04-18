'use client'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { Coins, Loader2, Link2, CheckCircle2, XCircle, ArrowLeft, UserX } from 'lucide-react'
import { ars } from '@/lib/utils'

function UnirseForm() {
  const supabase     = createClient()
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [codigo, setCodigo]     = useState(searchParams.get('codigo') || '')
  const [invitacion, setInv]    = useState<any>(null)
  const [grupo, setGrupo]       = useState<any>(null)
  const [miembrosCount, setMC]  = useState(0)
  const [grupoLleno, setLleno]  = useState(false)
  const [buscando, setBuscan]   = useState(false)
  const [notFound, setNF]       = useState(false)
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    const cod = searchParams.get('codigo')
    if (cod && cod.length === 8) buscar(cod)
  }, [])

  async function buscar(cod: string) {
    const c = cod.toUpperCase().trim()
    if (c.length !== 8) return
    setBuscan(true); setInv(null); setGrupo(null); setNF(false); setLleno(false)

    try {
      const { data: inv } = await supabase
        .from('invitaciones').select('id, grupo_id, usos')
        .eq('codigo', c).eq('activa', true).maybeSingle()
      if (!inv) { setNF(true); return }
      setInv({ ...inv, codigo: c })

      // Traer grupo y cantidad actual de miembros en paralelo
      const [{ data: g }, { count }] = await Promise.all([
        supabase.from('grupos')
          .select('id, nombre, monto_total, cantidad_numeros, aporte_por_numero')
          .eq('id', inv.grupo_id).single(),
        supabase.from('participantes')
          .select('id', { count: 'exact', head: true })
          .eq('grupo_id', inv.grupo_id),
      ])

      if (!g) { setNF(true); return }
      setGrupo(g)

      const cantMiembros = count ?? 0
      setMC(cantMiembros)
      setLleno(cantMiembros >= g.cantidad_numeros)
    } catch {
      setNF(true)
    } finally {
      setBuscan(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    setCodigo(val); setInv(null); setGrupo(null); setNF(false); setLleno(false)
    if (val.length === 8) buscar(val)
  }

  async function unirse() {
    if (!invitacion || !grupo) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      // Re-verificar límite en el momento de unirse
      const { count } = await supabase
        .from('participantes')
        .select('id', { count: 'exact', head: true })
        .eq('grupo_id', grupo.id)
      if ((count ?? 0) >= grupo.cantidad_numeros) {
        toast.error('El grupo ya está completo, no se permiten más participantes')
        setLleno(true); setLoading(false); return
      }

      // ¿Ya es participante?
      const { data: existe } = await supabase
        .from('participantes').select('id')
        .eq('grupo_id', grupo.id).eq('user_id', user.id).maybeSingle()
      if (existe) { toast.success('Ya sos miembro'); router.push(`/grupos/${grupo.id}`); return }

      const { error } = await supabase.from('participantes').insert({
        grupo_id: grupo.id, user_id: user.id, rol: 'participante',
      })
      if (error) throw error

      await supabase.from('invitaciones')
        .update({ usos: (invitacion.usos || 0) + 1 }).eq('id', invitacion.id)

      toast.success(`¡Te uniste a "${grupo.nombre}"!`)
      router.push(`/grupos/${grupo.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Error al unirse')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Coins className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight">Poolly</span>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-[380px] space-y-5 animate-fade-in">
          <div>
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 text-muted-foreground">
              <Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Volver</Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Unirse a un grupo</h1>
            <p className="text-sm text-muted-foreground mt-1">Ingresá el código de invitación que recibiste</p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Código de invitación</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="codigo">Código (8 caracteres)</Label>
                <Input
                  id="codigo" value={codigo} onChange={handleChange}
                  placeholder="ABC12345" maxLength={8}
                  className="text-center text-xl font-bold tracking-[0.2em] font-mono h-12"
                />
              </div>

              {buscando && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />Buscando...
                </div>
              )}

              {/* Grupo encontrado */}
              {grupo && !buscando && !grupoLleno && (
                <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />Grupo encontrado
                  </div>
                  <p className="font-bold text-foreground text-base">{grupo.nombre}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{grupo.cantidad_numeros} números</span>
                    <span>·</span>
                    <span>Aporte: {ars(Number(grupo.aporte_por_numero))}</span>
                    <span>·</span>
                    <span>{miembrosCount}/{grupo.cantidad_numeros} miembros</span>
                  </div>
                </div>
              )}

              {/* Grupo lleno */}
              {grupo && !buscando && grupoLleno && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <UserX className="h-3.5 w-3.5" />Grupo completo
                  </div>
                  <p className="font-bold text-foreground text-base">{grupo.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    Este grupo ya tiene {grupo.cantidad_numeros}/{grupo.cantidad_numeros} participantes y no acepta nuevos miembros.
                  </p>
                </div>
              )}

              {/* Código inválido */}
              {notFound && !buscando && codigo.length === 8 && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4 shrink-0" />Código no encontrado o inválido
                </div>
              )}

              <Button
                className="w-full" size="lg"
                disabled={loading || !grupo || grupoLleno}
                onClick={unirse}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Uniéndose...</>
                  : grupoLleno ? 'Grupo completo' : 'Unirse al grupo'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function UnirsePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <UnirseForm />
    </Suspense>
  )
}
