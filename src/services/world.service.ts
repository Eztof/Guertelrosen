import { supabase } from '@/lib/supabase'

export const worldService = {
  async listMyWorlds() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('world_members')
      .select('role, status, worlds(*)')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) throw error
    return data
  },

  async getWorld(worldId: string) {
    const { data, error } = await supabase
      .from('worlds')
      .select('*')
      .eq('id', worldId)
      .single()
    if (error) throw error
    return data
  },

  async createWorld(name: string, description: string) {
    const { data, error } = await supabase
      .rpc('create_world_with_membership', {
        p_name: name,
        p_description: description || null,
      })
    if (error) throw error
    return data
  },

  async getWorldMembers(worldId: string) {
    const { data, error } = await supabase
      .from('world_members')
      .select('*, profiles(display_name, avatar_url)')
      .eq('world_id', worldId)
    if (error) throw error
    return data
  },

  async getUserRole(worldId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
      .from('world_members')
      .select('role')
      .eq('world_id', worldId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    return data?.role ?? null
  },

  async addMember(worldId: string, userId: string, role: 'editor' | 'player') {
    const { data, error } = await supabase
      .from('world_members')
      .insert({
        world_id: worldId,
        user_id: userId,
        role,
        status: 'active',
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateMemberRole(memberId: string, role: 'gm' | 'editor' | 'player') {
    const { data, error } = await supabase
      .from('world_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async removeMember(memberId: string) {
    const { error } = await supabase
      .from('world_members')
      .delete()
      .eq('id', memberId)
    if (error) throw error
  },
}
