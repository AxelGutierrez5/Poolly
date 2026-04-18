'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/Modal'
import { Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { grupoId: string; grupoNombre: string }

export function DeleteGroupButton({ grupoId, grupoNombre }: Props) {
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  async function eliminar() {
    setLoading(true)
    try {
      const { error } = await supabase.from('grupos').delete().eq('id', grupoId)
      if (error) throw error
      toast.success('Grupo eliminado')
      router.push('/dashboard'); router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar')
      setLoading(false); setOpen(false)
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        onClick={() => setOpen(true)} title="Eliminar grupo">
        <Trash2 className="h-4 w-4" />
      </Button>

      <Modal open={open} onClose={() => !loading && setOpen(false)} title="Eliminar grupo">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ¿Eliminar <strong>"{grupoNombre}"</strong>? Esta acción es permanente y eliminará todos los turnos, pagos, números y miembros del grupo.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="destructive" className="w-full" onClick={eliminar} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Eliminando...</> : 'Sí, eliminar grupo'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
