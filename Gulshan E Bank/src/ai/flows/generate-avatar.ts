'use server';

/**
 * @fileOverview A flow for generating user avatars from a text prompt.
 *
 * - generateAvatar - A function that handles the avatar generation process.
 * - GenerateAvatarInput - The input type for the generateAvatar function.
 * - GenerateAvatarOutput - The return type for the generateAvatar function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { resizeImage } from './resize-image';

const GenerateAvatarInputSchema = z.object({
  prompt: z.string().describe('A text description of the avatar to generate.'),
});
export type GenerateAvatarInput = z.infer<typeof GenerateAvatarInputSchema>;

const GenerateAvatarOutputSchema = z.object({
  avatarDataUri: z.string().describe("The generated avatar image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type GenerateAvatarOutput = z.infer<typeof GenerateAvatarOutputSchema>;

export async function generateAvatar(input: GenerateAvatarInput): Promise<GenerateAvatarOutput> {
  return generateAvatarFlow(input);
}

const generateAvatarFlow = ai.defineFlow(
  {
    name: 'generateAvatarFlow',
    inputSchema: GenerateAvatarInputSchema,
    outputSchema: GenerateAvatarOutputSchema,
  },
  async ({ prompt }) => {
    // Enhance the prompt for better avatar generation and specify JPEG format
    const fullPrompt = `Generate a creative, high-quality, circular avatar for a user profile based on the following description: "${prompt}". The avatar should be suitable for a professional context like a bank, with a clean background.`;
    
    const { media } = await ai.generate({
      model: 'googleai/imagen-4.0-fast-generate-001',
      prompt: fullPrompt,
    });
    
    if (!media.url) {
      throw new Error('Image generation failed to return a data URI.');
    }

    // Resize and compress the generated image to ensure it's small enough.
    const resized = await resizeImage({ imageDataUri: media.url });
    
    return {
      avatarDataUri: resized.imageDataUri,
    };
  }
);
