import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Página no encontrada
        </h2>
        <p className="text-gray-500 mb-6">
          El grupo o recurso que buscás no existe o fue eliminado.
        </p>
        <Link href="/dashboard" className="btn-primary">
          Ir al dashboard
        </Link>
      </div>
    </div>
  )
}
