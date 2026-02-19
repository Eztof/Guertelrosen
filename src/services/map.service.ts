import { supabase } from '@/lib/supabase'
import type { Visibility } from '@/types'

export const mapService = {
  async listMaps(worldId: string) {
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async getMap(id: string) {
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createMap(worldId: string, title: string, imagePath: string, visibility: Visibility = 'players') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data, error } = await supabase
      .from('maps')
      .insert({ world_id: worldId, title, image_path: imagePath, visibility, created_by: user.id })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateMap(id: string, updates: { title?: string; visibility?: Visibility }) {
    const { data, error } = await supabase
      .from('maps')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteMap(id: string) {
    const { error } = await supabase.from('maps').delete().eq('id', id)
    if (error) throw error
  },

  // Pins
  async getPins(mapId: string) {
    const { data, error } = await supabase
      .from('map_pins')
      .select('*, articles(id, title, slug, type)')
      .eq('map_id', mapId)
    if (error) throw error
    return data ?? []
  },

  async createPin(mapId: string, pin: {
    x: number
    y: number
    title: string
    notes?: string
    related_article_id?: string | null
    visibility?: Visibility
    dsa_date_str?: string | null
    dsa_date_sort?: number | null
  }) {
    const { data, error } = await supabase
      .from('map_pins')
      .insert({ map_id: mapId, visibility: 'players', ...pin })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updatePin(id: string, updates: Partial<{
    x: number
    y: number
    title: string
    notes: string
    related_article_id: string | null
    visibility: Visibility
    dsa_date_str: string | null
    dsa_date_sort: number | null
  }>) {
    const { data, error } = await supabase
      .from('map_pins')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deletePin(id: string) {
    const { error } = await supabase.from('map_pins').delete().eq('id', id)
    if (error) throw error
  },
}
