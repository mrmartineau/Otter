export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bookmarks: {
        Row: {
          click_count: number
          created_at: string
          description: string | null
          feed: string | null
          id: string
          image: string | null
          modified_at: string
          note: string | null
          star: boolean
          status: Database["public"]["Enums"]["status"]
          tags: string[] | null
          title: string | null
          tweet: Json | null
          type: Database["public"]["Enums"]["type"] | null
          url: string | null
          user: string | null
        }
        Insert: {
          click_count?: number
          created_at?: string
          description?: string | null
          feed?: string | null
          id?: string
          image?: string | null
          modified_at?: string
          note?: string | null
          star?: boolean
          status?: Database["public"]["Enums"]["status"]
          tags?: string[] | null
          title?: string | null
          tweet?: Json | null
          type?: Database["public"]["Enums"]["type"] | null
          url?: string | null
          user?: string | null
        }
        Update: {
          click_count?: number
          created_at?: string
          description?: string | null
          feed?: string | null
          id?: string
          image?: string | null
          modified_at?: string
          note?: string | null
          star?: boolean
          status?: Database["public"]["Enums"]["status"]
          tags?: string[] | null
          title?: string | null
          tweet?: Json | null
          type?: Database["public"]["Enums"]["type"] | null
          url?: string | null
          user?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          id: string
          settings_group_by_date: boolean | null
          settings_pinned_tags: string[]
          settings_tags_visible: boolean
          settings_top_tags_count: number | null
          settings_types_visible: boolean
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          id: string
          settings_group_by_date?: boolean | null
          settings_pinned_tags?: string[]
          settings_tags_visible?: boolean
          settings_top_tags_count?: number | null
          settings_types_visible?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: string
          settings_group_by_date?: boolean | null
          settings_pinned_tags?: string[]
          settings_tags_visible?: boolean
          settings_top_tags_count?: number | null
          settings_types_visible?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      toots: {
        Row: {
          created_at: string | null
          db_user_id: string | null
          hashtags: string[] | null
          id: string
          liked_toot: boolean
          media: Json | null
          reply: Json | null
          text: string | null
          toot_id: string | null
          toot_url: string | null
          urls: Json | null
          user_avatar: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          db_user_id?: string | null
          hashtags?: string[] | null
          id?: string
          liked_toot?: boolean
          media?: Json | null
          reply?: Json | null
          text?: string | null
          toot_id?: string | null
          toot_url?: string | null
          urls?: Json | null
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          db_user_id?: string | null
          hashtags?: string[] | null
          id?: string
          liked_toot?: boolean
          media?: Json | null
          reply?: Json | null
          text?: string | null
          toot_id?: string | null
          toot_url?: string | null
          urls?: Json | null
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      tweets: {
        Row: {
          created_at: string | null
          db_user_id: string | null
          hashtags: string[] | null
          id: string
          liked_tweet: boolean
          media: Json | null
          reply: Json | null
          text: string | null
          tweet_id: string | null
          tweet_url: string | null
          urls: Json | null
          user_avatar: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          db_user_id?: string | null
          hashtags?: string[] | null
          id?: string
          liked_tweet?: boolean
          media?: Json | null
          reply?: Json | null
          text?: string | null
          tweet_id?: string | null
          tweet_url?: string | null
          urls?: Json | null
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          db_user_id?: string | null
          hashtags?: string[] | null
          id?: string
          liked_tweet?: boolean
          media?: Json | null
          reply?: Json | null
          text?: string | null
          tweet_id?: string | null
          tweet_url?: string | null
          urls?: Json | null
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      tags_count: {
        Row: {
          count: number | null
          tag: string | null
        }
        Relationships: []
      }
      types_count: {
        Row: {
          count: number | null
          type: Database["public"]["Enums"]["type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_url: {
        Args: {
          url_input: string
        }
        Returns: {
          click_count: number
          created_at: string
          description: string | null
          feed: string | null
          id: string
          image: string | null
          modified_at: string
          note: string | null
          star: boolean
          status: Database["public"]["Enums"]["status"]
          tags: string[] | null
          title: string | null
          tweet: Json | null
          type: Database["public"]["Enums"]["type"] | null
          url: string | null
          user: string | null
        }[]
      }
    }
    Enums: {
      status: "active" | "inactive"
      type:
        | "link"
        | "video"
        | "audio"
        | "recipe"
        | "image"
        | "document"
        | "article"
        | "game"
        | "book"
        | "event"
        | "product"
        | "note"
        | "file"
        | "place"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
