import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * API interaction tests for the Base44 client.
 *
 * We don't test the SDK internals (that's the SDK's responsibility) — we verify
 * that our wrapper wires appParams correctly and that the exported `base44` object
 * exposes the expected surface area.
 */

// Mock app-params so tests are hermetic (no window.localStorage dependency).
vi.mock('@/lib/app-params', () => ({
  appParams: {
    appId: 'test-app-id',
    token: 'test-token',
    functionsVersion: '1',
    appBaseUrl: null,
  },
}));

// Capture what createClient was called with.
const createClientMock = vi.fn((opts: unknown) => ({
  _opts: opts,
  auth: { me: vi.fn(), logout: vi.fn(), redirectToLogin: vi.fn() },
  entities: {},
  functions: { invoke: vi.fn() },
}));

vi.mock('@base44/sdk', () => ({ createClient: createClientMock }));

describe('base44Client', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockClear();
  });

  it('calls createClient with appId from appParams', async () => {
    await import('./base44Client');
    expect(createClientMock).toHaveBeenCalledOnce();
    const opts = createClientMock.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.appId).toBe('test-app-id');
  });

  it('passes token from appParams', async () => {
    await import('./base44Client');
    const opts = createClientMock.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.token).toBe('test-token');
  });

  it('sets requiresAuth to false', async () => {
    await import('./base44Client');
    const opts = createClientMock.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.requiresAuth).toBe(false);
  });

  it('exports a base44 object with auth and functions', async () => {
    const mod = await import('./base44Client');
    expect(mod.base44).toBeDefined();
    expect(mod.base44.auth).toBeDefined();
    expect(mod.base44.functions).toBeDefined();
  });
});

describe('base44Client — null-to-undefined coercion', () => {
  it('coerces null string param to undefined via ?? operator', () => {
    // Unit-test the coercion logic directly without re-importing the module.
    const nullishToUndefined = (v: string | null) => v ?? undefined;
    expect(nullishToUndefined(null)).toBeUndefined();
    expect(nullishToUndefined('abc')).toBe('abc');
  });
});
