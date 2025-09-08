// docs/30-rulepack-v2.md
# RulePack v2 — Authoring & Conventions
**Last updated:** 2025-09-07

## Conventions
- Key: `<equipment>.<failure>.v2` (e.g., `topdrive.wont_start.v2`)
- `version: 2` is required; robust detection also treats `Json.version==2` or `.v2` suffix as v2
- Each actionable node includes **expectations** and **citations** (Doc page, PLC tag, or TestPoint)
- Safety: use `safetyGate` or set `requireConfirm:true` with a short hazard note
- Use TestPoint anchors: store `DocRef` + `DocPage`; UI can link like `docId#p=12`

## Node types (current)
- `note` (info), `ask`, `measure`, `safetyGate`, `done`
### New in Block 15
- `plcRead` — read a PLC tag/address; show program/block/rung citation; evaluate expectation
- `photo` — require/allow a photo; attaches to session and shows in report

## Minimal template (illustrative)
```json
{
  "key": "topdrive.wont_start.v2",
  "version": 2,
  "equipmentType": "TopDrive",
  "start": "collect_docs",
  "nodes": {
    "collect_docs": {"type":"note","subtype":"collectDocs","instruction":"Upload schematics / IO / PLC exports.","passNext":"safety_loto"},
    "safety_loto": {"type":"safetyGate","instruction":"De-energize per LOTO.","requireConfirm":true,"hazardNote":"Arc-flash / stored energy.","passNext":"first_check","failNext":"done"},
    "first_check": {"type":"measure","instruction":"Meter black IO14 COM; red TB11-A1 with RUN cmd.","expect":24,"tolerance":2,"unit":"VDC","citation":"Doc p.34; TP:TB11-A1; Sig:I124.3","passNext":"branch_ok","failNext":"check_enable_chain"},
    "check_enable_chain": {"type":"plcRead","instruction":"Read MainContactorEnable (OB1).","tag":"MainContactorEnable","expect":{"op":"==","value":1},"citation":"PLC OB1 %I0.2","passNext":"photo_panel","failNext":"done"},
    "photo_panel": {"type":"photo","instruction":"Photo of enable chain relay + F3 fuse.","required":true,"citation":"Electrical p.12","next":"done"},
    "done": {"type":"done","instruction":"Complete."}
  }
}
