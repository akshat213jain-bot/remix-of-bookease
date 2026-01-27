# UI Templates Backup

This folder contains **backup copies** of key UI pages and components for reference purposes.

> ⚠️ **IMPORTANT**: These files are **NOT** deployed. The actual pages are in `src/pages/`.

## Why This Exists

These templates are provided for:

- Quick reference for authentication flows and UI patterns
- Easy copying/sharing of UI code
- Documentation of form fields and validation
- Template for future projects

## Template List

| Template | Description |
|----------|-------------|
| `Auth.tsx` | Complete authentication page with login/signup flows, multi-role support, OTP verification |
| `BlockedAccount.tsx` | Account suspension/ban page with appeal form |
| `ForgotPassword.tsx` | Password reset flow with email OTP verification |

## Key Features

### Auth.tsx Features
- **Multi-step signup flow** (2 steps: basic info → details)
- **Three role types**: User, Provider, Admin
- **Fields collected**:
  - Step 1: Full name, Email, Password, Role selection
  - Step 2 (User): Phone, Date of birth, Address, City
  - Step 2 (Provider): Phone, Address, City, Profession, Specialty, Years of experience
  - Step 2 (Admin): Phone, Address, City, Department, Justification
- **Phone OTP verification** after signup
- **Zod validation** for all fields
- **Automatic redirect** based on role after login
- **Provider approval workflow** (creates approval_requests entry)
- **Admin approval workflow** (creates approval_requests entry)

### BlockedAccount.tsx Features
- **Status display**: Shows banned vs suspended state with different icons
- **Status reason**: Displays admin-provided reason
- **Appeal form**: Subject + message textarea
- **Email + notification**: Sends appeal to all admins
- **Auto-redirect**: Checks every 10 seconds if account is reactivated
- **Logout functionality**: Properly navigates to /auth

## Environment Variables Required

- Phone OTP requires `send-phone-otp` and `verify-phone-otp` edge functions
- Appeal emails require `send-appeal` edge function with Brevo configuration

## Validation Rules

| Field | Validation |
|-------|------------|
| Email | Valid email format (Zod) |
| Password | Minimum 8 characters |
| Name | Minimum 2 characters |
| Phone | Regex: `/^\+?[1-9]\d{9,14}$/` |
| Admin Justification | Minimum 20 characters |

## Professions List

```typescript
const PROFESSIONS = [
  "Doctor",
  "Dentist", 
  "Therapist",
  "Consultant",
  "Tutor",
  "Fitness Trainer",
  "Lawyer",
  "Accountant",
  "Designer",
  "Other"
];
```
