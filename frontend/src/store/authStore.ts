import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  userId: number | null
  userName: string | null
  role: string | null
  setAuth: (token: string, userId: number, userName: string, role: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      userName: null,
      role: null,
      setAuth: (token, userId, userName, role) =>
        set({ token, userId, userName, role }),
      logout: () => set({ token: null, userId: null, userName: null, role: null }),
    }),
    { name: 'auth-store' },
  ),
)
