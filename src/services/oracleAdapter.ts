/**
 * Oracle Utilities Customer Cloud Service (CCS) Integration Adapter Specification
 * 
 * ARCHITECTURE NOTICE:
 * This interface defines the contract for future live Oracle CCS integration.
 * In this MVP, the application strictly runs in "File Mode — Not Connected to Live CCS".
 * Live endpoints, credentials, and network requests to Oracle CCS are explicitly not implemented here.
 */

export interface OracleCcsToDoEntry {
  toDoEntryId: string;
  toDoType: string;
  toDoRole: string;
  status: string;
  drillDownKeyValue?: string;
  messageParameters?: string[];
  sortKey?: string;
  assignedUser?: string;
  creationDateTime?: string;
}

export interface OracleCcsStatusMapping {
  oracleBaseStatus: string;
  oracleSubstatus?: string;
  canonicalStatus: 'Open' | 'Assigned' | 'In Progress' | 'On Hold' | 'Completed';
  canonicalSubstatus: string;
}

export interface OracleCcsAdapterConfig {
  baseUrl?: string;
  oauthClientId?: string;
  environmentId?: string;
  mockMode: true;
}

/**
 * Interface definition for future bidirectional Oracle CCS integration.
 */
export interface OracleCcsAdapter {
  /**
   * Future method: Query and stream active To Do entries from Oracle CCS.
   */
  readToDoEntries(criteria?: {
    toDoType?: string;
    toDoRole?: string;
    statusFilter?: string;
    maxEntries?: number;
  }): Promise<OracleCcsToDoEntry[]>;

  /**
   * Future method: Retrieve authoritative current state of a single To Do entry.
   */
  getTaskState(toDoEntryId: string): Promise<OracleCcsToDoEntry | null>;

  /**
   * Translates Oracle CCS base status codes (e.g., '10', '20', '30') to canonical lifecycle statuses.
   */
  mapOracleStatus(baseStatus: string, substatus?: string): OracleCcsStatusMapping;

  /**
   * Future method: Validate whether a transition is accepted by Oracle CCS business rules.
   */
  validateSupportedTransition(currentEntry: OracleCcsToDoEntry, targetStatus: string): boolean;

  /**
   * Future method: Execute state change via Oracle REST / SOAP maintenance services.
   */
  executeApprovedAction(action: {
    toDoEntryId: string;
    targetStatus: string;
    reason?: string;
    assignedUser?: string;
    notes?: string;
  }): Promise<{ success: boolean; externalCorrelationId?: string; error?: string }>;
}

/**
 * Stub implementation ensuring strict safety and transparency in File Mode.
 */
export class FileStubOracleCcsAdapter implements OracleCcsAdapter {
  private isConnected = false;

  public async readToDoEntries(): Promise<OracleCcsToDoEntry[]> {
    throw new Error(
      'Live Oracle CCS connection is not enabled. Application operates in local File Mode using imported batches.'
    );
  }

  public async getTaskState(): Promise<OracleCcsToDoEntry | null> {
    throw new Error('Live Oracle CCS connection is not enabled in File Mode.');
  }

  public mapOracleStatus(baseStatus: string, substatus?: string): OracleCcsStatusMapping {
    const norm = String(baseStatus || '').trim().toUpperCase();
    if (norm === '10' || norm === 'OPEN') {
      return { oracleBaseStatus: norm, canonicalStatus: 'Open', canonicalSubstatus: substatus || 'Unassigned' };
    }
    if (norm === '20' || norm === 'ASSIGNED' || norm === 'BEING WORKED') {
      return { oracleBaseStatus: norm, canonicalStatus: 'Assigned', canonicalSubstatus: substatus || 'Assigned' };
    }
    if (norm === 'IN_PROGRESS' || norm === 'WORKING' || norm === 'WIP') {
      return { oracleBaseStatus: norm, canonicalStatus: 'In Progress', canonicalSubstatus: substatus || 'In Progress' };
    }
    if (norm === 'HOLD' || norm === 'ON_HOLD' || norm === 'SUSPENDED') {
      return { oracleBaseStatus: norm, canonicalStatus: 'On Hold', canonicalSubstatus: substatus || 'On Hold' };
    }
    if (norm === '30' || norm === 'COMPLETED' || norm === 'CLOSED') {
      return { oracleBaseStatus: norm, canonicalStatus: 'Completed', canonicalSubstatus: substatus || 'Resolved' };
    }
    return { oracleBaseStatus: norm, canonicalStatus: 'Open', canonicalSubstatus: substatus || norm };
  }

  public validateSupportedTransition(): boolean {
    return false;
  }

  public async executeApprovedAction(): Promise<{ success: boolean; error?: string }> {
    return {
      success: false,
      error: 'Cannot update live Oracle CCS: Application is configured in File Mode.',
    };
  }
}
