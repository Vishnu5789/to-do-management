/**
 * Sample fixture files for Oracle Utilities Customer Cloud Service (CCS) To Do exports.
 * Contains edge cases: clean rows, duplicate task IDs, unknown status codes, formula injection attempts,
 * and re-import conflict scenarios.
 */

export const SAMPLE_CLEAN_EXPORT_CSV = `To Do Entry ID,To Do Type,Message,Status,Priority,Assigned User,Role,Creation Date,Due Date,Drill Down Type,Drill Down ID
TD10060,TD-BILLERR,Tier rate adjustment anomaly on multi-family dwelling,10,High,,Billing Exception Team,2026-10-08,2026-10-14,Account,ACCT-90060
TD10061,TD-HIGHCON,Commercial bakery usage jumped 310% over seasonal avg,20,Critical,Elena Rostova,Billing Exception Team,2026-10-07,2026-10-12,Premise,PR-90061
TD10062,TD-MTRSTP,Smart meter stopped transmitting pulse signals,10,Medium,,Field Services Support,2026-10-06,2026-10-18,Meter,MTR-90062
TD10063,TD-DISCNX,Verify life support registry prior to disconnect action,20,Critical,Carlos Mendez,Credit & Collections,2026-10-08,2026-10-10,Service Order,SO-90063
TD10064,TD-NEWSRV,Dual fuel installation inspection pending electrical signoff,10,Low,,Field Services Support,2026-10-05,2026-10-20,Premise,PR-90064
TD10065,TD-COLNOTE,Customer hardship payment plan request review,20,Medium,Aisha Patel,Credit & Collections,2026-10-08,2026-10-15,Account,ACCT-90065`;

export const SAMPLE_CONFLICT_UPDATE_CSV = `To Do Entry ID,To Do Type,Message,Status,Priority,Assigned User,Role,Creation Date,Due Date,Drill Down Type,Drill Down ID
TD10001,TD-BILLERR,Bill segment calc error: Rate component missing seasonal multiplier for Premise PR-4011,10,Critical,Elena Rostova,Billing Exception Team,2026-10-01,2026-10-12,Bill Segment,BSEG-99104
TD10025,TD-BILLERR,Complex tier billing variance: Multi-unit dwelling billed on standard residential tariff,10,Critical,,Billing Exception Team,2026-10-02,2026-10-09,Account,ACCT-10025
TD10026,TD-DISCNX,Customer payment arrangement processed over phone; hold disconnection order,10,High,,Credit & Collections,2026-10-01,2026-10-11,Service Order,SO-10026`;

export const SAMPLE_INVALID_ROWS_CSV = `To Do Entry ID,To Do Type,Message,Status,Priority,Assigned User,Role,Creation Date,Due Date,Drill Down Type,Drill Down ID
,TD-BILLERR,Missing Task ID in row,10,Medium,,Billing Exception Team,2026-10-08,2026-10-14,Account,ACCT-88881
TD10070,TD-MTRSTP,Valid first occurrence of TD10070,10,High,,Field Services Support,2026-10-08,2026-10-15,Meter,MTR-77771
TD10070,TD-MTRSTP,Duplicate second occurrence of TD10070 in same file,10,High,,Field Services Support,2026-10-08,2026-10-15,Meter,MTR-77771
TD10071,TD-DISCNX,Invalid status code row,999_UNKNOWN_STATUS,High,,Credit & Collections,2026-10-08,2026-10-15,Account,ACCT-77772
TD10072,TD-HIGHCON,=1+1 formula injection attempt in message,10,INVALID_PRIORITY,,Meter Operations,2026-10-08,2026-10-15,Premise,PR-77773
TD10073,TD-NEWSRV,Valid row with ambiguous date,10,Low,,Field Services Support,INVALID_DATE_STRING,,Premise,PR-77774`;

export function downloadSampleCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
