import { describe, it, expect } from 'vitest';
import { ProviderRegistry } from '../../src/providers/registry.js';

describe('ProviderRegistry', () => {
  const mockConfig = {
    openai: { apiKey: 'sk-test', baseUrl: 'https://api.openai.com/v1' },
    anthropic: { apiKey: 'sk-ant-test' },
    google: { apiKey: 'test-key' },
    local: { baseUrl: 'http://localhost:11434' },
  };

  it('registers providers on construction', () => {
    const registry = new ProviderRegistry(mockConfig);
    const all = registry.getAll();
    expect(all.length).toBe(3);
    expect(all[0].providerId).toBe('openai');
    expect(all[1].providerId).toBe('anthropic');
    expect(all[2].providerId).toBe('google');
  });

  it('filters available providers', () => {
    const registry = new ProviderRegistry(mockConfig);
    const available = registry.getAvailable();
    expect(available.length).toBe(3); // All have API keys
  });

  it('filters unavailable providers when API key is empty', () => {
    const noKeyConfig = {
      ...mockConfig,
      openai: { apiKey: '', baseUrl: '' },
    };
    const registry = new ProviderRegistry(noKeyConfig);
    const available = registry.getAvailable();
    expect(available.length).toBe(2);
  });

  it('finds model by id', () => {
    const registry = new ProviderRegistry(mockConfig);
    const result = registry.findByModelId('gpt-4o');
    expect(result).toBeDefined();
    expect(result!.model.id).toBe('gpt-4o');
    expect(result!.provider.providerId).toBe('openai');
  });

  it('returns undefined for unknown model', () => {
    const registry = new ProviderRegistry(mockConfig);
    const result = registry.findByModelId('nonexistent-model');
    expect(result).toBeUndefined();
  });

  it('lists all models from available providers', () => {
    const registry = new ProviderRegistry(mockConfig);
    const models = registry.listAllModels();
    expect(models.length).toBeGreaterThan(0);
  });
});
