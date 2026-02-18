import { supabase } from '@/lib/supabase'
import { nanoid } from 'nanoid' // We'll use crypto.randomUUID instead

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('worlds')
      .insert({ name, description, owner_id: user.id })
      .select()
      .single()
    if (error) throw error

    // Add creator as GM
    await supabase.from('world_members').insert({
      world_id: data.id,
      user_id: user.id,
      role: 'gm',
      status: 'active',
    })

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

  // Invite codes
  async createInviteCode(worldId: string, role: 'editor' | 'player') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const code = crypto.randomUUID().split('-')[0].toUpperCase()
    const { data, error } = await supabase
      .from('invite_codes')
      .insert({
        world_id: worldId,
        code,
        role,
        created_by: user.id,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async useInviteCode(code: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Find the code
    const { data: invite, error: findError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .is('used_by', null)
      .single()

    if (findError || !invite) throw new Error('Ungültiger oder bereits verwendeter Code')

    // Check expiry
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      throw new Error('Einladungscode abgelaufen')
    }

    // Add member
    const { error: memberError } = await supabase
      .from('world_members')
      .insert({
        world_id: invite.world_id,
        user_id: user.id,
        role: invite.role,
        status: 'active',
      })
    if (memberError) throw memberError

    // Mark used
    await supabase
      .from('invite_codes')
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq('id', invite.id)

    return invite.world_id
  },

  async getInviteCodes(worldId: string) {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
}
