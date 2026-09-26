// Types partagés, alignés sur le schéma supabase/migrations/0001_init.sql

export type WaterType = 'freshwater' | 'saltwater' | 'brackish';
export type CyclingStatus = 'not_started' | 'cycling' | 'cycled';

export interface Tank {
  id: string;
  user_id: string;
  name: string;
  water_type: WaterType;
  volume_liters: number;
  is_planted: boolean;
  setup_date: string | null; // date de mise en eau
  cycling_status: CyclingStatus;
  conditioner_dose_ml_per_100l: number | null;
  notes: string | null;
  cover_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CyclingDose {
  id: string;
  tank_id: string;
  user_id: string;
  dosed_at: string;
  ammonia_ppm_target: number | null;
  note: string | null;
  created_at: string;
}

export interface WaterTest {
  id: string;
  tank_id: string;
  user_id: string;
  tested_at: string;
  ph: number | null;
  ammonia_ppm: number | null;
  nitrite_ppm: number | null;
  nitrate_ppm: number | null;
  gh_dgh: number | null;
  kh_dkh: number | null;
  temperature_c: number | null;
  salinity_sg: number | null;
  phosphate_ppm: number | null;
  source: 'manual' | 'photo_ai';
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export type LivestockCategory = 'fish' | 'invertebrate' | 'plant' | 'coral';

export interface Livestock {
  id: string;
  tank_id: string;
  user_id: string;
  category: LivestockCategory;
  species_common_name: string;
  species_scientific_name: string | null;
  quantity: number;
  sex: 'male' | 'female' | 'unknown' | 'mixed' | null;
  adult_size_cm: number | null;
  bioload_factor: number;
  temperament: string | null;
  min_tank_liters: number | null;
  added_at: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export type MaintenanceTaskType =
  | 'water_change'
  | 'filter_clean'
  | 'glass_clean'
  | 'dosing'
  | 'feeding'
  | 'equipment_check'
  | 'other';

export interface MaintenanceLog {
  id: string;
  tank_id: string;
  user_id: string;
  task_type: MaintenanceTaskType;
  description: string | null;
  percentage_changed: number | null;
  conditioner_ml: number | null;
  performed_at: string;
  next_due_at: string | null;
  created_at: string;
}

export interface AiConversation {
  id: string;
  tank_id: string | null;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  image_url: string | null;
  created_at: string;
}

export type DiagnosticSeverity = 'low' | 'medium' | 'high' | 'urgent';

export interface AiDiagnostic {
  id: string;
  tank_id: string;
  user_id: string;
  input_type: 'photo' | 'text' | 'both';
  input_description: string | null;
  photo_url: string | null;
  likely_condition: string;
  confidence: number;
  severity: DiagnosticSeverity;
  recommended_actions: string[];
  vet_referral: boolean;
  raw_ai_response: unknown;
  created_at: string;
}

// Le client Supabase n'est volontairement pas branché sur un generic
// Database strict (voir src/lib/supabase/client.ts) : les résultats de
// requêtes sont castés manuellement vers ces types côté composants.
