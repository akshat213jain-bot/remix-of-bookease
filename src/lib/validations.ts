import { z } from "zod";

// ==================== Authentication Schemas ====================
export const emailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address")
  .max(255, "Email must be less than 255 characters");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be less than 100 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: nameSchema,
  role: z.enum(["user", "provider"]),
});

// ==================== Profile Schemas ====================
export const phoneSchema = z
  .string()
  .trim()
  .max(20, "Phone number must be less than 20 characters")
  .regex(/^[+]?[\d\s()-]*$/, "Please enter a valid phone number")
  .optional()
  .or(z.literal(""));

export const profileUpdateSchema = z.object({
  full_name: nameSchema,
  phone: phoneSchema.nullable(),
});

// ==================== Provider Profile Schemas ====================
export const professionSchema = z
  .string()
  .trim()
  .min(2, "Profession is required")
  .max(100, "Profession must be less than 100 characters");

export const specialtySchema = z
  .string()
  .trim()
  .max(100, "Specialty must be less than 100 characters")
  .optional()
  .or(z.literal(""));

export const bioSchema = z
  .string()
  .trim()
  .max(2000, "Bio must be less than 2000 characters")
  .optional()
  .or(z.literal(""));

export const locationSchema = z
  .string()
  .trim()
  .max(200, "Location must be less than 200 characters")
  .optional()
  .or(z.literal(""));

export const consultationFeeSchema = z
  .number()
  .min(0, "Consultation fee must be positive")
  .max(100000, "Consultation fee exceeds maximum")
  .optional()
  .nullable();

export const yearsOfExperienceSchema = z
  .number()
  .int("Years must be a whole number")
  .min(0, "Years of experience must be positive")
  .max(70, "Years of experience exceeds maximum")
  .optional()
  .nullable();

export const providerProfileSchema = z.object({
  profession: professionSchema,
  specialty: specialtySchema.nullable(),
  bio: bioSchema.nullable(),
  consultation_fee: consultationFeeSchema,
  location: locationSchema.nullable(),
  years_of_experience: yearsOfExperienceSchema,
  is_active: z.boolean(),
});

// ==================== Appointment Schemas ====================
export const appointmentNotesSchema = z
  .string()
  .trim()
  .max(500, "Notes must be less than 500 characters")
  .optional()
  .or(z.literal(""));

export const cancellationReasonSchema = z
  .string()
  .trim()
  .max(500, "Reason must be less than 500 characters")
  .optional()
  .or(z.literal(""));

export const createAppointmentSchema = z.object({
  provider_id: z.string().uuid("Invalid provider ID"),
  appointment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  notes: appointmentNotesSchema,
});

export const cancelAppointmentSchema = z.object({
  id: z.string().uuid("Invalid appointment ID"),
  reason: cancellationReasonSchema,
});

// ==================== Search & Pagination Schemas ====================
export const searchQuerySchema = z
  .string()
  .trim()
  .max(100, "Search query must be less than 100 characters")
  .optional()
  .or(z.literal(""));

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

// ==================== Notification Schemas ====================
export const notificationTypeSchema = z.enum([
  "booking_created",
  "booking_confirmed",
  "booking_rejected",
  "booking_cancelled",
  "booking_completed",
  "reminder",
  "info",
  "reschedule_request",
  "reschedule_accepted",
  "reschedule_declined",
  "contact_message",
]);

export const sendNotificationSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(1000),
  type: notificationTypeSchema,
  related_appointment_id: z.string().uuid().optional().nullable(),
  recipient_email: emailSchema.optional(),
  recipient_name: z.string().trim().max(100).optional(),
  send_email: z.boolean().default(false),
});

// ==================== Utility Functions ====================
export const validateInput = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join(".");
    if (!errors[path]) {
      errors[path] = err.message;
    }
  });
  
  return { success: false, errors };
};

// Sanitize string input - remove potential XSS vectors
export const sanitizeString = (input: string): string => {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
};
