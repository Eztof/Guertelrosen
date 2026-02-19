import { supabase } from '@/lib/supabase'
import type { Visibility } from '@/types'

export interface TimelineEventInput {
  title: string
  description?: string | null
  dsa_start_str?: string | null
  dsa_start_sort?: number | null
  dsa_end_str?: string | null
  dsa_end_sort?: number | null
  related_article_id?: string | null
  visibility?: Visibility
  sort_order?: number
}

export const timelineService = {
  async listTimelines(worldId: string) {
    const { data, error } = await supabase
      .from('timelines')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at')
    if (error) throw error
    return data ?? []
  },

  async getTimeline(id: string) {
    const { data, error } = await supabase
      .from('timelines')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createTimeline(worldId: string, title: string, description?: string) {
    const { data, error } = await supabase
      .from('timelines')
      .insert({ world_id: worldId, title, description: description || null })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateTimeline(id: string, updates: { title?: string; description?: string | null }) {
    const { data, error } = await supabase
      .from('timelines')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteTimeline(id: string) {
    const { error } = await supabase.from('timelines').delete().eq('id', id)
    if (error) throw error
  },

  async getEvents(timelineId: string) {
    const { data, error } = await supabase
      .from('timeline_events')
      .select('*, articles(id, title, slug, type, summary)')
      .eq('timeline_id', timelineId)
      .order('dsa_start_sort', { ascending: true, nullsFirst: false })
    if (error) throw error
    return data ?? []
  },

  async createEvent(timelineId: string, worldId: string, input: TimelineEventInput) {
    const { data, error } = await supabase
      .from('timeline_events')
      .insert({
        timeline_id: timelineId,
        world_id: worldId,
        visibility: 'players',
        sort_order: 0,
        ...input,
      })
      .select('*, articles(id, title, slug, type, summary)')
      .single()
    if (error) throw error
    return data
  },

  async updateEvent(id: string, input: Partial<TimelineEventInput>) {
    const { data, error } = await supabase
      .from('timeline_events')
      .update(input)
      .eq('id', id)
      .select('*, articles(id, title, slug, type, summary)')
      .single()
    if (error) throw error
    return data
  },

  async deleteEvent(id: string) {
    const { error } = await supabase.from('timeline_events').delete().eq('id', id)
    if (error) throw error
  },

  // Get all events for a world (for the world-wide timeline view)
  async getAllWorldEvents(worldId: string, includeGm: boolean) {
    let query = supabase
      .from('timeline_events')
      .select('*, articles(id, title, slug, type, summary), timelines(id, title)')
      .eq('world_id', worldId)
      .order('dsa_start_sort', { ascending: true, nullsFirst: false })

    if (!includeGm) {
      query = query.eq('visibility', 'players')
    }

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },
}
