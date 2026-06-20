'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from './Button'
import { cn } from '@/lib/utils'
import { BookOpen, LayoutDashboard, Library, Settings, LogOut, Shield } from 'lucide-react'

const memberLinks = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/dashboard/books', label: 'Minhas obras', icon: BookOpen },
  { href: '/library', label: 'Biblioteca', icon: Library },
]

const adminLinks = [
  { href: '/admin', label: 'Admin', icon: Shield },
]

export function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-black/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="mr-2 text-base font-bold tracking-tight text-white shrink-0"
        >
          BookGenerator
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1 flex-1">
          {memberLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                pathname === href || pathname.startsWith(href + '/')
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          {isAdmin &&
            adminLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {user && (
            <span className="hidden sm:block text-xs text-zinc-500 max-w-[160px] truncate">
              {user.name || user.email}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
