'use server';

/**
 * @fileOverview Account inquiry AI agent.
 *
 * - accountInquiry - A function that handles the account inquiry process.
 * - AccountInquiryInput - The input type for the accountInquiry function.
 * - AccountInquiryOutput - The return type for the accountInquiry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AccountInquiryInputSchema = z.object({
  query: z.string().describe('The user query about their account.'),
});
export type AccountInquiryInput = z.infer<typeof AccountInquiryInputSchema>;

const AccountInquiryOutputSchema = z.object({
  response: z.string().describe('The response to the user query.'),
});
export type AccountInquiryOutput = z.infer<typeof AccountInquiryOutputSchema>;

export async function accountInquiry(input: AccountInquiryInput): Promise<AccountInquiryOutput> {
  return accountInquiryFlow(input);
}

const accountInquiryPrompt = ai.definePrompt({
  name: 'accountInquiryPrompt',
  input: {schema: AccountInquiryInputSchema},
  output: {schema: AccountInquiryOutputSchema},
  prompt: `You are a helpful AI assistant for a bank.

  Respond to the user query about their account:

  Query: {{{query}}}
  `,
});

const accountInquiryFlow = ai.defineFlow(
  {
    name: 'accountInquiryFlow',
    inputSchema: AccountInquiryInputSchema,
    outputSchema: AccountInquiryOutputSchema,
  },
  async input => {
    const {output} = await accountInquiryPrompt(input);
    return output!;
  }
);
