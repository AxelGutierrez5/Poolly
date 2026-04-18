import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-7 w-1/2" />
      <div className="pt-3 border-t space-y-2">
        {[80, 65, 50, 70].map((w, i) => <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />)}
      </div>
    </div>
  )
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-lg border bg-card divide-y overflow-hidden shadow-sm">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4" style={{ width: `${45 + (i * 17) % 40}%` }} />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function PageLoader({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

export { Skeleton }
