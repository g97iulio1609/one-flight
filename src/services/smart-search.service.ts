/**
 * Smart Flight Search Service
 *
 * Uses the OneAgent SDK v3.0 to execute the flight-search agent.
 * The agent uses ToolLoopAgent with MCP tools (Kiwi) for flight data
 * and AI analysis for recommendations.
 *
 * Integrates with the centralized AI model system from admin settings.
 */

import { execute } from '@onecoach/one-agent/framework';
import type { FlightResult } from '../types';
import { resolve } from 'path';
import { initializeFlightSchemas } from '../registry';

// =============================================================================
// Types
// =============================================================================

export interface FlightSearchInput {
  flyFrom: string[];
  flyTo: string[];
  departureDate: string;
  returnDate?: string | null;
  maxResults?: number;
  currency?: string;
  preferences?: {
    priority?: 'price' | 'duration' | 'convenience';
    preferDirectFlights?: boolean;
    maxLayoverHours?: number;
    departureTimePreference?: 'morning' | 'afternoon' | 'evening' | 'any';
  };
}

export interface FlightAnalysis {
  marketSummary: string;
  priceAnalysis: {
    avgOutboundPrice: number;
    avgReturnPrice?: number;
    isPriceGood: boolean;
    priceTrend: string;
  };
  routeAnalysis: {
    bestOrigin?: string;
    originReason?: string;
    bestDestination?: string;
    destinationReason?: string;
  };
  scheduleAnalysis: {
    hasGoodDirectOptions: boolean;
    avgLayoverMinutes?: number;
    bestTimeToFly: string;
  };
  keyInsights: string[];
  savingsTips?: string[];
}

export interface FlightRecommendation {
  outboundFlightId: string;
  returnFlightId?: string;
  totalPrice: number;
  strategy: 'best_value' | 'cheapest' | 'fastest' | 'most_convenient' | 'flexible_combo';
  confidence: number;
  reasoning: string;
  deepLink?: string;
  outboundDeepLink?: string;
  returnDeepLink?: string;
}

export interface FlightSearchOutput {
  tripType: 'one-way' | 'round-trip';
  outbound: FlightResult[];
  return?: FlightResult[];
  analysis: FlightAnalysis;
  recommendation: FlightRecommendation;
  alternatives?: FlightRecommendation[];
  metadata: {
    searchedAt: string;
    totalResults: number;
    cheapestPrice?: number;
  };
}

export interface SmartSearchResult {
  success: boolean;
  data?: FlightSearchOutput;
  error?: {
    message: string;
    code: string;
  };
  meta: {
    executionId: string;
    durationMs: number;
    tokensUsed: number;
    costUSD: number;
  };
  /** Workflow run ID for durable mode - use for polling/resume (SDK v4.0+) */
  workflowRunId?: string;
  /** Workflow status for durable mode */
  workflowStatus?: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
}

// =============================================================================
// Service State
// =============================================================================

let isInitialized = false;
let basePath: string = '';

/**
 * Initialize the smart search service
 *
 * The basePath should point to the directory containing sdk-agents/
 * In Next.js, process.cwd() returns apps/next, so we go up to monorepo root
 */
export function initializeSmartSearch(options: { basePath?: string } = {}): void {
  if (isInitialized) return;

  // Register flight schemas with SDK registry (required for bundled envs)
  initializeFlightSchemas();

  // Use provided basePath, or construct from monorepo root
  // process.cwd() in Next.js = /path/to/CoachOne/apps/next
  // We need: /path/to/CoachOne/submodules/one-flight/src
  // So: go up 2 levels (../../) then into submodules
  basePath = options.basePath ?? resolve(process.cwd(), '../../submodules/one-flight/src');
  isInitialized = true;
  console.log('[SmartSearch] Initialized with basePath:', basePath);
}

// =============================================================================
// Helper Function (Hoisted)
// =============================================================================

/**
 * Helper to populate deepLinks in recommendations by looking up flight IDs
 */
