// ============================================================
// AI provider abstraction.
//
// Every provider implements the same async interface:
//    generate({ query, user, memory, history }) -> { md, suggestions?, memory? }
//
// The default `LocalCrmProvider` runs the deterministic in-app
// engine over the CRM data — no network, no API key, no hallucination.
//
// To add Claude / OpenAI / Gemini / DeepSeek / a local LLM / an MCP
// server later, implement the same interface and register it below.
// The UI never changes — it only talks to `getProvider()`.
// ============================================================
import { runEngine } from './engine.js'

export class LocalCrmProvider {
  id = 'local'
  name = 'SmartTech Local Engine'
  requiresKey = false

  async generate({ query, user, memory, appLang }) {
    // Deterministic + instant. Small artificial delay handled by the UI.
    return runEngine(query, { user, memory, appLang })
  }
}

/*
 * Example future provider (kept as a documented stub, intentionally inert):
 *
 * export class ClaudeProvider {
 *   id = 'claude'; name = 'Anthropic Claude'; requiresKey = true
 *   constructor(apiKey) { this.apiKey = apiKey }
 *   async generate({ query, user, memory, history }) {
 *     // 1. Build a CRM system prompt + RAG context from the data layer.
 *     // 2. Call the Messages API with tool-use bound to the SKILLS registry.
 *     // 3. Return { md, suggestions, memory } in the same shape.
 *   }
 * }
 */

const registry = {
  local: new LocalCrmProvider(),
}

// Which provider the app currently uses. Swap this (or read from Settings)
// to route through a hosted LLM once one is configured.
export const ACTIVE_PROVIDER = 'local'

export function registerProvider(provider) {
  registry[provider.id] = provider
}

export function getProvider(id = ACTIVE_PROVIDER) {
  return registry[id] || registry.local
}

export function listProviders() {
  return Object.values(registry).map((p) => ({ id: p.id, name: p.name, requiresKey: p.requiresKey }))
}
