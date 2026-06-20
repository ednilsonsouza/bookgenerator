import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-background bg-grid">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-primary">BookGenerator</span>
          </Link>
          <p className="mt-1 text-sm text-muted-foreground/70">Geração de obras com IA</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-surface p-8 backdrop-blur-md shadow-[0_0_40px_rgba(6,182,212,0.08)]">
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

