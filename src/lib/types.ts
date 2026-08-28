/* Veritabanı tipleri — migration 001 + 002 ile birebir uyumlu.
   `supabase gen types typescript` ile üretilmiş tipleri buraya kopyalayabilirsiniz. */

export type AccountStatus = "active" | "suspended" | "banned" | "pending_deletion" | "deleted";
export type AppRole = "user" | "support" | "moderator" | "editor" | "finance" | "admin" | "super_admin";
export type ChildStatus = "active" | "inactive" | "archived";
export type OrderStatus =
  | "pending" | "payment_pending" | "paid" | "processing"
  | "shipped" | "delivered" | "completed" | "cancelled" | "refunded";
export type PaymentStatus =
  | "pending" | "awaiting_review" | "paid" | "rejected" | "failed" | "cancelled" | "refunded";
export type CardStatus =
  | "pending" | "processing" | "ready" | "shipped" | "delivered"
  | "active" | "expired" | "cancelled" | "suspended" | "lost";
export type SubscriptionStatus = "pending" | "scheduled" | "active" | "expired" | "cancelled" | "refunded";
export type ContentStatus = "draft" | "scheduled" | "published" | "archived";
export type EventStatus = "draft" | "scheduled" | "published" | "ongoing" | "completed" | "cancelled" | "archived";
export type EventType =
  | "match" | "tournament" | "workshop" | "meeting" | "campaign"
  | "children_event" | "social_event" | "other";
export type EventAccessType = "public" | "card_holders" | "team_card_holders" | "invite_only";
export type RegistrationStatus = "pending" | "confirmed" | "waitlisted" | "cancelled" | "attended" | "no_show";
export type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "completed" | "archived";
export type AnnouncementPriority = "low" | "normal" | "high" | "critical";
export type VerificationMethod = "none" | "captcha" | "email_otp" | "phone_otp" | "authenticated" | "edevlet";

export interface City { id: number; name: string; slug: string; region: string | null }
export interface District { id: number; city_id: number; name: string; slug: string }

export interface Team {
  id: string; name: string; short_name: string | null; slug: string;
  logo_path: string | null; city_id: number | null; description: string | null;
  website: string | null; color_primary: string | null; color_secondary: string | null;
  sort_order: number; is_active: boolean;
}

export interface Profile {
  id: string; first_name: string | null; last_name: string | null; username: string | null;
  city_id: number | null; district_id: number | null; avatar_path: string | null;
  account_status: AccountStatus; default_address_id: string | null;
  consent_marketing: boolean; deletion_requested_at: string | null; purge_after: string | null;
  created_at: string; updated_at: string;
}

export interface Child {
  id: string; user_id: string; first_name: string; last_name: string; birth_date: string;
  gender: string | null; city_id: number | null; favorite_team_id: string | null;
  photo_path: string | null;
  status: ChildStatus; created_at: string; updated_at: string;
}

export interface Address {
  id: string; user_id: string; title: string; recipient_name: string; phone: string;
  city_id: number; district_id: number | null; neighborhood: string | null;
  postal_code: string | null; full_address: string; is_default: boolean;
}

export interface SubscriptionPlan {
  id: string; name: string; slug: string; description: string | null;
  duration_months: number; price: number; currency: string; is_active: boolean;
}

export interface Order {
  id: string; order_number: string; user_id: string | null; child_id: string | null;
  plan_id: string; team_id: string | null; status: OrderStatus; amount: number; currency: string;
  shipping_address_snapshot: Record<string, string | null>;
  is_renewal: boolean; notes: string | null; created_at: string; updated_at: string;
}

export interface Payment {
  id: string; order_id: string; user_id: string | null; amount: number; currency: string;
  payment_method: string; payment_provider: string; status: PaymentStatus;
  paid_at: string | null; rejection_reason: string | null; created_at: string;
}

export interface CardRow {
  id: string; card_number: string; child_id: string | null; team_id: string;
  order_id: string | null; subscription_id: string | null; status: CardStatus;
  valid_from: string | null; valid_until: string | null;
  shipping_carrier: string | null; tracking_number: string | null;
}

