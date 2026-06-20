export type UserRole = 'member' | 'admin'

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  plan: 'free' | 'pro'
  createdAt: string
}
