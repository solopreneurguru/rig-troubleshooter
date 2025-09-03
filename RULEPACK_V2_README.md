# RulePack v2 Implementation

This document describes the implementation of RulePack v2 with validator and simulator functionality for the rig-troubleshooter application.

## Overview

RulePack v2 introduces a new schema format with enhanced validation, simulation capabilities, and improved type safety using Zod schemas. The system maintains backward compatibility with existing v1 rulepacks while providing new features for complex troubleshooting workflows.

## Architecture

### A) Types (`src/lib/rulepacks.ts`)

#### RulePackV2 Schema
```typescript
{
  key: string,
  version: string,
  start: string,
  nodes: Record<string, {
    key: string,
    type: "measure"|"inspect"|"controls"|"hydraulic"|"mechanical"|"safetyGate"|"note"|"done",
    instruction: string,
    expect?: number, tolerance?: number, min?: number, max?: number,
    unit?: "VDC"|"VAC"|"mA"|"bar"|"psi"|"ohm"|"deg"|"rpm"|"Hz"|string,
    points?: string,         // e.g., "A16-B12"
    multi?: Array<{label:string, points?:string, expect?:number, min?:number, max?:number, unit?:string}>,
    hazardNote?: string,
    requireConfirm?: boolean,
    citation?: string,       // doc page / PLC block
    passNext?: string,
    failNext?: string
  }>
}
```

#### parseReading Function
```typescript
parseReading(str: string): { value: number; unit?: string }
```
Extracts numeric values and units from free text like "24vdc" → `{value: 24, unit: "VDC"}`.

### B) Validator (`/api/rulepacks/validate`)

**POST** endpoint that validates RulePack v2 against:
- Zod schema validation
- Start node existence
- All next keys exist in the graph
- Terminal nodes resolve properly
- Graph connectivity checks

**Response:**
```json
{
  "ok": true,
  "warnings": ["Unreachable nodes: node1, node2"]
}
```

### C) Simulator (`/api/rulepacks/simulate`)

**POST** endpoint that walks the graph from start applying measurements:

**Request:**
```json
{
  "json": RulePackV2,
  "path": [
    {"value": 1250, "pass": true},
    {"value": 175, "pass": true}
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "finalNodeKey": "done_success",
  "steps": [
    {
      "nodeKey": "check_rpm",
      "nodeType": "measure",
      "instruction": "Measure topdrive RPM at points A16-B12",
      "input": {"value": 1250, "unit": "rpm"},
      "expected": {"value": 1200, "unit": "rpm", "tolerance": 50},
      "result": "pass",
      "nextNode": "check_pressure"
    }
  ]
}
```

### D) Airtable Integration

- Updated list route to include `isV2: true/false` flag
- Maintains backward compatibility with existing v1 rulepacks
- Version field support for rulepack versioning

## Sample Implementation

### TopDrive RPM Low RulePack

A complete example rulepack for troubleshooting low topdrive RPM:

