/**
 * Host entry for dsh-session-manager.
 *
 * The browser owns the radar view; this half only exposes one authenticated
 * maintenance route for permanently deleting an archived session's own log
 * directory. DSH's persistence seam intentionally has no delete API, so the
 * route performs the external removal that the seam documents as the caller's
 * responsibility. It accepts archived ids only and refuses to recurse outside
 * a directory that is visibly named after the session.
 */
import { rm } from 'node:fs/promises';
import { basename, dirname } from 'node:path';

const DELETE_PATH = '/api/session-manager.delete';
const MAX_DELETE = 50;

export const name = 'session-manager';
export const inject = ['connection'];

function connectionOf(ctx) {
  return Reflect.get(ctx, 'connection');
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function uniqueIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(id => typeof id === 'string' && id.length > 0 && id.length < 256))].slice(0, MAX_DELETE);
}

async function deleteOne(ctx, id, archived) {
  if (!archived.has(id)) throw new Error('只能删除已归档的会话');
  const persistence = ctx.get?.('sessionPersistence');
  if (persistence === undefined || typeof persistence.list !== 'function') throw new Error('宿主未提供会话持久化服务');
  const snapshots = await persistence.list();
  const snapshot = (Array.isArray(snapshots) ? snapshots : []).find(item => item?.header?.id === id);
  if (snapshot === undefined) throw new Error('找不到会话日志');
  const logPath = snapshot.location?.path;
  if (typeof logPath !== 'string' || logPath === '') throw new Error('会话没有可删除的文件路径');
  const directory = dirname(logPath);
  const folder = basename(directory);
  const normalized = id.startsWith('session-') ? id.slice('session-'.length) : id;
  if (!folder.includes(id) && !folder.includes(normalized)) throw new Error('无法确认会话目录，已拒绝删除');
  if (basename(logPath).includes('session') !== true) throw new Error('会话日志文件名不符合预期，已拒绝删除');
  const registry = ctx.get?.('workspaceRegistry');
  let unarchived = false;
  if (registry !== undefined && typeof registry.unarchiveSession === 'function') {
    await registry.unarchiveSession(id);
    unarchived = true;
  }
  try {
    await rm(directory, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
  } catch (error) {
    if (unarchived && registry !== undefined && typeof registry.archiveSession === 'function') {
      await registry.archiveSession(id, { stopActivity: true }).catch(() => {});
    }
    throw error;
  }
  return id;
}

async function handleDelete(ctx, request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: '请求体不是有效 JSON' });
  }
  const ids = uniqueIds(payload?.ids);
  if (ids.length === 0) return json(400, { error: '没有要删除的会话' });
  const deletion = await deleteArchivedSessions(ctx, ids);
  // Partial success is still a handled maintenance result; the client reads
  // both arrays and reports the per-session failures.
  return json(200, deletion);
}

async function deleteArchivedSessions(ctx, ids) {
  const registry = ctx.get?.('workspaceRegistry');
  const archived = new Set(Array.isArray(registry?.archivedSessionIds) ? registry.archivedSessionIds : []);
  const deleted = [];
  const failed = [];
  for (const id of ids) {
    try {
      await deleteOne(ctx, id, archived);
      deleted.push(id);
    } catch (error) {
      failed.push({ id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { deleted, failed };
}

export function apply(ctx) {
  const connection = connectionOf(ctx);
  if (connection === undefined || connection.fetch === undefined || typeof connection.fetch.register !== 'function') return;
  const register = () => connection.fetch.register({
    path: DELETE_PATH,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: request => handleDelete(ctx, request),
  });
  const dispose = register();
  if (typeof ctx.effect === 'function') {
    try { ctx.effect(() => dispose, 'session-manager: delete route'); } catch { /* older host: route lives with plugin lifetime */ }
  }
}
