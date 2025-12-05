
'use server';

/**
 * @fileOverview A flow for generating animated user avatars from a text prompt.
 *
 * - generateAnimatedAvatar - A function that handles the avatar generation process.
 * - GenerateAnimatedAvatarInput - The input type for the generateAnimatedAvatar function.
 * - GenerateAnimatedAvatarOutput - The return type for the generateAnimatedAvatar function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GenerateAnimatedAvatarInputSchema = z.object({
  prompt: z.string().describe('A text description of the animated avatar to generate.'),
});
export type GenerateAnimatedAvatarInput = z.infer<typeof GenerateAnimatedAvatarInputSchema>;

const GenerateAnimatedAvatarOutputSchema = z.object({
  avatarDataUri: z.string().describe("The generated animated avatar as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:video/mp4;base64,<encoded_data>'."),
});
export type GenerateAnimatedAvatarOutput = z.infer<typeof GenerateAnimatedAvatarOutputSchema>;

export async function generateAnimatedAvatar(input: GenerateAnimatedAvatarInput): Promise<GenerateAnimatedAvatarOutput> {
  return generateAnimatedAvatarFlow(input);
}

const generateAnimatedAvatarFlow = ai.defineFlow(
  {
    name: 'generateAnimatedAvatarFlow',
    inputSchema: GenerateAnimatedAvatarInputSchema,
    outputSchema: GenerateAnimatedAvatarOutputSchema,
  },
  async ({ prompt }) => {
    const fullPrompt = `Generate a creative, high-quality, circular, looping animated avatar for a user profile based on the following description: "${prompt}". The avatar should be suitable for a professional context like a bank, with a clean background. It should be a seamless loop.`;

    let { operation } = await ai.generate({
        model: googleAI.model('veo-2.0-generate-001'),
        prompt: fullPrompt,
        config: {
          durationSeconds: 5,
        },
      });

    if (!operation) {
        throw new Error('Expected the model to return an operation');
    }

    // Wait until the operation completes.
    while (!operation.done) {
        operation = await ai.checkOperation(operation, { includeContent: true });
        // Sleep for 5 seconds before checking again.
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    
    if (operation.error) {
        throw new Error('failed to generate video: ' + operation.error.message);
    }
    
    const videoPart = operation.output?.message?.content.find((p) => !!p.media);
    if (!videoPart || !videoPart.media?.url) {
        throw new Error('Failed to find the generated video in the operation result');
    }

    return {
      avatarDataUri: videoPart.media.url,
    };
  }
);
