
'use server';

/**
 * @fileOverview An AI agent for generating Instagram posts for the salon.
 *
 * - generateInstagramPost - A function that generates an Instagram post.
 * - GenerateInstagramPostInput - The input type for the generateInstagramPost function.
 * - GenerateInstagramPostOutput - The return type for the generateInstagramPost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInstagramPostInputSchema = z.object({
  serviceDescription: z
    .string()
    .describe('Description of the service being promoted in the Instagram post.'),
  salonName: z.string().describe('The name of the salon.'),
  targetAudience: z
    .string()
    .describe('Description of the target audience for the Instagram post.'),
  desiredTone: z
    .string()
    .describe('The desired tone of the Instagram post (e.g., friendly, professional, humorous).'),
});
export type GenerateInstagramPostInput = z.infer<typeof GenerateInstagramPostInputSchema>;

const GenerateInstagramPostOutputSchema = z.object({
  instagramPost: z.string().describe('The generated Instagram post content.'),
});
export type GenerateInstagramPostOutput = z.infer<typeof GenerateInstagramPostOutputSchema>;

export async function generateInstagramPost(input: GenerateInstagramPostInput): Promise<GenerateInstagramPostOutput> {
  console.log('[generateInstagramPost] Called with input:', JSON.stringify(input));
   try {
    const result = await generateInstagramPostFlow(input);
    console.log('[generateInstagramPost] Flow successfully returned:', JSON.stringify(result));
    return result;
  } catch (error: any) {
    console.error('[generateInstagramPost] Error calling flow:', error.message, error.stack);
    throw new Error(`Failed to generate Instagram post: ${error.message || 'Unknown error from flow'}`);
  }
}

const prompt = ai.definePrompt({
  name: 'generateInstagramPostPrompt',
  input: {schema: GenerateInstagramPostInputSchema},
  output: {schema: GenerateInstagramPostOutputSchema},
  prompt: `You are a social media manager for {{salonName}}, an upscale salon with a target audience of {{targetAudience}}.

  Generate an engaging Instagram post to promote the following service:
  {{serviceDescription}}

  The post should have a {{desiredTone}} tone, be concise, and include relevant hashtags to maximize reach. Do not use emojis in your response.
  Do not use markdown in your response.

  Your response MUST be a valid JSON object. It must ONLY contain the JSON object and nothing else. The JSON object must have a single key "instagramPost" which is a string containing the post. Example: {"instagramPost": "Check out our new service..."}
  `,
});

const generateInstagramPostFlow = ai.defineFlow(
  {
    name: 'generateInstagramPostFlow',
    inputSchema: GenerateInstagramPostInputSchema,
    outputSchema: GenerateInstagramPostOutputSchema,
  },
  async (input: GenerateInstagramPostInput): Promise<GenerateInstagramPostOutput> => {
    console.log(`[generateInstagramPostFlow] Received input:`, JSON.stringify(input, null, 2));
    let llmResponse;
    try {
      console.log(`[generateInstagramPostFlow] Calling LLM prompt...`);
      llmResponse = await prompt(input); 
      console.log(`[generateInstagramPostFlow] LLM call appears successful.`);
      if (llmResponse && llmResponse.usage) {
        console.log(`[generateInstagramPostFlow] LLM Usage:`, JSON.stringify(llmResponse.usage, null, 2));
      }
      if (llmResponse && llmResponse.hasOwnProperty('output')) {
        console.log(`[generateInstagramPostFlow] Raw LLM output type: ${typeof llmResponse.output}`);
        console.log(`[generateInstagramPostFlow] Raw LLM output value:`, JSON.stringify(llmResponse.output, null, 2));
      } else {
        console.warn(`[generateInstagramPostFlow] LLM response did not contain an 'output' property as expected. Full response:`, JSON.stringify(llmResponse, null, 2));
      }

    } catch (llmError: any) {
      console.error(`[generateInstagramPostFlow] Error DURING LLM prompt call:`, llmError.message);
      console.error(`[generateInstagramPostFlow] LLM Error name:`, llmError.name);
      console.error(`[generateInstagramPostFlow] LLM Error stack:`, llmError.stack);
      if (llmError.cause) console.error(`[generateInstagramPostFlow] LLM Error cause:`, llmError.cause);
      throw new Error(`LLM prompt call failed: ${llmError.message}`);
    }
    
    const { output } = llmResponse;

    if (output === null || output === undefined) {
       console.error('[generateInstagramPostFlow] Critical Error: LLM output property was null or undefined after a successful call. This implies a schema mismatch or an empty response from the model where one was expected.');
      throw new Error('LLM output property was null or undefined and is required by the schema. The model might have failed to generate a conformant response or the response was empty.');
    }

    let parsedOutput: GenerateInstagramPostOutput;
    if (typeof output === 'string') {
      try {
        parsedOutput = JSON.parse(output) as GenerateInstagramPostOutput;
        console.log(`[generateInstagramPostFlow] Successfully parsed string output into JSON.`);
      } catch (parseError: any) {
        console.error('[generateInstagramPostFlow] JSON Parse Error: LLM output was a string but not valid JSON.', parseError.message);
        console.error('[generateInstagramPostFlow] Raw LLM string output that failed to parse:', output);
        throw new Error(`LLM output was a string but not valid JSON: ${parseError.message}. Raw output: ${output}`);
      }
    } else if (typeof output === 'object' && output !== null) {
      parsedOutput = output as GenerateInstagramPostOutput; // Genkit might have already parsed it
      console.log(`[generateInstagramPostFlow] LLM output was already an object. Proceeding with validation.`);
    } else {
      console.error('[generateInstagramPostFlow] LLM output was not a string or a usable object:', typeof output, output);
      throw new Error('LLM output was not in the expected format (string or object).');
    }

    const validationResult = GenerateInstagramPostOutputSchema.safeParse(parsedOutput);
    if (!validationResult.success) {
      console.error('[generateInstagramPostFlow] Zod Validation Error: Parsed LLM output does not match schema.', validationResult.error.errors);
      console.error('[generateInstagramPostFlow] Parsed output that failed Zod validation:', JSON.stringify(parsedOutput, null, 2));
      throw new Error(`LLM output failed Zod validation: ${validationResult.error.message}`);
    }
    
    console.log(`[generateInstagramPostFlow] Successfully validated output against Zod schema:`, JSON.stringify(validationResult.data, null, 2));
    return validationResult.data;
  }
);

