import { usePluginModal, usePluginTranslation, type SlotComponentProps } from '@tabularis/plugin-api';
import { ConnectionExtraFields } from './ConnectionFields';
import { snapshotRef } from './models';
import { Workspace } from './Workspace';
import './styles.css';

export default function CosmosActions({ context, pluginId }: SlotComponentProps) {
  const modal = usePluginModal();
  const t = usePluginTranslation(pluginId);
  if (context.driver && context.driver !== 'cosmos-nosql') return null;
  if (context.targetPluginId && context.targetPluginId !== pluginId) return null;
  if (typeof context.setExtraField === 'function' && typeof context.setCredentialFieldsHidden === 'function') {
    return <ConnectionExtraFields extra={(context.extra || {}) as Record<string, string>} setExtraField={context.setExtraField as (key: string, value: string) => void} setCredentialFieldsHidden={context.setCredentialFieldsHidden as (hidden: boolean) => void} />;
  }
  const snapshot = snapshotRef(context);
  const open = (document = false) => modal.openModal({ title: t('workspace', { defaultValue: 'Cosmos 작업 공간' }), size: 'xl', content: <Workspace pluginId={pluginId} initialConnectionId={context.connectionId || null} snapshot={document ? snapshot : null} /> });
  if (context.targetPluginId || context.tableName || context.resultId) return <span className="cosmos-actions"><button onClick={() => open()}>{t('workspace', { defaultValue: 'Cosmos 작업 공간' })}</button>{(context.rowIndex !== undefined || context.resultRowOrdinal !== undefined || context.columnName) && <button disabled={!snapshot || !context.connectionId} onClick={() => open(true)}>문서 보기</button>}</span>;
  return null;
}
