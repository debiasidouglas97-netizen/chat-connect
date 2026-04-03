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
      activity_logs: {
        Row: {
          created_at: string
          descricao_bruta: string
          descricao_ia: string | null
          entidade: string
          entidade_id: string | null
          id: string
          prioridade: string
          tenant_id: string | null
          tipo_evento: string
          usuario_responsavel: string | null
        }
        Insert: {
          created_at?: string
          descricao_bruta: string
          descricao_ia?: string | null
          entidade: string
          entidade_id?: string | null
          id?: string
          prioridade?: string
          tenant_id?: string | null
          tipo_evento: string
          usuario_responsavel?: string | null
        }
        Update: {
          created_at?: string
          descricao_bruta?: string
          descricao_ia?: string | null
          entidade?: string
          entidade_id?: string | null
          id?: string
          prioridade?: string
          tenant_id?: string | null
          tipo_evento?: string
          usuario_responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cidades: {
        Row: {
          comunicacao_recente: boolean
          created_at: string
          demandas: number
          demandas_resolvidas: number
          emendas: number
          engajamento: number
          id: string
          latitude: number | null
          liderancas: number
          longitude: number | null
          name: string
          peso: number
          population: string
          presenca_deputado: boolean
          regiao: string
          tenant_id: string | null
          updated_at: string
          votos_2022: number
        }
        Insert: {
          comunicacao_recente?: boolean
          created_at?: string
          demandas?: number
          demandas_resolvidas?: number
          emendas?: number
          engajamento?: number
          id?: string
          latitude?: number | null
          liderancas?: number
          longitude?: number | null
          name: string
          peso?: number
          population: string
          presenca_deputado?: boolean
          regiao: string
          tenant_id?: string | null
          updated_at?: string
          votos_2022?: number
        }
        Update: {
          comunicacao_recente?: boolean
          created_at?: string
          demandas?: number
          demandas_resolvidas?: number
          emendas?: number
          engajamento?: number
          id?: string
          latitude?: number | null
          liderancas?: number
          longitude?: number | null
          name?: string
          peso?: number
          population?: string
          presenca_deputado?: boolean
          regiao?: string
          tenant_id?: string | null
          updated_at?: string
          votos_2022?: number
        }
        Relationships: [
          {
            foreignKeyName: "cidades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_attachments: {
        Row: {
          created_at: string
          demanda_id: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          source: string
          storage_path: string
          tenant_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          demanda_id: string
          file_name: string
          file_size?: number
          file_type?: string
          id?: string
          source?: string
          storage_path: string
          tenant_id?: string | null
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          demanda_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          source?: string
          storage_path?: string
          tenant_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "demanda_attachments_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demanda_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_comments: {
        Row: {
          author: string
          chat_id: number | null
          created_at: string
          demanda_id: string
          id: string
          source: string
          tenant_id: string | null
          text: string
        }
        Insert: {
          author: string
          chat_id?: number | null
          created_at?: string
          demanda_id: string
          id?: string
          source?: string
          tenant_id?: string | null
          text: string
        }
        Update: {
          author?: string
          chat_id?: number | null
          created_at?: string
          demanda_id?: string
          id?: string
          source?: string
          tenant_id?: string | null
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
          {
            foreignKeyName: "demanda_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          demanda_id: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          demanda_id?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demanda_history_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demanda_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          demanda_id: string
          id?: string
          status_sent: string
          tenant_id?: string | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          demanda_id?: string
          id?: string
          status_sent?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demanda_notifications_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demanda_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          party_logo_url: string | null
          phone: string | null
          primary_color: string | null
          priority_cities: string[] | null
          public_name: string | null
          regions: string[] | null
          state: string
          telegram_username: string | null
          tenant_id: string | null
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
          party_logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          priority_cities?: string[] | null
          public_name?: string | null
          regions?: string[] | null
          state: string
          telegram_username?: string | null
          tenant_id?: string | null
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
          party_logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          priority_cities?: string[] | null
          public_name?: string | null
          regions?: string[] | null
          state?: string
          telegram_username?: string | null
          tenant_id?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deputy_profile_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      emenda_attachments: {
        Row: {
          created_at: string
          emenda_id: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          storage_path: string
          tenant_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          emenda_id: string
          file_name: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path: string
          tenant_id?: string | null
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          emenda_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          storage_path?: string
          tenant_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "emenda_attachments_emenda_id_fkey"
            columns: ["emenda_id"]
            isOneToOne: false
            referencedRelation: "emendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emenda_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      emendas: {
        Row: {
          ano: number
          cidade: string
          created_at: string
          descricao: string | null
          id: string
          liderancas_relacionadas: string[] | null
          notas: string | null
          objetivo_politico: string | null
          prioridade: string
          regiao: string | null
          status: string
          tenant_id: string | null
          tipo: string
          titulo: string | null
          updated_at: string
          valor: string
        }
        Insert: {
          ano?: number
          cidade: string
          created_at?: string
          descricao?: string | null
          id?: string
          liderancas_relacionadas?: string[] | null
          notas?: string | null
          objetivo_politico?: string | null
          prioridade?: string
          regiao?: string | null
          status?: string
          tenant_id?: string | null
          tipo: string
          titulo?: string | null
          updated_at?: string
          valor: string
        }
        Update: {
          ano?: number
          cidade?: string
          created_at?: string
          descricao?: string | null
          id?: string
          liderancas_relacionadas?: string[] | null
          notas?: string | null
          objetivo_politico?: string | null
          prioridade?: string
          regiao?: string | null
          status?: string
          tenant_id?: string | null
          tipo?: string
          titulo?: string | null
          updated_at?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "emendas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_logs: {
        Row: {
          comment_id: string
          comment_text: string | null
          created_at: string
          id: string
          instagram_username: string
          leader_id: string | null
          post_id: string
          score: number
          tenant_id: string
          tipo_interacao: string
        }
        Insert: {
          comment_id: string
          comment_text?: string | null
          created_at?: string
          id?: string
          instagram_username: string
          leader_id?: string | null
          post_id: string
          score?: number
          tenant_id: string
          tipo_interacao?: string
        }
        Update: {
          comment_id?: string
          comment_text?: string | null
          created_at?: string
          id?: string
          instagram_username?: string
          leader_id?: string | null
          post_id?: string
          score?: number
          tenant_id?: string
          tipo_interacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_logs_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_processed_posts: {
        Row: {
          comments_count: number | null
          id: string
          post_caption: string | null
          post_id: string
          post_timestamp: string | null
          post_url: string | null
          processed_at: string
          tenant_id: string
        }
        Insert: {
          comments_count?: number | null
          id?: string
          post_caption?: string | null
          post_id: string
          post_timestamp?: string | null
          post_url?: string | null
          processed_at?: string
          tenant_id: string
        }
        Update: {
          comments_count?: number | null
          id?: string
          post_caption?: string | null
          post_id?: string
          post_timestamp?: string | null
          post_url?: string | null
          processed_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_processed_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_sync_config: {
        Row: {
          apify_api_key: string
          created_at: string
          frequencia_sincronizacao: string
          id: string
          instagram_handle: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          apify_api_key?: string
          created_at?: string
          frequencia_sincronizacao?: string
          id?: string
          instagram_handle?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          apify_api_key?: string
          created_at?: string
          frequencia_sincronizacao?: string
          id?: string
          instagram_handle?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_sync_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evento_notifications: {
        Row: {
          chat_id: number
          created_at: string
          evento_id: string
          id: string
          tenant_id: string | null
          tipo: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          evento_id: string
          id?: string
          tenant_id?: string | null
          tipo?: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          evento_id?: string
          id?: string
          tenant_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "evento_notifications_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evento_notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          cep: string | null
          cidade: string
          convidados: string | null
          created_at: string
          data: string
          demanda_id: string | null
          demandas: number
          description: string | null
          dia_inteiro: boolean
          emenda_id: string | null
          endereco: string | null
          estado: string | null
          hora: string
          hora_fim: string | null
          id: string
          impacto_politico: string
          lembrete_enviado: boolean
          liderancas: number
          local_nome: string | null
          notas: string | null
          notificado: boolean
          participantes_liderancas: string[] | null
          prioridade: string
          secretario_responsavel: string | null
          status: string
          tenant_id: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade: string
          convidados?: string | null
          created_at?: string
          data: string
          demanda_id?: string | null
          demandas?: number
          description?: string | null
          dia_inteiro?: boolean
          emenda_id?: string | null
          endereco?: string | null
          estado?: string | null
          hora: string
          hora_fim?: string | null
          id?: string
          impacto_politico?: string
          lembrete_enviado?: boolean
          liderancas?: number
          local_nome?: string | null
          notas?: string | null
          notificado?: boolean
          participantes_liderancas?: string[] | null
          prioridade?: string
          secretario_responsavel?: string | null
          status?: string
          tenant_id?: string | null
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string
          convidados?: string | null
          created_at?: string
          data?: string
          demanda_id?: string | null
          demandas?: number
          description?: string | null
          dia_inteiro?: boolean
          emenda_id?: string | null
          endereco?: string | null
          estado?: string | null
          hora?: string
          hora_fim?: string | null
          id?: string
          impacto_politico?: string
          lembrete_enviado?: boolean
          liderancas?: number
          local_nome?: string | null
          notas?: string | null
          notificado?: boolean
          participantes_liderancas?: string[] | null
          prioridade?: string
          secretario_responsavel?: string | null
          status?: string
          tenant_id?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_emenda_id_fkey"
            columns: ["emenda_id"]
            isOneToOne: false
            referencedRelation: "emendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leadership_notes: {
        Row: {
          author: string
          created_at: string
          id: string
          is_pinned: boolean
          lideranca_name: string
          tag: Database["public"]["Enums"]["note_tag"] | null
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leadership_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          classificacao_manual: string | null
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
          tenant_id: string | null
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
          classificacao_manual?: string | null
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
          tenant_id?: string | null
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
          classificacao_manual?: string | null
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
          tenant_id?: string | null
          tipo?: string
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liderancas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mobilizacao_destinatarios: {
        Row: {
          chat_id: number | null
          cidade: string | null
          created_at: string
          enviado_at: string | null
          id: string
          lideranca_name: string
          mobilizacao_id: string
          telegram_enviado: boolean
          tenant_id: string
        }
        Insert: {
          chat_id?: number | null
          cidade?: string | null
          created_at?: string
          enviado_at?: string | null
          id?: string
          lideranca_name: string
          mobilizacao_id: string
          telegram_enviado?: boolean
          tenant_id: string
        }
        Update: {
          chat_id?: number | null
          cidade?: string | null
          created_at?: string
          enviado_at?: string | null
          id?: string
          lideranca_name?: string
          mobilizacao_id?: string
          telegram_enviado?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobilizacao_destinatarios_mobilizacao_id_fkey"
            columns: ["mobilizacao_id"]
            isOneToOne: false
            referencedRelation: "mobilizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobilizacao_destinatarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mobilizacoes: {
        Row: {
          agendado_para: string | null
          created_at: string
          criado_por: string
          enviado_por: string | null
          id: string
          link: string
          mensagem: string
          segmentacao_tipo: string
          segmentacao_valor: string[] | null
          status: string
          tenant_id: string
          tipo: string
          titulo: string
          total_enviado: number
          updated_at: string
        }
        Insert: {
          agendado_para?: string | null
          created_at?: string
          criado_por?: string
          enviado_por?: string | null
          id?: string
          link: string
          mensagem: string
          segmentacao_tipo?: string
          segmentacao_valor?: string[] | null
          status?: string
          tenant_id: string
          tipo?: string
          titulo: string
          total_enviado?: number
          updated_at?: string
        }
        Update: {
          agendado_para?: string | null
          created_at?: string
          criado_por?: string
          enviado_por?: string | null
          id?: string
          link?: string
          mensagem?: string
          segmentacao_tipo?: string
          segmentacao_valor?: string[] | null
          status?: string
          tenant_id?: string
          tipo?: string
          titulo?: string
          total_enviado?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobilizacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cities: string[] | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          lideranca_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cities?: string[] | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          lideranca_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cities?: string[] | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          lideranca_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_lideranca_id_fkey"
            columns: ["lideranca_id"]
            isOneToOne: false
            referencedRelation: "liderancas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proposicao_tramitacoes: {
        Row: {
          created_at: string
          data_hora: string | null
          descricao_tramitacao: string | null
          despacho: string | null
          id: string
          proposicao_id: string
          sequencia: number | null
          sigla_orgao: string | null
          situacao: string | null
          tenant_id: string | null
          url: string | null
        }
        Insert: {
          created_at?: string
          data_hora?: string | null
          descricao_tramitacao?: string | null
          despacho?: string | null
          id?: string
          proposicao_id: string
          sequencia?: number | null
          sigla_orgao?: string | null
          situacao?: string | null
          tenant_id?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string
          data_hora?: string | null
          descricao_tramitacao?: string | null
          despacho?: string | null
          id?: string
          proposicao_id?: string
          sequencia?: number | null
          sigla_orgao?: string | null
          situacao?: string | null
          tenant_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposicao_tramitacoes_proposicao_id_fkey"
            columns: ["proposicao_id"]
            isOneToOne: false
            referencedRelation: "proposicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposicao_tramitacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      proposicoes: {
        Row: {
          adicionado_kanban: boolean | null
          ano: number
          autor: string | null
          camara_id: number
          created_at: string
          demanda_id: string | null
          ementa: string | null
          id: string
          numero: number
          status_proposicao: string | null
          tema: string | null
          tenant_id: string | null
          tipo: string
          ultima_atualizacao: string | null
          updated_at: string
          url_inteiro_teor: string | null
        }
        Insert: {
          adicionado_kanban?: boolean | null
          ano: number
          autor?: string | null
          camara_id: number
          created_at?: string
          demanda_id?: string | null
          ementa?: string | null
          id?: string
          numero: number
          status_proposicao?: string | null
          tema?: string | null
          tenant_id?: string | null
          tipo: string
          ultima_atualizacao?: string | null
          updated_at?: string
          url_inteiro_teor?: string | null
        }
        Update: {
          adicionado_kanban?: boolean | null
          ano?: number
          autor?: string | null
          camara_id?: number
          created_at?: string
          demanda_id?: string | null
          ementa?: string | null
          id?: string
          numero?: number
          status_proposicao?: string | null
          tema?: string | null
          tenant_id?: string | null
          tipo?: string
          ultima_atualizacao?: string | null
          updated_at?: string
          url_inteiro_teor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposicoes_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposicoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          text?: string | null
          update_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_stream_config: {
        Row: {
          created_at: string
          id: string
          status: string
          stream_type: string
          stream_url: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          stream_type?: string
          stream_url?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          stream_type?: string
          stream_url?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_stream_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ano_eleicao: number
          camara_deputado_id: number | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_estado: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          estado: string | null
          foto_url: string | null
          id: string
          nome: string
          nome_parlamentar: string | null
          nr_candidato_tse: string | null
          partido: string | null
          status: string
          telefone: string | null
          telegram_bot_token: string | null
          telegram_bot_username: string | null
          updated_at: string
        }
        Insert: {
          ano_eleicao?: number
          camara_deputado_id?: number | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          nome_parlamentar?: string | null
          nr_candidato_tse?: string | null
          partido?: string | null
          status?: string
          telefone?: string | null
          telegram_bot_token?: string | null
          telegram_bot_username?: string | null
          updated_at?: string
        }
        Update: {
          ano_eleicao?: number
          camara_deputado_id?: number | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          estado?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          nome_parlamentar?: string | null
          nr_candidato_tse?: string | null
          partido?: string | null
          status?: string
          telefone?: string | null
          telegram_bot_token?: string | null
          telegram_bot_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "deputado"
        | "chefe_gabinete"
        | "secretario"
        | "lideranca"
        | "super_admin"
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
      app_role: [
        "deputado",
        "chefe_gabinete",
        "secretario",
        "lideranca",
        "super_admin",
      ],
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
