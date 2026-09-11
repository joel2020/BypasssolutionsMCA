import { describe, expect, it } from 'vitest';
import { canonicalLeadStatuses, pipelineStages, stageForStatus, statusForStage, approvedStatuses } from './status';
import type { LeadStatus } from './supabase';

/**
 * The 7-stage board is a *view* over the status values already stored in
 * Supabase (so we never had to migrate live rows). If a stored status stops
 * mapping to a stage, deals silently vanish from the Kanban — hence these tests.
 */
describe('pipeline stages', () => {
  it('exposes exactly the 7 stages Chris asked for, in order', () => {
    expect(pipelineStages.map((s) => s.label)).toEqual([
      'New lead',
      'Application started',
      'Documents needed',
      'Under review',
      'Approved',
      'In-contract',
      'Funded',
    ]);
  });

  it('maps every active stored status onto a stage (no deal falls off the board)', () => {
    const offBoard: LeadStatus[] = ['Declined', 'Lost'];
    const active = canonicalLeadStatuses.filter((s) => !offBoard.includes(s));
    for (const status of active) {
      expect(stageForStatus(status), `status "${status}" has no stage`).not.toBeNull();
    }
  });

  it('keeps Declined/Lost off the board', () => {
    expect(stageForStatus('Declined')).toBeNull();
    expect(stageForStatus('Lost')).toBeNull();
  });

  it('maps the legacy status names onto the new stage names', () => {
    expect(stageForStatus('Pre-Approved')).toBe('Approved');
    expect(stageForStatus('Offer Sent')).toBe('In-contract');
    expect(stageForStatus('Contacted')).toBe('New lead');
    expect(stageForStatus('Funded')).toBe('Funded');
  });

  it('round-trips: choosing a stage persists a status that maps back to it', () => {
    for (const stage of pipelineStages) {
      const persisted = statusForStage(stage.label);
      expect(persisted).not.toBeNull();
      expect(stageForStatus(persisted as LeadStatus)).toBe(stage.label);
    }
  });

  it('returns null for an unknown stage label', () => {
    expect(statusForStage('Nonsense')).toBeNull();
  });

  it('never assigns one status to two stages', () => {
    const seen = new Set<string>();
    for (const stage of pipelineStages) {
      for (const status of stage.statuses) {
        expect(seen.has(status), `"${status}" appears in more than one stage`).toBe(false);
        seen.add(status);
      }
    }
  });

  it('treats approved-but-not-yet-funded statuses as approvals', () => {
    expect(approvedStatuses).toContain('Pre-Approved');
    expect(approvedStatuses).toContain('Offer Sent');
    expect(approvedStatuses).not.toContain('Funded');
  });
});

import {contactStatuses,contactStatusForLead} from './status';
it('preserves six contact dispositions independently from pipeline stages',()=>{
 expect(contactStatuses).toEqual(['New lead','Contacted/Qualified','Low rev/Not interested','Unresponsive','Missing docs','Submitted']);
 for(const lead_status of contactStatuses)expect(contactStatusForLead({status:'New Lead',lead_status})).toBe(lead_status);
 expect(contactStatusForLead({status:'Contacted'})).toBe('Contacted/Qualified');
 expect(contactStatusForLead({status:'Documents Needed'})).toBe('Missing docs');
 expect(contactStatusForLead({status:'Under Review'})).toBe('Submitted');
});
