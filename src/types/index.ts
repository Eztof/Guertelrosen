export type { Database, ArticleType, Visibility, WorldRole } from './database'

export interface AppUser {
  id: string
  email: string
  display_name: string
  avatar_url?: string | null
}

export interface WorldContext {
  worldId: string
  role: 'gm' | 'editor' | 'player'
}
