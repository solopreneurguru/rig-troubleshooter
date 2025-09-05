# RulePack v2 Guide

**Last updated:** 2025-09-03 03:11 

RulePacks define troubleshooting as a directed graph of **typed nodes** with branching and citations.

## Minimal JSON
```json
{
  "key": "topdrive.rpm.low.v2",
  "version": 2,
  "equipmentType": "TopDrive",
  "start": "check_main_contactor",
  "nodes": {
    "check_main_contactor": {
      "type": "measure",
      "instruction": "Meter: black on A16, red on B12 with RUN command.",
      "expect": 24,
      "tolerance": 2,
      "unit": "VDC",
      "citation": "Elec schematic p.34; TB A16/B12",
      "passNext": "check_enable_chain",
      "failNext": "check_F3_fuse"
    },
    "check_F3_fuse": {
      "type": "safetyGate",
      "instruction": "De-energize per LOTO. Pull F3 and check continuity <1Ω.",
      "requireConfirm": true,
      "hazardNote": "LOTO required; arc-flash PPE.",
      "citation": "Elec schematic p.12; F3",
      "passNext": "retest_run_cmd",
      "failNext": "escalate_electrical"
    },
    "done": { "type": "done" }
  }
}
```

## Node types
- `measure` — numeric reading; either `expect±tolerance` **or** `min/max`; `unit` recommended
- `inspect` / `mechanical` / `hydraulic` / `controls` / `note` — procedural checks; capture pass/fail
- `safetyGate` — requires authenticated tech, LOTO/PPE checkbox, optional note; logs to Action
- `done` — terminal

## Citations
Point to document anchors (e.g., `docId#p=34`), PLC **Signals**, or **TestPoints**.

## Endpoints
- `POST /api/rulepacks/validate` with `{ json }` → schema + graph checks
- `POST /api/rulepacks/simulate` with `{ json, path }` (dev tool)
  - Path entries by type:
    - measure → `{ value: <number>, pass: true|false }`
    - safetyGate → `{ confirm: true, pass: true }`
    - others → `{ pass: true|false }`

## Authoring tips
- Include **lead positions** and **expected ranges**; keep instructions concise.
- Always include a **citation**.
- Prefer deterministic thresholds; subjective checks go through `inspect` with crisp criteria.
- Validate before activating; drafts remain `Active: false` until approved.
