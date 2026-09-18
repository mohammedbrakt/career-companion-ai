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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_states: {
        Row: {
          context: Json
          next_action: Json | null
          state: Database["public"]["Enums"]["agent_state"]
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: Json
          next_action?: Json | null
          state?: Database["public"]["Enums"]["agent_state"]
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: Json
          next_action?: Json | null
          state?: Database["public"]["Enums"]["agent_state"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          completion_tokens: number
          cost_usd: number | null
          created_at: string
          error: string | null
          id: string
          latency_ms: number | null
          model: string
          prompt_tokens: number
          purpose: string
          status: string
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model: string
          prompt_tokens?: number
          purpose: string
          status?: string
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number
          cost_usd?: number | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model?: string
          prompt_tokens?: number
          purpose?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          id: string
          name: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      application_events: {
        Row: {
          actor: Database["public"]["Enums"]["event_actor"]
          application_id: string
          description: string | null
          event_type: string
          id: string
          metadata: Json
          occurred_at: string
          user_id: string
        }
        Insert: {
          actor?: Database["public"]["Enums"]["event_actor"]
          application_id: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          user_id: string
        }
        Update: {
          actor?: Database["public"]["Enums"]["event_actor"]
          application_id?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          answers: Json
          applied_at: string | null
          closed_reason:
            | Database["public"]["Enums"]["application_closed_reason"]
            | null
          cover_letter: string | null
          created_at: string
          cv_version_id: string | null
          deleted_at: string | null
          employer_contact: Json | null
          id: string
          job_id: string
          match_id: string | null
          mode: Database["public"]["Enums"]["application_mode"]
          next_follow_up_at: string | null
          notes: string | null
          stage: Database["public"]["Enums"]["application_stage"]
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          applied_at?: string | null
          closed_reason?:
            | Database["public"]["Enums"]["application_closed_reason"]
            | null
          cover_letter?: string | null
          created_at?: string
          cv_version_id?: string | null
          deleted_at?: string | null
          employer_contact?: Json | null
          id?: string
          job_id: string
          match_id?: string | null
          mode?: Database["public"]["Enums"]["application_mode"]
          next_follow_up_at?: string | null
          notes?: string | null
          stage?: Database["public"]["Enums"]["application_stage"]
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          applied_at?: string | null
          closed_reason?:
            | Database["public"]["Enums"]["application_closed_reason"]
            | null
          cover_letter?: string | null
          created_at?: string
          cv_version_id?: string | null
          deleted_at?: string | null
          employer_contact?: Json | null
          id?: string
          job_id?: string
          match_id?: string | null
          mode?: Database["public"]["Enums"]["application_mode"]
          next_follow_up_at?: string | null
          notes?: string | null
          stage?: Database["public"]["Enums"]["application_stage"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_cv_version_id_fkey"
            columns: ["cv_version_id"]
            isOneToOne: false
            referencedRelation: "cv_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "user_job_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      career_memory: {
        Row: {
          confidence: number
          created_at: string
          id: string
          key: string
          kind: Database["public"]["Enums"]["memory_kind"]
          source: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          key: string
          kind: Database["public"]["Enums"]["memory_kind"]
          source?: string
          updated_at?: string
          user_id: string
          value: Json
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          key?: string
          kind?: Database["public"]["Enums"]["memory_kind"]
          source?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      career_preferences: {
        Row: {
          application_permission: Database["public"]["Enums"]["application_permission"]
          company_sizes: string[]
          employment_types: Database["public"]["Enums"]["employment_type"][]
          match_threshold: number
          notification_prefs: Json
          relocation_willing: boolean | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          target_cities: string[]
          target_countries: string[]
          target_industries: string[]
          travel_willing: boolean | null
          updated_at: string
          user_id: string
          work_arrangements: Database["public"]["Enums"]["work_arrangement"][]
        }
        Insert: {
          application_permission?: Database["public"]["Enums"]["application_permission"]
          company_sizes?: string[]
          employment_types?: Database["public"]["Enums"]["employment_type"][]
          match_threshold?: number
          notification_prefs?: Json
          relocation_willing?: boolean | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          target_cities?: string[]
          target_countries?: string[]
          target_industries?: string[]
          travel_willing?: boolean | null
          updated_at?: string
          user_id: string
          work_arrangements?: Database["public"]["Enums"]["work_arrangement"][]
        }
        Update: {
          application_permission?: Database["public"]["Enums"]["application_permission"]
          company_sizes?: string[]
          employment_types?: Database["public"]["Enums"]["employment_type"][]
          match_threshold?: number
          notification_prefs?: Json
          relocation_willing?: boolean | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          target_cities?: string[]
          target_countries?: string[]
          target_industries?: string[]
          travel_willing?: boolean | null
          updated_at?: string
          user_id?: string
          work_arrangements?: Database["public"]["Enums"]["work_arrangement"][]
        }
        Relationships: []
      }
      career_targets: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["target_role_kind"]
          rationale: string | null
          source: string
          status: Database["public"]["Enums"]["target_role_status"]
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["target_role_kind"]
          rationale?: string | null
          source?: string
          status?: Database["public"]["Enums"]["target_role_status"]
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["target_role_kind"]
          rationale?: string | null
          source?: string
          status?: Database["public"]["Enums"]["target_role_status"]
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          job_id: string | null
          kind: Database["public"]["Enums"]["conversation_kind"]
          last_message_at: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_versions: {
        Row: {
          analysis: Json | null
          content: Json | null
          created_at: string
          created_by: string
          cv_id: string
          file_path: string | null
          file_type: string | null
          id: string
          label: string | null
          parsed_data: Json | null
          user_id: string
          version_no: number
        }
        Insert: {
          analysis?: Json | null
          content?: Json | null
          created_at?: string
          created_by?: string
          cv_id: string
          file_path?: string | null
          file_type?: string | null
          id?: string
          label?: string | null
          parsed_data?: Json | null
          user_id: string
          version_no?: number
        }
        Update: {
          analysis?: Json | null
          content?: Json | null
          created_at?: string
          created_by?: string
          cv_id?: string
          file_path?: string | null
          file_type?: string | null
          id?: string
          label?: string | null
          parsed_data?: Json | null
          user_id?: string
          version_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "cv_versions_cv_id_fkey"
            columns: ["cv_id"]
            isOneToOne: false
            referencedRelation: "cvs"
            referencedColumns: ["id"]
          },
        ]
      }
      cvs: {
        Row: {
          created_at: string
          current_version_id: string | null
          deleted_at: string | null
          id: string
          job_id: string | null
          kind: Database["public"]["Enums"]["cv_kind"]
          template: Database["public"]["Enums"]["cv_template"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_version_id?: string | null
          deleted_at?: string | null
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["cv_kind"]
          template?: Database["public"]["Enums"]["cv_template"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_version_id?: string | null
          deleted_at?: string | null
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["cv_kind"]
          template?: Database["public"]["Enums"]["cv_template"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cvs_current_version_fk"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "cv_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cvs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_events: {
        Row: {
          created_at: string
          details: Json
          id: string
          job_id: string | null
          kind: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          job_id?: string | null
          kind: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          job_id?: string | null
          kind?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_jobs: {
        Row: {
          created_at: string
          job_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hidden_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          application_id: string
          created_at: string
          id: string
          kind: string | null
          location: string | null
          notes: string | null
          outcome: string | null
          prep: Json | null
          scheduled_at: string | null
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          kind?: string | null
          location?: string | null
          notes?: string | null
          outcome?: string | null
          prep?: Json | null
          scheduled_at?: string | null
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          kind?: string | null
          location?: string | null
          notes?: string | null
          outcome?: string | null
          prep?: Json | null
          scheduled_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_collectors: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          kind: string
          last_run_at: string | null
          last_status: string | null
          name: string
          stats: Json
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          last_run_at?: string | null
          last_status?: string | null
          name: string
          stats?: Json
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          last_run_at?: string | null
          last_status?: string | null
          name?: string
          stats?: Json
        }
        Relationships: []
      }
      job_skills: {
        Row: {
          id: string
          job_id: string
          name: string
          normalized_name: string | null
          required: boolean
        }
        Insert: {
          id?: string
          job_id: string
          name: string
          normalized_name?: string | null
          required?: boolean
        }
        Update: {
          id?: string
          job_id?: string
          name?: string
          normalized_name?: string | null
          required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "job_skills_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_sources: {
        Row: {
          collector_id: string | null
          external_ref: string | null
          first_seen_at: string
          id: string
          job_id: string
          last_seen_at: string
          source_name: string
          source_url: string | null
        }
        Insert: {
          collector_id?: string | null
          external_ref?: string | null
          first_seen_at?: string
          id?: string
          job_id: string
          last_seen_at?: string
          source_name: string
          source_url?: string | null
        }
        Update: {
          collector_id?: string | null
          external_ref?: string | null
          first_seen_at?: string
          id?: string
          job_id?: string
          last_seen_at?: string
          source_name?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_sources_collector_id_fkey"
            columns: ["collector_id"]
            isOneToOne: false
            referencedRelation: "job_collectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_sources_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          ai_summary: Json | null
          application_url: string | null
          city: string | null
          company: string
          company_logo_url: string | null
          country: string | null
          created_at: string
          description: string | null
          education_requirements: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          expires_at: string | null
          fingerprint: string | null
          id: string
          industry: string | null
          languages_required: string[]
          last_verified_at: string | null
          max_years_experience: number | null
          min_years_experience: number | null
          normalized_title: string | null
          posted_at: string | null
          preferred_skills: string[]
          raw: Json | null
          remote_eligible_countries: string[]
          required_skills: string[]
          responsibilities: string[]
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          salary_period: string | null
          seniority: Database["public"]["Enums"]["seniority_level"] | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          visa_sponsorship: boolean | null
          work_arrangement:
            | Database["public"]["Enums"]["work_arrangement"]
            | null
        }
        Insert: {
          ai_summary?: Json | null
          application_url?: string | null
          city?: string | null
          company: string
          company_logo_url?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          education_requirements?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          expires_at?: string | null
          fingerprint?: string | null
          id?: string
          industry?: string | null
          languages_required?: string[]
          last_verified_at?: string | null
          max_years_experience?: number | null
          min_years_experience?: number | null
          normalized_title?: string | null
          posted_at?: string | null
          preferred_skills?: string[]
          raw?: Json | null
          remote_eligible_countries?: string[]
          required_skills?: string[]
          responsibilities?: string[]
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
          visa_sponsorship?: boolean | null
          work_arrangement?:
            | Database["public"]["Enums"]["work_arrangement"]
            | null
        }
        Update: {
          ai_summary?: Json | null
          application_url?: string | null
          city?: string | null
          company?: string
          company_logo_url?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          education_requirements?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          expires_at?: string | null
          fingerprint?: string | null
          id?: string
          industry?: string | null
          languages_required?: string[]
          last_verified_at?: string | null
          max_years_experience?: number | null
          min_years_experience?: number | null
          normalized_title?: string | null
          posted_at?: string | null
          preferred_skills?: string[]
          raw?: Json | null
          remote_eligible_countries?: string[]
          required_skills?: string[]
          responsibilities?: string[]
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          salary_period?: string | null
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          visa_sponsorship?: boolean | null
          work_arrangement?:
            | Database["public"]["Enums"]["work_arrangement"]
            | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          client_message_id: string | null
          conversation_id: string
          created_at: string
          id: string
          parts: Json
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Insert: {
          client_message_id?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          parts?: Json
          role: Database["public"]["Enums"]["message_role"]
          user_id: string
        }
        Update: {
          client_message_id?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          parts?: Json
          role?: Database["public"]["Enums"]["message_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_prices: {
        Row: {
          amount: number
          billing_interval: string
          country: string
          currency: string
          id: string
          is_active: boolean
          plan_id: string
        }
        Insert: {
          amount: number
          billing_interval?: string
          country?: string
          currency: string
          id?: string
          is_active?: boolean
          plan_id: string
        }
        Update: {
          amount?: number
          billing_interval?: string
          country?: string
          currency?: string
          id?: string
          is_active?: boolean
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          certifications: Json
          city: string | null
          country: string | null
          created_at: string
          current_title: string | null
          deleted_at: string | null
          education: Json
          email: string | null
          full_name: string | null
          headline: string | null
          industries: string[]
          languages: Json
          locale: string
          onboarding_completed: boolean
          phone: string | null
          profile_strength: number
          seniority: Database["public"]["Enums"]["seniority_level"] | null
          track: Database["public"]["Enums"]["career_track"] | null
          updated_at: string
          user_id: string
          work_history: Json
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          certifications?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          current_title?: string | null
          deleted_at?: string | null
          education?: Json
          email?: string | null
          full_name?: string | null
          headline?: string | null
          industries?: string[]
          languages?: Json
          locale?: string
          onboarding_completed?: boolean
          phone?: string | null
          profile_strength?: number
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          track?: Database["public"]["Enums"]["career_track"] | null
          updated_at?: string
          user_id: string
          work_history?: Json
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          certifications?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          current_title?: string | null
          deleted_at?: string | null
          education?: Json
          email?: string | null
          full_name?: string | null
          headline?: string | null
          industries?: string[]
          languages?: Json
          locale?: string
          onboarding_completed?: boolean
          phone?: string | null
          profile_strength?: number
          seniority?: Database["public"]["Enums"]["seniority_level"] | null
          track?: Database["public"]["Enums"]["career_track"] | null
          updated_at?: string
          user_id?: string
          work_history?: Json
          years_experience?: number | null
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          code: string
          created_at: string
          description: Json
          features: Json
          id: string
          is_active: boolean
          limits: Json
          name: Json
          sort_order: number
          tier: Database["public"]["Enums"]["plan_tier"]
          trial_days: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: Json
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name?: Json
          sort_order?: number
          tier: Database["public"]["Enums"]["plan_tier"]
          trial_days?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: Json
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name?: Json
          sort_order?: number
          tier?: Database["public"]["Enums"]["plan_tier"]
          trial_days?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          country: string | null
          created_at: string
          currency: string | null
          ends_at: string | null
          id: string
          plan_id: string | null
          provider: string | null
          provider_ref: string | null
          renews_at: string | null
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          ends_at?: string | null
          id?: string
          plan_id?: string | null
          provider?: string | null
          provider_ref?: string | null
          renews_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          ends_at?: string | null
          id?: string
          plan_id?: string | null
          provider?: string | null
          provider_ref?: string | null
          renews_at?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          area: string
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json
        }
        Insert: {
          area: string
          created_at?: string
          id?: string
          level?: string
          message: string
          metadata?: Json
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          feature: string
          id: string
          period_key: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feature: string
          id?: string
          period_key: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feature?: string
          id?: string
          period_key?: string
          quantity?: number
          user_id?: string
        }
        Relationships: []
      }
      user_job_matches: {
        Row: {
          breakdown: Json
          computed_at: string
          eligible: boolean
          gaps: string[]
          id: string
          ineligibility_reasons: string[]
          job_id: string
          recommendation: string | null
          recommended_for: string | null
          score: number
          status: Database["public"]["Enums"]["match_status"]
          strengths: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          breakdown?: Json
          computed_at?: string
          eligible?: boolean
          gaps?: string[]
          id?: string
          ineligibility_reasons?: string[]
          job_id: string
          recommendation?: string | null
          recommended_for?: string | null
          score: number
          status?: Database["public"]["Enums"]["match_status"]
          strengths?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          breakdown?: Json
          computed_at?: string
          eligible?: boolean
          gaps?: string[]
          id?: string
          ineligibility_reasons?: string[]
          job_id?: string
          recommendation?: string | null
          recommended_for?: string | null
          score?: number
          status?: Database["public"]["Enums"]["match_status"]
          strengths?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_job_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          category: string | null
          created_at: string
          id: string
          level: string | null
          name: string
          normalized_name: string | null
          source: string
          user_id: string
          years: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          level?: string | null
          name: string
          normalized_name?: string | null
          source?: string
          user_id: string
          years?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          level?: string | null
          name?: string
          normalized_name?: string | null
          source?: string
          user_id?: string
          years?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      agent_state:
        | "NEW_USER"
        | "ONBOARDING"
        | "WAITING_FOR_CV"
        | "CV_ANALYSIS"
        | "PROFILE_REVIEW"
        | "READY_TO_SEARCH"
        | "JOB_DISCOVERY"
        | "JOB_REVIEW"
        | "JOB_INTERESTED"
        | "CV_TAILORING"
        | "APPLICATION_READY"
        | "APPLICATION_PROCESS"
        | "INTERVIEW_PREP"
      app_role: "admin" | "moderator" | "user"
      application_closed_reason:
        | "rejected"
        | "withdrawn"
        | "job_closed"
        | "user_declined"
      application_mode: "direct" | "autofill" | "assisted"
      application_permission: "approval_required" | "trusted_auto"
      application_stage:
        | "found"
        | "interested"
        | "approved"
        | "applied"
        | "viewed"
        | "interview"
        | "offer"
        | "closed"
      career_track: "experienced" | "fresh_graduate"
      conversation_kind: "general" | "onboarding" | "job" | "interview" | "cv"
      cv_kind: "master" | "tailored"
      cv_template: "professional" | "modern" | "fresh_graduate"
      employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "internship"
        | "temporary"
        | "freelance"
      event_actor: "agent" | "user" | "employer" | "system"
      job_status:
        | "active"
        | "possibly_active"
        | "expired"
        | "removed"
        | "unknown"
      match_status: "new" | "viewed" | "interested" | "skipped" | "hidden"
      memory_kind: "fact" | "preference" | "behavior"
      message_role: "user" | "assistant" | "system" | "tool"
      plan_tier: "free_trial" | "basic" | "pro" | "premium"
      seniority_level:
        | "intern"
        | "junior"
        | "mid"
        | "senior"
        | "lead"
        | "manager"
        | "director"
        | "executive"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "cancelled"
        | "expired"
      target_role_kind: "primary" | "secondary"
      target_role_status: "suggested" | "approved" | "removed"
      work_arrangement: "remote" | "hybrid" | "onsite"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      agent_state: [
        "NEW_USER",
        "ONBOARDING",
        "WAITING_FOR_CV",
        "CV_ANALYSIS",
        "PROFILE_REVIEW",
        "READY_TO_SEARCH",
        "JOB_DISCOVERY",
        "JOB_REVIEW",
        "JOB_INTERESTED",
        "CV_TAILORING",
        "APPLICATION_READY",
        "APPLICATION_PROCESS",
        "INTERVIEW_PREP",
      ],
      app_role: ["admin", "moderator", "user"],
      application_closed_reason: [
        "rejected",
        "withdrawn",
        "job_closed",
        "user_declined",
      ],
      application_mode: ["direct", "autofill", "assisted"],
      application_permission: ["approval_required", "trusted_auto"],
      application_stage: [
        "found",
        "interested",
        "approved",
        "applied",
        "viewed",
        "interview",
        "offer",
        "closed",
      ],
      career_track: ["experienced", "fresh_graduate"],
      conversation_kind: ["general", "onboarding", "job", "interview", "cv"],
      cv_kind: ["master", "tailored"],
      cv_template: ["professional", "modern", "fresh_graduate"],
      employment_type: [
        "full_time",
        "part_time",
        "contract",
        "internship",
        "temporary",
        "freelance",
      ],
      event_actor: ["agent", "user", "employer", "system"],
      job_status: [
        "active",
        "possibly_active",
        "expired",
        "removed",
        "unknown",
      ],
      match_status: ["new", "viewed", "interested", "skipped", "hidden"],
      memory_kind: ["fact", "preference", "behavior"],
      message_role: ["user", "assistant", "system", "tool"],
      plan_tier: ["free_trial", "basic", "pro", "premium"],
      seniority_level: [
        "intern",
        "junior",
        "mid",
        "senior",
        "lead",
        "manager",
        "director",
        "executive",
      ],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "cancelled",
        "expired",
      ],
      target_role_kind: ["primary", "secondary"],
      target_role_status: ["suggested", "approved", "removed"],
      work_arrangement: ["remote", "hybrid", "onsite"],
    },
  },
} as const
