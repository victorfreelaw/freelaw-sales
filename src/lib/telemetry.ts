// Telemetry utilities for FreelawSales
// Logs events without PII, with correlation IDs for debugging

interface TelemetryEvent {
  event: string;
  correlationId?: string;
  timestamp?: string;
  [key: string]: any;
}

export class Telemetry {
  private static generateCorrelationId(): string {
    return `tel_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private static sanitizeValue(value: any): any {
    // Remove PII from telemetry data
    if (typeof value === 'string') {
      // Redact email addresses
      if (value.includes('@')) {
        return '[EMAIL_REDACTED]';
      }
      // Redact long strings that might contain PII
      if (value.length > 100) {
        return '[CONTENT_REDACTED]';
      }
    }
    
    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeValue(item));
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        // Skip known PII fields
        if (['email', 'name', 'fullName', 'text', 'rawText', 'transcript'].includes(key)) {
          sanitized[key] = '[PII_REDACTED]';
        } else {
          sanitized[key] = this.sanitizeValue(val);
        }
      }
      return sanitized;
    }
    
    return value;
  }

  static emit(eventName: string, properties: Record<string, any> = {}): void {
    const event: TelemetryEvent = {
      event: eventName,
      correlationId: this.generateCorrelationId(),
      timestamp: new Date().toISOString(),
      ...this.sanitizeValue(properties),
    };

    // In development, log to console
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Telemetry:', JSON.stringify(event, null, 2));
    } else {
      // In production, use structured logging
      console.log(JSON.stringify(event));
    }
  }

  // Specific telemetry methods for different event types
  static analysisCompleted(props: {
    meetingId: string;
    scriptScore: number;
    icpFit: string;
    durationMs: number;
  }): void {
    this.emit('analysis.completed', props);
  }

  static hubspotSynced(props: {
    meetingId: string;
    contactId?: string;
    companyId?: string;
    dealId?: string;
    success: boolean;
  }): void {
    this.emit('hubspot.synced', props);
  }

  static slackNotified(props: {
    meetingId: string;
    channelId?: string;
    success: boolean;
  }): void {
    this.emit('slack.notified', props);
  }

  static meetingIngested(props: {
    meetingId: string;
    sourceId: string;
    participants: number;
    duration: number;
    hasTranscript: boolean;
  }): void {
    this.emit('meeting.ingested', props);
  }

  static webhookFailed(props: {
    service: string;
    errorCode?: string;
    retryAttempt?: number;
  }): void {
    this.emit('webhook.failed', props);
  }

  static userLogin(props: {
    userId: string;
    role: string;
  }): void {
    this.emit('user.login', props);
  }

  static pageView(props: {
    path: string;
    userId?: string;
    loadTime?: number;
  }): void {
    this.emit('page.view', props);
  }

  // Wrapper for timing operations
  static async time<T>(
    operation: string,
    fn: () => Promise<T>,
    additionalProps: Record<string, any> = {}
  ): Promise<T> {
    const startTime = Date.now();
    const correlationId = this.generateCorrelationId();
    
    this.emit(`${operation}.started`, { correlationId, ...additionalProps });
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      this.emit(`${operation}.completed`, {
        correlationId,
        durationMs: duration,
        success: true,
        ...additionalProps,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.emit(`${operation}.failed`, {
        correlationId,
        durationMs: duration,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        ...additionalProps,
      });
      
      throw error;
    }
  }
}