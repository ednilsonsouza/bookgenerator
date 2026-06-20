import { cn } from '@/lib/utils'
import type { BookStatus } from '@/types/book'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-white/5 text-foreground/80 border border-white/10',
  success: 'bg-success-muted text-success border border-success/30',
  warning: 'bg-warning-muted text-warning border border-warning/30',
  danger: 'bg-danger-muted text-danger border border-danger/30',
  info: 'bg-info-muted text-info border border-info/30',
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

