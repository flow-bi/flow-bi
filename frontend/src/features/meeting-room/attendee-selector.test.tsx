import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AttendeeSelector } from './attendee-selector'

function StatefulAttendeeSelector({
  findCandidates,
  onChange,
}: {
  findCandidates: (query: string) => Promise<{ userId: number; displayName: string }[]>
  onChange: (attendees: { userId: number; displayName: string }[]) => void
}) {
  const [attendees, setAttendees] = useState<{ userId: number; displayName: string }[]>([])
  return (
    <AttendeeSelector
      selectedAttendees={attendees}
      onFindCandidates={findCandidates}
      onChange={(nextAttendees) => {
        setAttendees(nextAttendees)
        onChange(nextAttendees)
      }}
    />
  )
}

describe('AttendeeSelector', () => {
  it('normalizes searches, prevents duplicates, and synchronizes selected attendee IDs', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const findCandidates = vi.fn().mockResolvedValue([{ userId: 7, displayName: '김하늘' }])
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <StatefulAttendeeSelector findCandidates={findCandidates} onChange={onChange} />
      </QueryClientProvider>,
    )

    await user.type(screen.getByLabelText('참석자 검색'), '  김하늘  ')
    await user.click(await screen.findByRole('button', { name: '김하늘 참석자로 추가' }))
    expect(onChange).toHaveBeenLastCalledWith([{ userId: 7, displayName: '김하늘' }])
    await user.click(screen.getByRole('button', { name: '김하늘 참석자로 추가' }))
    expect(screen.getByRole('status')).toHaveTextContent('중복 참석자는 한 번만 추가됩니다.')
    await user.click(screen.getByRole('button', { name: '김하늘 제거' }))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([]))
    expect(findCandidates).toHaveBeenCalledWith('김하늘')
  })
})
