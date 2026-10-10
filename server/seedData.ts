import { Task, User } from '../src/types/index.ts';

export const SEED_USERS: User[] = [
  {
    userId: 'usr_sup_1',
    email: 'marcus.vance@utility.internal',
    displayName: 'Marcus Vance',
    role: 'Supervisor',
    teamId: 'TEAM_BILLING',
    teamName: 'Billing & Revenue Oversight',
    isActive: true,
    createdAt: '2026-01-10T08:00:00.000Z',
  },
  {
    userId: 'usr_op_1',
    email: 'elena.rostova@utility.internal',
    displayName: 'Elena Rostova',
    role: 'Operator',
    teamId: 'TEAM_BILLING',
    teamName: 'Billing Exception Team',
    isActive: true,
    createdAt: '2026-01-15T09:00:00.000Z',
  },
  {
    userId: 'usr_op_2',
    email: 'carlos.mendez@utility.internal',
    displayName: 'Carlos Mendez',
    role: 'Operator',
    teamId: 'TEAM_FIELD',
    teamName: 'Field Services Support',
    isActive: true,
    createdAt: '2026-01-15T09:30:00.000Z',
  },
  {
    userId: 'usr_op_3',
    email: 'aisha.patel@utility.internal',
    displayName: 'Aisha Patel',
    role: 'Operator',
    teamId: 'TEAM_CREDIT',
    teamName: 'Credit & Collections',
    isActive: true,
    createdAt: '2026-01-16T10:00:00.000Z',
  },
  {
    userId: 'usr_op_4',
    email: 'david.kim@utility.internal',
    displayName: 'David Kim',
    role: 'Operator',
    teamId: 'TEAM_METER',
    teamName: 'Meter Operations',
    isActive: true,
    createdAt: '2026-02-01T08:30:00.000Z',
  },
];

