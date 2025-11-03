import { cn } from '@/lib/cn'

export function Card({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('rounded-lg bg-white shadow-soft ring-1 ring-border/60', className)}>{children}</div>
}

export function CardHeader({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('p-6 pb-4', className)}>{children}</div>
}

export function CardTitle({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <h3 className={cn('text-lg font-semibold', className)}>{children}</h3>
}

export function CardContent({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cn('p-6 pt-0', className)}>{children}</div>
}
