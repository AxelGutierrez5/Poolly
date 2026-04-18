'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import type { Participante } from '@/types'

export default function ParticipantesPage() {
  const { id: grupoId } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClient()

  const [grupo, setGrupo] = useState<any>(null)
  const [participantes, setParticipantes] = useState<
    (Participante & { numeros_asignados: { numero: number }[] })[]
  >([])
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    const [{ data: g }, { data: p }] = await Promise.all([
      supabase
        .from('grupos')
        .select('nombre, cantidad_numeros')
        .eq('id', grupoId)
        .single(),
      supabase
        .from('participantes')
        .select('*, numeros_asignados(numero)')
        .eq('grupo_id', grupoId)
        .order('created_at'),
    ])
    setGrupo(g)
    setParticipantes(p || [])
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setLoading(true)
    const { error } = await supabase.from('participantes').insert({
      grupo_id: grupoId,
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`${nombre} agregado`)
      setNombre('')
      setTelefono('')
      cargar()
    }
    setLoading(false)
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar a ${nombre}? Se eliminarán sus números asignados.`))
      return
    const { error } = await supabase
      .from('participantes')
      .delete()
      .eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Participante eliminado')
      cargar()
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/grupos/${grupoId}`} className="btn-ghost text-sm">
          ← Volver
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Participantes</h1>
          {grupo && (
            <p className="text-sm text-gray-400">{grupo.nombre}</p>
          )}
        </div>
      </div>

      {/* Formulario agregar */}
      <form onSubmit={agregar} className="card p-5 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">
          Agregar participante
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            required
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            placeholder="Nombre *"
            className="input-base"
          />
          <input
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            placeholder="Teléfono (opcional)"
            className="input-base"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary text-sm"
        >
          {loading ? 'Agregando...' : '+ Agregar'}
        </button>
      </form>

      {/* Lista */}
      <div className="card divide-y divide-gray-100">
        {participantes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">👤</p>
            <p>Sin participantes todavía</p>
          </div>
        ) : (
          participantes.map(p => (
            <div
              key={p.id}
              className="flex items-center justify-between px-5 py-4"
            >
              <div>
                <p className="font-medium text-gray-900">{p.nombre}</p>
                <p className="text-sm text-gray-400">
                  {p.telefono && <span className="mr-3">📞 {p.telefono}</span>}
                  {p.numeros_asignados.length > 0 && (
                    <span className="text-brand-600">
                      🔢 Números:{' '}
                      {p.numeros_asignados
                        .map(n => n.numero)
                        .sort((a, b) => a - b)
                        .join(', ')}
                    </span>
                  )}
                  {p.numeros_asignados.length === 0 && (
                    <span className="text-amber-500">Sin números asignados</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => eliminar(p.id, p.nombre)}
                className="text-red-400 hover:text-red-600 text-sm transition-colors ml-4"
              >
                Eliminar
              </button>
            </div>
          ))
        )}
      </div>

      {participantes.length > 0 && (
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-400">
            {participantes.length} participante
            {participantes.length !== 1 ? 's' : ''}
          </p>
          <Link
            href={`/grupos/${grupoId}/numeros`}
            className="btn-primary text-sm"
          >
            Asignar números →
          </Link>
        </div>
      )}
    </div>
  )
}
