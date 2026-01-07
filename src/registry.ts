/**
 * OneFlight - Schema & Tools Registry
 *
 * Registers flight agent schemas and tools for bundled environments (Turbopack, Webpack).
 * Call initializeFlightSchemas() at app initialization time.
 *
 * @example
 * // In apps/next/instrumentation.ts or similar
 * import { initializeFlightSchemas } from '@onecoach/one-flight';
 * initializeFlightSchemas();
 */

import { registerSchemas, registerTools } from '@onecoach/one-agent/framework';
import {
  FlightSearchInputSchema,
  FlightSearchOutputSchema,
} from './sdk-agents/flight-search/schema';
import { flightSearchTools } from './sdk-agents/flight-search/tools/tools';

/**
 * Initialize flight domain schemas and tools
 *
 * Registers all flight-related agent schemas and tools with the SDK registry.
 * Must be called before executing flight agents.
 */
export function initializeFlightSchemas(): void {
  // Register schemas
  registerSchemas({
    'flight-search:input': FlightSearchInputSchema,
    'flight-search:output': FlightSearchOutputSchema,
  });

  // Register local tools
  registerTools({
    'flight-search': flightSearchTools,
  });
}
