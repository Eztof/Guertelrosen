export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ArticleType =
  | 'location'
  | 'npc'
  | 'faction'
  | 'item'
  | 'deity'
  | 'plot'
  | 'rule'
  | 'handout'
  | 'session_report'
  | 'note'

export type Visibility = 'players' | 'gm'

export type WorldRole = 'gm' | 'editor' | 'player'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
        }
        Update: {
          display_name?: string
          avatar_url?: string | null
        }
      }
      worlds: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          created_at: string
        }
        Insert: {
          name: string
          description?: string | null
          owner_id: string
        }
        Update: {
          name?: string
          description?: string | null
        }
      }
      world_members: {
        Row: {
          id: string
          world_id: string
          user_id: string
          role: WorldRole
          status: string
          created_at: string
        }
        Insert: {
          world_id: string
          user_id: string
          role: WorldRole
          status?: string
        }
        Update: {
          role?: WorldRole
          status?: string
        }
      }
      invite_codes: {
        Row: {
          id: string
          world_id: string
          code: string
          role: WorldRole
          created_by: string
          used_by: string | null
          used_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          world_id: string
          code: string
          role: WorldRole
          created_by: string
          expires_at?: string | null
        }
        Update: {
          used_by?: string | null
          used_at?: string | null
        }
      }
      collections: {
        Row: {
          id: string
          world_id: string
          parent_id: string | null
          name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          world_id: string
          parent_id?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          parent_id?: string | null
          name?: string
          sort_order?: number
        }
      }
      articles: {
        Row: {
          id: string
          world_id: string
          collection_id: string | null
          type: ArticleType
          title: string
          slug: string
          summary: string | null
          content_json: Json | null
          content_text: string | null
          visibility: Visibility
          is_draft: boolean
          created_by: string
          updated_by: string
          created_at: string
          updated_at: string
          published_at: string | null
        }
        Insert: {
          world_id: string
          collection_id?: string | null
          type: ArticleType
          title: string
          slug: string
          summary?: string | null
          content_json?: Json | null
          content_text?: string | null
          visibility?: Visibility
          is_draft?: boolean
          created_by: string
          updated_by: string
        }
        Update: {
          collection_id?: string | null
          type?: ArticleType
          title?: string
          slug?: string
          summary?: string | null
          content_json?: Json | null
          content_text?: string | null
          visibility?: Visibility
          is_draft?: boolean
          updated_by?: string
          updated_at?: string
          published_at?: string | null
        }
      }
      article_versions: {
        Row: {
          id: string
          article_id: string
          version_no: number
          content_json: Json | null
          title: string
          created_at: string
          created_by: string
        }
        Insert: {
          article_id: string
          version_no: number
          content_json?: Json | null
          title: string
          created_by: string
        }
        Update: Record<string, never>
      }
      article_links: {
        Row: {
          id: string
          source_article_id: string
          target_article_id: string
          world_id: string
        }
        Insert: {
          source_article_id: string
          target_article_id: string
          world_id: string
        }
        Update: Record<string, never>
      }
      tags: {
        Row: {
          id: string
          world_id: string
          name: string
          color: string | null
        }
        Insert: {
          world_id: string
          name: string
          color?: string | null
        }
        Update: {
          name?: string
          color?: string | null
        }
      }
      article_tags: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: Record<string, never>
      }
      sessions: {
        Row: {
          id: string
          world_id: string
          title: string
          session_date: string | null
          recap: string | null
          agenda: string | null
          todos: Json | null
          loot: Json | null
          hooks: string | null
          visibility: Visibility
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          world_id: string
          title: string
          session_date?: string | null
          recap?: string | null
          agenda?: string | null
          todos?: Json | null
          loot?: Json | null
          hooks?: string | null
          visibility?: Visibility
          created_by: string
        }
        Update: {
          title?: string
          session_date?: string | null
          recap?: string | null
          agenda?: string | null
          todos?: Json | null
          loot?: Json | null
          hooks?: string | null
          visibility?: Visibility
          updated_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          world_id: string
          kind: 'pc' | 'npc'
          name: string
          summary: string | null
          details_json: Json | null
          visibility: Visibility
          article_id: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          world_id: string
          kind: 'pc' | 'npc'
          name: string
          summary?: string | null
          details_json?: Json | null
          visibility?: Visibility
          article_id?: string | null
          created_by: string
        }
        Update: {
          kind?: 'pc' | 'npc'
          name?: string
          summary?: string | null
          details_json?: Json | null
          visibility?: Visibility
          article_id?: string | null
        }
      }
      relationships: {
        Row: {
          id: string
          world_id: string
          from_character_id: string
          to_character_id: string
          label: string
          notes: string | null
          visibility: Visibility
        }
        Insert: {
          world_id: string
          from_character_id: string
          to_character_id: string
          label: string
          notes?: string | null
          visibility?: Visibility
        }
        Update: {
          label?: string
          notes?: string | null
          visibility?: Visibility
        }
      }
      timelines: {
        Row: {
          id: string
          world_id: string
          title: string
          description: string | null
          created_at: string
        }
        Insert: {
          world_id: string
          title: string
          description?: string | null
        }
        Update: {
          title?: string
          description?: string | null
        }
      }
      timeline_events: {
        Row: {
          id: string
          timeline_id: string
          world_id: string
          title: string
          description: string | null
          start_date: string | null
          end_date: string | null
          related_article_id: string | null
          visibility: Visibility
          sort_order: number
        }
        Insert: {
          timeline_id: string
          world_id: string
          title: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          related_article_id?: string | null
          visibility?: Visibility
          sort_order?: number
        }
        Update: {
          title?: string
          description?: string | null
          start_date?: string | null
          end_date?: string | null
          related_article_id?: string | null
          visibility?: Visibility
          sort_order?: number
        }
      }
      maps: {
        Row: {
          id: string
          world_id: string
          title: string
          image_path: string
          width: number | null
          height: number | null
          visibility: Visibility
          created_by: string
          created_at: string
        }
        Insert: {
          world_id: string
          title: string
          image_path: string
          width?: number | null
          height?: number | null
          visibility?: Visibility
          created_by: string
        }
        Update: {
          title?: string
          image_path?: string
          width?: number | null
          height?: number | null
          visibility?: Visibility
        }
      }
      map_pins: {
        Row: {
          id: string
          map_id: string
          x: number
          y: number
          title: string
          notes: string | null
          related_article_id: string | null
          visibility: Visibility
        }
        Insert: {
          map_id: string
          x: number
          y: number
          title: string
          notes?: string | null
          related_article_id?: string | null
          visibility?: Visibility
        }
        Update: {
          x?: number
          y?: number
          title?: string
          notes?: string | null
          related_article_id?: string | null
          visibility?: Visibility
        }
      }
      assets: {
        Row: {
          id: string
          world_id: string
          path: string
          filename: string
          mime_type: string | null
          size: number | null
          owner: string
          visibility: Visibility
          created_at: string
        }
        Insert: {
          world_id: string
          path: string
          filename: string
          mime_type?: string | null
          size?: number | null
          owner: string
          visibility?: Visibility
        }
        Update: {
          visibility?: Visibility
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      search_articles: {
        Args: { p_world_id: string; p_query: string }
        Returns: Array<{
          id: string
          title: string
          slug: string
          type: string
          summary: string | null
          rank: number
        }>
      }
      is_world_member: {
        Args: { p_world_id: string }
        Returns: boolean
      }
      get_user_world_role: {
        Args: { p_world_id: string }
        Returns: string | null
      }
    }
    Enums: Record<string, never>
  }
}
