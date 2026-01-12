/**
 * Flight Agents
 *
 * Exposes OneAgent SDK 3.1-based flight search agent.
 * The agent is defined in sdk-agents/flight-search and uses the workflow/worker pattern.
 *
 * Usage:
 * ```typescript
 * import { executeFlightSearch } from '@onecoach/lib-flight/agents';
 *
 * const result = await executeFlightSearch({
 *   flyFrom: ['MXP'],
 *   flyTo: ['BCN'],
 *   departureDate: '2025-02-15',
 * }, { userId: 'user_123' });
 * ```
 */

import { execute as sdkExecute, createInMemoryAdapter, type PersistenceAdapter } from '@onecoach/one-agent/framework';
// Side-effect import to register schemas in the SDK registry
import '../sdk-agents/flight-search/schema';
import type { FlightSearchInput as SDKFlightSearchInput, FlightSearchOutput } from '../sdk-agents/flight-search/schema';
import path from 'path';

// Export SDK-based types under distinct names to avoid conflict with ./types
export type { FlightSearchOutput as SDKFlightSearchOutput };

export interface FlightAgentOptions {
  userId: string;
  /** Prisma or in-memory adapter for persistence */
  persistence?: PersistenceAdapter;
}

/**
 * Execute a flight search using the OneAgent SDK 3.1 workflow.
 */
export async function executeFlightSearch(
  input: SDKFlightSearchInput,
  options: FlightAgentOptions
): Promise<{
  success: boolean;
  output?: FlightSearchOutput;
  error?: { message: string };
  meta: {
    duration: number;
    tokensUsed: number;
    costUSD: number;
  };
}> {
  const persistence = options.persistence ?? createInMemoryAdapter();

  return sdkExecute<FlightSearchOutput>(
    'sdk-agents/flight-search',
    input,
    {
      userId: options.userId,
      persistence,
      // SDK now handles bundled path normalization (Turbopack/Webpack)
      basePath: path.resolve(__dirname, '..'),
    }
  );
}



