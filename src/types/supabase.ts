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
        }
        Relationships: []
      }
      item_tags: {
        Row: {
          item_id: number
          tag_id: number
        }
        Insert: {
          item_id: number
          tag_id: number
        }
        Update: {
          item_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "item_tags_item_id_fkey"
            columns: ["item_id"]
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_tags_tag_id_fkey"
            columns: ["tag_id"]
            referencedRelation: "tags2"
            referencedColumns: ["id"]
          }
        ]
      }
      items: {
        Row: {
          description: string | null
          id: number
          name: string
        }
        Insert: {
          description?: string | null
          id?: number
          name: string
        }
        Update: {
          description?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          id: string
          settings: Json | null
          settings_group_by_date: boolean | null
          settings_pinned_tags: string[] | null
          settings_tags_visible: boolean
          settings_top_tags_count: number | null
          settings_types_visible: boolean
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          id: string
          settings?: Json | null
          settings_group_by_date?: boolean | null
          settings_pinned_tags?: string[] | null
          settings_tags_visible?: boolean
          settings_top_tags_count?: number | null
          settings_types_visible?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          id?: string
          settings?: Json | null
          settings_group_by_date?: boolean | null
          settings_pinned_tags?: string[] | null
          settings_tags_visible?: boolean
          settings_top_tags_count?: number | null
          settings_types_visible?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string | null
          id: number
          tag_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          tag_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          tag_name?: string | null
        }
        Relationships: []
      }
      tags2: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      toots: {
        Row: {
          created_at: string | null
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
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
