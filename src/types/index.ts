import { z } from 'zod';

/**
 * Zod Schema per i risultati volo dal Kiwi MCP
 *
 * Basato sulla struttura reale restituita da Kiwi.com MCP Server:
 * {
 *   flyFrom, flyTo, cityFrom, cityTo,
 *   departure: { utc, local },
 *   arrival: { utc, local },
 *   totalDurationInSeconds, durationInSeconds, price, deepLink, currency,
 *   layovers: [{ at, city, cityCode, arrival, departure }]
 * }
 */
export const FlightResultSchema = z.object({
  // Identificatore unico - generato dal servizio se non presente
  id: z.string().optional(),

  // Aeroporti
  flyFrom: z.string(),
  flyTo: z.string(),
  cityFrom: z.string(),
  cityTo: z.string(),

  // Orari di partenza (formato Kiwi MCP)
  departure: z.object({
    utc: z.string(),
    local: z.string(),
  }),

  // Orari di arrivo (formato Kiwi MCP)
  arrival: z.object({
    utc: z.string(),
    local: z.string(),
  }),

  // Durata in secondi
  totalDurationInSeconds: z.number(),
  durationInSeconds: z.number().optional(),

  // Prezzo
  price: z.number(),
  currency: z.string().optional().default('EUR'),

  // Link per la prenotazione
  deepLink: z.string(),

  // Scali (opzionale)
  layovers: z
    .array(
      z.object({
        at: z.string(),
        city: z.string(),
        cityCode: z.string().optional(),
        arrival: z
          .object({
            utc: z.string(),
            local: z.string(),
          })
          .optional(),
        departure: z
          .object({
            utc: z.string(),
            local: z.string(),
          })
          .optional(),
      })
    )
    .optional(),
});

export type FlightResult = z.infer<typeof FlightResultSchema>;

export interface FlightSearchInput {
  flyFrom: string[];
  flyTo: string[];
  departureDate: string;
  returnDate?: string | null;
}

/**
 * Strategy used to find the deal
 */
export type DealStrategy = 'standard' | 'one-way-combo' | 'hidden-city' | 'flexible-dates';

/**
 * Extended flight result with deal information
 */
export interface FlightDeal extends FlightResult {
  /** Whether this flight is a deal (cheaper than standard) */
  isDeal: boolean;

  /** Amount saved compared to standard round-trip (in EUR) */
  savingsAmount?: number;

  /** Strategy used to find this deal */
  dealStrategy: DealStrategy;

  /** For one-way-combo: the outbound flight */
  outboundFlight?: FlightResult;

  /** For one-way-combo: the return flight */
  returnFlight?: FlightResult;

  /** Total price for combo deals (outbound + return) */
  comboTotalPrice?: number;

  /** Standard round-trip price for comparison */
  standardRoundTripPrice?: number;
}

/**
 * Supported AI feature types for model configuration.
 * Matches AIModelService.getFeatureModelConfig parameter.
 */
export type FeatureType = 'chat' | 'nutrition' | 'workout' | 'oneagenda';

/**
 * Configuration for flight search service
 */
export interface FlightSearchConfig {
  /** Function to get MCP tools for the agent */
  getMcpTools: (context: {
    userId: string;
    isAdmin: boolean;
    mcpContext: Record<string, unknown>;
  }) => Promise<unknown>;

  /** Function to get feature model config */
  getModelConfig: (feature: FeatureType) => Promise<{ model: unknown }>;

  /** Logger instance */
  logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
}
