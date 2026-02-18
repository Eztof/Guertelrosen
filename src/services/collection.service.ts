import { supabase } from '@/lib/supabase'

export const collectionService = {
  async listCollections(worldId: string) {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('world_id', worldId)
      .order('sort_order')
    if (error) throw error
    return data ?? []
  },

  async createCollection(worldId: string, name: string, parentId?: string | null) {
    const { data, error } = await supabase
      .from('collections')
      .insert({ world_id: worldId, name, parent_id: parentId ?? null })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateCollection(id: string, updates: { name?: string; parent_id?: string | null; sort_order?: number }) {
    const { data, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteCollection(id: string) {
    const { error } = await supabase.from('collections').delete().eq('id', id)
    if (error) throw error
  },
}
