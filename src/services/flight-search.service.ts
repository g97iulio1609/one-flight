import { createFlightAgent } from '@onecoach/lib-ai-agents';
import type { LanguageModel } from 'ai';
import type {
  FlightResult,
  FlightSearchInput,
  FlightSearchConfig,
  FlightSearchResponse,
  FlightDirection,
} from '../types/index.js';
import { FlightResultSchema } from '../types/index.js';

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
    const { logger, getMcpTools, getModelConfig } = config;
    const searchId = `${from}->${to}`;

    logger.info(`🔍 [${this.SERVICE_NAME}] Avvio ricerca singola: ${searchId}`);

    try {
      const modelConfig = await getModelConfig('chat');
      const mcpContext: Record<string, unknown> = { domain: 'chat' };

      const mcpTools = await getMcpTools({
        userId: 'system',
        isAdmin: false,
        mcpContext,
      });

      const { execute } = await createFlightAgent({
        userId: 'system',
        model: modelConfig.model as LanguageModel,
        mcpTools: mcpTools as Record<string, unknown>,
      });

      const prompt = this.buildSearchPrompt(from, to, departureDate, returnDate);
      const result = await execute(prompt);

      if (!result.success || !result.data) {
        logger.warn(`⚠️ [${this.SERVICE_NAME}] Nessun dato per ${searchId}`);
        return [];
      }

      const flights = this.parseAndValidateResults(result.data, searchId, logger);
      return flights;
    } catch (error) {
      logger.error(`❌ [${this.SERVICE_NAME}] Fallita ricerca ${searchId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  private static buildSearchPrompt(
    from: string,
    to: string,
    dep: string,
    ret?: string | null
  ): string {
    let prompt = `Find cheapest flights from ${from} to ${to} departing on ${dep}`;
    if (ret) {
      prompt += ` and returning on ${ret}`;
    }
    prompt += `. Return max 5 options. Ensure you get real data from the tools.`;
    return prompt;
  }

  private static parseAndValidateResults(
    agentData: { response: string; steps: unknown[] },
    searchId: string,
    logger: FlightSearchConfig['logger']
  ): FlightResult[] {
    let flights: unknown[] = [];

    // Extract from tool steps
    if (agentData.steps && Array.isArray(agentData.steps)) {
      flights = this.extractFlightsFromAgentSteps(agentData.steps);
    }

    // Fallback: parse JSON from response
    if (flights.length === 0 && typeof agentData.response === 'string') {
      try {
        const jsonMatch = agentData.response.match(/\[.*\]/s);
        if (jsonMatch) {
          flights = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Silent fail on parse error
      }
    }

    // Validate with Zod
    const validatedFlights: FlightResult[] = [];
    let flightIndex = 0;

    for (const flight of flights) {
      try {
        const rawFlight = flight as Record<string, unknown>;
        if (!rawFlight.id) {
          const uniqueStr = `${rawFlight.flyFrom}-${rawFlight.flyTo}-${rawFlight.price}-${flightIndex}-${Date.now()}`;
          rawFlight.id = `kiwi-${Buffer.from(uniqueStr).toString('base64').replace(/[+/=]/g, '')}`;
        }
        flightIndex++;

        const validated = FlightResultSchema.parse(rawFlight);
        validatedFlights.push(validated);
      } catch {
        // Skip invalid flights
      }
    }

    logger.info(
      `✅ [${this.SERVICE_NAME}] Validati ${validatedFlights.length} voli per ${searchId}`
    );
    return validatedFlights;
  }

  private static extractFlightsFromAgentSteps(steps: unknown[]): unknown[] {
    const flights: unknown[] = [];

    steps.forEach((step) => {
      const s = step as {
        toolResults?: Array<{
          toolName: string;
          output?: { content?: Array<{ type: string; text?: string }>; data?: unknown[] };
        }>;
      };

      if (s.toolResults) {
        const kiwiResults = s.toolResults.filter((tr) => tr.toolName === 'kiwi_search_flight');

        kiwiResults.forEach((tr) => {
          const toolOutput = tr.output;

          if (toolOutput?.content && Array.isArray(toolOutput.content)) {
            toolOutput.content.forEach((contentItem) => {
              if (contentItem.type === 'text' && contentItem.text) {
                try {
                  const parsed = JSON.parse(contentItem.text);
                  if (Array.isArray(parsed)) {
                    flights.push(...parsed);
                  } else if (parsed.data && Array.isArray(parsed.data)) {
                    flights.push(...parsed.data);
                  }
                } catch {
                  // Silent fail
                }
              }
            });
          } else if (toolOutput) {
            const data = toolOutput.data || toolOutput;
            if (Array.isArray(data)) {
              flights.push(...data);
            }
          }
        });
      }
    });

    return flights;
  }
}
