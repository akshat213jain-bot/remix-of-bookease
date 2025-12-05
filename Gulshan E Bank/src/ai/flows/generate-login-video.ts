
'use server';

/**
 * @fileOverview A flow for generating a login screen background video.
 *
 * - generateLoginVideo - A function that handles the video generation process.
 * - GenerateLoginVideoOutput - The return type for the generateLoginVideo function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GenerateLoginVideoOutputSchema = z.object({
  videoDataUri: z.string().describe("The generated video as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:video/mp4;base64,<encoded_data>'."),
});
export type GenerateLoginVideoOutput = z.infer<typeof GenerateLoginVideoOutputSchema>;

export async function generateLoginVideo(): Promise<GenerateLoginVideoOutput> {
  return generateLoginVideoFlow();
}

const generateLoginVideoFlow = ai.defineFlow(
  {
    name: 'generateLoginVideoFlow',
    inputSchema: z.void(),
    outputSchema: GenerateLoginVideoOutputSchema,
  },
  async () => {
    const prompt = "A cinematic shot of a modern and secure bank vault, with digital elements.";

    let { operation } = await ai.generate({
        model: googleAI.model('veo-2.0-generate-001'),
        prompt: prompt,
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
      videoDataUri: videoPart.media.url,
    };
  }
);
