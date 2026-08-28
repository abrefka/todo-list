import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('todo app', () => {
  it('adds a task, switches filters, and deletes a task', async () => {
    const user = userEvent.setup()
    render(<App />)

    const input = screen.getByPlaceholderText(/add a task/i)
    await user.type(input, 'Plan launch')
    await user.selectOptions(screen.getByLabelText(/task type/i), 'one-time')
    await user.click(screen.getByRole('button', { name: /add task/i }))

    expect(screen.getByText('Plan launch')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /weekly/i }))
    expect(screen.queryByText('Plan launch')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /all tasks/i }))
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)

    expect(screen.queryByText('Plan launch')).not.toBeInTheDocument()
  })
})
