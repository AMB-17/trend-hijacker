import OpenAI from '@openai/sdk';
import { logger } from '../utils/logger';

const openaiApiKey = process.env.OPENAI_API_KEY;

class OpenAIService {
  private client: OpenAI | null = null;
  private initialized = false;

  initialize() {
    if (!openaiApiKey) {
      logger.warn('OPENAI_API_KEY not configured - AI features disabled');
      this.initialized = false;
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: openaiApiKey,
      });
      this.initialized = true;
      logger.info('OpenAI client initialized');
    } catch (error) {
      logger.error('Failed to initialize OpenAI client', error);
      this.initialized = false;
    }
  }

  isInitialized() {
    return this.initialized && !!this.client;
  }

  async generateCompletion(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      responseFormat?: { type: 'json_object' };
    }
  ): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: options?.model || 'gpt-4-turbo',
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
        ...(options?.responseFormat && { response_format: options.responseFormat }),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return content;
    } catch (error) {
      logger.error('OpenAI API error', error);
      throw error;
    }
  }

  async generateStructuredCompletion<T>(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    schema: object,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<T> {
    const content = await this.generateCompletion(messages, {
      ...options,
      responseFormat: { type: 'json_object' },
    });

    try {
      return JSON.parse(content) as T;
    } catch {
      logger.error('Failed to parse JSON response from OpenAI', { content });
      throw new Error('Invalid JSON response from OpenAI');
    }
  }
}

export const openaiService = new OpenAIService();
