# Vision & Alignment

**Last updated:** 2025-09-03 03:11 

We are building an **advanced, interactive troubleshooting assistant** for drill-floor equipment on drillships and large platforms: Top Drive, Drawworks, traveling block/hook, rotary table, Iron Roughneck, power catwalk, pipe handling machine, mud pumps, and driller's cabin controls.

The app will:
- Understand **electrical** (Power Control Systems, VFD, SCR), **mechanical**, and **hydraulic** systems (incl. HPU) and how they interact.
- Ingest **PDFs/drawings**, **images**, and **PLC/TIA** artifacts; link knowledge to **rig-specific equipment variants**.
- Guide techs through **step-by-step diagnostics** with clear measurements (e.g., “black on A16, red on B12”), recording readings and decisions.
- Enforce **safety gating** (LOTO/PPE) with named technician confirmation and audit trail.
- Generate **PDF finding reports** and trigger notifications.
- **Learn** from field outcomes to tune procedures (human-approved).

## Alignment
- **Rig-specificity** via EquipmentInstances + Signals + TestPoints bound to a rig and equipment.
- **Cross-discipline logic** encoded as **RulePack v2** graphs (typed nodes, units, thresholds, citations, branching).
- **Knowledge ingestion** of documents and PLC tag catalogs with citations back to sources.
- **Interactive sessions** (Sessions → Actions → Readings → Finding) with full audit.
- **Continuous improvement**: outcome analytics propose pack tuning; editors approve.