export interface Subscription {
  id: string; user_id: string | null; child_id: string | null; card_id: string | null;
  plan_id: string; order_id: string | null; status: SubscriptionStatus;
  amount: number; currency: string; starts_at: string; expires_at: string; auto_renew: boolean;
}

export interface NewsRow {
  id: string; title: string; slug: string; excerpt: string | null; content: string | null;
  category_id: string | null; author_id: string | null; status: ContentStatus;
  published_at: string | null; is_featured: boolean;
  meta_title: string | null; meta_description: string | null; og_image_path: string | null;
  view_count: number;
}

export interface EventRow {
  id: string; title: string; slug: string; short_description: string | null;
  description: string | null; event_type: EventType; status: EventStatus;
  access_type: EventAccessType; required_team_id: string | null;
  city_id: number | null; district_id: number | null;
  venue_name: string | null; venue_address: string | null;
  latitude: number | null; longitude: number | null;
  starts_at: string; ends_at: string | null;
  capacity: number | null; registration_required: boolean; waitlist_enabled: boolean;
  registration_opens_at: string | null; registration_closes_at: string | null;
  min_age: number | null; max_age: number | null; per_family_limit: number;
  guardian_required: boolean; fee: number; currency: string; view_count: number;
}

export interface EventPublicView extends EventRow {
  required_team_name: string | null;
  required_team_logo: string | null;
  city_name: string | null;
  city_slug: string | null;
  district_name: string | null;
  registered_count: number;
  remaining_capacity: number | null;
  requires_card: boolean;
}

export interface Announcement {
  id: string; title: string; slug: string | null; summary: string | null; content: string;
  priority: AnnouncementPriority; status: ContentStatus; starts_at: string; expires_at: string | null;
}

export interface SignatureCampaign {
  id: string; title: string; slug: string; description: string | null;
  team_id: string | null; is_multi_team: boolean; requires_team_choice: boolean;
  required_verification: VerificationMethod;
  starts_at: string | null; ends_at: string | null;
  target_signature_count: number | null; status: CampaignStatus; is_active: boolean;
}

export interface CampaignProgress {
  campaign_id: string; slug: string; title: string; status: CampaignStatus;
  starts_at: string | null; ends_at: string | null;
  target_signature_count: number | null; signature_count: number; progress_percent: number | null;
}

export interface TeamLeaderboardRow {
  campaign_id: string; team_id: string; team_name: string; team_slug: string;
  logo_path: string | null; signature_count: number; rank: number;
}

export interface MyCardView {
  card_id: string; card_number: string; card_status: CardStatus;
  valid_from: string | null; valid_until: string | null;
  shipping_carrier: string | null; tracking_number: string | null;
  child_id: string | null; child_first_name: string | null; child_last_name: string | null;
  team_name: string | null; team_slug: string | null; logo_path: string | null;
  subscription_id: string | null; subscription_status: SubscriptionStatus | null;
  expires_at: string | null; order_number: string | null; order_status: OrderStatus | null;
}

export interface MyEventRegistration {
  registration_id: string; status: RegistrationStatus; check_in_code: string | null;
  waitlist_position: number | null; attendee_count: number; checked_in_at: string | null;
  created_at: string; child_id: string | null;
  child_first_name: string | null; child_last_name: string | null;
  event_id: string; event_title: string; event_slug: string;
  starts_at: string; ends_at: string | null;
  venue_name: string | null; venue_address: string | null; city_name: string | null;
}

export interface ChildEligibility {
  child_id: string; first_name: string; last_name: string; age: number;
  eligible: boolean; will_waitlist: boolean; reason: string | null; message: string | null;
}

export interface Notification {
  id: string; user_id: string; type: string; title: string; body: string | null;
  data: Record<string, unknown>; read_at: string | null; created_at: string;
}

/* Not: Supabase istemcileri şemasız (untyped) kullanılıyor.
   `npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts`
   komutuyla üretilen tipleri bağlamak isterseniz istemcilere <Database> generic'ini ekleyin. */
