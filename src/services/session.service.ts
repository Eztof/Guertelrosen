import { supabase } from '@/lib/supabase'
import type { Visibility } from '@/types'

export interface SessionInput {
  title: string
  session_date?: string | null
  recap?: string | null
  agenda?: string | null
  todos?: { text: string; done: boolean }[]
  loot?: { name: string; amount?: string }[]
  hooks?: string | null
  visibility?: Visibility
}

export const sessionService = {
  async listSessions(worldId: string) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('world_id', worldId)
      .order('session_date', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getSession(id: string) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createSession(worldId: string, input: SessionInput) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('sessions')
      .insert({ ...input, world_id: worldId, created_by: user.id, todos: input.todos ?? [], loot: input.loot ?? [] })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateSession(id: string, input: Partial<SessionInput>) {
    const { data, error } = await supabase
      .from('sessions')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteSession(id: string) {
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) throw error
  },
}
