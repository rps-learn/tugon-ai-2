export type Role = 'citizen' | 'official' | 'bfp' | 'eruf' | 'police'
export type Agency = 'bfp' | 'eruf' | 'police' | 'official'
export type Severity = 'P1' | 'P2' | 'P3' | 'P4'
export type Status =
  | 'submitted' | 'classified' | 'agency_notified' | 'acknowledged' | 'en_route' | 'on_scene' | 'resolved'

export interface Profile { id: string; full_name: string; role: Role }

export interface Incident {
  id: string
  reporter_id: string | null
  anonymous: boolean
  description: string | null
  photo_path: string | null
  lat: number | null
  lng: number | null
  purok: string | null
  in_progress: boolean
  category: string | null
  subcategory: string | null
  primary_agency: Agency | null
  secondary_agency: Agency | null
  severity: Severity | null
  confidence: number | null
  urgency_note: string | null
  needs_review: boolean
  status: Status
  cluster_id: string | null
  resolution_note: string | null
  created_at: string
  acknowledged_at: string | null
  resolved_at: string | null
}

export const CATEGORIES = [
  'fire', 'medical_emergency', 'natural_disaster', 'crime_serious',
  'crime_reported', 'minor_disturbance', 'social_general',
] as const

export const AGENCIES: Agency[] = ['bfp', 'eruf', 'police', 'official']
export const SEVERITIES: Severity[] = ['P1', 'P2', 'P3', 'P4']
export const STATUSES: Status[] = [
  'submitted', 'classified', 'agency_notified', 'acknowledged', 'en_route', 'on_scene', 'resolved',
]

export const AGENCY_LABEL: Record<Agency, string> = {
  bfp: 'BFP', eruf: 'ERUF', police: 'Barangay Police', official: 'Barangay Official',
}

export const CATEGORY_LABEL: Record<string, string> = {
  fire: 'Fire',
  medical_emergency: 'Medical Emergency',
  natural_disaster: 'Natural Disaster',
  crime_serious: 'Crime (Serious)',
  crime_reported: 'Crime (Reported)',
  minor_disturbance: 'Minor Disturbance',
  social_general: 'Social / General',
}

export const SEVERITY_COLOR: Record<Severity, string> = {
  P1: '#c62828', P2: '#ef6c00', P3: '#f9a825', P4: '#607d8b',
}

// Barangays Mambaling and Pardo, Cebu City
export const MAP_CENTER: [number, number] = [10.2800, 123.8620]
