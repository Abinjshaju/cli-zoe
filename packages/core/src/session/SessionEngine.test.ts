/**
 * @license
 * Copyright 2026 Zoe Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { SessionEngine } from './SessionEngine.js';
import { EventBus } from '../events/EventBus.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SessionStore } from './SessionStore.js';

describe('SessionEngine', () => {
  it('initializes with default placeholder provider and emits session:start', () => {
    const events = new EventBus();
    let started = false;
    events.on('session:start', () => {
      started = true;
    });

    const session = new SessionEngine({ eventBus: events });
    session.start();

    expect(started).toBe(true);
    expect(session.getMessages()).toHaveLength(0);
    expect(session.getState()).toBe('idle');
    expect(session.getProvider().name).toBe('placeholder');
  });

  it('handles user input, streams tokens, and returns Zoe core is running.', async () => {
    const events = new EventBus();
    const chunks: string[] = [];
    const statuses: string[] = [];

    events.on('runtime:stream', (data) => {
      chunks.push(data.chunk);
    });
    events.on('runtime:status', (data) => {
      if (data.message) {
        statuses.push(data.message);
      }
    });

    const session = new SessionEngine({ eventBus: events });
    session.start();

    await session.send('hello');

    const messages = session.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('hello');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toBe('Zoe core is running.');
    expect(chunks.join('')).toBe('Zoe core is running.');
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses[0]).toContain('Thinking with placeholder');
  });

  it('clears message history', async () => {
    const session = new SessionEngine();
    session.start();
    await session.send('test');
    expect(session.getMessages()).toHaveLength(2);

    session.clearHistory();
    expect(session.getMessages()).toHaveLength(0);
  });

  it('persists and resumes a project conversation', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zoe-engine-session-'));
    try {
      const store = new SessionStore(root);
      const first = new SessionEngine({ workspaceRoot: root, sessionStore: store });
      await first.send('remember this');
      const savedId = first.id;

      const second = new SessionEngine({ workspaceRoot: root, sessionStore: store });
      const resumed = second.resumeSession(savedId.slice(0, 8));
      expect(resumed.id).toBe(savedId);
      expect(second.getMessages().map((message) => message.content)).toEqual([
        'remember this',
        'Zoe core is running.',
      ]);

      second.clearHistory();
      expect(store.list()).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
