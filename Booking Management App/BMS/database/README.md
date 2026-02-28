# Database Schema Documentation

This directory contains the complete database schema for the BookEase application. Each file is named after the primary table or function it documents.

> **Note**: These files are for **documentation purposes only**. The actual database is managed through Supabase migrations in `supabase/migrations/`.

## Tables Overview

### Core Tables (5 files)

| File | Table | Description |
|------|-------|-------------|
| `appointments.sql` | `appointments` | Bookings with group support, video, reschedule, recurring |
| `profiles.sql` | `profiles` | User profiles with contact, verification, i18n preferences |
| `provider_profiles.sql` | `provider_profiles` | Provider details, fees, ratings, verification, Stripe Connect |
| `provider_availability.sql` | `provider_availability` | Weekly recurring availability schedules |
| `provider_blocked_dates.sql` | `provider_blocked_dates` | Specific dates when providers are unavailable |

### Communication & Engagement (5 files)

| File | Table | Description |
|------|-------|-------------|
| `notifications.sql` | `notifications` | In-app notifications with type categorization |
| `chat_conversations.sql` | `chat_conversations` | Chat threads between users and providers |
| `chat_messages.sql` | `chat_messages` | Individual messages with realtime enabled |
| `push_subscriptions.sql` | `push_subscriptions` | Browser push notification tokens |
| `satisfaction_surveys.sql` | `satisfaction_surveys` | Post-appointment multi-dimensional feedback |

### Reviews & Trust (2 files)

| File | Table | Description |
|------|-------|-------------|
| `reviews.sql` | `reviews` | User reviews with provider responses |
| `disputes.sql` | `disputes` | Complaints and conflict resolution workflow |

### Favorites & Waitlist (2 files)

| File | Table | Description |
|------|-------|-------------|
| `favorite_providers.sql` | `favorite_providers` | User's bookmarked providers |
| `slot_waitlist.sql` | `slot_waitlist` | Waitlist for preferred time slots |

### Loyalty & Referrals (3 files)

| File | Table | Description |
|------|-------|-------------|
| `loyalty_points.sql` | `loyalty_points` | User points balance with tier support |
| `loyalty_transactions.sql` | `loyalty_transactions` | Points earning/redemption history |
| `referrals.sql` | `referrals` | Referral tracking between users |

### Subscriptions & Payments (4 files)

| File | Table | Description |
|------|-------|-------------|
| `subscription_plans.sql` | `subscription_plans` | Available subscription tiers |
| `user_subscriptions.sql` | `user_subscriptions` | User subscription records with Stripe IDs |
| `group_discounts.sql` | `group_discounts` | Multi-appointment discount configurations |
| `booking_groups.sql` | `booking_groups` | Groups for multi-provider booking |

### Analytics (1 file)

| File | Table | Description |
|------|-------|-------------|
| `user_analytics.sql` | `user_analytics` | Aggregated booking patterns and insights |

### Admin & System (5 files)

| File | Table | Description |
|------|-------|-------------|
| `user_roles.sql` | `user_roles` | Role assignments (admin, provider, user) |
| `approval_requests.sql` | `approval_requests` | Provider registrations, reschedules, refunds |
| `email_templates.sql` | `email_templates` | Customizable HTML templates with variables |
| `outgoing_emails.sql` | `outgoing_emails` | Email delivery tracking via Brevo webhooks |
| `system_settings.sql` | `system_settings` | Platform configuration (currency, etc.) |

## Functions (6 files)

| File | Function | Description |
|------|----------|-------------|
| `fn_has_role.sql` | `has_role()` | Security definer to check user roles (prevents RLS recursion) |
| `fn_get_user_role.sql` | `get_user_role()` | Get highest priority role for a user |
| `fn_update_updated_at_column.sql` | `update_updated_at_column()` | Trigger for auto-updating timestamps |
| `fn_update_provider_rating.sql` | `update_provider_rating()` | Trigger to recalculate provider average ratings |
| `fn_update_conversation_last_message.sql` | `update_conversation_last_message()` | Trigger for chat timestamp sync |
| `fn_handle_new_user.sql` | `handle_new_user()` | Trigger for new user setup (profile + role) |

## Enums

| Name | Values | Usage |
|------|--------|-------|
| `app_role` | `admin`, `provider`, `user` | Role-based access control |
| `appointment_status` | `pending`, `approved`, `rejected`, `cancelled`, `completed` | Appointment workflow states |

## Entity Relationships

