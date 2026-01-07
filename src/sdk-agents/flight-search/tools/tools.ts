/**
 * Flight Search Agent - Local Tools
 *
 * Utility tools for the AI to call during flight analysis.
 * These are local computations, not API calls.
 *
 * AI SDK v6 tool format: { description, inputSchema, execute }
 */

import { z } from 'zod';

/**
 * Calculate a convenience score based on layover duration
 */
export const calculateLayoverScore = {
  description: 'Calculate convenience score based on layover duration. Use this to evaluate connecting flights.',
  inputSchema: z.object({
    layoverMinutes: z.number().describe('Layover duration in minutes'),
  }),
  execute: async ({ layoverMinutes }: { layoverMinutes: number }) => {
    if (layoverMinutes < 45) {
      return { score: 2, rating: 'risky', message: 'Very tight connection, high risk of missing flight' };
    }
    if (layoverMinutes < 90) {
      return { score: 6, rating: 'tight', message: 'Tight but manageable with efficient transfer' };
    }
    if (layoverMinutes < 180) {
      return { score: 9, rating: 'comfortable', message: 'Comfortable layover with time for meals' };
    }
    if (layoverMinutes < 300) {
      return { score: 7, rating: 'long', message: 'Long but acceptable layover' };
    }
    return { score: 4, rating: 'excessive', message: 'Very long wait, consider alternatives' };
  },
};

/**
 * Calculate value-for-money score comparing price to journey quality
 */
export const calculateValueScore = {
  description: 'Calculate value-for-money score. Higher is better (0-100 scale).',
  inputSchema: z.object({
    price: z.number().describe('Flight price in EUR'),
    durationMinutes: z.number().describe('Total journey duration in minutes'),
    isDirect: z.boolean().describe('Whether this is a direct flight'),
    numLayovers: z.number().optional().describe('Number of layovers'),
  }),
  execute: async ({ price, durationMinutes, isDirect, numLayovers = 0 }: {
    price: number;
    durationMinutes: number;
    isDirect: boolean;
    numLayovers?: number;
  }) => {
    // Price score: cheaper is better (normalized, 100 = €100 or less)
    const priceScore = Math.max(0, Math.min(100, (500 - price) / 4));

    // Time score: faster is better (normalized, 100 = 3 hours or less)
    const timeScore = Math.max(0, Math.min(100, (600 - durationMinutes) / 5));

    // Convenience bonus
    const directBonus = isDirect ? 20 : 0;
    const layoverPenalty = numLayovers * 5;

    // Weighted average
    const score = (priceScore * 0.5 + timeScore * 0.3 + directBonus - layoverPenalty);

    return {
      score: Math.round(Math.max(0, Math.min(100, score))),
      breakdown: {
        priceScore: Math.round(priceScore),
        timeScore: Math.round(timeScore),
        directBonus,
        layoverPenalty,
      },
    };
  },
};

/**
 * Compare two flight options and recommend the better one
 */
export const compareFlights = {
  description: 'Compare two flight options and recommend which is better based on price and convenience trade-offs.',
  inputSchema: z.object({
    flight1: z.object({
      label: z.string(),
      price: z.number(),
      durationMinutes: z.number(),
      isDirect: z.boolean(),
    }),
    flight2: z.object({
      label: z.string(),
      price: z.number(),
      durationMinutes: z.number(),
      isDirect: z.boolean(),
    }),
    priority: z.enum(['price', 'duration', 'convenience']).default('price'),
  }),
  execute: async ({ flight1, flight2, priority }: {
    flight1: { label: string; price: number; durationMinutes: number; isDirect: boolean };
    flight2: { label: string; price: number; durationMinutes: number; isDirect: boolean };
    priority: 'price' | 'duration' | 'convenience';
  }) => {
    const priceDiff = flight1.price - flight2.price;
    const timeDiff = flight1.durationMinutes - flight2.durationMinutes;

    // Calculate time value: how much is 1 hour saved worth?
    const hoursSaved = Math.abs(timeDiff) / 60;
    const costPerHourSaved = hoursSaved > 0 ? Math.abs(priceDiff) / hoursSaved : 0;

    let winner: string;
    let reasoning: string;

    if (priority === 'price') {
      winner = priceDiff < 0 ? flight1.label : flight2.label;
      reasoning = `${winner} is €${Math.abs(priceDiff)} cheaper`;
    } else if (priority === 'duration') {
      winner = timeDiff < 0 ? flight1.label : flight2.label;
      reasoning = `${winner} is ${Math.round(Math.abs(timeDiff) / 60 * 10) / 10}h faster`;
    } else {
      // Convenience: prefer direct, then shorter
      if (flight1.isDirect !== flight2.isDirect) {
        winner = flight1.isDirect ? flight1.label : flight2.label;
        reasoning = `${winner} is a direct flight`;
      } else {
        winner = timeDiff < 0 ? flight1.label : flight2.label;
        reasoning = `${winner} has a shorter journey`;
      }
    }

    return {
      winner,
      reasoning,
      priceDifference: priceDiff,
      timeDifferenceMinutes: timeDiff,
      costPerHourSaved: Math.round(costPerHourSaved),
    };
  },
};

/**
 * All local tools exported for registration
 */
export const flightSearchTools = {
  calculateLayoverScore,
  calculateValueScore,
  compareFlights,
};

export default flightSearchTools;
