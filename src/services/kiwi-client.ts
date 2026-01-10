/**
 * Kiwi MCP Client
 * 
 * Direct client for calling Kiwi MCP server endpoints.
 * Used as workaround for gemini-cli provider which has thought_signature issues with MCP tool loops.
 * 
 * @see https://github.com/ben-vargas/ai-sdk-provider-gemini-cli/issues/28
 */

import type { FlightResult } from '../types';

interface KiwiSearchParams {
  flyFrom: string;
  flyTo: string;
  departureDate: string;  // DD/MM/YYYY format for Kiwi
  returnDate?: string;    // DD/MM/YYYY format for Kiwi
  passengers?: {
    adults?: number;
    children?: number;
    infants?: number;
  };
  sort?: 'price' | 'duration' | 'quality';
  curr?: string;
  limit?: number;
}

interface KiwiMcpResponse {
  content: Array<{ type: string; text: string }>;
}

/**
 * Convert YYYY-MM-DD to DD/MM/YYYY for Kiwi API
 */
function formatDateForKiwi(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Call Kiwi MCP server directly to search flights
 * 
 * This bypasses the AI SDK tool loop, avoiding thought_signature issues with gemini-cli
 */
export async function searchFlightsViaKiwiMcp(params: {
  flyFrom: string[];
  flyTo: string[];
  departureDate: string;  // YYYY-MM-DD
  returnDate?: string | null;    // YYYY-MM-DD
  currency?: string;
  maxResults?: number;
}): Promise<FlightResult[]> {
  const MCP_URL = 'https://mcp.kiwi.com';
  
  // Validate required params
  if (!params.flyFrom.length || !params.flyTo.length) {
    throw new Error('flyFrom and flyTo arrays must have at least one element');
  }
  
  // Prepare search params for Kiwi MCP
  const kiwiParams: KiwiSearchParams = {
    flyFrom: params.flyFrom[0] as string, // Validated above
    flyTo: params.flyTo[0] as string,     // Validated above
    departureDate: formatDateForKiwi(params.departureDate),
    passengers: { adults: 1 },
    sort: 'price',
    curr: params.currency ?? 'EUR',
    limit: params.maxResults ?? 10,
  };
  
  if (params.returnDate) {
    kiwiParams.returnDate = formatDateForKiwi(params.returnDate);
  }

  console.log('[KiwiClient] Calling MCP directly with params:', kiwiParams);

  try {
    // Call MCP tool endpoint directly
    // Note: MCP servers expose tools via SSE, we need to make a tool call request
    const response = await fetch(`${MCP_URL}/mcp/v1/tools/search-flight/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        arguments: kiwiParams,
      }),
    });

    if (!response.ok) {
      console.error('[KiwiClient] MCP response not ok:', response.status, response.statusText);
      throw new Error(`Kiwi MCP error: ${response.status} ${response.statusText}`);
    }

    const mcpResponse: KiwiMcpResponse = await response.json();
    
    // Extract flight data from MCP response
    const textContent = mcpResponse.content?.find(c => c.type === 'text');
    if (!textContent?.text) {
      console.warn('[KiwiClient] No text content in MCP response');
      return [];
    }

    const flights: FlightResult[] = JSON.parse(textContent.text);
    console.log('[KiwiClient] Received', flights.length, 'flights from Kiwi MCP');
    
    return flights;
  } catch (error) {
    console.error('[KiwiClient] Error calling Kiwi MCP:', error);
    throw error;
  }
}

/**
 * Check if we need the gemini-cli workaround for thoughtSignature issues
 * 
 * WORKAROUND REMOVED: The forked @onecoach/ai-sdk-provider-gemini-cli
 * now properly handles thoughtSignature propagation, so we can use
 * normal MCP flow with gemini-cli provider.
 * 
 * @returns false - workaround is no longer needed
 */
export async function isGeminiCliProvider(): Promise<boolean> {
  // Workaround no longer needed - forked provider handles thoughtSignature correctly
  return false;
}
