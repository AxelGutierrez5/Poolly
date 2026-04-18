'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Copy, RefreshCw, Link2, Hash } from 'lucide-react'

export default function InvitarPage() {
  const { id: grupoId } = useParams() as { id: string }
  const supabase = createClient()
  const [grupo, setGrupo]   = useState<any>(null)
  const [inv, setInv]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [gen, setGen]       = useState(false)
  const base = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [{ data: g }, { data: i }] = await Promise.all([
      supabase.from('grupos').select('nombre').eq('id', grupoId).single(),
      supabase.from('invitaciones').select('*').eq('grupo_id', grupoId).eq('activa', true).limit(1).maybeSingle(),
    ])
    setGrupo(g); setInv(i); setLoading(false)
  }

  async function regenerar() {
    setGen(true)
    if (inv) await supabase.from('invitaciones').update({ activa: false }).eq('id', inv.id)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('invitaciones').insert({ grupo_id: grupoId, creado_por: user!.id }).select().single()
    if (error) toast.error(error.message)
    else { setInv(data); toast.success('Nueva invitación generada') }
    setGen(false)
  }

  function copiar(texto: string, label: string) {
    navigator.clipboard.writeText(texto).then(() => toast.success(`${label} copiado`))
  }

  if (loading) return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="h-8 w-24 bg-muted rounded animate-pulse" />
      <div className="h-40 bg-muted rounded-lg animate-pulse" />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2 text-muted-foreground">
          <Link href={`/grupos/${grupoId}`}><ArrowLeft className="h-4 w-4" />Volver</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Invitar miembros</h1>
        {grupo && <p className="text-sm text-muted-foreground mt-0.5">{grupo.nombre}</p>}
      </div>

      {inv ? (
        <div className="space-y-4">
          {/* Código */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Código de invitación</CardTitle>
              </div>
              <CardDescription>Compartí este código con quienes quieras invitar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center py-3 rounded-lg bg-primary/10 border border-primary/20">
                  <code className="text-2xl font-bold tracking-[0.2em] text-primary font-mono">{inv.codigo}</code>
                </div>
                <Button variant="outline" size="icon" className="h-12 w-12 shrink-0"
                  onClick={() => copiar(inv.codigo, 'Código')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                El invitado ingresa este código en <strong>Poolly → Unirse</strong>
              </p>
            </CardContent>
          </Card>

          {/* Link directo */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Link directo</CardTitle>
              </div>
              <CardDescription>Al tocarlo, entra directo al grupo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground break-all border">
                {base}/unirse?codigo={inv.codigo}
              </div>
              <Button className="w-full" onClick={() => copiar(`${base}/unirse?codigo=${inv.codigo}`, 'Link')}>
                <Copy className="h-4 w-4" />Copiar link de invitación
              </Button>
            </CardContent>
          </Card>

          <Button variant="ghost" className="w-full text-muted-foreground" onClick={regenerar} disabled={gen}>
            <RefreshCw className={`h-4 w-4 ${gen ? 'animate-spin' : ''}`} />
            {gen ? 'Generando...' : 'Generar nuevo código'}
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-muted-foreground text-sm">No hay una invitación activa</p>
            <Button onClick={regenerar} disabled={gen}>
              {gen ? <><RefreshCw className="h-4 w-4 animate-spin" />Generando...</> : 'Generar invitación'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
