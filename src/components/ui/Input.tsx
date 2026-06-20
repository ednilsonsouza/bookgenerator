import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground/80">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-10 w-full rounded-md border bg-surface px-3 text-sm text-foreground placeholder-muted-foreground/50 transition-all',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50',
            error
              ? 'border-danger focus:ring-danger/30 focus:border-danger/50'
              : 'border-border hover:border-border-strong',
            props.disabled && 'cursor-not-allowed opacity-50',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

