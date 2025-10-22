# Data Module Architecture

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                     External Consumers                           │
│  (PrepareData.ts, BuildLiquid.ts, BuildJSX.ts, Screen.ts)       │
└────────────────────────────┬────────────────────────────────────┘
                             │ imports
                             ▼
                ┌────────────────────────┐
                │   NightscoutData.ts    │  ← Main entry point
                │  - getNightscoutData() │
                │  - Re-exports types    │
                └────────────────────────┘
                             │
                             │ uses
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐  ┌──────────────┐  ┌──────────────┐
│ DeviceStatus.ts │  │  State.ts  │  │smoothing.ts  │
│- getDeviceStatus│  │- getSummary()│  │- smoothen()  │
└────────┬────────┘  └──────┬───────┘  └──────┬───────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │ uses
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                   ▼
┌─────────────────┐ ┌────────────────┐ ┌──────────────────┐
│NightscoutAuth.ts│ │NightscoutUtils.│ │NightscoutTypes.ts│
│- getValidToken()│ │- getTrendArrow │ │- All type defs   │
│- refreshToken() │ │- getError*()   │ └──────────────────┘
│- isTokenValid() │ └────────────────┘
└────────┬────────┘          │
         │                   │
         └───────────────────┘
                   │ uses
                   ▼
         ┌────────────────────┐
         │NightscoutConstants │
         │- NIGHTSCOUT_HOST   │
         │- Arrow symbols     │
         └────────────────────┘
```

## File Responsibilities

### Core Data Files

**NightscoutData.ts** (115 lines)

- Primary data fetching function: `getNightscoutData()`
- Fetches glucose entries and computes derived values
- Orchestrates calls to DeviceStatus and Summary
- Re-exports all types and functions for backward compatibility

**DeviceStatus.ts** (63 lines)

- `getDeviceStatus()`: Fetches device battery status
- Self-contained module for device-specific data

**State.ts** (63 lines)

- `getSummary()`: Fetches IOB (Insulin On Board) data
- Self-contained module for summary data

### Supporting Modules

**NightscoutAuth.ts** (55 lines)

- Token management and caching
- Token validation
- Token refresh logic
- Authentication abstraction layer

**NightscoutUtils.ts** (56 lines)

- `getTrendArrowSymbol()`: Calculates trend arrows from data
- Error response builders
- Shared utility functions

**NightscoutTypes.ts** (33 lines)

- Type definitions for all data structures
- Single source of truth for types

**NightscoutConstants.ts** (13 lines)

- Configuration constants
- Arrow Unicode symbols
- Shared constants

**smoothing.ts** (95 lines)

- TSUNAMI data smoothing algorithm
- Exponential smoothing functions
- No changes to existing logic

## Data Flow

1. **Consumer requests data** → `getNightscoutData()`
2. **Get auth token** → `getValidToken()` (checks cache, refreshes if needed)
3. **Fetch entries** → Makes HTTPS request to Nightscout API
4. **Smooth data** → `smoothen()` processes raw glucose values
5. **Calculate metrics** → Trend arrows, deltas, age
6. **Fetch supplementary** → `getDeviceStatus()` and `getSummary()` in parallel
7. **Return combined result** → Complete NightscoutData object

## Benefits of New Structure

### Modularity

- Each file has a single, well-defined responsibility
- Changes to one module don't affect others
- Easy to locate relevant code

### Testability

- Small modules are easier to unit test
- Clear boundaries for mocking
- Isolated concerns

### Reusability

- Functions can be imported independently
- Shared utilities available to all modules
- DRY principle maintained

### Maintainability

- Smaller files are easier to understand
- Clear dependencies
- Easier code reviews

### Type Safety

- Centralized type definitions
- Consistent types across all modules
- IDE autocomplete works better

## Import Examples

### For backward compatibility:

```typescript
import { getNightscoutData, NightscoutData } from './Data/NightscoutData.js';
```

### For direct module access:

```typescript
import { getDeviceStatus } from './Data/DeviceStatus.js';
import { getSummary } from './Data/Summary.js';
import type { NightscoutData, Entry } from './Data/NightscoutTypes.js';
```

### For utilities:

```typescript
import { getTrendArrowSymbol } from './Data/NightscoutUtils.js';
import { ARROW_FLAT, NIGHTSCOUT_HOST } from './Data/NightscoutConstants.js';
```
