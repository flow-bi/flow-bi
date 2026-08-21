import { describe, expect, it, vi } from 'vitest'

import { getCurrentUser } from './api'

describe('current user API', () => {
  it('gets only the current user name from /api/me/header through the authenticated request boundary', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ name: '실제 사용자' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCurrentUser()).resolves.toEqual({ name: '실제 사용자' })

    expect(fetchMock).toHaveBeenCalledWith('/api/me/header', {
      credentials: 'include',
      headers: {},
    })
  })

  it('rejects responses without a string name instead of substituting a display name', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: 42 }))))

    await expect(getCurrentUser()).rejects.toThrow('Current user response is invalid')
  })
})
