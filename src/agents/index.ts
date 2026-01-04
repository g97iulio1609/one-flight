/**
 * Flight Agents - Re-exports from @onecoach/lib-ai-agents
 *
 * lib-flight acts as a facade for flight-related functionality.
 * The actual agent implementations remain in lib-ai-agents (already a submodule).
 *
 * This ensures:
 * 1. Single source of truth for agent code
 * 2. No duplication of logging utilities
 * 3. Consistent versioning through lib-ai-agents submodule
 */

// Re-export flight agents from lib-ai-agents
// Consumers can import from '@onecoach/lib-flight/agents' for convenience
export { createFlightAgent, type FlightAgentConfig } from '@onecoach/lib-ai-agents';

// FlightHackerAgent for advanced search strategies
export { createFlightHackerAgent, type FlightHackerAgentConfig } from '@onecoach/lib-ai-agents';
