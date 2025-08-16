export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.0.1 (cd38da5)"
  }
  public: {
    Tables: {
      bookmark_tags: {
        Row: {
          bookmark_id: string
          tag_id: string
        }
        Insert: {
          bookmark_id: string
          tag_id: string
        }
        Update: {
          bookmark_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmark_tags_bookmark_id_fkey"
            columns: ["bookmark_id"]
            isOneToOne: false
            referencedRelation: "bookmarks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmark_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
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
          public: boolean
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
          public?: boolean
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
          public?: boolean
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
      feeds: {
        Row: {
          created_at: string
          id: number
          name: string
          properties: Json | null
          type: Database["public"]["Enums"]["feeds_type"]
          url: string
        }
        Insert: {
          created_at?: string
          id?: number
          name: string
          properties?: Json | null
          type: Database["public"]["Enums"]["feeds_type"]
          url: string
        }
        Update: {
          created_at?: string
          id?: number
          name?: string
          properties?: Json | null
          type?: Database["public"]["Enums"]["feeds_type"]
          url?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string
          id: number
          media_id: string | null
          modified_at: string | null
          name: string
          platform: string | null
          rating: Database["public"]["Enums"]["media_rating"] | null
          sort_order: number | null
          status: Database["public"]["Enums"]["media_status"] | null
          type: Database["public"]["Enums"]["media_type"] | null
        }
        Insert: {
          created_at?: string
          id?: number
          media_id?: string | null
          modified_at?: string | null
          name?: string
          platform?: string | null
          rating?: Database["public"]["Enums"]["media_rating"] | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["media_status"] | null
          type?: Database["public"]["Enums"]["media_type"] | null
        }
        Update: {
          created_at?: string
          id?: number
          media_id?: string | null
          modified_at?: string | null
          name?: string
          platform?: string | null
          rating?: Database["public"]["Enums"]["media_rating"] | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["media_status"] | null
          type?: Database["public"]["Enums"]["media_type"] | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_key: string
          avatar_url: string | null
          id: string
          settings_collections_visible: boolean
          settings_group_by_date: boolean | null
          settings_pinned_tags: string[]
          settings_tags_visible: boolean
          settings_top_tags_count: number | null
          settings_types_visible: boolean
          updated_at: string | null
          username: string | null
        }
        Insert: {
          api_key?: string
          avatar_url?: string | null
          id: string
          settings_collections_visible?: boolean
          settings_group_by_date?: boolean | null
          settings_pinned_tags?: string[]
          settings_tags_visible?: boolean
          settings_top_tags_count?: number | null
          settings_types_visible?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          api_key?: string
          avatar_url?: string | null
          id?: string
          settings_collections_visible?: boolean
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
      tags: {
        Row: {
          id: string
          tag: string
        }
        Insert: {
          id?: string
          tag: string
        }
        Update: {
          id?: string
          tag?: string
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
      bookmark_counts: {
        Row: {
          all_count: number | null
          public_count: number | null
          stars_count: number | null
          top_count: number | null
          trash_count: number | null
        }
        Relationships: []
      }
      collection_tags_view: {
        Row: {
          bookmark_count: number | null
          collection: string | null
          tags: string[] | null
        }
        Relationships: []
      }
      tags_count: {
        Row: {
          count: number | null
          tag: string | null
        }
        Relationships: []
      }
      tags_count1: {
        Row: {
          bookmark_count: number | null
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
        Args: { url_input: string }
        Returns: {
          click_count: number
          created_at: string
          description: string | null
          feed: string | null
          id: string
          image: string | null
          modified_at: string
          note: string | null
          public: boolean
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
      get_bookmarks_by_collection: {
        Args: { collection_name: string }
        Returns: {
          click_count: number
          created_at: string
          description: string | null
          feed: string | null
          id: string
          image: string | null
          modified_at: string
          note: string | null
          public: boolean
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
      update_bookmark_tags: {
        Args: { old_tag: string; new_tag: string; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      feeds_type: "rss" | "api"
      media_rating:
        | "0"
        | "0.5"
        | "1"
        | "1.5"
        | "2"
        | "2.5"
        | "3"
        | "3.5"
        | "4"
        | "4.5"
        | "5"
      media_status: "now" | "skipped" | "done" | "wishlist"
      media_type:
        | "tv"
        | "film"
        | "game"
        | "book"
        | "podcast"
        | "music"
        | "other"
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      feeds_type: ["rss", "api"],
      media_rating: [
        "0",
        "0.5",
        "1",
        "1.5",
        "2",
        "2.5",
        "3",
        "3.5",
        "4",
        "4.5",
        "5",
      ],
      media_status: ["now", "skipped", "done", "wishlist"],
      media_type: ["tv", "film", "game", "book", "podcast", "music", "other"],
      status: ["active", "inactive"],
      type: [
        "link",
        "video",
        "audio",
        "recipe",
        "image",
        "document",
        "article",
        "game",
        "book",
        "event",
        "product",
        "note",
        "file",
        "place",
      ],
    },
  },
} as const
