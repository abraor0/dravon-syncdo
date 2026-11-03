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
      tasks: {
        Row: {
          id: number
          title: string
          description: string | null
          status: string
          priority: string
          // Email of the owning user
          assignee: string
          created_at: string
          completed_at: string | null
          // Email of the user who completed the task
          completed_by: string | null
        }
        Insert: {
          id?: never
          title: string
          description?: string | null
          status?: string
          priority?: string
          assignee: string
          created_at?: string
          completed_at?: string | null
          completed_by?: string | null
        }
        Update: {
          id?: never
          title?: string
          description?: string | null
          status?: string
          priority?: string
          assignee?: string
          created_at?: string
          completed_at?: string | null
          completed_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          name: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
