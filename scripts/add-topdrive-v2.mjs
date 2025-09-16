import { upsertRulePackByKey } from '../src/lib/rulepacks.js';

const pack = {
  key: 'topdrive_basic_power_v2',
  version: '2',
  start: 'check_main_contactor',
  nodes: {
    check_main_contactor: {
      id: 'check_main_contactor',
      type: 'measure',
      unit: 'VDC',
      points: 'A16-B12',
      expect: 24,
      tolerance: 2,
      passNext: 'check_enable_chain',
      failNext: 'check_F3_fuse',
      why: 'Control supply must be present at A16-B12 before logic.',
      cite: [{ doc: 'Electrical', page: 12, tag: 'TB1:A16/B12' }]
    }
  }
};

async function main() {
  try {
    const result = await upsertRulePackByKey('topdrive_basic_power_v2', pack);
    console.log('RulePack added:', result);
  } catch (err) {
    console.error('Failed to add RulePack:', err);
    process.exit(1);
  }
}

main();
