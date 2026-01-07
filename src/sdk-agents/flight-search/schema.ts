/**
 * Smart Flight Search Agent - Schema Definitions
 * 
 * Enhanced schema with AI-powered analysis and recommendations.
 */

import { z } from 'zod';

// ==================== INPUT SCHEMA ====================

export const FlightSearchInputSchema = z.object({
  /** Origin airport codes (IATA) */
  flyFrom: z.array(z.string()).min(1).describe('Origin airport codes (e.g., ["MXP", "LIN"])'),
  
  /** Destination airport codes (IATA) */
  flyTo: z.array(z.string()).min(1).describe('Destination airport codes (e.g., ["BCN", "MAD"])'),
  
  /** Departure date in YYYY-MM-DD format */
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Departure date (YYYY-MM-DD)'),
  
  /** Return date for round-trip (optional) */
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().describe('Return date for round-trip (YYYY-MM-DD)'),
  
  /** Maximum number of results per direction */
  maxResults: z.number().int().min(1).max(20).default(5).describe('Maximum results to return per direction'),
  
  /** User's preferred currency */
  currency: z.string().length(3).default('EUR').describe('Currency code (e.g., EUR, USD)'),

  /** User preferences for prioritization */
  preferences: z.object({
    /** Priority: price, duration, or convenience */
    priority: z.enum(['price', 'duration', 'convenience']).default('price'),
    /** Avoid layovers if possible */
    preferDirectFlights: z.boolean().default(true),
    /** Maximum acceptable layover duration in hours */
    maxLayoverHours: z.number().default(4),
    /** Preferred departure time range */
    departureTimePreference: z.enum(['morning', 'afternoon', 'evening', 'any']).default('any'),
  }).optional(),
});

export type FlightSearchInput = z.infer<typeof FlightSearchInputSchema>;

// ==================== FLIGHT RESULT SCHEMA ====================

const FlightResultSchema = z.object({
  id: z.string(),
  flyFrom: z.string(),
  flyTo: z.string(),
  cityFrom: z.string(),
  cityTo: z.string(),
  departure: z.object({
    utc: z.string(),
    local: z.string(),
  }),
  arrival: z.object({
    utc: z.string(),
    local: z.string(),
  }),
  totalDurationInSeconds: z.number(),
  price: z.number(),
  currency: z.string(),
  deepLink: z.string(),
  layovers: z.array(z.object({
    at: z.string(),
    city: z.string(),
    cityCode: z.string().optional(),
    durationInSeconds: z.number().optional(),
  })).optional(),
  direction: z.enum(['outbound', 'return']).optional(),
});

// ==================== RECOMMENDATION SCHEMA ====================

const FlightRecommendationSchema = z.object({
  /** Recommended outbound flight ID */
  outboundFlightId: z.string(),
  
  /** Recommended return flight ID (if round-trip) */
  returnFlightId: z.string().optional(),
  
  /** Deep link to book outbound flight */
  outboundDeepLink: z.string().optional(),
  
  /** Deep link to book return flight (or combined booking) */
  returnDeepLink: z.string().optional(),
  
  /** Combined booking deep link (if available) */
  deepLink: z.string().optional(),
  
  /** Total combined price */
  totalPrice: z.number(),
  
  /** Primary reason for this recommendation */
  strategy: z.enum([
    'best_value',           // Best balance of price and convenience
    'cheapest',             // Lowest total cost
    'fastest',              // Shortest total travel time
    'most_convenient',      // Best schedule, direct flights, etc.
    'flexible_combo',       // One-way combo that saves money
  ]),
  
  /** Confidence score (0-1) - optional for alternatives */
  confidence: z.number().min(0).max(1).optional().default(0.7),
  
  /** Detailed reasoning */
  reasoning: z.string(),
});

// ==================== ANALYSIS SCHEMA ====================

const FlightAnalysisSchema = z.object({
  /** Overall market assessment */
  marketSummary: z.string(),
  
  /** Price analysis */
  priceAnalysis: z.object({
    /** Average price for outbound flights */
    avgOutboundPrice: z.number(),
    /** Average price for return flights (if applicable) */
    avgReturnPrice: z.number().optional(),
    /** Is this a good time to book? */
    isPriceGood: z.boolean(),
    /** Price trend insight */
    priceTrend: z.string(),
  }),
  
  /** Route analysis */
  routeAnalysis: z.object({
    /** Best origin airport to depart from */
    bestOrigin: z.string().optional(),
    /** Reason for origin recommendation */
    originReason: z.string().optional(),
    /** Best destination airport */
    bestDestination: z.string().optional(),
    /** Reason for destination recommendation */
    destinationReason: z.string().optional(),
  }),
  
  /** Schedule insights */
  scheduleAnalysis: z.object({
    /** Are there good direct flight options? */
    hasGoodDirectOptions: z.boolean(),
    /** Average layover duration for connecting flights */
    avgLayoverMinutes: z.number().optional(),
    /** Best time to fly */
    bestTimeToFly: z.string(),
  }),
  
  /** Key insights (bullet points) */
  keyInsights: z.array(z.string()).min(1).max(5),
  
  /** Potential savings tips */
  savingsTips: z.array(z.string()).optional(),
});

// ==================== OUTPUT SCHEMA ====================

export const FlightSearchOutputSchema = z.object({
  /** Trip type */
  tripType: z.enum(['one-way', 'round-trip']),
  
  /** Outbound flights */
  outbound: z.array(FlightResultSchema),
  
  /** Return flights (only for round-trip) */
  return: z.array(FlightResultSchema).optional(),
  
  /** AI-powered analysis */
  analysis: FlightAnalysisSchema,
  
  /** AI-powered recommendation */
  recommendation: FlightRecommendationSchema,
  
  /** Alternative recommendations (ranked) */
  alternatives: z.array(FlightRecommendationSchema).max(2).optional(),
  
  /** Search metadata */
  metadata: z.object({
    searchedAt: z.string(),
    totalResults: z.number(),
    cheapestPrice: z.number().optional(),
    searchDurationMs: z.number().optional(),
    agentVersion: z.string().default('3.0.0'),
  }),
});

export type FlightSearchOutput = z.infer<typeof FlightSearchOutputSchema>;
export type FlightResult = z.infer<typeof FlightResultSchema>;
export type FlightAnalysis = z.infer<typeof FlightAnalysisSchema>;
export type FlightRecommendation = z.infer<typeof FlightRecommendationSchema>;
