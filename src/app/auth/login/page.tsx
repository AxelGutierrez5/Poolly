'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { Coins, Loader2 } from 'lucide-react'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre]     = useState('')
  const [apellido, setApellido] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading]   = useState(false)
  const supabase = createClient()
  const router   = useRouter()

  function handleTelefono(val: string) {
    // Solo permite dígitos, +, espacios y guiones
    const cleaned = val.replace(/[^\d+\s\-]/g, '')
    setTelefono(cleaned)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'register') {
        if (!telefono.trim()) { toast.error('El teléfono es requerido'); setLoading(false); return }
        if (!/^\+?[\d\s\-]{6,}$/.test(telefono.trim())) { toast.error('Ingresá un número de teléfono válido'); setLoading(false); return }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: {
              nombre:   nombre.trim() || null,
              apellido: apellido.trim() || null,
              telefono: telefono.trim(),
            },
          },
        })
        if (error) throw error
        toast.success('¡Cuenta creada! Ahora ingresá con tu email y contraseña.')
        setMode('login')
        setPassword(''); setNombre(''); setApellido(''); setTelefono('')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/dashboard'); router.refresh()
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'Invalid login credentials': 'Email o contraseña incorrectos',
        'User already registered': 'Ya existe una cuenta con ese email',
        'Password should be at least 6 characters': 'Mínimo 6 caracteres',
      }
      toast.error(msgs[err.message] || err.message)
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
        <div className="w-full max-w-[400px] animate-fade-in">
          <div className="hidden sm:block text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Gestioná tus juntas</h1>
            <p className="text-muted-foreground">Organizá grupos de ahorro colectivo de forma simple</p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">
                {mode === 'login' ? 'Bienvenido de nuevo' : 'Crear cuenta'}
              </CardTitle>
              <CardDescription>
                {mode === 'login' ? 'Ingresá con tu email y contraseña' : 'Completá tus datos para comenzar'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex rounded-lg bg-muted p-1 mb-5">
                {(['login', 'register'] as Mode[]).map(m => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    {m === 'login' ? 'Ingresar' : 'Registrarse'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <>
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
                      <Label htmlFor="telefono">Teléfono *</Label>
                      <Input
                        id="telefono"
                        type="tel"
                        value={telefono}
                        onChange={e => handleTelefono(e.target.value)}
                        placeholder="+54 11 1234-5678"
                        required
                        inputMode="numeric"
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pass">Contraseña</Label>
                  <Input id="pass" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <Button type="submit" disabled={loading} className="w-full" size="lg">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Cargando...</> : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-4">
                {mode === 'login' ? '¿Sin cuenta? ' : '¿Ya tenés cuenta? '}
                <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                  className="text-primary font-medium hover:underline">
                  {mode === 'login' ? 'Registrate' : 'Ingresá'}
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