export function generateSeedTasks(): Task[] {
  const tasks: Task[] = [];
  const baseBatchId = 'BATCH_INITIAL_SEED_2026';
  const importTime = '2026-10-01T10:00:00.000Z';

  // Seed tasks configuration
  const rawDefinitions = [
    {
      id: 'TD10001',
      type: 'TD-BILLERR',
      desc: 'Bill segment calc error: Rate component missing seasonal multiplier for Premise PR-4011',
      prio: 'Critical',
      status: 'In Progress',
      substatus: 'Investigating Rate Schedule',
      assignee: SEED_USERS[1],
      team: 'Billing Exception Team',
      objType: 'Bill Segment',
      objId: 'BSEG-99104',
      daysAgoCreated: 5,
      daysDueOffset: -2, // Overdue!
      isLocallyModified: true,
    },
    {
      id: 'TD10002',
      type: 'TD-HIGHCON',
      desc: 'High consumption alert: Commercial account usage spiked 420% over 30-day baseline',
      prio: 'High',
      status: 'On Hold',
      substatus: 'Awaiting Meter Reading',
      holdReason: 'Awaiting specialized interval meter reading from field crew',
      assignee: SEED_USERS[2],
      team: 'Field Services Support',
      objType: 'Meter',
      objId: 'MTR-88102',
      daysAgoCreated: 8,
      daysDueOffset: 3,
      isLocallyModified: true,
    },
    {
      id: 'TD10003',
      type: 'TD-MTRSTP',
      desc: 'Stopped meter suspected: Zero consumption recorded for active bakery over 2 billing cycles',
      prio: 'Critical',
      status: 'Assigned',
      substatus: 'Assigned to Carlos Mendez',
      assignee: SEED_USERS[2],
      team: 'Field Services Support',
      objType: 'Premise',
      objId: 'PR-10292',
      daysAgoCreated: 4,
      daysDueOffset: -1, // Overdue!
      isLocallyModified: false,
    },
    {
      id: 'TD10004',
      type: 'TD-DISCNX',
      desc: 'Pending disconnection verification: Life-support equipment flag detected on residential account',
      prio: 'Critical',
      status: 'Open',
      substatus: 'Unassigned',
      assignee: null,
      team: 'Credit & Collections',
      objType: 'Account',
      objId: 'ACCT-77312',
      daysAgoCreated: 1,
      daysDueOffset: 1,
      isLocallyModified: false,
    },
    {
      id: 'TD10005',
      type: 'TD-BILLERR',
      desc: 'Net metering solar credit rollover exceeded max threshold by $1,420.00',
      prio: 'Medium',
      status: 'Completed',
      substatus: 'Resolved',
      assignee: SEED_USERS[1],
      team: 'Billing Exception Team',
      objType: 'Bill',
      objId: 'BILL-44109',
      completionNote: 'Manual credit true-up applied per Tariff Section 14B.',
      daysAgoCreated: 12,
      daysDueOffset: 5,
      isLocallyModified: true,
    },
    {
      id: 'TD10006',
      type: 'TD-NEWSRV',
      desc: 'New dual-fuel service connection inspection pending permit clearance',
      prio: 'Medium',
      status: 'Open',
      substatus: 'Unassigned',
      assignee: null,
      team: 'Field Services Support',
      objType: 'Service Order',
      objId: 'SO-55192',
      daysAgoCreated: 3,
      daysDueOffset: 4,
      isLocallyModified: false,
    },
    {
      id: 'TD10007',
      type: 'TD-COLNOTE',
      desc: 'Customer dispute regarding estimated billing adjustments during winter freeze',
      prio: 'Low',
      status: 'Assigned',
      substatus: 'Assigned to Aisha Patel',
      assignee: SEED_USERS[3],
      team: 'Credit & Collections',
      objType: 'Account',
      objId: 'ACCT-66014',
      daysAgoCreated: 7,
      daysDueOffset: -3, // Overdue!
      isLocallyModified: false,
    },
    {
      id: 'TD10008',
      type: 'TD-MTRXCH',
      desc: 'Smart meter exchange serial mismatch between AMI head-end and CCS asset repository',
      prio: 'High',
      status: 'In Progress',
      substatus: 'In Progress',
      assignee: SEED_USERS[4],
      team: 'Meter Operations',
      objType: 'Device',
      objId: 'DEV-99210',
      daysAgoCreated: 2,
      daysDueOffset: 2,
      isLocallyModified: true,
    },
    {
      id: 'TD10009',
      type: 'TD-HIGHCON',
      desc: 'Industrial chiller sub-meter anomaly: Negative reactive power factor registered',
      prio: 'High',
      status: 'On Hold',
      substatus: 'Awaiting Customer Response',
      holdReason: 'Requested customer facility engineer contact details from account manager',
      assignee: SEED_USERS[4],
      team: 'Meter Operations',
      objType: 'Premise',
      objId: 'PR-33011',
      daysAgoCreated: 9,
      daysDueOffset: -1, // Overdue!
      isLocallyModified: true,
    },
    {
      id: 'TD10010',
      type: 'TD-BILLERR',
      desc: 'Budget billing reconciliation calculation failed due to missing historical 12-month reads',
      prio: 'Medium',
      status: 'Open',
      substatus: 'Unassigned',
      assignee: null,
      team: 'Billing Exception Team',
      objType: 'Account',
      objId: 'ACCT-88192',
      daysAgoCreated: 4,
      daysDueOffset: 3,
      isLocallyModified: false,
    },
    // TD10025: Key task specifically highlighted in prompt instructions!
    {
      id: 'TD10025',
      type: 'TD-BILLERR',
      desc: 'Complex tier billing variance: Multi-unit dwelling billed on standard residential tariff',
      prio: 'Critical',
      status: 'Assigned',
      substatus: 'Assigned to Elena Rostova',
      assignee: SEED_USERS[1],
      team: 'Billing Exception Team',
      objType: 'Account',
      objId: 'ACCT-10025',
      daysAgoCreated: 3,
      daysDueOffset: -1, // Overdue
      isLocallyModified: false,
    },
    // Conflict task: Modified locally (Completed), but re-import may still say Open
    {
      id: 'TD10026',
      type: 'TD-DISCNX',
      desc: 'Customer payment arrangement processed over phone; hold disconnection order',
      prio: 'High',
      status: 'Completed',
      substatus: 'Resolved',
      assignee: SEED_USERS[3],
      team: 'Credit & Collections',
      objType: 'Service Order',
      objId: 'SO-10026',
      completionNote: 'Confirmed payment receipt #PY-90812 received and credit hold placed.',
      daysAgoCreated: 6,
      daysDueOffset: 2,
      isLocallyModified: true,
      hasConflict: true,
      conflictDetails: {
        sourceStatus: 'Open',
        sourceSubstatus: 'Unassigned',
        sourcePriority: 'High',
        localStatus: 'Completed',
        localSubstatus: 'Resolved',
        localPriority: 'High',
        sourceUpdated: '2026-10-05T09:00:00.000Z',
        diffFields: ['status'],
      },
    },
  ];

  // Populate first 12 explicit tasks
  for (const def of rawDefinitions) {
    const createdDate = new Date(Date.now() - def.daysAgoCreated * 86400000).toISOString();
    const dueDate = new Date(Date.now() + def.daysDueOffset * 86400000).toISOString();
    tasks.push({
      taskId: def.id,
      sourceSystem: 'Oracle CCS To Do Export',
      taskType: def.type,
      description: def.desc,
      priority: def.prio as any,
      status: def.status as any,
      substatus: def.substatus,
      assigneeId: def.assignee ? def.assignee.userId : null,
      assigneeName: def.assignee ? def.assignee.displayName : null,
      teamId: 'TEAM_' + def.team.toUpperCase().replace(/[^A-Z]/g, '_'),
      teamName: def.team,
      relatedObjectType: def.objType,
      relatedObjectId: def.objId,
      createdAt: createdDate,
      updatedAt: createdDate,
      dueAt: dueDate,
      completionNote: (def as any).completionNote || null,
      holdReason: (def as any).holdReason || null,
      sourceValues: {
        'To Do Entry ID': def.id,
        'To Do Type': def.type,
        'Message': def.desc,
        'Status': def.status === 'Completed' ? '30' : def.status === 'In Progress' ? '20' : '10',
        'Priority': def.prio,
        'Role': def.team,
        'Creation Date': createdDate.slice(0, 10),
      },
      currentLocalValues: {
        status: def.status,
        substatus: def.substatus,
        priority: def.prio,
        assigneeName: def.assignee?.displayName || null,
      },
      lastImportedAt: importTime,
      lastImportBatchId: baseBatchId,
      isLocallyModified: def.isLocallyModified,
      hasConflict: (def as any).hasConflict || false,
      conflictDetails: (def as any).conflictDetails || null,
      version: def.isLocallyModified ? 2 : 1,
    });
  }

  // Populate remaining tasks to reach 54 seeded tasks across varied states and teams
  const taskTypes = ['TD-BILLERR', 'TD-HIGHCON', 'TD-MTRSTP', 'TD-DISCNX', 'TD-COLNOTE', 'TD-NEWSRV', 'TD-RATEOPT', 'TD-MTRXCH'];
  const priorities: ('Critical' | 'High' | 'Medium' | 'Low')[] = ['Critical', 'High', 'Medium', 'Low'];
  const statuses: ('Open' | 'Assigned' | 'In Progress' | 'On Hold' | 'Completed')[] = ['Open', 'Assigned', 'In Progress', 'On Hold', 'Completed'];
  const objectTypes = ['Account', 'Premise', 'Meter', 'Bill', 'Service Agreement', 'Device'];

  for (let i = 13; i <= 54; i++) {
    const numStr = String(i).padStart(5, '0');
    const taskId = `TD${numStr}`;
    const tType = taskTypes[i % taskTypes.length];
    const prio = priorities[(i * 3) % priorities.length];
    const status = statuses[i % statuses.length];
    const user = status === 'Open' ? null : SEED_USERS[1 + (i % 4)];
    const objType = objectTypes[i % objectTypes.length];
    const daysOffset = (i % 7) - 3; // Some negative (overdue), some positive
    const daysAgo = (i % 14) + 1;

    const created = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const due = new Date(Date.now() + daysOffset * 86400000).toISOString();

    const desc = i === 45
      ? '' // Blank description case for testing validation
      : `${tType} automated exception alert on ${objType} REF-${9000 + i}. Requires operator assessment.`;

    const substatus = status === 'Open'
      ? 'Unassigned'
      : status === 'Assigned'
      ? `Assigned to ${user?.displayName}`
      : status === 'In Progress'
      ? 'In Progress'
      : status === 'On Hold'
      ? 'Awaiting External Input'
      : 'Resolved';

    const isModified = i % 5 === 0;

    tasks.push({
      taskId,
      sourceSystem: 'Oracle CCS To Do Export',
      taskType: tType,
      description: desc,
      priority: prio,
      status,
      substatus,
      assigneeId: user ? user.userId : null,
      assigneeName: user ? user.displayName : null,
      teamId: user ? user.teamId : 'TEAM_BILLING',
      teamName: user ? user.teamName : 'Billing Exception Team',
      relatedObjectType: objType,
      relatedObjectId: `REF-${9000 + i}`,
      createdAt: created,
      updatedAt: created,
      dueAt: due,
      completionNote: status === 'Completed' ? 'Investigation complete. Verified against CIS ledger.' : null,
      holdReason: status === 'On Hold' ? 'Awaiting response from dispatch unit.' : null,
      sourceValues: {
        'To Do Entry ID': taskId,
        'To Do Type': tType,
        'Message': desc,
        'Status': status,
        'Priority': prio,
      },
      currentLocalValues: {
        status,
        substatus,
        priority: prio,
      },
      lastImportedAt: importTime,
      lastImportBatchId: baseBatchId,
      isLocallyModified: isModified,
      hasConflict: false,
      conflictDetails: null,
      version: isModified ? 2 : 1,
    });
  }

  return tasks;
}
