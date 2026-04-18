'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/Modal'
import { Loader2, User, Shield, Info, LogOut, Trash2 } from 'lucide-react'
import { PageLoader } from '@/components/ui/SkeletonCard'
import { cn } from '@/lib/utils'

export default function PerfilPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [user, setUser]         = useState<any>(null)
  const [nombre, setNombre]     = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTel]      = useState('')
  const [passActual, setPA]     = useState('')
  const [passNuevo, setPN]      = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [savingP, setSP]        = useState(false)

  const [showLogout, setShowLogout]   = useState(false)
  const [showDelete, setShowDelete]   = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loggingOut, setLoggingOut]   = useState(false)
  const [deleting, setDeleting]       = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data: { user: u } } = await supabase.auth.getUser()
    if (!u) return
    setUser(u)
    const { data: p } = await supabase.from('perfiles').select('*').eq('id', u.id).single()
    if (p) {
      setNombre(p.nombre || '')
      setApellido(p.apellido || '')
      setTel(p.telefono || '')
    }
    setLoading(false)
  }

  function handleTelefono(val: string) {
    setTel(val.replace(/[^\d+\s\-]/g, ''))
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!telefono.trim()) { toast.error('El teléfono es requerido'); return }
    if (!/^\+?[\d\s\-]{6,}$/.test(telefono.trim())) { toast.error('Ingresá un número de teléfono válido'); return }
    setSaving(true)
    const { error } = await supabase.from('perfiles').upsert({
      id: user.id,
      nombre:   nombre.trim() || null,
      apellido: apellido.trim() || null,
      telefono: telefono.trim(),
    })
    if (error) toast.error(error.message)
    else toast.success('Perfil actualizado')
    setSaving(false)
  }

  async function cambiarPass(e: React.FormEvent) {
    e.preventDefault()
    if (!passActual) { toast.error('Ingresá tu contraseña actual'); return }
    if (passNuevo.length < 6) { toast.error('Mínimo 6 caracteres para la nueva contraseña'); return }
    setSP(true)
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email: user.email, password: passActual })
      if (authErr) throw new Error('La contraseña actual es incorrecta')
      const { error } = await supabase.auth.updateUser({ password: passNuevo })
      if (error) throw error
      toast.success('Contraseña actualizada')
      setPA(''); setPN('')
    } catch (err: any) {
      toast.error(err.message)
    } finally { setSP(false) }
  }

  async function confirmarLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/auth/login'); router.refresh()
  }

  async function confirmarEliminar() {
    if (confirmText.trim().toLowerCase() !== 'eliminar') {
      toast.error('Escribí "eliminar" para confirmar'); return
    }
    setDeleting(true)
    try {
      await supabase.from('perfiles').delete().eq('id', user.id)
      await supabase.auth.signOut()
      toast.success('Cuenta eliminada')
      router.push('/auth/login')
    } catch (err: any) {
      toast.error(err.message)
      setDeleting(false); setShowDelete(false)
    }
  }

  if (loading) return <PageLoader text="Cargando perfil..." />

  const nombreCompleto = [nombre, apellido].filter(Boolean).join(' ')
  const initials = (nombre || user?.email || 'U').charAt(0).toUpperCase()

  return (
    <>
      <div className="max-w-lg mx-auto space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{nombreCompleto || 'Mi perfil'}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Datos personales */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Datos personales</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={guardar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Juan" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input id="apellido" value={apellido} onChange={e => setApellido(e.target.value)} placeholder="Pérez" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tel">Teléfono</Label>
                <Input id="tel" type="tel" value={telefono} onChange={e => handleTelefono(e.target.value)} placeholder="+54 11 1234-5678" required inputMode="numeric" />
              </div>
              <Button type="submit" disabled={saving} size="sm">
                {saving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Guardando...</> : 'Guardar cambios'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contraseña */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Cambiar contraseña</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={cambiarPass} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="passActual">Contraseña actual</Label>
                <Input id="passActual" type="password" value={passActual} onChange={e => setPA(e.target.value)} placeholder="Tu contraseña actual" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="passNuevo">Nueva contraseña</Label>
                <Input id="passNuevo" type="password" value={passNuevo} onChange={e => setPN(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <Button type="submit" variant="secondary" size="sm" disabled={savingP || !passActual || passNuevo.length < 6}>
                {savingP ? 'Actualizando...' : 'Cambiar contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Cuenta</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {[
              { k: 'Email', v: user?.email },
              { k: 'Miembro desde', v: user?.created_at ? new Date(user.created_at).toLocaleDateString('es-AR') : '—' },
            ].map(({ k, v }, i) => (
              <div key={k}>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-muted-foreground">{k}</span>
                  <span className="text-sm font-medium">{v}</span>
                </div>
                {i < 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Acciones */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setShowLogout(true)}>
              <LogOut className="h-4 w-4" />Cerrar sesión
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => { setConfirmText(''); setShowDelete(true) }}>
              <Trash2 className="h-4 w-4" />Eliminar cuenta permanentemente
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modal cerrar sesión */}
      <Modal open={showLogout} onClose={() => !loggingOut && setShowLogout(false)} title="Cerrar sesión">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vas a cerrar tu sesión. Podés volver a ingresar cuando quieras con tu email y contraseña.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={confirmarLogout} disabled={loggingOut} className="w-full">
              {loggingOut ? <><Loader2 className="h-4 w-4 animate-spin" />Cerrando...</> : 'Sí, cerrar sesión'}
            </Button>
            <Button variant="ghost" onClick={() => setShowLogout(false)} disabled={loggingOut} className="w-full">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar cuenta */}
      <Modal open={showDelete} onClose={() => !deleting && setShowDelete(false)} title="Eliminar cuenta">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos tus datos y grupos creados.
          </p>
          <div className="rounded-lg bg-destructive/8 border border-destructive/20 p-3 space-y-2">
            <p className="text-xs font-medium text-destructive">
              Para confirmar escribí <strong>eliminar</strong> abajo:
            </p>
            <Input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder='eliminar'
              className="border-destructive/30 focus-visible:ring-destructive"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="destructive" className="w-full"
              disabled={deleting || confirmText.trim().toLowerCase() !== 'eliminar'}
              onClick={confirmarEliminar}>
              {deleting ? <><Loader2 className="h-4 w-4 animate-spin" />Eliminando...</> : 'Eliminar cuenta'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setShowDelete(false)} disabled={deleting}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
