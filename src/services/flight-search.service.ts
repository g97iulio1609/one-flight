
import type {
  FlightResult,
  FlightSearchInput,
  FlightSearchConfig,
  FlightSearchResponse,
  FlightDirection,
} from '../types';

/**
 * Flight Search Service
 *
 * Orchestrates flight search using AI agents.
 * Uses dependency injection for MCP tools and model config to remain platform-agnostic.
 */
export class FlightSearchService {
  private static readonly SERVICE_NAME = 'FlightSearchService';
  private static config: FlightSearchConfig | null = null;

  /**
   * Initialize the service with configuration.
   * Must be called before using search().
   */
  static configure(config: FlightSearchConfig): void {
    FlightSearchService.config = config;
  }

  private static getConfig(): FlightSearchConfig {
    if (!FlightSearchService.config) {
      throw new Error(
        `[${this.SERVICE_NAME}] Service not configured. Call FlightSearchService.configure() first.`
      );
    }
    return FlightSearchService.config;
  }

  /**
   * Esegue una ricerca voli utilizzando l'AI Agent specializzato.
   * Returns structured FlightSearchResponse with separate outbound/return arrays for round-trips.
   */
  static async search(input: FlightSearchInput): Promise<FlightSearchResponse> {
    const config = this.getConfig();
    const { logger } = config;
    const startTime = Date.now();
    const { flyFrom, flyTo, departureDate, returnDate } = input;
    const isRoundTrip = !!returnDate;

    logger.info(`✈️ [${this.SERVICE_NAME}] Avvio ricerca voli`, {
      module: 'flight',
      from: flyFrom,
      to: flyTo,
      tripType: isRoundTrip ? 'round-trip' : 'one-way',
    });

    try {
      // Generate all airport pair combinations
      const searchPairs: { from: string; to: string }[] = [];
      for (const from of flyFrom) {
        for (const to of flyTo) {
          searchPairs.push({ from, to });
        }
      }

      if (isRoundTrip) {
        // ROUND-TRIP: Separate searches for outbound and return
        const [outboundResults, returnResults] = await Promise.all([
          this.executeDirectionalSearch(searchPairs, departureDate, 'outbound'),
          this.executeDirectionalSearch(
            searchPairs.map((p) => ({ from: p.to, to: p.from })), // Swap direction
            returnDate,
            'return'
          ),
        ]);

        logger.info(`✅ [${this.SERVICE_NAME}] Round-trip search completed`, {
          outboundCount: outboundResults.length,
          returnCount: returnResults.length,
          durationMs: Date.now() - startTime,
        });

        return {
          tripType: 'round-trip',
          outbound: outboundResults,
          return: returnResults,
        };
      } else {
        // ONE-WAY: Single direction search
        const flights = await this.executeDirectionalSearch(searchPairs, departureDate, 'outbound');

        logger.info(`✅ [${this.SERVICE_NAME}] One-way search completed`, {
          totalFound: flights.length,
          durationMs: Date.now() - startTime,
        });

        return {
          tripType: 'one-way',
          flights,
        };
      }
    } catch (error) {
      logger.error(`❌ [${this.SERVICE_NAME}] Errore durante la ricerca`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Executes searches for multiple airport pairs and tags results with direction.
   */
  private static async executeDirectionalSearch(
    pairs: { from: string; to: string }[],
    date: string,
    direction: FlightDirection
  ): Promise<FlightResult[]> {
    const searchPromises = pairs.map((pair) =>
      this.executeSingleSearch(pair.from, pair.to, date, null) // No return date for single-leg
    );

    const allResults = await Promise.all(searchPromises);

    // Flatten, deduplicate, and tag with direction
    const seenKeys = new Set<string>();
    const flights: FlightResult[] = [];

    for (const results of allResults) {
      for (const flight of results) {
        const uniqueKey = `${flight.flyFrom}-${flight.flyTo}-${flight.price}-${flight.departure.local}`;
        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          flights.push({ ...flight, direction });
        }
      }
    }

    // Sort by price
    return flights.sort((a, b) => a.price - b.price);
  }

  /**
   * Esegue una singola ricerca per una coppia di aeroporti.
   */
  private static async executeSingleSearch(
    from: string,
    to: string,
    departureDate: string,
    returnDate?: string | null
  ): Promise<FlightResult[]> {
    const config = this.getConfig();
    const { logger } = config;
    const searchId = `${from}->${to}`;

    logger.info(`🔍 [${this.SERVICE_NAME}] Avvio ricerca singola: ${searchId}`);

    try {
      // Use SDK 3.1 executeFlightSearch directly
      const { executeFlightSearch } = await import('../agents');

      const result = await executeFlightSearch({
        flyFrom: [from],
        flyTo: [to],
        departureDate,
        returnDate: returnDate ?? undefined,
        maxResults: 5,
        currency: 'EUR',
      }, { userId: 'system' });

      if (!result.success || !result.output) {
        logger.warn(`⚠️ [${this.SERVICE_NAME}] Nessun dato per ${searchId}`);
        return [];
      }

      // Map SDK output to FlightResult format
      const flights: FlightResult[] = result.output.outbound.map((flight) => ({
        id: flight.id,
        flyFrom: flight.flyFrom,
        flyTo: flight.flyTo,
        cityFrom: flight.cityFrom,
        cityTo: flight.cityTo,
        departure: flight.departure,
        arrival: flight.arrival,
        totalDurationInSeconds: flight.totalDurationInSeconds,
        price: flight.price,
        currency: flight.currency,
        deepLink: flight.deepLink,
        layovers: flight.layovers?.map(l => ({
          at: l.at,
          city: l.city,
          cityCode: l.cityCode,
        })),
        direction: flight.direction as FlightDirection,
      }));

      return flights;
    } catch (error) {
      logger.error(`❌ [${this.SERVICE_NAME}] Fallita ricerca ${searchId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}


