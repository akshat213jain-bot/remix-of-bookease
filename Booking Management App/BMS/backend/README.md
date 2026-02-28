# Backend Functions Backup

This folder contains **backup copies** of all Supabase Edge Functions for reference purposes.

> ⚠️ **IMPORTANT**: These files are **NOT** deployed. The actual deployed functions are in `supabase/functions/`.

## Why This Exists

Supabase Edge Functions have a mandatory directory structure requiring functions to be in `supabase/functions/<function-name>/index.ts`. This backup folder is provided for:

- Quick reference without navigating to the supabase folder
- Easy copying/sharing of backend code
- Documentation purposes

## Function List

### Authentication & User Management

| Function | File | Description |
|----------|------|-------------|
| `send-password-reset-otp` | `send-password-reset-otp.ts` | Send OTP to email for password reset |
| `verify-password-reset-otp` | `verify-password-reset-otp.ts` | Verify OTP for password reset |
| `reset-password` | `reset-password.ts` | Reset user password after OTP verification |
| `send-phone-otp` | `send-phone-otp.ts` | Phone number OTP verification sending |
| `verify-phone-otp` | `verify-phone-otp.ts` | Phone number OTP verification |

### Notifications & Communication

| Function | File | Description |
|----------|------|-------------|
| `send-notification` | `send-notification.ts` | In-app and email notifications via Brevo |
| `send-reminders` | `send-reminders.ts` | Automated 24-hour appointment reminders |
| `send-appeal` | `send-appeal.ts` | Blocked/suspended account appeal emails to admins |
| `brevo-webhook` | `brevo-webhook.ts` | Brevo email delivery status webhook receiver |
| `waitlist-notify` | `waitlist-notify.ts` | Slot waitlist notifications when slots become available |

### Payments & Billing

| Function | File | Description |
|----------|------|-------------|
| `create-appointment-payment` | `create-appointment-payment.ts` | Stripe checkout session creation for appointments |
| `create-subscription-checkout` | `create-subscription-checkout.ts` | Stripe checkout for subscription plan purchases |
| `stripe-connect` | `stripe-connect.ts` | Provider Stripe Connect onboarding and dashboard |
| `stripe-webhook` | `stripe-webhook.ts` | Stripe payment webhook handler (success, failure, refunds, subscriptions) |
| `admin-payment-data` | `admin-payment-data.ts` | Admin payment management, transactions, refunds |
| `provider-earnings` | `provider-earnings.ts` | Provider earnings, transactions, and payouts |

### Notifications & Communication

| Function | File | Description |
|----------|------|-------------|
| `send-notification` | `send-notification.ts` | In-app and email notifications via Brevo |
| `send-push-notification` | `send-push-notification.ts` | Web push notifications using VAPID |
| `send-reminders` | `send-reminders.ts` | Automated 24-hour appointment reminders |
| `send-appeal` | `send-appeal.ts` | Blocked/suspended account appeal emails to admins |
| `brevo-webhook` | `brevo-webhook.ts` | Brevo email delivery status webhook receiver |
| `waitlist-notify` | `waitlist-notify.ts` | Slot waitlist notifications when slots become available |

### Analytics

| Function | File | Description |
|----------|------|-------------|
| `admin-analytics` | `admin-analytics.ts` | System-wide booking trends and provider performance metrics |
| `provider-analytics` | `provider-analytics.ts` | Individual provider analytics dashboard data |

### AI & Chatbot

| Function | File | Description |
|----------|------|-------------|
| `ai-chat` | `ai-chat.ts` | AI chatbot for customer support with OpenAI integration |

### Coupons & Promotions

| Function | File | Description |
|----------|------|-------------|
| `validate-coupon` | `validate-coupon.ts` | Validate coupon codes and calculate discounts |

### Security & Authentication

| Function | File | Description |
|----------|------|-------------|
| `setup-2fa` | `setup-2fa.ts` | Two-factor authentication setup with TOTP |
| `send-sms` | `send-sms.ts` | Send SMS notifications via Twilio |

### GDPR & Compliance

| Function | File | Description |
|----------|------|-------------|
| `export-user-data` | `export-user-data.ts` | GDPR-compliant user data export |

### Recurring & Scheduling

| Function | File | Description |
|----------|------|-------------|
| `create-recurring-booking` | `create-recurring-booking.ts` | Create recurring appointment schedules |

### Gamification

