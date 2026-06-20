import { cn } from '@/lib/utils'
import type { ReferenceStatus } from '@/lib/appwrite/references'
import { CheckCircle2, Clock, AlertCircle, Loader2, FileX } from 'lucide-react'

const config: Record<ReferenceStatus, { label: string; icon: React.ElementType; classes: string }> = {
  ready:      { label: 'Pronto',       icon: CheckCircle2, classes: 'text-emerald-400 bg-emerald-900/30 border-emerald-800' },
  processing: { label: 'Processando',  icon: Loader2,      classes: 'text-yellow-400 bg-yellow-900/30 border-yellow-800 animate-pulse' },
  pending:    { label: 'Aguardando',   icon: Clock,        classes: 'text-muted-foreground bg-surface-muted/60 border-border' },
  error:      { label: 'Erro',         icon: AlertCircle,  classes: 'text-red-400 bg-red-900/30 border-red-800' },
  no_file:    { label: 'Sem arquivo',  icon: FileX,        classes: 'text-muted-foreground/70 bg-surface border-border' },
}

export function ReferenceStatusBadge({ status }: { status: ReferenceStatus }) {
  const { label, icon: Icon, classes } = config[status] ?? config.pending
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        classes
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
