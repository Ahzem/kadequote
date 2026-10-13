import { AIParseRequest, AIParsedQuotation, OllamaStatusResponse } from '@/types/ai';
import { buildSystemPrompt } from './prompts';
import { AIRawOutputSchema } from '@/lib/validation/quotation';

const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'gemma3:1b';
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds

export function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL;
}

export function getOllamaModel(): string {
  return process.env.OLLAMA_MODEL || DEFAULT_MODEL;
}

/**
 * Checks connectivity to local Ollama instance and verifies model presence.
 */
export async function checkOllamaStatus(): Promise<OllamaStatusResponse> {
  const baseUrl = getOllamaBaseUrl();
  const targetModel = getOllamaModel();
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        connected: false,
        model: targetModel,
        modelInstalled: false,
        availableModels: [],
        error: `Ollama returned status ${res.status}: ${res.statusText}`,
        latencyMs: Date.now() - startTime,
      };
    }

    const data = await res.json();
    const models: string[] = Array.isArray(data.models)
      ? data.models.map((m: { name?: string; model?: string }) => m.name || m.model || '').filter(Boolean)
      : [];

    const isInstalled = models.some(
      (m) => m === targetModel || m.startsWith(`${targetModel}:`) || m === `${targetModel}:latest`
    );

    return {
      connected: true,
      model: targetModel,
      modelInstalled: isInstalled,
      availableModels: models,
      latencyMs: Date.now() - startTime,
    };
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : String(err);
    const errObj = err as { name?: string; cause?: { code?: string } };
    let errorMessage = rawError || 'Failed to connect to Ollama';

    if (errObj?.name === 'AbortError') {
      errorMessage = 'Connection to Ollama timed out (service may be stopped or overloaded)';
    } else if (errObj?.cause?.code === 'ECONNREFUSED' || rawError.includes('ECONNREFUSED')) {
      errorMessage = `Cannot connect to Ollama at ${baseUrl}. Ensure Ollama is installed and running.`;
    }

    return {
      connected: false,
      model: targetModel,
      modelInstalled: false,
      availableModels: [],
      error: errorMessage,
      latencyMs: Date.now() - startTime,
    };
  }
}

/**
 * Robust JSON parser that handles markdown code blocks or surrounding text
 */
export function extractAndParseJSON(rawText: string): unknown {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty AI response received');
  }

  const cleaned = rawText.trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue to substring extraction
  }

  // Look for ```json ... ``` blocks
  const markdownMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (markdownMatch && markdownMatch[1]) {
    try {
      return JSON.parse(markdownMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Look for the first outer {...} object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue
    }
  }

  throw new Error('AI output did not contain valid JSON: ' + cleaned.slice(0, 100));
}

/**
 * Sends quotation notes to local Ollama instance running Gemma 3 1B
 */
export async function parseQuotationWithOllama(
  payload: AIParseRequest
): Promise<AIParsedQuotation> {
  const baseUrl = getOllamaBaseUrl();
  const model = getOllamaModel();

  const systemPrompt = buildSystemPrompt(payload.priceList, payload.businessContext);

  const requestBody = {
    model,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Parse these notes into a structured quotation:\n\n${payload.notes}`,
      },
    ],
    format: 'json',
    stream: false,
    options: {
      temperature: 0.1,
      top_p: 0.9,
    },
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let rawContent = '';
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `Model '${model}' not found in Ollama. Please run: 'ollama run ${model}' in your terminal.`
        );
      }
      const errBody = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${errBody || response.statusText}`);
    }

    const data = await response.json();
    rawContent = data?.message?.content;

    if (!rawContent) {
      throw new Error('Ollama returned an empty response message');
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errObj = err as { name?: string; message?: string; cause?: { code?: string } };
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errObj?.name === 'AbortError') {
      throw new Error(
        `Ollama inference timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds. Ensure your computer is not out of memory.`
      );
    }
    if (errObj?.cause?.code === 'ECONNREFUSED' || errMsg.includes('ECONNREFUSED')) {
      throw new Error(
        `Could not reach Ollama at ${baseUrl}. Please ensure the Ollama desktop app or service is running.`
      );
    }
    throw err;
  }

  // Parse raw JSON
  const parsedJson = extractAndParseJSON(rawContent);

  // Validate and clean with Zod
  const validated = AIRawOutputSchema.parse(parsedJson);

  // Clean items and ensure needsReview is appropriately set
  const items = validated.items.map((item) => {
    const isUnpriced = item.unitPrice === null || item.unitPrice === 0;
    return {
      description: item.description,
      quantity: Math.max(1, item.quantity),
      unit: item.unit || 'piece',
      unitPrice: item.unitPrice,
      category: item.category,
      needsReview: item.needsReview || isUnpriced,
    };
  });

  const requiresReview = validated.requiresReview || items.some((i) => i.needsReview);

  return {
    customerName: validated.customerName,
    customerPhone: validated.customerPhone,
    customerAddress: validated.customerAddress,
    jobTitle: validated.jobTitle || 'Quotation Estimate',
    items,
    notes: validated.notes,
    requiresReview,
  };
}
