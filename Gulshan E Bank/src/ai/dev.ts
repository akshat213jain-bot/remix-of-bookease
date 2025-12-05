import { config } from 'dotenv';
config();

import '@/ai/flows/account-inquiry.ts';
import '@/ai/flows/service-inquiry.ts';
import '@/ai/flows/send-notification-email.ts';
import '@/ai/flows/generate-avatar.ts';
import '@/ai/flows/generate-animated-avatar.ts';
import '@/ai/flows/resize-image.ts';
