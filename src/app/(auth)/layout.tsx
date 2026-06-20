import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">BookGenerator</span>
          </Link>
          <p className="mt-1 text-sm text-muted-foreground/70">Geração de obras com IA</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface-muted/60 p-8 backdrop-blur">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          Ao continuar você concorda com os{' '}
          <span className="text-muted-foreground">Termos de Uso</span>.
        </p>
      </div>
    </div>
  )
}
