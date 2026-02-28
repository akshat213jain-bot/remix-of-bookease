

## Full Database Export (JSON Backup)

### Overview
Create a backend function that exports ALL data from the current database as a single downloadable JSON file. This file can then be manually imported into any target database.

**Why direct migration isn't possible**: The target project credentials provided are publishable keys (subject to RLS). Direct writes require the target's service role key AND matching table schema. A JSON export is the safe, reliable approach.

### What Gets Built

**1. New Edge Function: `full-data-export`**
- Admin-only access (validates caller has admin role)
- Uses service role key to bypass RLS and read all tables
- Fetches data from all 30+ tables with explicit safe columns (no sensitive fields)
- Paginates large tables in batches of 1000 to avoid row limits
- Returns a single JSON response with all data organized by table name

**2. Admin Dashboard Integration**
- Add an "Export Full Database" button to the existing admin dashboard
- Shows progress indicator while exporting
- Downloads result as `bookease-full-export-YYYY-MM-DD.json`

### Tables Exported
All existing tables: profiles, provider_profiles, appointments, reviews, chat_conversations, chat_messages, notifications, referrals, loyalty_points, loyalty_transactions, user_roles, user_subscriptions, subscription_plans, coupons, disputes, email_templates, system_settings, badges, user_badges, service_packages, booking_groups, provider_availability, provider_blocked_dates, favorite_providers, satisfaction_surveys, slot_waitlist, tips, gift_cards, gift_card_transactions, calls, user_packages, outgoing_emails, approval_requests, push_subscriptions, user_analytics, group_discounts

### Sensitive Fields Excluded
- `stripe_account_id`, `stripe_session_id`, `stripe_payment_intent_id`, `stripe_subscription_id`
- `p256dh`, `auth` (push subscription keys)
- `verification_documents`, `verification_type`
- `last_payload` (email webhook payloads)

### Technical Details

**Edge Function (`supabase/functions/full-data-export/index.ts`)**
- Authenticates caller via Authorization header
- Verifies admin role using `user_roles` table lookup
- Uses `SUPABASE_SERVICE_ROLE_KEY` to create admin client
- Iterates all tables with explicit column lists (reusing the pattern from `useDataExport.ts`)
- Paginates with `.range()` in batches of 1000 to handle large tables
- Returns JSON with structure: `{ export_date, table_count, total_records, tables: { table_name: [...records] } }`

**Config (`supabase/config.toml`)**
- Add `[functions.full-data-export]` with `verify_jwt = false` (auth validated in code)

**Frontend (`src/pages/dashboard/AdminDashboard.tsx`)**
- Add export button that calls `supabase.functions.invoke("full-data-export")`
- Download response as timestamped JSON file

### How to Import Into Target Project
After downloading the JSON:
1. Open the target project's SQL editor / dashboard
2. Create the same table schema (can use the SQL files in the `database/` folder)
3. Use the dashboard's import feature or write INSERT statements from the JSON data

