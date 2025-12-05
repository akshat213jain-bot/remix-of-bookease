'use server';
/**
 * @fileOverview A flow for resizing and compressing an image.
 *
 * - resizeImage - A function that takes an image data URI and returns a resized version.
 * - ResizeImageInput - The input type for the resizeImage function.
 * - ResizeImageOutput - The return type for the resizeImage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ResizeImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ResizeImageInput = z.infer<typeof ResizeImageInputSchema>;

const ResizeImageOutputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      'The resized image as a JPEG data URI.'
    ),
});
export type ResizeImageOutput = z.infer<typeof ResizeImageOutputSchema>;

export async function resizeImage(input: ResizeImageInput): Promise<ResizeImageOutput> {
  return resizeImageFlow(input);
}

const resizeImageFlow = ai.defineFlow(
  {
    name: 'resizeImageFlow',
    inputSchema: ResizeImageInputSchema,
    outputSchema: ResizeImageOutputSchema,
  },
  async ({ imageDataUri }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-image-preview',
      prompt: [
        { media: { url: imageDataUri } },
        {
          text: 'Resize this image to be 256x256 pixels. Ensure the output is a standard JPEG image. Do not change the content of the image, only resize and compress it.',
        },
      ],
      config: {
        responseModalities: ['IMAGE'],
        outputFileFormat: 'jpeg',
      },
    });

    if (!media.url) {
        throw new Error('Image resizing failed to return a data URI.');
    }

    return {
      imageDataUri: media.url,
    };
  }
);
