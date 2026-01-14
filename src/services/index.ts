/**
 * Flight Services
 *
 * Contains the FlightSearchService for orchestrating flight searches.
 */

export { FlightSearchService } from './flight-search.service';

// Smart Search (OneAgent SDK v3.0)
export {
  smartFlightSearch,
  initializeSmartSearch,
  getSmartSearchBasePath,
  type SmartSearchResult,
  type FlightSearchInput as SmartSearchInput,
  type FlightSearchOutput as SmartSearchOutput,
} from './smart-search.service';
