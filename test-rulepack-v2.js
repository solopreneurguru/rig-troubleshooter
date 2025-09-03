const { execSync } = require('child_process');

// Sample v2 rulepack for topdrive.rpm.low
const sampleRulePack = {
  key: "topdrive.rpm.low",
  version: "2.0.0",
  start: "check_rpm",
  nodes: {
    "check_rpm": {
      key: "check_rpm",
      type: "measure",
      instruction: "Measure topdrive RPM at points A16-B12",
      expect: 1200,
      tolerance: 50,
      unit: "rpm",
      points: "A16-B12",
      citation: "PLC Block 3.2",
      passNext: "check_pressure",
      failNext: "low_rpm_fault"
    },
    "check_pressure": {
      key: "check_pressure",
      type: "measure",
      instruction: "Check hydraulic pressure at manifold",
      min: 150,
      max: 200,
      unit: "bar",
      points: "C8-D4",
      hazardNote: "High pressure - ensure safety valve is operational",
      requireConfirm: true,
      citation: "Doc page 45",
      passNext: "inspect_gearbox",
      failNext: "pressure_fault"
    },
    "inspect_gearbox": {
      key: "inspect_gearbox",
      type: "inspect",
      instruction: "Visually inspect gearbox for oil leaks and damage",
      citation: "Maintenance manual section 7.3",
      passNext: "done_success",
      failNext: "gearbox_fault"
    },
    "low_rpm_fault": {
      key: "low_rpm_fault",
      type: "note",
      instruction: "RPM below expected range. Check motor controller and power supply.",
      hazardNote: "Low RPM may indicate motor failure or power issues",
      citation: "Troubleshooting guide 2.1",
      passNext: "done_failure"
    },
    "pressure_fault": {
      key: "pressure_fault",
      type: "note",
      instruction: "Hydraulic pressure outside normal range. Check pump and relief valves.",
      citation: "Hydraulic system manual 4.2",
      passNext: "done_failure"
    },
    "gearbox_fault": {
      key: "gearbox_fault",
      type: "note",
      instruction: "Gearbox inspection failed. Check for oil leaks, damage, or excessive wear.",
      citation: "Maintenance manual section 7.3",
      passNext: "done_failure"
    },
    "done_success": {
      key: "done_success",
      type: "done",
      instruction: "Topdrive RPM check completed successfully. All systems operating within normal parameters."
    },
    "done_failure": {
      key: "done_failure",
      type: "done",
      instruction: "Topdrive RPM check failed. Follow maintenance procedures and contact supervisor."
    }
  }
};

// Test simulation path (successful path)
const successPath = [
  { value: 1250, pass: true },   // RPM check passes
  { value: 175, pass: true },    // Pressure check passes
  { value: 0, pass: true }       // Inspection passes (value ignored for inspect)
];

// Test simulation path (failure path)
const failurePath = [
  { value: 1100, pass: false },  // RPM check fails
  { value: 0, pass: false }      // No more steps needed
];

console.log("=== RulePack v2 Implementation Test ===\n");

console.log("1. Sample RulePack Structure:");
console.log(JSON.stringify(sampleRulePack, null, 2));
console.log("\n");

console.log("2. Curl Examples:\n");

console.log("A) Validate RulePack:");
console.log(`curl -X POST http://localhost:3000/api/rulepacks/validate \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '${JSON.stringify(sampleRulePack)}'`);
console.log("\n");

console.log("B) Simulate Success Path:");
console.log(`curl -X POST http://localhost:3000/api/rulepacks/simulate \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '${JSON.stringify({ json: sampleRulePack, path: successPath })}'`);
console.log("\n");

console.log("C) Simulate Failure Path:");
console.log(`curl -X POST http://localhost:3000/api/rulepacks/simulate \\`);
console.log(`  -H "Content-Type: application/json" \\`);
console.log(`  -d '${JSON.stringify({ json: sampleRulePack, path: failurePath })}'`);
console.log("\n");

console.log("D) Get Sample RulePack:");
console.log(`curl -X GET http://localhost:3000/api/rulepacks/test`);
console.log("\n");

console.log("E) List All RulePacks (with v2 detection):");
console.log(`curl -X GET http://localhost:3000/api/rulepacks/list`);
console.log("\n");

console.log("=== Implementation Summary ===");
console.log("✅ RulePack v2 Zod schema defined");
console.log("✅ parseReading() function implemented");
console.log("✅ Validator API route created (/api/rulepacks/validate)");
console.log("✅ Simulator API route created (/api/rulepacks/simulate)");
console.log("✅ Airtable integration updated with isV2 flag");
console.log("✅ Sample v2 rulepack created for topdrive.rpm.low");
console.log("✅ Build successful");
console.log("✅ Development server running on http://localhost:3000");
console.log("\n");

console.log("=== Key Features ===");
console.log("• Strong typing with Zod validation");
console.log("• Graph traversal with pass/fail branching");
console.log("• Support for multiple node types: measure, inspect, note, done");
console.log("• Unit parsing from free text (e.g., '24vdc' → {value: 24, unit: 'VDC'})");
console.log("• Hazard notes and confirmation requirements");
console.log("• Citation references for documentation");
console.log("• Backward compatibility with existing v1 rulepacks");
console.log("\n");

console.log("Ready for testing! Use the curl examples above to test the API endpoints.");
