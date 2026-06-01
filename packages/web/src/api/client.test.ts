import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiDelete, apiGet, apiPost, apiPut } from './client';

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds GET URLs with query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiGet<{ ok: boolean }>('/foods', { category: 'TREAT', archived: 'true' });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/foods?category=TREAT&archived=true',
    );
  });

  it('posts JSON payloads to API paths', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'entry-1' }));
    vi.stubGlobal('fetch', fetchMock);

    await apiPost('/feed-entries', { foodId: 'food-1', pieces: 1 });

    expect(fetchMock).toHaveBeenCalledWith('/api/feed-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodId: 'food-1', pieces: 1 }),
    });
  });

  it('puts JSON payloads to API paths', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: 'food-1' }));
    vi.stubGlobal('fetch', fetchMock);

    await apiPut('/foods/food-1', { name: 'Nowa nazwa' });

    expect(fetchMock).toHaveBeenCalledWith('/api/foods/food-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nowa nazwa' }),
    });
  });

  it('returns undefined for successful empty DELETE responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiDelete('/cats/cat-1')).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/cats/cat-1', { method: 'DELETE' });
  });

  it('throws API error messages from failed responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Food not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiGet('/foods/missing')).rejects.toThrow('Food not found');
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
