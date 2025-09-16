import crypto from 'crypto';
import { z } from 'zod';

// Fathom webhook payload schema
export const FathomWebhookSchema = z.object({
  event: z.literal('recording_finished'),
  data: z.object({
    meeting_id: z.string(),
    title: z.string(),
    started_at: z.string().datetime(),
    duration_seconds: z.number(),
    participants: z.array(z.object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
    })),
    transcript: z.object({
      available: z.boolean(),
      language: z.string().optional(),
      text: z.string().optional(),
    }),
    recording_url: z.string().url(),
    metadata: z.record(z.any()).optional(),
  }),
});

export type FathomWebhookPayload = z.infer<typeof FathomWebhookSchema>;

// HMAC verification for webhook security
export function verifyFathomWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(cleanSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying Fathom webhook signature:', error);
    return false;
  }
}

// Fathom API client for fetching transcript if needed
export class FathomAPI {
  private apiKey: string;
  private baseUrl = 'https://app.fathom.video/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTranscript(meetingId: string): Promise<{
    text: string;
    language: string;
    segments: Array<{
      speaker: string;
      text: string;
      start: number;
      end: number;
    }>;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/meetings/${meetingId}/transcript`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Fathom API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching transcript from Fathom:', error);
      return null;
    }
  }

  async getMeetingDetails(meetingId: string): Promise<{
    id: string;
    title: string;
    started_at: string;
    duration_seconds: number;
    participants: Array<{
      id: string;
      name?: string;
      email?: string;
    }>;
    recording_url: string;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Fathom API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching meeting details from Fathom:', error);
      return null;
    }
  }
}