```
auth.users (managed by Supabase Auth)
    │
    ├── profiles (1:1) ─────────────────────────────────────┐
    │       │                                                │
    │       ├── user_roles (1:many) ── Role assignments     │
    │       ├── user_analytics (1:1) ── Booking stats       │
    │       ├── push_subscriptions (1:many) ── Push tokens  │
    │       ├── loyalty_points (1:1) ── Points balance      │
    │       ├── loyalty_transactions (1:many) ── History    │
    │       ├── referrals (1:many) ── Referral tracking     │
    │       ├── favorite_providers (1:many) ── Bookmarks    │
    │       ├── slot_waitlist (1:many) ── Waitlist entries  │
    │       └── user_subscriptions (1:many) ── Plans        │
    │                                                        │
    └── provider_profiles (1:1 for providers) ──────────────┤
            │                                                │
            ├── provider_availability (1:many)               │
            ├── provider_blocked_dates (1:many)              │
            ├── group_discounts (1:many)                     │
            │                                                │
            ├── appointments (1:many as provider) ──────────┤
            │       │                                        │
            │       ├── reviews (1:1 per appointment)        │
            │       ├── disputes (1:many)                    │
            │       └── satisfaction_surveys (1:1)           │
            │                                                │
            ├── chat_conversations (1:many) ────────────────┤
            │       └── chat_messages (1:many)               │
            │                                                │
            └── favorite_providers (1:many as favorited)     │
                                                             │
booking_groups (Multi-provider booking) ─────────────────────┘
    └── appointments (1:many) ── Grouped appointments
    
subscription_plans ──────────────────────────────────────────┐
    └── user_subscriptions (1:many)                          │
                                                             │
approval_requests ── Provider registrations, reschedules ────┤
email_templates ── Customizable email content ───────────────┤
outgoing_emails ── Delivery tracking ────────────────────────┤
system_settings ── Platform configuration ───────────────────┘
```

## Security Model

### Row-Level Security (RLS)
All tables have RLS enabled with policies that enforce:

| Role | Access Level |
|------|--------------|
| `user` | Own data only (via `auth.uid() = user_id`) |
| `provider` | Own profile + related appointments/reviews |
| `admin` | Full access to all data |

### Security Definer Functions
The `has_role()` function is used in all admin-related policies to prevent infinite recursion:

```sql
-- ✅ CORRECT: Use security definer function
CREATE POLICY "Admins can view all" ON some_table
FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ❌ WRONG: Direct query causes infinite recursion
CREATE POLICY "Admins can view all" ON some_table
FOR SELECT USING ((SELECT role FROM user_roles WHERE user_id = auth.uid()) = 'admin');
```

### Critical Security Notes
1. **Roles stored separately**: Never store roles on profiles table (privilege escalation risk)
2. **New users start as 'user'**: Provider/admin roles require approval
3. **RLS on all tables**: No table is publicly accessible without authentication

## Phase 2 Features

### Trust & Safety
- ✅ Provider Verification: `is_verified`, `verification_type`, `verification_documents`
- ✅ Dispute Resolution: Full workflow with status tracking

### Scheduling
- ✅ Buffer Time: `buffer_time_before`, `buffer_time_after` on provider_profiles
- ✅ Timezone Support: `timezone` on profiles and provider_profiles
- ✅ Blocked Dates: Specific unavailable dates with reasons

### User Experience
- ✅ i18n Support: `preferred_language` on profiles
- ✅ SMS Notifications: `sms_notifications_enabled` preferences
- ✅ Push Notifications: Browser notification subscriptions
- ✅ Satisfaction Surveys: Multi-dimensional feedback collection

### Payments
- ✅ Stripe Connect: `stripe_account_id`, `stripe_charges_enabled`, `stripe_payouts_enabled`
- ✅ Group Booking: `booking_groups` + `booking_group_id` on appointments
- ✅ Group Discounts: Percentage discounts for multi-appointment bookings

### Analytics & Engagement
- ✅ User Analytics: Aggregated booking patterns
- ✅ Provider Ratings: Auto-calculated via trigger
- ✅ Loyalty Program: Points, tiers, and transactions

## Maintenance Notes

### Adding New Tables
1. Create SQL file: `database/<table_name>.sql`
2. Include: CREATE TABLE, RLS policies, indexes
3. Update this README with table documentation
4. Create migration via Lovable migration tool

### Modifying Existing Tables
1. Use Lovable migration tool for schema changes
2. Update corresponding SQL documentation file
3. Check for RLS policy updates needed
