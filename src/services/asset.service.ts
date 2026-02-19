import { supabase } from '@/lib/supabase'
import type { Visibility } from '@/types'

const BUCKET = 'assets'

/**
 * crypto.randomUUID() is only available in secure contexts (HTTPS / localhost with SSL).
 * This fallback works everywhere including plain HTTP dev servers.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // RFC 4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const assetService = {
  async uploadFile(worldId: string, file: File, visibility: Visibility = 'players') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const ext = file.name.split('.').pop()
    const path = `${worldId}/${generateUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type })
    if (uploadError) throw uploadError

    const { data: asset, error: dbError } = await supabase
      .from('assets')
      .insert({
        world_id: worldId,
        path,
        filename: file.name,
        mime_type: file.type,
        size: file.size,
        owner: user.id,
        visibility,
      })
      .select()
      .single()
    if (dbError) throw dbError

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return { ...asset, publicUrl }
  },

  async listAssets(worldId: string) {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('world_id', worldId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(a => ({
      ...a,
      publicUrl: supabase.storage.from(BUCKET).getPublicUrl(a.path).data.publicUrl,
    }))
  },

  async deleteAsset(id: string, path: string) {
    await supabase.storage.from(BUCKET).remove([path])
    await supabase.from('assets').delete().eq('id', id)
  },

  getPublicUrl(path: string) {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
  },
}
