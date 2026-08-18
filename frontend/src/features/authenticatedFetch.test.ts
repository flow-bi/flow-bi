import { afterEach, describe, expect, it, vi } from 'vitest'

import { authenticatedFetch, onUnauthenticated } from './authenticatedFetch'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('authenticatedFetch', () => {
  it('notifies the session boundary only when a protected request returns 401', async () => {
    const onExpired = vi.fn()
    const unsubscribe = onUnauthenticated(onExpired)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })))

    await authenticatedFetch('/api/schedules')

    expect(onExpired).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('does not end the session for forbidden or missing calendar responses', async () => {
    const onExpired = vi.fn()
    const unsubscribe = onUnauthenticated(onExpired)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })))

    await authenticatedFetch('/api/schedules/1')

    expect(onExpired).not.toHaveBeenCalled()
    unsubscribe()
  })
})
