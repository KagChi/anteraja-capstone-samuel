export type Role = "courier" | "admin";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface Session {
  role: Role;
  name: string;
  at: number;
}

export interface AsyncResource<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  reload: () => void;
}

export interface Province {
  id: string;
  name: string;
}

export interface Regency {
  id: string;
  province_id: string;
  name: string;
}

export interface PostalResult {
  code: number;
  village: string;
  district: string;
  regency: string;
  province: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
}

export type ServiceSegment = "instant" | "sameday" | "regular";

export type TaskCategory = "instant" | "sameday";

export interface TaskBadge {
  label: string;
  tone: "service-instant" | "service-sameday" | "pill" | "note" | "pin";
}

export interface TaskGeofence {
  distanceMeters: number;
  deviationMeters: number;
  radiusMeters: number;
  point: string;
}

export interface DeliveryTask {
  tracking: string;
  category: TaskCategory;
  recipient: string;
  address: string;
  distance: string;
  eta: string;
  badges: TaskBadge[];
  footerNote?: string;
  cta?: string;
  destination?: DestinationPoint;
  geofence?: TaskGeofence;
}

export interface DestinationPoint {
  latitude: number;
  longitude: number;
  label: string;
}

export interface PinIssue {
  status: string;
  expires_at?: string | null;
  attempts: number;
  max_attempts: number;
  debug_code?: string;
}

export interface PinVerifyResult {
  verified: boolean;
  status: string;
  attempts: number;
  max_attempts: number;
}

export interface DeliveryProofResult {
  id: string;
  review_status: string;
  distance_to_destination_m: number;
  photo_path?: string | null;
  captured_at?: string | null;
  watermark_hash?: string | null;
}

export interface DeliveryCompletionResult {
  status: string;
  distance_m: number;
  inside: boolean;
  exception_used: boolean;
  pin_required: boolean;
}

export type DeliveryFlag = "review" | "delivered" | "exception";

export type StatusTone = "amber" | "emerald" | "orange";

export interface DeliveryRow {
  id: string;
  courierName: string;
  courierCode: string;
  tracking: string;
  service: ServiceSegment;
  flag: DeliveryFlag;
  statusLabel: string;
  statusTone: StatusTone;
  region: "jaksel" | "jakpus";
  regionLabel: string;
  regencyId?: string;
  recipient?: string;
  address?: string;
  href: string;
  highlight?: boolean;
}

export interface ExceptionRow {
  id: string;
  courierName: string;
  courierCode: string;
  tracking: string;
  service: ServiceSegment;
  deviation: number;
  maxTolerance: number;
  reason: string;
  status: string;
  note?: string | null;
}

export interface RadiusAccent {
  iconBg: string;
  iconText: string;
  slaBg: string;
  slaText: string;
  input: string;
}

export interface RadiusSegment {
  id: string;
  label: string;
  icon: string;
  sla: string;
  description: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  accent: RadiusAccent;
}

export interface Decision {
  decision: "approve" | "reject";
  note: string;
  at: number;
}

export interface SeoConfig {
  title: string;
  description: string;
  jsonLd?: Record<string, unknown>;
}

export interface DashboardSummary {
  total: number;
  reviewCount: number;
  verifiedCount: number;
  shift: string;
}

export interface TimelineStepData {
  label: string;
  time: string;
}

export interface Milestone {
  time: string;
  datetime: string;
  text: string;
  accent: "tertiary" | "magenta" | null;
}

export interface GeofenceInfo {
  target: [number, number];
  courier: [number, number];
  radiusMeters: number;
  deviationMeters: number;
  pointLabel: string;
  analysis: string;
}

export interface PodInfo {
  photoSeed: string;
  capturedTime: string;
  watermark: string;
  recipientName: string;
  relation: string;
  pin: string;
}

export interface ShipmentDetail {
  timeline: TimelineStepData[];
  milestones: Milestone[];
  geofence: GeofenceInfo;
  pod: PodInfo;
  deviationMeters: number;
  maxToleranceMeters: number;
  reason: string;
  completedLabel: string;
}

export interface ExceptionDetail extends ExceptionRow {
  actualDistance: number;
  ticketAt: string;
  ticketIso: string;
  podPoint: string;
  podCapturedAt: string;
  podIso: string;
}

export interface RadiusMeta {
  protocol: string;
  updatedBy: string;
  updatedAtIso: string;
  updatedAtLabel: string;
}
