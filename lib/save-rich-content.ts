import type { SupabaseClient } from '@supabase/supabase-js';
import type { RichDocumentBlock, RichDocumentContent } from '@/types/rich-content';

const INSERT_BATCH_SIZE = 50;

function buildMetadataBlock(content: RichDocumentContent): RichDocumentBlock {
  return {
    id: 'metadata',
    type: 'meta',
    metadata: content.metadata,
  };
}

export async function saveRichContent(
  supabase: SupabaseClient,
  materialId: string,
  content: RichDocumentContent
) {
  try {
    await supabase.from('material_rich_blocks').delete().eq('material_id', materialId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('relation') && message.includes('material_rich_blocks')) {
      console.warn('[saveRichContent] Table material_rich_blocks is missing. Run add-rich-content.sql migration.');
      return;
    }
    console.error('[saveRichContent] Failed to clear existing rich blocks:', error);
    return;
  }

  const blocks: RichDocumentBlock[] = [buildMetadataBlock(content), ...content.blocks];

  const rows = blocks.map((block, index) => ({
    material_id: materialId,
    order_index: index,
    block_type: block.type,
    page_number: block.page ?? null,
    content: block,
  }));

  for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
    const { error } = await supabase.from('material_rich_blocks').insert(batch);
    if (error) {
      console.error('[saveRichContent] Failed to insert rich blocks batch:', error);
      break;
    }
  }
}

