import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import App from './App.jsx'
import { useAuth } from './stores/useAuth.js'
import { useCrmData } from './stores/useCrmData.js'

describe('SmartTech CRM', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuth.setState({ user: null })
    useCrmData.setState({ customers: [], products: [], orders: [], status: 'idle', error: null })
  })

  it('shows the login page when signed out', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows the dashboard after signing in', async () => {
    // Stub the backend bootstrap call.
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ customers: [], products: [], orders: [] }),
    }))
    localStorage.setItem('stc.token', 'test-token')
    useAuth.setState({ user: { name: 'Azimov Diyorbek', email: 'admin@smarttech.uz', role: 'Super Admin' } })

    render(<App />)
    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument()
  })
})
