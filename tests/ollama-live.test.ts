import { describe, it, expect } from 'vitest';
import { parseQuotationWithOllama, checkOllamaStatus } from '../lib/ai/ollama';

describe('Live Ollama Integration Test (gemma3:1b)', () => {
  it('connects to local Ollama and sees gemma3:1b installed', async () => {
    const status = await checkOllamaStatus();
    expect(status.connected).toBe(true);
    expect(status.modelInstalled).toBe(true);
  }, 10000);

  it('parses the user example job notes accurately with Gemma 3 1B', async () => {
    const notes = 'Replace 3 switches, repair one electrical socket, labour 2500 rupees, switches cost 450 each and socket repair parts 800.';
    const result = await parseQuotationWithOllama({ notes });

    expect(result).toBeDefined();
    expect(result.items.length).toBeGreaterThanOrEqual(2);
    // Verify switches or sockets extracted
    const descriptions = result.items.map((i) => i.description.toLowerCase()).join(' ');
    expect(descriptions).toMatch(/switch|socket/);
    console.log('Parsed result from Gemma 3 1B:', JSON.stringify(result, null, 2));
  }, 35000);
});
