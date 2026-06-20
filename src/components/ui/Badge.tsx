import { cn } from '@/lib/utils'
import type { BookStatus } from '@/types/book'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-zinc-700 text-zinc-300',
  success: 'bg-emerald-900/60 text-emerald-400 border border-emerald-800',
  warning: 'bg-yellow-900/60 text-yellow-400 border border-yellow-800',
  danger: 'bg-red-900/60 text-red-400 border border-red-800',
  info: 'bg-blue-900/60 text-blue-400 border border-blue-800',
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

const statusVariants: Record<BookStatus, BadgeVariant> = {
  draft: 'default',
  plan_pending: 'warning',
  plan_ready: 'info',
  generating: 'warning',
  review: 'info',
  completed: 'success',
  published: 'success',
  failed: 'danger',
}

export function BookStatusBadge({ status }: { status: BookStatus }) {
  const labels: Record<BookStatus, string> = {
    draft: 'Rascunho',
    plan_pending: 'Aguardando plano',
    plan_ready: 'Plano pronto',
    generating: 'Gerando',
    review: 'Em revisão',
    completed: 'Concluída',
    published: 'Publicada',
    failed: 'Falha',
  }
  return <Badge variant={statusVariants[status]}>{labels[status]}</Badge>
}
