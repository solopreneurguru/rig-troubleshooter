import { NextResponse } from "next/server";
import { RulePackV2Schema } from "@/lib/rulepacks";

export const runtime = "nodejs";

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

export async function GET() {
  try {
    // Validate the sample rulepack
    const validationResult = RulePackV2Schema.safeParse(sampleRulePack);
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        ok: false, 
        error: "Sample rulepack validation failed", 
        details: validationResult.error.format() 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      ok: true, 
      rulepack: sampleRulePack,
      validation: { success: true },
      examples: {
        validate: {
          url: "/api/rulepacks/validate",
          method: "POST",
          body: sampleRulePack
        },
        simulate: {
          url: "/api/rulepacks/simulate",
          method: "POST",
          body: {
            json: sampleRulePack,
            path: [
              { value: 1250, pass: true },   // RPM check passes
              { value: 175, pass: true },    // Pressure check passes
              { value: 0, pass: true }       // Inspection passes (value ignored for inspect)
            ]
          }
        }
      }
    });
    
  } catch (e: any) {
    return NextResponse.json({ 
      ok: false, 
      error: String(e?.message || e) 
    }, { status: 500 });
  }
}
