export type RuleNode = {
  key: string;
  instruction: string;
  expect?: string;
  citation?: string;
  passNext?: string;
  failNext?: string;
};

export const TOP_DRIVE_RPM_LOW: Record<string, RuleNode> = {
  start: { key: "start", instruction: "Begin Top Drive RPM-low diagnostic.", passNext: "check_main_contactor" },
  check_main_contactor: {
    key: "check_main_contactor",
    instruction: "Meter: black on A16, red on B12. Expect 24 VDC with run command active.",
    expect: "24 VDC",
    citation: "Elec schematic p.34; TB A16/B12",
    passNext: "check_enable_chain",
    failNext: "check_F3_fuse",
  },
  check_F3_fuse: {
    key: "check_F3_fuse",
    instruction: "De-energize per LOTO. Pull F3 and check continuity (<1Ω). Replace if blown.",
    expect: "<1Ω continuity",
    citation: "Elec schematic p.12; Fuse F3",
    passNext: "retest_run_cmd",
    failNext: "escalate_electrical",
  },
  retest_run_cmd: {
    key: "retest_run_cmd",
    instruction: "Re-energize safely and reissue run command. Observe control voltage at A16-B12 again.",
    expect: "24 VDC",
    citation: "Elec schematic p.34",
    passNext: "check_enable_chain",
    failNext: "escalate_electrical",
  },
  check_enable_chain: {
    key: "check_enable_chain",
    instruction: "Check E-stop/enable chain: meter X7-4 to COM. Expect 24 VDC when chain healthy.",
    expect: "24 VDC",
    citation: "PLC DI map; block OB1 rung 23",
    passNext: "verify_vfd_speed_ref",
    failNext: "inspect_estop_loop",
  },
  inspect_estop_loop: {
    key: "inspect_estop_loop",
    instruction: "Inspect E-stop devices and enable relays. Verify all permissives closed.",
    citation: "Safety chain drawing p.7",
    passNext: "verify_vfd_speed_ref",
    failNext: "escalate_electrical",
  },
  verify_vfd_speed_ref: {
    key: "verify_vfd_speed_ref",
    instruction: "Measure analog speed ref at TB3-2 to COM. Expect >8VDC for high RPM command.",
    expect: "> 8 VDC",
    citation: "VFD I/O sheet p.5",
    passNext: "inspect_mechanical_load",
    failNext: "check_plc_output",
  },
  check_plc_output: {
    key: "check_plc_output",
    instruction: "Check PLC AO channel scaling and status. Verify tag 'TD_SpdRef'.",
    citation: "TIA: DB12.DBD20; HW config p.3",
    passNext: "inspect_mechanical_load",
    failNext: "escalate_controls",
  },
  inspect_mechanical_load: {
    key: "inspect_mechanical_load",
    instruction: "Check for over-torque, brake dragging, or gearbox binding.",
    citation: "Mechanical manual p.18",
    passNext: "done",
    failNext: "done",
  },
  escalate_electrical: { key: "escalate_electrical", instruction: "Electrical escalation. Capture findings.", passNext: "done", failNext: "done" },
  escalate_controls: { key: "escalate_controls", instruction: "Controls escalation. Capture findings.", passNext: "done", failNext: "done" },
  done: { key: "done", instruction: "End of plan. Close or escalate." },
};
