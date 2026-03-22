export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      cidades: {
        Row: {
          comunicacao_recente: boolean
          created_at: string
          demandas: number
          demandas_resolvidas: number
          emendas: number
          engajamento: number
          id: string
          liderancas: number
          name: string
          peso: number
          population: string
          presenca_deputado: boolean
          regiao: string
          updated_at: string
        }
        Insert: {
          comunicacao_recente?: boolean
          created_at?: string
          demandas?: number
          demandas_resolvidas?: number
          emendas?: number
          engajamento?: number
          id?: string
          liderancas?: number
          name: string
          peso?: number
          population: string
          presenca_deputado?: boolean
          regiao: string
          updated_at?: string
        }
        Update: {
          comunicacao_recente?: boolean
          created_at?: string
          demandas?: number
          demandas_resolvidas?: number
          emendas?: number
          engajamento?: number
          id?: string
          liderancas?: number
          name?: string
          peso?: number
          population?: string
          presenca_deputado?: boolean
          regiao?: string
          updated_at?: string
        }
        Relationships: []
      }
      demanda_comments: {
        Row: {
          author: string
          chat_id: number | null
          created_at: string
          demanda_id: string
          id: string
          source: string
          text: string
        }
        Insert: {
          author: string
          chat_id?: number | null
          created_at?: string
          demanda_id: string
          id?: string
          source?: string
          text: string
        }
        Update: {
          author?: string
          chat_id?: number | null
          created_at?: string
          demanda_id?: string
          id?: string
          source?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "demanda_comments_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_history: {
        Row: {
          action: string
          actor: string
          created_at: string
          demanda_id: string
          id: string
          new_status: string | null
          old_status: string | null
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          demanda_id: string
          id?: string
          new_status?: string | null
          old_status?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          demanda_id?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demanda_history_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_notifications: {
        Row: {
          chat_id: number
          created_at: string
          demanda_id: string
          id: string
          status_sent: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          demanda_id: string
          id?: string
          status_sent: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          demanda_id?: string
          id?: string
          status_sent?: string
        }
        Relationships: [
          {
            foreignKeyName: "demanda_notifications_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      demandas: {
        Row: {
          attachments: number
          city: string
          col: string
          created_at: string
          creator_chat_id: number | null
          creator_name: string | null
          description: string | null
          id: string
          order_index: number
          origin: string
          priority: string
          responsible: string | null
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: number
          city: string
          col?: string
          created_at?: string
          creator_chat_id?: number | null
          creator_name?: string | null
          description?: string | null
          id?: string
          order_index?: number
          origin?: string
          priority?: string
          responsible?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: number
          city?: string
          col?: string
          created_at?: string
          creator_chat_id?: number | null
          creator_name?: string | null
          description?: string | null
          id?: string
          order_index?: number
          origin?: string
          priority?: string
          responsible?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      deputy_profile: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          facebook: string | null
          focus_areas: string[] | null
          full_name: string
          id: string
          instagram: string | null
          institutional_message: string | null
          logo_url: string | null
          party: string
          phone: string | null
          primary_color: string | null
          priority_cities: string[] | null
          public_name: string | null
          regions: string[] | null
          state: string
          telegram_username: string | null
          updated_at: string
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          focus_areas?: string[] | null
          full_name: string
          id?: string
          instagram?: string | null
          institutional_message?: string | null
          logo_url?: string | null
          party: string
          phone?: string | null
          primary_color?: string | null
          priority_cities?: string[] | null
          public_name?: string | null
          regions?: string[] | null
          state: string
          telegram_username?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          focus_areas?: string[] | null
          full_name?: string
          id?: string
          instagram?: string | null
          institutional_message?: string | null
          logo_url?: string | null
          party?: string
          phone?: string | null
          primary_color?: string | null
          priority_cities?: string[] | null
          public_name?: string | null
          regions?: string[] | null
          state?: string
          telegram_username?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      emendas: {
        Row: {
          ano: number
          cidade: string
          created_at: string
          id: string
          status: string
          tipo: string
          updated_at: string
          valor: string
        }
        Insert: {
          ano?: number
          cidade: string
          created_at?: string
          id?: string
          status?: string
          tipo: string
          updated_at?: string
          valor: string
        }
        Update: {
          ano?: number
          cidade?: string
          created_at?: string
          id?: string
          status?: string
          tipo?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          cidade: string
          created_at: string
          data: string
          demandas: number
          hora: string
          id: string
          liderancas: number
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cidade: string
          created_at?: string
          data: string
          demandas?: number
          hora: string
          id?: string
          liderancas?: number
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cidade?: string
          created_at?: string
          data?: string
          demandas?: number
          hora?: string
          id?: string
          liderancas?: number
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      leadership_notes: {
        Row: {
          author: string
          created_at: string
          id: string
          is_pinned: boolean
          lideranca_name: string
          tag: Database["public"]["Enums"]["note_tag"] | null
          text: string
          updated_at: string
        }
        Insert: {
          author?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          lideranca_name: string
          tag?: Database["public"]["Enums"]["note_tag"] | null
          text: string
          updated_at?: string
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          lideranca_name?: string
          tag?: Database["public"]["Enums"]["note_tag"] | null
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      liderancas: {
        Row: {
          address_cep: string | null
          address_city: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          atuacao: Json
          avatar_url: string | null
          cargo: string
          cidade_principal: string
          created_at: string
          email: string | null
          engajamento: number
          facebook: string | null
          id: string
          img: string
          influencia: string
          instagram: string | null
          name: string
          phone: string | null
          telegram_username: string | null
          tipo: string
          updated_at: string
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          address_cep?: string | null
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          atuacao?: Json
          avatar_url?: string | null
          cargo: string
          cidade_principal: string
          created_at?: string
          email?: string | null
          engajamento?: number
          facebook?: string | null
          id?: string
          img: string
          influencia?: string
          instagram?: string | null
          name: string
          phone?: string | null
          telegram_username?: string | null
          tipo?: string
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          address_cep?: string | null
          address_city?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          atuacao?: Json
          avatar_url?: string | null
          cargo?: string
          cidade_principal?: string
          created_at?: string
          email?: string | null
          engajamento?: number
          facebook?: string | null
          id?: string
          img?: string
          influencia?: string
          instagram?: string | null
          name?: string
          phone?: string | null
          telegram_username?: string | null
          tipo?: string
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_contacts: {
        Row: {
          chat_id: number
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          lideranca_name: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          lideranca_name?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          lideranca_name?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      telegram_conversation_state: {
        Row: {
          chat_id: number
          data: Json
          step: string
          updated_at: string
        }
        Insert: {
          chat_id: number
          data?: Json
          step?: string
          updated_at?: string
        }
        Update: {
          chat_id?: number
          data?: Json
          step?: string
          updated_at?: string
        }
        Relationships: []
      }
      telegram_messages: {
        Row: {
          chat_id: number
          created_at: string
          direction: string
          id: string
          is_read: boolean
          raw_update: Json | null
          text: string | null
          update_id: number | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          direction?: string
          id?: string
          is_read?: boolean
          raw_update?: Json | null
          text?: string | null
          update_id?: number | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          direction?: string
          id?: string
          is_read?: boolean
          raw_update?: Json | null
          text?: string | null
          update_id?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      note_tag:
        | "relacionamento"
        | "politico"
        | "conflito"
        | "apoio"
        | "alerta"
        | "estrategico"
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
      note_tag: [
        "relacionamento",
        "politico",
        "conflito",
        "apoio",
        "alerta",
        "estrategico",
      ],
    },
  },
} as const
