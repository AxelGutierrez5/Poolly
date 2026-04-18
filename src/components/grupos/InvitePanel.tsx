'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Copy, Link2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

interface Props {
  codigo: string
  invitacionId: string
  grupoId: string
  usos: number
}

function copiarTexto(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
  return new Promise((resolve, reject) => {
    const el = document.createElement('textarea')
    el.value = text
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;'
    document.body.appendChild(el)
    el.focus(); el.select()
    try {
      document.execCommand('copy') ? resolve() : reject()
    } catch (e) { reject(e) }
    finally { document.body.removeChild(el) }
  })
}

export function InvitePanel({ codigo: initialCodigo, invitacionId, grupoId, usos }: Props) {
  const [codigo, setCodigo] = useState(initialCodigo)
  const [gen, setGen]       = useState(false)
  // Evitar hydration mismatch: construir URL solo en cliente
  const [link, setLink]     = useState('')
  const supabase = createClient()

  useEffect(() => {
    setLink(`${window.location.origin}/unirse?codigo=${codigo}`)
  }, [codigo])

  async function copiarCodigo() {
    try { await copiarTexto(codigo); toast.success('Código copiado') }
    catch { toast.error('No se pudo copiar automáticamente') }
  }

  async function copiarLink() {
    if (!link) return
    try { await copiarTexto(link); toast.success('Link copiado') }
    catch { toast.error('No se pudo copiar automáticamente') }
  }

  async function regenerar() {
    setGen(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // Usar función atómica que desactiva el anterior e inserta nuevo
      const { data, error } = await supabase.rpc('crear_invitacion', {
        p_grupo_id: grupoId,
        p_user_id: user!.id,
      })
      if (error) throw error
      const nuevoCodigo = data[0]?.codigo
      if (nuevoCodigo) { setCodigo(nuevoCodigo); toast.success('Nuevo código generado') }
    } catch { toast.error('Error al regenerar') }
    finally { setGen(false) }
  }

  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Código de invitación
          {usos > 0 && <span className="normal-case font-normal"> · {usos} uso{usos !== 1 ? 's' : ''}</span>}
        </p>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground"
          onClick={regenerar} disabled={gen} title="Nuevo código">
          <RefreshCw className={`h-3 w-3 ${gen ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 text-center py-2 rounded-md bg-background border text-lg font-bold tracking-[0.2em] text-primary font-mono select-all">
          {codigo}
        </code>
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={copiarCodigo} title="Copiar código">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={copiarLink} title="Copiar link" disabled={!link}>
            <Link2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
