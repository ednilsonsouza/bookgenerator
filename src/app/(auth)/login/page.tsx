'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
})

type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginValues) {
    setError('')
    try {
      await login(values.email, values.password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login.')
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Entrar</h1>
      <p className="mb-6 text-sm text-muted-foreground">Acesse sua conta para continuar</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="E-mail"
          type="email"
          placeholder="voce@exemplo.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Senha"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        {error && (
          <p className="rounded-md border border-danger/30 bg-danger-muted px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
          Entrar
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground/70">
        Não tem conta?{' '}
        <Link href="/register" className="text-foreground/80 hover:text-foreground transition-colors">
          Criar conta
        </Link>
      </p>
    </div>
  )
}

