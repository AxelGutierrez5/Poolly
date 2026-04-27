'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Bug, Lightbulb, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tipo = 'bug' | 'problema' | 'sugerencia'

const TIPOS: { value: Tipo; label: string; icon: any; desc: string }[] = [
  { value: 'bug',        label: 'Bug',        icon: Bug,          desc: 'Algo no funciona como debería' },
  { value: 'problema',   label: 'Problema',   icon: AlertCircle,  desc: 'Tengo inconvenientes usando la app' },
  { value: 'sugerencia', label: 'Sugerencia', icon: Lightbulb,    desc: 'Tengo una idea para mejorar' },
]

export default function SoportePage() {
  const supabase = createClient()
  const [tipo, setTipo]       = useState<Tipo>('problema')
  const [asunto, setAsunto]   = useState('')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!asunto.trim() || !mensaje.trim()) { toast.error('Completá todos los campos'); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: perfil } = user
        ? await supabase.from('perfiles').select('nombre, apellido, telefono').eq('id', user.id).single()
        : { data: null }

      const nombreUsuario = perfil
        ? [perfil.nombre, perfil.apellido].filter(Boolean).join(' ')
        : 'Desconocido'

      // Enviar via Supabase Edge Function o directamente a un endpoint de email
      // Como no tenemos edge function configurada, usamos el endpoint de Resend/EmailJS
      // via fetch a una ruta API de Next.js
      const res = await fetch('/api/soporte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          asunto: asunto.trim(),
          mensaje: mensaje.trim(),
          email: user?.email || 'No identificado',
          nombre: nombreUsuario,
          telefono: perfil?.telefono || '',
        }),
      })

      if (!res.ok) throw new Error('Error al enviar')
      setEnviado(true)
    } catch (err: any) {
      toast.error('No se pudo enviar. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) return (
    <div className="max-w-lg mx-auto space-y-5 text-center pt-12">
      <div className="flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">¡Mensaje enviado!</h1>
        <p className="text-sm text-muted-foreground">Recibimos tu {tipo}. Te responderemos a la brevedad.</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Volver al inicio</Link>
      </Button>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-3 text-muted-foreground">
          <Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Volver</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Soporte</h1>
        <p className="text-sm text-muted-foreground mt-1">Reportá un problema, bug o enviá una sugerencia</p>
      </div>

      {/* Tipo */}
      <div className="grid grid-cols-3 gap-2">
        {TIPOS.map(({ value, label, icon: Icon, desc }) => (
          <button key={value} type="button" onClick={() => setTipo(value)}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
              tipo === value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}>
            <Icon className="h-5 w-5" />
            <span className="text-xs font-semibold">{label}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground -mt-2 pl-1">
        {TIPOS.find(t => t.value === tipo)?.desc}
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {tipo === 'bug' ? 'Reportar bug' : tipo === 'problema' ? 'Reportar problema' : 'Enviar sugerencia'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="asunto">Asunto *</Label>
              <Input
                id="asunto"
                value={asunto}
                onChange={e => setAsunto(e.target.value)}
                placeholder={tipo === 'sugerencia' ? 'Ej: Agregar exportar a PDF' : 'Ej: No puedo cerrar el turno'}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mensaje">Descripción *</Label>
              <textarea
                id="mensaje"
                value={mensaje}
                onChange={e => setMensaje(e.target.value)}
                placeholder={tipo === 'sugerencia'
                  ? 'Describí tu idea con el mayor detalle posible...'
                  : 'Describí qué pasó, en qué página, qué estabas haciendo...'}
                required
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                : 'Enviar mensaje'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
