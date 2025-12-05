'use server';

/**
 * @fileOverview A flow for sending customized email notifications.
 *
 * - sendNotificationEmail - A function that generates and sends a branded email.
 * - SendNotificationEmailInput - The input type for the sendNotificationEmail function.
 * - SendNotificationEmailOutput - The return type for the sendNotificationEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Mock email sending service. In a real app, this would use a service like SendGrid, Nodemailer, etc.
const emailService = {
  send: async (to: string, subject: string, htmlBody: string) => {
    console.log('Email successfully sent (mock).');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    // console.log(`Body: ${htmlBody}`); // Uncomment to see the full HTML in logs
    return { success: true, messageId: `mock_${Date.now()}` };
  },
};

const SendNotificationEmailInputSchema = z.object({
  to: z.string().email().describe('The recipient\'s email address.'),
  subject: z.string().describe('The subject line of the email.'),
  header: z.string().describe('The main heading for the email content.'),
  message: z.string().describe('The body content of the email, can include HTML.'),
  button: z.object({
    text: z.string(),
    url: z.string().url(),
  }).optional().describe('An optional call-to-action button.'),
});
export type SendNotificationEmailInput = z.infer<typeof SendNotificationEmailInputSchema>;

const SendNotificationEmailOutputSchema = z.object({
  success: z.boolean(),
  messageId: z.string().optional(),
});
export type SendNotificationEmailOutput = z.infer<typeof SendNotificationEmailOutputSchema>;

/**
 * Creates a branded HTML email template.
 * @param input - The dynamic content for the email.
 * @returns The full HTML string for the email body.
 */
function createEmailTemplate({ header, message, button }: Omit<SendNotificationEmailInput, 'to'|'subject'>): string {
  const primaryColor = '#2E8B57'; // Sea Green
  const accentColor = '#B8860B'; // DarkGoldenrod
  const backgroundColor = '#f0f4f0'; // Honeydew-like light gray
  const textColor = '#333333';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gulshan eBank Notification</title>
      <style>
        body { margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: ${backgroundColor}; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: ${primaryColor}; color: #ffffff; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 32px; color: ${textColor}; line-height: 1.6; }
        .content h2 { color: ${primaryColor}; margin-top: 0; font-size: 20px; }
        .button-container { text-align: center; margin-top: 24px; }
        .button { background-color: ${accentColor}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
        .footer { background-color: #f7f7f7; color: #888888; padding: 16px; text-align: center; font-size: 12px; }
        .footer a { color: ${primaryColor}; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Gulshan eBank</h1>
        </div>
        <div class="content">
          <h2>${header}</h2>
          <p>${message}</p>
          ${button ? `
            <div class="button-container">
              <a href="${button.url}" class="button">${button.text}</a>
            </div>
          ` : ''}
          <p>If you did not request this, please contact our support team immediately.</p>
          <p>Thank you for banking with us,<br>The Gulshan eBank Team</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Gulshan eBank. All rights reserved.</p>
          <p><a href="#">Visit our website</a> | <a href="#">Contact Support</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const sendNotificationEmailFlow = ai.defineFlow(
  {
    name: 'sendNotificationEmailFlow',
    inputSchema: SendNotificationEmailInputSchema,
    outputSchema: SendNotificationEmailOutputSchema,
  },
  async (input) => {
    const { to, subject, ...templateData } = input;
    
    // 1. Generate the HTML body from the template
    const htmlBody = createEmailTemplate(templateData);

    // 2. Send the email using the mock service
    const result = await emailService.send(to, subject, htmlBody);
    
    return {
      success: result.success,
      messageId: result.messageId,
    };
  }
);


export async function sendNotificationEmail(input: SendNotificationEmailInput): Promise<SendNotificationEmailOutput> {
  return sendNotificationEmailFlow(input);
}
