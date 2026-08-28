export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LocationType =
  | "refrigerator"
  | "freezer"
  | "vegetable_room"
  | "pantry"
  | "other";

export type ChannelType = "physical_store" | "online" | "subscription";

export type RoleType = "owner" | "admin" | "member";

export type PhotoAnalysisStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type InventoryLogReason =
  | "manual_adjustment"
  | "photo_analysis"
  | "purchase"
  | "consumption"
  | "expired"
  | "other";

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          household_id: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: RoleType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          household_id?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: RoleType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: RoleType;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };
      items: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          category: string;
          location: LocationType;
          current_quantity: number;
          unit: string;
          min_quantity: number;
          consumption_step: number;
          package_quantity: number;
          track_expiry: boolean;
          track_opened: boolean;
          opened_shelf_life_days: number | null;
          expiry_date: string | null;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          category?: string;
          location?: LocationType;
          current_quantity?: number;
          unit?: string;
          min_quantity?: number;
          consumption_step?: number;
          package_quantity?: number;
          track_expiry?: boolean;
          track_opened?: boolean;
          opened_shelf_life_days?: number | null;
          expiry_date?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          category?: string;
          location?: LocationType;
          current_quantity?: number;
          unit?: string;
          min_quantity?: number;
          consumption_step?: number;
          package_quantity?: number;
          track_expiry?: boolean;
          track_opened?: boolean;
          opened_shelf_life_days?: number | null;
          expiry_date?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };
      item_batches: {
        Row: {
          id: string;
          item_id: string;
          quantity: number;
          expiry_date: string | null;
          opened_at: string | null;
          purchased_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          quantity?: number;
          expiry_date?: string | null;
          opened_at?: string | null;
          purchased_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          quantity?: number;
          expiry_date?: string | null;
          opened_at?: string | null;
          purchased_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_batches_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          }
        ];
      };
      item_procurement_channels: {
        Row: {
          id: string;
          item_id: string;
          channel_type: ChannelType;
          provider_name: string;
          url: string | null;
          unit_price: number | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          channel_type: ChannelType;
          provider_name: string;
          url?: string | null;
          unit_price?: number | null;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          channel_type?: ChannelType;
          provider_name?: string;
          url?: string | null;
          unit_price?: number | null;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_procurement_channels_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          }
        ];
      };
      item_reference_images: {
        Row: {
          id: string;
          item_id: string;
          storage_path: string;
          label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          storage_path: string;
          label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          storage_path?: string;
          label?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_reference_images_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "items";
            referencedColumns: ["id"];
          }
        ];
      };
      shopping_list_items: {
        Row: {
          id: string;
          household_id: string;
          item_id: string | null;
          name: string;
          quantity: number;
          unit: string;
          is_purchased: boolean;
          assigned_user_id: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          item_id?: string | null;
          name: string;
          quantity?: number;
          unit?: string;
          is_purchased?: boolean;
          assigned_user_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          item_id?: string | null;
          name?: string;
          quantity?: number;
          unit?: string;
          is_purchased?: boolean;
          assigned_user_id?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };
      photo_analyses: {
        Row: {
          id: string;
          household_id: string;
          storage_path: string;
          status: PhotoAnalysisStatus;
          analysis_result: Json | null;
          model_used: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          storage_path: string;
          status?: PhotoAnalysisStatus;
          analysis_result?: Json | null;
          model_used?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          storage_path?: string;
          status?: PhotoAnalysisStatus;
          analysis_result?: Json | null;
          model_used?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photo_analyses_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };
      inventory_logs: {
        Row: {
          id: string;
          household_id: string;
          item_id: string | null;
          change_amount: number;
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          item_id?: string | null;
          change_amount: number;
          reason: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          item_id?: string | null;
          change_amount?: number;
          reason?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_logs_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_current_user_household_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
