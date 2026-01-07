/**
 * @onecoach/lib-flight
 *
 * Flight search and deal finding for OneCoach.
 * Consolidated from apps/next, lib-ai-agents, and lib-mcp-server.
 */

// Types
export * from './types';

// Services
export * from './services';

// Agents
export * from './agents';

// Tools
export * from './tools';

// Registry (for bundled environments)
export { initializeFlightSchemas } from './registry';
