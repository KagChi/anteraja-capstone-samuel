export type { GpsFixWindow, GpsReason } from "./lib/fakeGps";

import type { GpsFixWindow, GpsReason } from "./lib/fakeGps";

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
  center?: [number, number];
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
  exception?: TaskException | null;
  gpsLock?: GpsLockInfo | null;
  pin?: TaskPin | null;
}

export interface TaskPin {
  status: string;
  attempts: number;
  maxAttempts: number;
  locked: boolean;
  verified: boolean;
  override: boolean;
  overrideReason?: string | null;
  lockedAt?: string | null;
  resendCount: number;
  resendLimit: number;
}

export interface GpsLockInfo {
  status: string;
  reason: string;
  requestedTime: string;
  decidedTime?: string | null;
  note?: string | null;
}

export interface TaskException {
  status: string;
  reason: string;
  submittedTime: string;
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
  resend_count?: number;
  resend_limit?: number;
  can_resend?: boolean;
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
  watermark_address?: string | null;
  review_note?: string | null;
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
  id?: string | null;
  photoUrl?: string | null;
  capturedTime: string;
  capturedAtIso?: string | null;
  watermark: string;
  recipientName: string;
  relation: string;
  pin: string;
  pinStatus?: string | null;
  pinVerifiedAt?: string | null;
  distanceMeters?: number | null;
  reviewStatus?: string | null;
  reviewNote?: string | null;
  watermarkHash?: string | null;
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
  case?: ShipmentCase | null;
  gps?: ShipmentGps | null;
}

export interface ShipmentGps {
  status: "clean" | "suspected" | "blocked" | "overridden";
  level?: "clean" | "suspected" | "blocked" | null;
  accuracyM?: number | null;
  reasons: GpsReason[];
  impliedSpeedKmh?: number | null;
  fixWindow?: GpsFixWindow | null;
  clockSkewSeconds?: number | null;
  overrideUsed: boolean;
  lock?: GpsLockInfo | null;
}

export interface GpsLockRow {
  id: string;
  courierName: string;
  courierCode: string;
  tracking?: string | null;
  service: ServiceSegment;
  reason: string;
  reasonLabels: string[];
  level: string;
  accuracyM?: number | null;
  status: string;
  requestedAt: string;
  requestedTime: string;
  note?: string | null;
}

export interface GpsLockDetail extends GpsLockRow {
  reasons: GpsReason[];
  impliedSpeedKmh?: number | null;
  fixWindow?: GpsFixWindow | null;
  clockSkewSeconds?: number | null;
  point?: [number, number] | null;
  pointLabel: string;
  target?: [number, number] | null;
  decidedAt?: string | null;
}

export interface PinLockRow {
  id: string;
  tracking?: string | null;
  courierName: string;
  courierCode: string;
  service: ServiceSegment;
  recipientName: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lockedAt: string;
  lockedTime: string;
  expiresAt: string;
  overrideReason?: string | null;
}

export interface PinLockEvent {
  result: string;
  attempt?: number | null;
  reason?: string | null;
  actor: string;
  at: string;
}

export interface PinLockDetail extends PinLockRow {
  events: PinLockEvent[];
}

export interface CourierHistoryRow {
  id: string;
  tracking: string;
  service: ServiceSegment;
  recipient: string;
  address?: string | null;
  status: string;
  statusLabel: string;
  dateLabel: string;
  distanceMeters?: number | null;
  reviewStatus?: string | null;
}

export interface CourierProfile {
  name: string;
  code: string;
  phone?: string | null;
  email?: string | null;
  active: boolean;
  serviceArea: { code?: string | null; label: string; region: string };
  stats: {
    activeTasks: number;
    deliveredToday: number;
    deliveredTotal: number;
  };
}

export interface ShipmentCase {
  number: string;
  status: string;
  closed: boolean;
  investigating: boolean;
  resolution?: string | null;
  closedAt: string;
}

export interface ExceptionDetail extends ExceptionRow {
  actualDistance: number;
  ticketAt: string;
  ticketIso: string;
  podPoint: string;
  podCapturedAt: string;
  podIso: string;
  podPhotoUrl?: string | null;
  target?: [number, number] | null;
  courierPoint?: [number, number] | null;
}

export interface RadiusMeta {
  protocol: string;
  updatedBy: string;
  updatedAtIso: string;
  updatedAtLabel: string;
}
