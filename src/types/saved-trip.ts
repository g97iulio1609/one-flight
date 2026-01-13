import { z } from 'zod';
import { FlightResultSchema, FlightAnalysisSchema, FlightRecommendationSchema } from '../sdk-agents/flight-search/schema';

// Re-export schemas for use in API
export { FlightResultSchema, FlightAnalysisSchema, FlightRecommendationSchema };

export type FlightResult = z.infer<typeof FlightResultSchema>;
export type FlightAnalysis = z.infer<typeof FlightAnalysisSchema>;
export type FlightRecommendation = z.infer<typeof FlightRecommendationSchema>;

// Saved Trip Input Schema (for API validation)
export const SavedTripInputSchema = z.object({
  name: z.string().optional(),
  note: z.string().optional(),
  outboundFlight: FlightResultSchema,
  returnFlight: FlightResultSchema.optional(),
  aiAnalysis: FlightAnalysisSchema,
  aiRecommendation: FlightRecommendationSchema,
  combinedDeepLink: z.string().optional(),
});

export type SavedTripInput = z.infer<typeof SavedTripInputSchema>;

// Price History Item
export interface TripPriceHistoryItem {
  id: string;
  tripId: string;
  price: number;
  currency: string;
  checkedAt: Date;
  priceChange: number | null;
  changeType: string | null;
}

// Full Saved Trip Type (matching Prisma model but with typed JSON fields)
export interface SavedTrip {
  id: string;
  userId: string;
  name: string | null;
  tripType: string;
  
  destinationCity: string;
  destinationCityCode: string;
  originCity: string;
  originCityCode: string;
  
  outboundFlight: FlightResult;
  returnFlight: FlightResult | null;
  
  aiAnalysis: FlightAnalysis;
  aiRecommendation: FlightRecommendation;
  
  totalPrice: number;
  currency: string;
  
  outboundDeepLink: string;
  returnDeepLink: string | null;
  combinedDeepLink: string | null;
  
  departureDate: Date;
  returnDate: Date | null;
  
  note: string | null;
  
  createdAt: Date;
  updatedAt: Date;
  
  priceHistory?: TripPriceHistoryItem[];
}

export interface TripsByDestination {
  destinationCity: string;
  destinationCityCode: string;
  trips: SavedTrip[];
  tripCount: number;
  avgPrice: number;
}
