/**
 * @license
 * Copyright 2026 Zoe Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SessionStore, type PersistedSession } from './SessionStore.js';

describe('SessionStore', () => {
  const temporaryDirectories: string[] = [];

  afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  function setup(): { root: string; store: SessionStore } {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zoe-sessions-'));
    temporaryDirectories.push(root);
    return { root, store: new SessionStore(root) };
  }

  function session(id: string, updatedAt: number, content: string): PersistedSession {
    return {
      version: 1,
      id,
      createdAt: updatedAt - 10,
      updatedAt,
      workspacePath: '/project',
      provider: 'placeholder',
      model: 'placeholder',
      messages: [{ id: `${id}-message`, role: 'user', content, timestamp: updatedAt }],
    };
  }

  it('saves, lists, and loads sessions by latest, full ID, or prefix', () => {
    const { store } = setup();
    store.save(session('aaaaaaaa-1111', 100, 'older conversation'));
    store.save(session('bbbbbbbb-2222', 200, 'newer conversation'));

    expect(store.list().map((item) => item.id)).toEqual(['bbbbbbbb-2222', 'aaaaaaaa-1111']);
    expect(store.load('latest').id).toBe('bbbbbbbb-2222');
    expect(store.load('aaaaaaaa-1111').messages[0].content).toBe('older conversation');
    expect(store.load('bbbb').id).toBe('bbbbbbbb-2222');
  });

  it('rejects unknown and ambiguous IDs and ignores damaged files', () => {
    const { store } = setup();
    store.save(session('abcd-1111', 100, 'one'));
    store.save(session('abcd-2222', 200, 'two'));
    fs.writeFileSync(path.join(store.getDirectory(), 'damaged.json'), '{');

    expect(() => store.load('missing')).toThrow('was not found');
    expect(() => store.load('abcd')).toThrow('ambiguous');
    expect(store.list()).toHaveLength(2);
  });

  it('deletes a saved session', () => {
    const { store } = setup();
    store.save(session('delete-me', 100, 'temporary'));
    store.delete('delete-me');
    expect(store.list()).toEqual([]);
  });

  it('does not interrupt the caller when storage is unwritable', () => {
    const { root } = setup();
    const blockingFile = path.join(root, 'not-a-directory');
    fs.writeFileSync(blockingFile, 'occupied');
    const store = new SessionStore(root, path.join(blockingFile, 'sessions'));
    expect(store.save(session('safe-failure', 100, 'keep chatting'))).toBe(false);
    expect(store.list()).toEqual([]);
  });
});
