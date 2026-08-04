import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

function InteractiveControl() {
  const [count, setCount] = useState(0)

  return (
    <button
      aria-label="Increment count"
      onClick={() => setCount((currentCount) => currentCount + 1)}
    >
      Count: {count}
    </button>
  )
}

describe('test environment', () => {
  it('renders accessible controls with jest-dom and asynchronous user interactions', async () => {
    const user = userEvent.setup()

    render(<InteractiveControl />)

    const incrementButton = screen.getByRole('button', { name: 'Increment count' })
    expect(incrementButton).toBeInTheDocument()

    await user.click(incrementButton)

    expect(incrementButton).toHaveTextContent('Count: 1')
  })
})