```json
{
  "key": "topdrive.rpm.low",
  "version": "2.0.0",
  "start": "check_rpm",
  "nodes": {
    "check_rpm": {
      "key": "check_rpm",
      "type": "measure",
      "instruction": "Measure topdrive RPM at points A16-B12",
      "expect": 1200,
      "tolerance": 50,
      "unit": "rpm",
      "points": "A16-B12",
      "citation": "PLC Block 3.2",
      "passNext": "check_pressure",
      "failNext": "low_rpm_fault"
    },
    "check_pressure": {
      "key": "check_pressure",
      "type": "measure",
      "instruction": "Check hydraulic pressure at manifold",
      "min": 150,
      "max": 200,
      "unit": "bar",
      "points": "C8-D4",
      "hazardNote": "High pressure - ensure safety valve is operational",
      "requireConfirm": true,
      "citation": "Doc page 45",
      "passNext": "inspect_gearbox",
      "failNext": "pressure_fault"
    },
    "inspect_gearbox": {
      "key": "inspect_gearbox",
      "type": "inspect",
      "instruction": "Visually inspect gearbox for oil leaks and damage",
      "citation": "Maintenance manual section 7.3",
      "passNext": "done_success",
      "failNext": "gearbox_fault"
    },
    "low_rpm_fault": {
      "key": "low_rpm_fault",
      "type": "note",
      "instruction": "RPM below expected range. Check motor controller and power supply.",
      "hazardNote": "Low RPM may indicate motor failure or power issues",
      "citation": "Troubleshooting guide 2.1",
      "passNext": "done_failure"
    },
    "pressure_fault": {
      "key": "pressure_fault",
      "type": "note",
      "instruction": "Hydraulic pressure outside normal range. Check pump and relief valves.",
      "citation": "Hydraulic system manual 4.2",
      "passNext": "done_failure"
    },
    "gearbox_fault": {
      "key": "gearbox_fault",
      "type": "note",
      "instruction": "Gearbox inspection failed. Check for oil leaks, damage, or excessive wear.",
      "citation": "Maintenance manual section 7.3",
      "passNext": "done_failure"
    },
    "done_success": {
      "key": "done_success",
      "type": "done",
      "instruction": "Topdrive RPM check completed successfully. All systems operating within normal parameters."
    },
    "done_failure": {
      "key": "done_failure",
      "type": "done",
      "instruction": "Topdrive RPM check failed. Follow maintenance procedures and contact supervisor."
    }
  }
}
```

## API Endpoints

### 1. Validate RulePack
```bash
curl -X POST http://localhost:3000/api/rulepacks/validate \
  -H "Content-Type: application/json" \
  -d '{"key":"topdrive.rpm.low","version":"2.0.0",...}'
```

### 2. Simulate RulePack
```bash
curl -X POST http://localhost:3000/api/rulepacks/simulate \
  -H "Content-Type: application/json" \
  -d '{"json": {...}, "path": [{"value": 1250, "pass": true}]}'
```

### 3. Get Sample RulePack
```bash
curl -X GET http://localhost:3000/api/rulepacks/test
```

### 4. List All RulePacks (with v2 detection)
```bash
curl -X GET http://localhost:3000/api/rulepacks/list
```

## Node Types

### measure
- For numeric measurements with expected values or ranges
- Supports `expect` ± `tolerance` or `min`/`max` ranges
- Examples: voltage, pressure, temperature, RPM

### inspect
- For visual inspections and qualitative assessments
- No numeric validation, relies on pass/fail input
- Examples: oil leaks, damage assessment, visual checks

### note
- For informational nodes with hazard warnings
- Always passes through to next node
- Examples: fault descriptions, safety warnings

### done
- Terminal nodes that end the workflow
- No next nodes required
- Examples: success/failure completion states

### controls, hydraulic, mechanical, safetyGate
- Legacy node types maintained for compatibility
- Function similarly to measure nodes

## Key Features

1. **Strong Typing**: Zod schemas provide runtime validation and TypeScript type safety
2. **Graph Traversal**: Sophisticated graph walking with pass/fail branching
3. **Unit Parsing**: Automatic extraction of values and units from free text
4. **Hazard Management**: Built-in support for safety notes and confirmation requirements
5. **Documentation**: Citation system for referencing manuals and PLC blocks
6. **Backward Compatibility**: Seamless integration with existing v1 rulepacks
7. **Validation**: Comprehensive validation of graph structure and connectivity

## Development

### Prerequisites
- Node.js 18+
- npm or yarn
- Airtable API key (for production)

### Setup
```bash
npm install
npm run dev
```

### Build
```bash
npm run build
```

### Testing
Use the provided curl examples in `test-rulepack-v2.js` to test the API endpoints.

## Deployment

The application is ready for deployment with:
- ✅ TypeScript compilation
- ✅ API route validation
- ✅ Error handling
- ✅ Production build optimization

Deploy using your preferred platform (Vercel, Netlify, etc.) with the following environment variables:
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `TB_RULEPACKS`

## Future Enhancements

1. **Multi-point measurements**: Support for multiple measurement points in a single node
2. **Conditional logic**: Advanced branching based on multiple conditions
3. **Time-based validation**: Support for time-sensitive measurements
4. **Integration hooks**: Callbacks for external system integration
5. **Audit trails**: Detailed logging of simulation steps and decisions