| Function | File | Description |
|----------|------|-------------|
| `check-badge-eligibility` | `check-badge-eligibility.ts` | Check and award badges based on achievements |

### Video & Calendar

| Function | File | Description |
|----------|------|-------------|
| `create-video-room` | `create-video-room.ts` | Daily.co video room creation for consultations |
| `sync-google-calendar` | `sync-google-calendar.ts` | Google Calendar integration (create/update/delete events) |

## To Deploy Changes

If you modify any file in this folder:
1. Copy the changes to the corresponding file in `supabase/functions/<function-name>/index.ts`
2. The deployment happens automatically when the preview builds

## Environment Variables Required

### Supabase (Auto-configured by Lovable Cloud)
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SUPABASE_DB_URL` | Direct database connection URL |

### Payments (Stripe)
| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

### Push Notifications (Web Push)
| Variable | Description |
|----------|-------------|
| `VAPID_PUBLIC_KEY` | VAPID public key for web push (base64url) |
| `VAPID_PRIVATE_KEY` | VAPID private key for web push (base64url) |

### Email (Brevo)
| Variable | Description |
|----------|-------------|
| `BREVO_API_KEY` | Brevo transactional email API key |
| `BREVO_SENDER_EMAIL` | Verified sender email address |
| `BREVO_SENDER_NAME` | Display name for sent emails |

### Video (Daily.co)
| Variable | Description |
|----------|-------------|
| `DAILY_API_KEY` | Daily.co video conferencing API key |

### AI (Auto-configured)
| Variable | Description |
|----------|-------------|
| `LOVABLE_API_KEY` | Lovable AI Gateway key for AI features |

### Optional (Legacy)
| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Alternative email provider (not currently used) |

## Database Tables Used

These functions interact with the following database tables:

### Core Tables
- `profiles` - User profiles with timezone, language, and verification preferences
- `provider_profiles` - Provider info with verification, buffer time, and Stripe Connect settings
- `appointments` - Booking records with group booking, video, and reschedule support
- `user_roles` - Role-based access control (admin, provider, user)

### Communication
- `notifications` - In-app notifications with type-based categorization
- `chat_conversations` / `chat_messages` - Real-time messaging between users and providers
- `push_subscriptions` - Browser push notification tokens
- `outgoing_emails` - Email delivery tracking with Brevo webhook events

### Trust & Safety
- `disputes` - User complaints and conflict resolution workflow
- `reviews` - Provider ratings and feedback with provider responses
- `satisfaction_surveys` - Post-appointment multi-dimensional surveys

### Payments & Subscriptions
- `subscription_plans` / `user_subscriptions` - Subscription tier management
- `booking_groups` / `group_discounts` - Multi-provider booking with percentage discounts
- `loyalty_points` / `loyalty_transactions` - Points-based rewards program
- `referrals` - User referral tracking and bonus awards

### Scheduling
- `provider_availability` - Weekly recurring availability schedules
- `provider_blocked_dates` - Specific date blocks with optional reasons
- `slot_waitlist` - User waitlist entries for preferred slots

### Admin & Analytics
- `approval_requests` - Provider registration, reschedule, and refund approvals
- `email_templates` - Customizable HTML email templates with variable substitution
- `system_settings` - Platform configuration (currency, etc.)
- `user_analytics` - Aggregated booking patterns and insights

## Edge Function Patterns

### CORS Headers
All edge functions use consistent CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Authentication
Functions use `getClaims()` for JWT validation:
```typescript
const token = authHeader.replace('Bearer ', '');
const { data, error } = await supabase.auth.getClaims(token);
if (error || !data?.claims) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
const userId = data.claims.sub;
```

### Logging
All functions include step-based logging for debugging:
```typescript
const logStep = (step: string, details?: Record<string, unknown>) => {
  console.info(`[FUNCTION-NAME] ${step}`, details ? JSON.stringify(details) : '');
};
```

## Recent Changes

### Phase 2 Features Complete
- ✅ Provider verification badges with document support
- ✅ Buffer time settings (before/after appointments)
- ✅ Timezone and i18n support
- ✅ SMS notification preferences
- ✅ Disputes and conflict resolution
- ✅ Satisfaction surveys with multi-dimensional ratings
- ✅ Push notifications via service worker
- ✅ User analytics dashboard
- ✅ Group discounts for multi-appointment bookings
- ✅ PDF invoice generation for completed appointments
- ✅ Provider comparison tool
- ✅ Waitlist management with automatic notifications
