import { supabase } from '@/lib/supabase'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  meta: Record<string, any>
  read: boolean
  created_at: string
}

export interface WorldInvitation {
  id: string
  world_id: string
  invited_user_id: string
  invited_by: string
  role: string
  status: string
  created_at: string
  worlds?: { name: string; description: string | null }
  profiles?: { display_name: string }
}

export const notificationService = {
  async listNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data ?? []
  },

  async markRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    if (error) throw error
  },

  async markAllRead() {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false)
    if (error) throw error
  },

  async getUnreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
    if (error) return 0
    return count ?? 0
  },

  async listPendingInvitations(): Promise<WorldInvitation[]> {
    const { data, error } = await supabase
      .from('world_invitations')
      .select('*, worlds(name, description), profiles!world_invitations_invited_by_fkey(display_name)')
      .eq('status', 'pending')
    if (error) throw error
    return data ?? []
  },

  async respondToInvitation(invitationId: string, accept: boolean) {
    const { error } = await supabase
      .rpc('respond_to_invitation', {
        p_invitation_id: invitationId,
        p_accept: accept,
      })
    if (error) throw error
  },

  // GM: invite user by looking up their profile by display_name or email
  async searchUsers(query: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${query}%`)
      .limit(10)
    if (error) throw error
    return data ?? []
  },

  async inviteUser(worldId: string, userId: string, role: 'player' | 'editor') {
    const { error } = await supabase
      .rpc('invite_user_to_world', {
        p_world_id: worldId,
        p_invited_user_id: userId,
        p_role: role,
      })
    if (error) throw error
  },

  // GM: get all invitations for a world
  async listWorldInvitations(worldId: string) {
    const { data, error } = await supabase
      .from('world_invitations')
      .select('*, profiles!world_invitations_invited_user_id_fkey(display_name, avatar_url)')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async revokeInvitation(invitationId: string) {
    const { error } = await supabase
      .from('world_invitations')
      .delete()
      .eq('id', invitationId)
    if (error) throw error
  },
}
