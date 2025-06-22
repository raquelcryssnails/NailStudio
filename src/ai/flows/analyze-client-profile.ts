
// src/ai/flows/analyze-client-profile.ts
'use server';

/**
 * @fileOverview AI flow for analyzing client profiles to generate insights for personalized service.
 *
 * - analyzeClientProfile - Function to trigger the client profile analysis flow.
 * - AnalyzeClientProfileInput - Input type for the analyzeClientProfile function.
 * - AnalyzeClientProfileOutput - Output type for the analyzeClientProfile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeClientProfileInputSchema = z.object({
  clientName: z.string().describe('The name of the client.'),
  clientHistory: z.string().describe('The client history of services and products.'),
  clientPreferences: z.string().describe('The client\s preferences in services and products.'),
});

export type AnalyzeClientProfileInput = z.infer<typeof AnalyzeClientProfileInputSchema>;

const AnalyzeClientProfileOutputSchema = z.object({
  insights: z.string().describe('Insights generated from the client profile analysis.'),
});

export type AnalyzeClientProfileOutput = z.infer<typeof AnalyzeClientProfileOutputSchema>;

export async function analyzeClientProfile(input: AnalyzeClientProfileInput): Promise<AnalyzeClientProfileOutput> {
  console.log('[analyzeClientProfile] Called with input:', JSON.stringify(input));
  try {
    const result = await analyzeClientProfileFlow(input);
    console.log('[analyzeClientProfile] Flow successfully returned:', JSON.stringify(result));
    return result;
  } catch (error: any) {
    console.error('[analyzeClientProfile] Error calling flow:', error.message, error.stack);
    // Re-throw the error to be caught by the client-side caller
    throw new Error(`Failed to analyze client profile: ${error.message || 'Unknown error from flow'}`);
  }
}

const analyzeClientProfilePrompt = ai.definePrompt({
  name: 'analyzeClientProfilePrompt',
  input: {schema: AnalyzeClientProfileInputSchema},
  output: {schema: AnalyzeClientProfileOutputSchema},
  prompt: `You are an AI assistant analyzing client profiles to generate insights for personalized services in a beauty salon.

  Analyze the client's history and preferences to identify opportunities for service personalization and improved customer satisfaction.

  Client Name: {{{clientName}}}
  Client History: {{{clientHistory}}}
  Client Preferences: {{{clientPreferences}}}

  Your response MUST be a valid JSON object. It must ONLY contain the JSON object and nothing else. The JSON object must have a single key "insights" which is a string. Example: {"insights": "Some insightful text."}
  Do not use markdown or any other formatting in your response.
  `,
});

const analyzeClientProfileFlow = ai.defineFlow(
  {
    name: 'analyzeClientProfileFlow',
    inputSchema: AnalyzeClientProfileInputSchema,
    outputSchema: AnalyzeClientProfileOutputSchema,
  },
  async (input: AnalyzeClientProfileInput): Promise<AnalyzeClientProfileOutput> => {
    console.log(`[analyzeClientProfileFlow] Received input:`, JSON.stringify(input, null, 2));
    let llmResponse;
    try {
      console.log(`[analyzeClientProfileFlow] Calling LLM prompt...`);
      llmResponse = await analyzeClientProfilePrompt(input);
      console.log(`[analyzeClientProfileFlow] LLM call appears successful.`);
      if (llmResponse && llmResponse.usage) {
        console.log(`[analyzeClientProfileFlow] LLM Usage:`, JSON.stringify(llmResponse.usage, null, 2));
      }
      if (llmResponse && llmResponse.hasOwnProperty('output')) {
        console.log(`[analyzeClientProfileFlow] Raw LLM output type: ${typeof llmResponse.output}`);
        console.log(`[analyzeClientProfileFlow] Raw LLM output value:`, JSON.stringify(llmResponse.output, null, 2));
      } else {
        console.warn(`[analyzeClientProfileFlow] LLM response did not contain an 'output' property as expected. Full response:`, JSON.stringify(llmResponse, null, 2));
      }

    } catch (llmError: any) {
      console.error(`[analyzeClientProfileFlow] Error DURING LLM prompt call:`, llmError.message);
      console.error(`[analyzeClientProfileFlow] LLM Error name:`, llmError.name);
      console.error(`[analyzeClientProfileFlow] LLM Error stack:`, llmError.stack);
      if (llmError.cause) console.error(`[analyzeClientProfileFlow] LLM Error cause:`, llmError.cause);
      throw new Error(`LLM prompt call failed: ${llmError.message}`);
    }

    const { output } = llmResponse;

    if (output === null || output === undefined) {
      console.error('[analyzeClientProfileFlow] Critical Error: LLM output property was null or undefined after a successful call. This implies a schema mismatch or an empty response from the model where one was expected.');
      throw new Error('LLM output property was null or undefined and is required by the schema. The model might have failed to generate a conformant response or the response was empty.');
    }
    
    let parsedOutput: AnalyzeClientProfileOutput;
    if (typeof output === 'string') {
      try {
        parsedOutput = JSON.parse(output) as AnalyzeClientProfileOutput;
        console.log(`[analyzeClientProfileFlow] Successfully parsed string output into JSON.`);
      } catch (parseError: any) {
        console.error('[analyzeClientProfileFlow] JSON Parse Error: LLM output was a string but not valid JSON.', parseError.message);
        console.error('[analyzeClientProfileFlow] Raw LLM string output that failed to parse:', output);
        throw new Error(`LLM output was a string but not valid JSON: ${parseError.message}. Raw output: ${output}`);
      }
    } else if (typeof output === 'object' && output !== null) {
      parsedOutput = output as AnalyzeClientProfileOutput; // Genkit might have already parsed it
      console.log(`[analyzeClientProfileFlow] LLM output was already an object. Proceeding with validation.`);
    } else {
       console.error('[analyzeClientProfileFlow] LLM output was not a string or a usable object:', typeof output, output);
       throw new Error('LLM output was not in the expected format (string or object).');
    }

    const validationResult = AnalyzeClientProfileOutputSchema.safeParse(parsedOutput);
    if (!validationResult.success) {
      console.error('[analyzeClientProfileFlow] Zod Validation Error: Parsed LLM output does not match schema.', validationResult.error.errors);
      console.error('[analyzeClientProfileFlow] Parsed output that failed Zod validation:', JSON.stringify(parsedOutput, null, 2));
      throw new Error(`LLM output failed Zod validation: ${validationResult.error.message}`);
    }

    console.log(`[analyzeClientProfileFlow] Successfully validated output against Zod schema:`, JSON.stringify(validationResult.data, null, 2));
    return validationResult.data;
  }
);

