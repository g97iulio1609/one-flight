# OneFlight + OneAgent SDK v3.0 Integration Guide

## Overview

OneFlight uses the **OneAgent SDK v3.0** to power its Smart Flight Search feature. This integration provides AI-powered flight analysis, recommendations, and MCP tool orchestration through a declarative agent architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OneFlight Smart Search                        │
│  apps/next/app/api/flight/smart-search/route.ts                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 smartFlightSearch() Service                      │
│  one-flight/src/services/smart-search.service.ts                 │
│  - Initializes schema registry                                   │
│  - Calls SDK execute()                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  OneAgent SDK v3.0                               │
│  one-agent/src/framework/                                        │
│  ├── engine.ts      → execute(), executeNode()                   │
│  ├── loader.ts      → loadAgentManifest(), schema registry       │
│  ├── worker.ts      → ToolLoopAgent + AI SDK v6                  │
│  ├── registry.ts    → Schema Registry for bundled envs           │
│  └── mcp.ts         → MCP server connections                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Flight Search Agent                           │
│  one-flight/src/sdk-agents/flight-search/                        │
│  ├── agent.json     → Agent config, MCP servers, schema refs     │
│  ├── AGENTS.md      → System prompt                              │
│  └── schema.ts      → Input/Output Zod schemas                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Kiwi MCP Server                               │
│  https://mcp.kiwi.com                                            │
│  - search_flights tool                                           │
│  - get_flight_details tool                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Schema Registry (Bundler Compatibility)

Dynamic `import()` fails in Turbopack/Webpack. The SDK uses a **Schema Registry** pattern:

```typescript
// one-flight/src/registry.ts
import { registerSchemas } from '@onecoach/one-agent/framework';
import { FlightSearchInputSchema, FlightSearchOutputSchema } from './sdk-agents/flight-search/schema';

export function initializeFlightSchemas(): void {
  registerSchemas({
    'flight-search:input': FlightSearchInputSchema,
    'flight-search:output': FlightSearchOutputSchema,
  });
}
```

**agent.json references:**
```json
{
  "interface": {
    "input": { "$ref": "flight-search:input" },
    "output": { "$ref": "flight-search:output" }
  }
}
```

### 2. Agent Definition

**agent.json** - Declarative agent configuration:
```json
{
  "id": "flight-search",
  "version": "1.0.0",
  "type": "agent",
  "interface": {
    "input": { "$ref": "flight-search:input" },
    "output": { "$ref": "flight-search:output" }
  },
  "mcpServers": {
    "kiwi": { "url": "https://mcp.kiwi.com" }
  },
  "config": {
    "model": "claude-sonnet-4-20250514",
    "temperature": 0.3,
    "maxSteps": 10,
    "executionMode": "stream"
  }
}
```

### 3. Structured Output

The SDK uses AI SDK v6's `Output.object()` for type-safe structured output:

```typescript
// one-agent/src/framework/worker.ts
const agent = new ToolLoopAgent({
  model,
  instructions: systemPrompt,
  tools,
  stopWhen: stepCountIs(maxSteps),
  output: Output.object({
    schema: manifest.interface.output, // ← Zod schema from registry
  }),
});
```

### 4. Service Integration

```typescript
// one-flight/src/services/smart-search.service.ts
import { execute } from '@onecoach/one-agent/framework';
import { initializeFlightSchemas } from '../registry';

export function initializeSmartSearch() {
  initializeFlightSchemas(); // Register schemas on init
  // ...
}

export async function smartFlightSearch(input, userId) {
  const result = await execute<FlightSearchOutput>(
    'sdk-agents/flight-search',
    input,
    { userId, basePath }
  );
  return result;
}
```

## Current Limitations

### Model Compatibility with Structured Output

Some models (e.g., `kimi-k2-thinking`) don't fully respect `Output.object()` JSON mode and may output Markdown instead. Solutions:

1. **Prompt Engineering**: Explicit JSON schema in AGENTS.md system prompt
2. **Model Selection**: Use models with native structured output (Claude, GPT-4o)
3. **Post-processing**: Parse markdown fallback in worker

### Schema Registry Requirement

For bundled environments (Next.js with Turbopack), schemas must be registered at app initialization:

```typescript
// apps/next/instrumentation.ts or similar
import { initializeFlightSchemas } from '@onecoach/one-flight';
initializeFlightSchemas();
```

## API Reference

### execute<TOutput>(agentPath, input, options)

Execute an agent and return structured output.

| Parameter | Type | Description |
|-----------|------|-------------|
| `agentPath` | `string` | Path to agent directory relative to basePath |
| `input` | `unknown` | Input data validated against agent's input schema |
| `options.userId` | `string` | User ID for context |
| `options.basePath` | `string` | Base path for resolving agent paths |

**Returns:** `Promise<ExecutionResult<TOutput>>`

### registerSchemas(schemas)

Register Zod schemas for bundled environments.

```typescript
registerSchemas({
  'agent-id:input': InputSchema,
  'agent-id:output': OutputSchema,
});
```

## File Structure

```
one-flight/src/
├── registry.ts                    # Schema registration
├── services/
│   └── smart-search.service.ts    # Service layer
└── sdk-agents/
    └── flight-search/
        ├── agent.json             # Agent configuration
        ├── AGENTS.md              # System prompt
        └── schema.ts              # Zod schemas

one-agent/src/framework/
├── engine.ts                      # execute() entry point
├── worker.ts                      # ToolLoopAgent execution
├── loader.ts                      # Manifest + schema loading
├── registry.ts                    # Schema registry
├── mcp.ts                         # MCP client connections
└── types.ts                       # Type definitions
```