function enrichOutputWithDeepLinks(output: FlightSearchOutput): FlightSearchOutput {
  const allFlights = [...output.outbound, ...(output.return || [])];

  // Helper to enrich a single recommendation
  const enrichRec = (rec: FlightRecommendation): FlightRecommendation => {
    const outboundFlight = allFlights.find((f) => f.id === rec.outboundFlightId);
    const returnFlight = rec.returnFlightId
      ? allFlights.find((f) => f.id === rec.returnFlightId)
      : undefined;

    // If deepLink is already present, keep it (unless it's empty)
    if (rec.deepLink && rec.deepLink.length > 0) return rec;

    // Construct deep links
    const outboundLink = outboundFlight?.deepLink;
    const returnLink = returnFlight?.deepLink;

    // For round trips (both flights present)
    if (outboundFlight && returnFlight) {
      // If the outbound flight is actually a round-trip itinerary (Kiwi often returns this),
      // then its deepLink covers both. We can check if returnFlight has the same deepLink
      // or if outboundFlight.deepLink looks like a composite.
      //
      // HEURISTIC: Use outbound link as the main deepLink if it exists.
      // Ideally, we'd have a combined link.
      return {
        ...rec,
        outboundDeepLink: outboundLink,
        returnDeepLink: returnLink,
        // Default to outbound link for the main CTA, assuming it's the primary booking anchor
        deepLink: outboundLink,
      };
    }

    // For one-way or single flight found
    if (outboundFlight) {
      return {
        ...rec,
        outboundDeepLink: outboundLink,
        deepLink: outboundLink,
      };
    }

    return rec;
  };

  return {
    ...output,
    recommendation: enrichRec(output.recommendation),
    alternatives: output.alternatives?.map(enrichRec),
  };
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Execute a smart flight search using the OneAgent SDK
 *
 * This calls the flight-search agent which:
 * 1. Uses ToolLoopAgent to call Kiwi MCP tools for flight data
 * 2. Analyzes the results using AI
 * 3. Generates recommendations based on user preferences
 */
export async function smartFlightSearch(
  input: FlightSearchInput,
  userId: string
): Promise<SmartSearchResult> {
  if (!isInitialized) {
    initializeSmartSearch();
  }

  const startTime = Date.now();

  console.log('[SmartSearch] Starting smart flight search...');
  console.log('[SmartSearch] basePath:', basePath);
  console.log('[SmartSearch] userId:', userId);
  console.log('[SmartSearch] input:', JSON.stringify(input, null, 2));

  try {
    console.log('[SmartSearch] Calling execute() with agentPath: sdk-agents/flight-search');
    console.log('[SmartSearch] input keys:', Object.keys(input));

    // Execute the flight-search agent via SDK
    // SDK v4.0: If agent is in durable mode, result includes workflowRunId
    const result = await execute<FlightSearchOutput>('sdk-agents/flight-search', input, {
      userId,
      basePath,
    });

    // Check for durable execution result (SDK v4.0)
    const durableResult = result as typeof result & {
      workflowRunId?: string;
      workflowStatus?: string;
    };

    console.log(
      '[SmartSearch] execute() returned:',
      JSON.stringify(
        {
          success: result.success,
          hasOutput: !!result.output,
          error: result.error,
          meta: result.meta,
          workflowRunId: durableResult.workflowRunId,
          workflowStatus: durableResult.workflowStatus,
        },
        null,
        2
      )
    );

    if (result.success && result.output) {
      console.log('[SmartSearch] ✅ Success! Returning data...');

      // Post-process recommendations to ensure deepLinks are populated
      const enrichedOutput = enrichOutputWithDeepLinks(result.output);

      return {
        success: true,
        data: enrichedOutput,
        meta: {
          executionId: result.meta.executionId,
          durationMs: result.meta.duration,
          tokensUsed: result.meta.tokensUsed,
          costUSD: result.meta.costUSD,
        },
        workflowRunId: durableResult.workflowRunId,
        workflowStatus: durableResult.workflowStatus as SmartSearchResult['workflowStatus'],
      };
    }

    console.log('[SmartSearch] ❌ execute() returned failure:', result.error);
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Unknown error occurred',
        code: result.error?.code ?? 'UNKNOWN_ERROR',
      },
      meta: {
        executionId: result.meta.executionId,
        durationMs: result.meta.duration,
        tokensUsed: result.meta.tokensUsed,
        costUSD: result.meta.costUSD,
      },
      // Include workflowRunId even on failure for resume capability
      workflowRunId: durableResult.workflowRunId,
      workflowStatus: durableResult.workflowStatus as SmartSearchResult['workflowStatus'],
    };
  } catch (error) {
    console.error('[SmartSearch] ❌ Exception caught:', error);
    console.error('[SmartSearch] Error name:', error instanceof Error ? error.name : 'N/A');
    console.error(
      '[SmartSearch] Error message:',
      error instanceof Error ? error.message : String(error)
    );
    console.error('[SmartSearch] Error stack:', error instanceof Error ? error.stack : 'N/A');

    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        code: 'EXECUTION_ERROR',
      },
      meta: {
        executionId: `error-${Date.now()}`,
        durationMs: Date.now() - startTime,
        tokensUsed: 0,
        costUSD: 0,
      },
    };
  }
}
