/**
 * @license
 * Copyright 2026 Zoe Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import type { SessionMessage } from './SessionEngine.js';

export interface PersistedSession {
  version: 1;
  id: string;
  createdAt: number;
  updatedAt: number;
  workspacePath: string;
  provider: string;
  model: string;
  messages: SessionMessage[];
}

export interface SessionSummary {
  id: string;
  createdAt: number;
  updatedAt: number;
  provider: string;
  model: string;
  messageCount: number;
  title: string;
}

export class SessionStore {
  private readonly directory: string;

  constructor(workspaceRoot: string, storagePath?: string) {
    this.directory = storagePath ?? path.join(workspaceRoot, '.zoe', 'sessions');
  }

  public getDirectory(): string {
    return this.directory;
  }

  public save(session: PersistedSession): boolean {
    let temporary: string | null = null;
    try {
      fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
      const target = this.pathFor(session.id);
      temporary = `${target}.${process.pid}.tmp`;
      fs.writeFileSync(temporary, JSON.stringify(session, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(temporary, target);
      return true;
    } catch {
      return false;
    } finally {
      try {
        if (temporary && fs.existsSync(temporary)) fs.unlinkSync(temporary);
      } catch {
        // Best-effort cleanup after a failed write.
      }
    }
  }

  public load(query: string): PersistedSession {
    const normalized = query.trim();
    const sessions = this.readAll();
    if (sessions.length === 0) throw new Error('No saved sessions found for this project.');
    if (!normalized || normalized.toLowerCase() === 'latest') return sessions[0];

    const matches = sessions.filter((session) => session.id === normalized || session.id.startsWith(normalized));
    if (matches.length === 0) throw new Error(`Session "${normalized}" was not found in this project.`);
    if (matches.length > 1) throw new Error(`Session prefix "${normalized}" is ambiguous. Use more characters.`);
    return matches[0];
  }

  public list(): SessionSummary[] {
    return this.readAll().map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      provider: session.provider,
      model: session.model,
      messageCount: session.messages.length,
      title: this.titleFor(session.messages),
    }));
  }

  public delete(id: string): boolean {
    try {
      const target = this.pathFor(id);
      if (fs.existsSync(target)) fs.unlinkSync(target);
      return true;
    } catch {
      return false;
    }
  }

  private pathFor(id: string): string {
    if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error('Invalid session ID.');
    return path.join(this.directory, `${id}.json`);
  }

  private readAll(): PersistedSession[] {
    if (!fs.existsSync(this.directory)) return [];
    const sessions: PersistedSession[] = [];
    let names: string[];
    try {
      names = fs.readdirSync(this.directory);
    } catch {
      return [];
    }
    for (const name of names) {
      if (!name.endsWith('.json')) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(this.directory, name), 'utf8')) as PersistedSession;
        if (parsed.version === 1 && typeof parsed.id === 'string' && Array.isArray(parsed.messages)) sessions.push(parsed);
      } catch {
        // Ignore incomplete or manually damaged session files.
      }
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private titleFor(messages: SessionMessage[]): string {
    const content = messages.find((message) => message.role === 'user')?.content ?? '(no user message)';
    return content.length > 60 ? `${content.slice(0, 57)}...` : content;
  }
}
