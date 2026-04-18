'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, Check, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { grupoId: string; nombreActual: string }

export function EditGroupName({ grupoId, nombreActual }: Props) {
  const [editing, setEditing]   = useState(false)
  const [nombre, setNombre]     = useState(nombreActual)
  const [loading, setLoading]   = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  async function guardar() {
    const n = nombre.trim()
    if (!n) { toast.error('El nombre no puede estar vacío'); return }
    if (n === nombreActual) { setEditing(false); return }

    setLoading(true)
    try {
      // Verificar si ya existe un grupo con ese nombre para este usuario
      const { data: existe } = await supabase
        .from('grupos')
        .select('id')
        .eq('nombre', n)
        .eq('creado_por', (await supabase.auth.getUser()).data.user?.id)
        .neq('id', grupoId)
        .maybeSingle()

      if (existe) {
        toast.error(`Ya tenés un grupo llamado "${n}"`)
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('grupos')
        .update({ nombre: n })
        .eq('id', grupoId)

      if (error) throw error
      toast.success('Nombre actualizado')
      setEditing(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  function cancelar() {
    setNombre(nombreActual)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 group/name">
        <h1 className="text-xl font-bold tracking-tight">{nombreActual}</h1>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Editar nombre"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        className="h-9 text-base font-bold"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') guardar()
          if (e.key === 'Escape') cancelar()
        }}
        maxLength={60}
      />
      <Button size="icon" className="h-9 w-9 shrink-0" onClick={guardar} disabled={loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={cancelar} disabled={loading}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
