import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import Actions from '../src/index';
import { CompatWorkspace } from '../src/Compat';

const fixture = vi.hoisted(() => ({ active: { connectionId: 'cosmos-1' as string | null, driver: 'cosmos-nosql' }, query: vi.fn(), modal: vi.fn() }));
vi.mock('@tabularis/plugin-api', () => ({ usePluginService: undefined, usePluginAssets: undefined, usePluginConnection: () => fixture.active, usePluginQuery: () => ({ executeQuery: fixture.query, loading: false }), usePluginModal: () => ({ openModal: fixture.modal }), usePluginTranslation: () => (_key: string, options: { defaultValue: string }) => options.defaultValue }));
beforeEach(() => { fixture.active = { connectionId: 'cosmos-1', driver: 'cosmos-nosql' }; fixture.query.mockReset(); fixture.modal.mockReset(); });
afterEach(cleanup);

test('0.26 API에서는 비밀번호를 숨기지 않고 기본 연결 필드를 표시한다', () => {
  // given
  const hide = vi.fn();
  const extra = { auth_mode: 'account_key', endpoint: '', database: '', container: '' };
  // when
  render(<Actions pluginId="cosmos-nosql" context={{ driver: 'cosmos-nosql', extra, setExtraField: vi.fn(), setCredentialFieldsHidden: hide }} />);
  // then
  expect(screen.getByLabelText('기본 컨테이너')).toBeTruthy();
  expect(hide).toHaveBeenCalledWith(false);
  expect(hide).not.toHaveBeenCalledWith(true);
});

test('작업 공간과 활성 연결이 다르면 조회를 실행하지 않는다', () => {
  // given
  fixture.active = { connectionId: 'other', driver: 'cosmos-nosql' };
  render(<CompatWorkspace connectionId="cosmos-1" />);
  // when
  fireEvent.click(screen.getByText('조회'));
  // then
  expect(fixture.query).not.toHaveBeenCalled();
});

test('Cosmos SQL 원문을 전달하고 제한된 결과를 표시한다', async () => {
  // given
  fixture.query.mockResolvedValue({ columns: ['_document'], rows: [[{ id: 'synthetic' }]], truncated: true });
  render(<CompatWorkspace connectionId="cosmos-1" />);
  // when
  fireEvent.click(screen.getByText('조회'));
  // then
  await waitFor(() => expect(screen.getByText(/truncated/)).toBeTruthy());
  expect(fixture.query).toHaveBeenCalledWith('SELECT * FROM c');
  expect(screen.getByText(/"id": "synthetic"/)).toBeTruthy();
});

test('연결을 바꾼 뒤 도착한 이전 결과는 화면에 표시하지 않는다', async () => {
  // given
  let complete!: (value: { columns: string[]; rows: unknown[][] }) => void;
  fixture.query.mockReturnValue(new Promise(resolve => { complete = resolve; }));
  const view = render(<CompatWorkspace connectionId="cosmos-1" />);
  fireEvent.click(screen.getByText('조회'));
  fixture.active = { connectionId: 'other', driver: 'cosmos-nosql' };
  view.rerender(<CompatWorkspace connectionId="cosmos-1" />);
  // when
  complete({ columns: ['_document'], rows: [[{ id: 'late-synthetic' }]] });
  await Promise.resolve();
  // then
  expect(screen.queryByText(/late-synthetic/)).toBeNull();
});
