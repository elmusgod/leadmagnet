import {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable
} from 'kysely'

// New UserTable interface
export interface CallLogTable {
  id: Generated<number>
  number: string
  status: ColumnType<string, string | undefined, 'pending'>
  duration: string | null
  agent: number
  records: string | null
  call_sid: string | null
  created_at: ColumnType<string | undefined, never>
  updated_at: ColumnType<string | undefined, string>
}

export type CallLog = Selectable<CallLogTable>
export type NewCallLog = Insertable<CallLogTable>
export type CallLogUpdate = Updateable<CallLogTable>

export interface AgentTable {
  id: Generated<number>
  name: string
  prompt: string
}

export type Agent = Selectable<AgentTable>
export type NewAgent = Insertable<AgentTable>
export type AgentUpdate = Updateable<AgentTable>

export interface LeadTable {
  id: Generated<number>
  agent_id: number
  source: string | null
  type: string | null
  sub_type: string | null
  surface: string | null
  surface_carrez: string | null
  room_count: string | null
  floor_count: string | null
  construction_year: string | null
  new_build: boolean | null
  marketing_type: string | null
  price: string | null
  price_hc: string | null
  price_cc: string | null
  selling_price: string | null
  dealers: string | null
  marketing_start_date: string | null
  marketing_end_date: string | null
  publication_start_date: string | null
  publication_end_date: string | null
  rental_expenses: string | null
  rental_expenses_included: boolean | null
  fees: string | null
  fees_included: boolean | null
  iris_ids: string | null
  street_number: string | null
  street: string | null
  zip_code: string | null
  city: string | null
  lat: string | null
  lon: string | null
  description: string | null
  images: string | null
  ads: string | null
  phone_number: string | null
  floor_level: string | null
  land: boolean | null
  surface_land: string | null
  terrace: boolean | null
  balcony: boolean | null
  cellar: boolean | null
  parking: boolean | null
  swimming_pool: boolean | null
  general_state: string | null
  dpe_letter: string | null
  dpe: string | null
  ges_letter: string | null
  ges: string | null
  diagnosis_date: string | null
  statut: ColumnType<string, string | undefined, 'new'>
  created_at: ColumnType<string | undefined, never>
  updated_at: ColumnType<string | undefined, string>
}

export type Lead = Selectable<LeadTable>
export type NewLead = Insertable<LeadTable>
export type LeadUpdate = Updateable<LeadTable>

export interface Database {
  call_log: CallLogTable;
  agent: AgentTable;
  lead: LeadTable;
}

export interface SystemConfigTable {
  id: Generated<number>
  key: string
  value: string
  created_at: ColumnType<string | undefined, never>
  updated_at: ColumnType<string | undefined, string>
}

export type SystemConfig = Selectable<SystemConfigTable>
export type NewSystemConfig = Insertable<SystemConfigTable>
export type SystemConfigUpdate = Updateable<SystemConfigTable>
