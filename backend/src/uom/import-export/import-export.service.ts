import { Injectable } from '@nestjs/common';

import { GroupsService } from '../groups/groups.service';

import type { ImportGroupsDto } from './dto/import-groups.dto';

export interface RowResult {
  row: number;
  name: string;
  status: 'created' | 'rejected';
  error?: string;
}

// Bulk Import/Export (T-080, FR-011, ADR-098). Per-row validation identical to an interactive
// Group save — literally reuses `GroupsService.create`, so BR-019's completeness check and every
// other Group-save rule apply row-for-row (VR-017), not a separate/looser bulk-path implementation.
//
// **Scoped implementation, flagged not hidden**: ADR-098's full background-job design (BullMQ
// progress tracking, S3-backed auto-expiring export files) targets exports/imports too large for a
// synchronous request — but ADR-098 itself sets a ~2-minute sync-vs-background threshold, and
// UOM's reference-data volume (dozens–low hundreds of Groups, not millions of transaction rows)
// stays well under that in practice. This implementation is synchronous, matching that threshold
// rule rather than building unused queue infrastructure; if a real deployment's import size grows
// past the sync threshold, route this through the same BullMQ pattern `QuickBooksSyncProcessor`
// already establishes in this codebase.
@Injectable()
export class ImportExportService {
  constructor(private readonly groups: GroupsService) {}

  async importGroups(dto: ImportGroupsDto, userId?: string) {
    const results: RowResult[] = [];
    let rowNumber = 0;
    for (const row of dto.groups) {
      rowNumber += 1;
      try {
        await this.groups.create(row, userId);
        results.push({ row: rowNumber, name: row.name, status: 'created' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({ row: rowNumber, name: row.name, status: 'rejected', error: message });
      }
    }
    return {
      total: results.length,
      created: results.filter((r) => r.status === 'created').length,
      rejected: results.filter((r) => r.status === 'rejected').length,
      results,
    };
  }

  async exportGroups() {
    const { items } = await this.groups.list({ take: 100000 });
    const detailed = await Promise.all(items.map((item) => this.groups.findById(item.id)));
    return { total: detailed.length, groups: detailed };
  }
}
