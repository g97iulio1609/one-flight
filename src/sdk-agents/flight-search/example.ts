/**
 * Flight Search Agent - Usage Example
 * 
 * Demonstrates how to use the OneAgent SDK v3.0 with the flight-search agent.
 */

import {
  execute,
  createInMemoryAdapter,
} from '@onecoach/one-agent/framework';
import type { FlightSearchInput, FlightSearchOutput } from './schema';

/**
 * Example: Search for flights using the SDK
 */
async function searchFlightsExample(): Promise<void> {
  // Use in-memory adapter for development (use createPrismaAdapter in production)
  const persistence = createInMemoryAdapter();

  const input: FlightSearchInput = {
    flyFrom: ['MXP', 'LIN'], // Milan airports
    flyTo: ['BCN'],          // Barcelona
    departureDate: '2025-02-15',
    returnDate: '2025-02-22',
    maxResults: 5,
    currency: 'EUR',
  };

  try {
    const result = await execute<FlightSearchOutput>(
      'sdk-agents/flight-search',
      input,
      {
        userId: 'test-user-123',
        persistence,
        basePath: __dirname,
      }
    );

    if (result.success && result.output) {
      console.log('✅ Flight search completed successfully!');
      console.log(`Trip Type: ${result.output.tripType}`);
      console.log(`Total Results: ${result.output.metadata.totalResults}`);
      
      if (result.output.metadata.cheapestPrice) {
        console.log(`Cheapest Price: €${result.output.metadata.cheapestPrice}`);
      }

      console.log('\n📤 Outbound Flights:');
      for (const flight of result.output.outbound.slice(0, 3)) {
        console.log(`  ${flight.cityFrom} → ${flight.cityTo}: €${flight.price}`);
      }

      if (result.output.return) {
        console.log('\n📥 Return Flights:');
        for (const flight of result.output.return.slice(0, 3)) {
          console.log(`  ${flight.cityFrom} → ${flight.cityTo}: €${flight.price}`);
        }
      }
    } else {
      console.error('❌ Flight search failed:', result.error?.message);
    }

    // Log execution metadata
    console.log('\n📊 Execution Stats:');
    console.log(`  Duration: ${result.meta.duration}ms`);
    console.log(`  Tokens: ${result.meta.tokensUsed}`);
    console.log(`  Cost: $${result.meta.costUSD.toFixed(4)}`);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run example
searchFlightsExample().catch(console.error);
