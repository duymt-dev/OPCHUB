import { Injectable } from '@nestjs/common';
import type { DbTx } from '@opchub/db';
import type { BulkBatchRow } from './bot-bulk.repository';

@Injectable()
export class BotBulkSaveRepository {
  /** Set-based ID allocation, script inserts and replay marker update in the caller's transaction. */
  save(tx: DbTx, batch: BulkBatchRow) {
    return tx.$queryRaw<{ id: string; topic: string }[]>`
      WITH planned AS MATERIALIZED (
        SELECT id AS item_id, 'sc' || nextval('bot_script_seq')::text AS script_id, topic, lines
        FROM bot_bulk_items WHERE batch_id = ${batch.id} AND selected AND saved_script_id IS NULL
        ORDER BY ordinal
      ), inserted AS (
        INSERT INTO bot_scripts (id,topic,group_ids,lines,enabled,type,delay_minutes,run_at,invite_real,created_at,updated_at)
        SELECT script_id,topic,${batch.groupIds}::text[],lines,true,${batch.typeName},${batch.delayMinutes},NULL,true,now(),now()
        FROM planned RETURNING id
      )
      UPDATE bot_bulk_items item SET saved_script_id = planned.script_id, updated_at = now()
      FROM planned JOIN inserted ON inserted.id = planned.script_id
      WHERE item.id = planned.item_id AND item.saved_script_id IS NULL
      RETURNING item.saved_script_id AS id, item.topic`;
  }
}
