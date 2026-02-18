import { supabase } from '@/lib/supabase'
import { generateSlug, extractInternalLinks } from '@/lib/linkParser'
import type { ArticleType, Visibility } from '@/types'

export interface ArticleInput {
  title: string
  type: ArticleType
  summary?: string
  content_json?: object
  content_text?: string
  visibility?: Visibility
  is_draft?: boolean
  collection_id?: string | null
}

export const articleService = {
  async listArticles(worldId: string, filters?: {
    type?: ArticleType
    collectionId?: string
    tag?: string
    isDraft?: boolean
  }) {
    let query = supabase
      .from('articles')
      .select('id, title, slug, type, summary, visibility, is_draft, created_at, updated_at, collection_id, collections(name)')
      .eq('world_id', worldId)
      .order('title')

    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.collectionId) query = query.eq('collection_id', filters.collectionId)
    if (filters?.isDraft !== undefined) query = query.eq('is_draft', filters.isDraft)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getArticle(worldId: string, slug: string) {
    const { data, error } = await supabase
      .from('articles')
      .select('*, collections(id, name, parent_id)')
      .eq('world_id', worldId)
      .eq('slug', slug)
      .single()
    if (error) throw error
    return data
  },

  async getArticleById(id: string) {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async createArticle(worldId: string, input: ArticleInput) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Generate unique slug
    let slug = generateSlug(input.title)
    let suffix = 1
    while (true) {
      const { data: existing } = await supabase
        .from('articles')
        .select('id')
        .eq('world_id', worldId)
        .eq('slug', slug)
        .single()
      if (!existing) break
      slug = generateSlug(input.title, suffix++)
    }

    const { data, error } = await supabase
      .from('articles')
      .insert({
        world_id: worldId,
        slug,
        created_by: user.id,
        updated_by: user.id,
        visibility: 'players',
        is_draft: true,
        ...input,
      })
      .select()
      .single()
    if (error) throw error

    // Save initial version
    await this._saveVersion(data.id, 1, data.content_json, data.title, user.id)

    return data
  },

  async updateArticle(id: string, worldId: string, input: Partial<ArticleInput>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get current version count
    const { count } = await supabase
      .from('article_versions')
      .select('*', { count: 'exact', head: true })
      .eq('article_id', id)

    const nextVersion = (count ?? 0) + 1

    const { data, error } = await supabase
      .from('articles')
      .update({
        ...input,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
        published_at: input.is_draft === false ? new Date().toISOString() : undefined,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error

    // Save version
    await this._saveVersion(id, nextVersion, data.content_json, data.title, user.id)

    // Update article_links
    if (input.content_text !== undefined) {
      await this._updateLinks(id, worldId, input.content_text ?? '')
    }

    return data
  },

  async deleteArticle(id: string) {
    const { error } = await supabase.from('articles').delete().eq('id', id)
    if (error) throw error
  },

  async _saveVersion(articleId: string, versionNo: number, contentJson: object | null | undefined, title: string, userId: string) {
    // Keep only last 20 versions
    const { data: versions } = await supabase
      .from('article_versions')
      .select('id')
      .eq('article_id', articleId)
      .order('version_no', { ascending: false })

    if (versions && versions.length >= 20) {
      const toDelete = versions.slice(19).map(v => v.id)
      await supabase.from('article_versions').delete().in('id', toDelete)
    }

    await supabase.from('article_versions').insert({
      article_id: articleId,
      version_no: versionNo,
      content_json: contentJson ?? null,
      title,
      created_by: userId,
    })
  },

  async _updateLinks(sourceArticleId: string, worldId: string, contentText: string) {
    // Delete old links from this source
    await supabase.from('article_links').delete().eq('source_article_id', sourceArticleId)

    const titles = extractInternalLinks(contentText)
    if (titles.length === 0) return

    // Find matching articles
    const { data: targets } = await supabase
      .from('articles')
      .select('id, title')
      .eq('world_id', worldId)
      .in('title', titles)

    if (!targets?.length) return

    await supabase.from('article_links').insert(
      targets.map(t => ({
        source_article_id: sourceArticleId,
        target_article_id: t.id,
        world_id: worldId,
      }))
    )
  },

  async getBacklinks(articleId: string) {
    const { data, error } = await supabase
      .from('article_links')
      .select('source_article_id, articles!article_links_source_article_id_fkey(id, title, slug, type)')
      .eq('target_article_id', articleId)
    if (error) throw error
    return data
  },

  async getVersions(articleId: string) {
    const { data, error } = await supabase
      .from('article_versions')
      .select('*, profiles(display_name)')
      .eq('article_id', articleId)
      .order('version_no', { ascending: false })
    if (error) throw error
    return data
  },

  async searchArticles(worldId: string, query: string) {
    const { data, error } = await supabase
      .rpc('search_articles', { p_world_id: worldId, p_query: query })
    if (error) throw error
    return data
  },

  // Tags
  async getTagsForArticle(articleId: string) {
    const { data, error } = await supabase
      .from('article_tags')
      .select('tags(id, name, color)')
      .eq('article_id', articleId)
    if (error) throw error
    return data?.map(d => d.tags).filter(Boolean) ?? []
  },

  async setTagsForArticle(articleId: string, tagIds: string[]) {
    await supabase.from('article_tags').delete().eq('article_id', articleId)
    if (tagIds.length === 0) return
    await supabase.from('article_tags').insert(tagIds.map(tag_id => ({ article_id: articleId, tag_id })))
  },

  async listTags(worldId: string) {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('world_id', worldId)
      .order('name')
    if (error) throw error
    return data
  },

  async createTag(worldId: string, name: string, color?: string) {
    const { data, error } = await supabase
      .from('tags')
      .insert({ world_id: worldId, name, color })
      .select()
      .single()
    if (error) throw error
    return data
  },

  // All articles for a world (for link autocomplete)
  async getAllTitles(worldId: string) {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, slug')
      .eq('world_id', worldId)
    if (error) throw error
    return data ?? []
  },
}
