import { supabase } from '@/lib/supabase'

export const authService = {
  async signInWithPassword(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password })
  },

  async signInWithMagicLink(email: string) {
    return supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
  },

  async signUp(email: string, password: string, displayName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) throw error

    // Create profile
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        display_name: displayName,
      })
    }
    return data
  },

  async signOut() {
    return supabase.auth.signOut()
  },

  async getSession() {
    return supabase.auth.getSession()
  },

  onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
    return supabase.auth.onAuthStateChange(callback)
  },
}
