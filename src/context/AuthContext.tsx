'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { Models } from 'appwrite'
import { account, isAppwriteConfigured, ID } from '@/lib/appwrite/client'
import { ADMIN_EMAIL } from '@/lib/appwrite/config'

export type AuthUser = Models.User<Models.Preferences>

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAppwriteConfigured()) {
      setLoading(false)
      return
    }
    account
      .get()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    if (!isAppwriteConfigured()) throw new Error('Appwrite não configurado.')
    // Appwrite proíbe criar sessão nova se já houver uma ativa.
    await account.deleteSession('current').catch(() => {})
    await account.createEmailPasswordSession(email, password)
    setUser(await account.get())
  }, [])

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      if (!isAppwriteConfigured()) throw new Error('Appwrite não configurado.')
      await account.create(ID.unique(), email, password, name)
      // Limpa sessão anterior, se houver, antes de criar a nova.
      await account.deleteSession('current').catch(() => {})
      await account.createEmailPasswordSession(email, password)
      setUser(await account.get())
    },
    []
  )

  const logout = useCallback(async () => {
    if (!isAppwriteConfigured()) return
    await account.deleteSession('current').catch(() => {})
    setUser(null)
  }, [])

  const isAdmin = user?.email === ADMIN_EMAIL

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

