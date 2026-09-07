#!/usr/bin/env node

/**
 * @license
 * Copyright 2026 Zoe Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.platform !== 'win32') {
  const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  fs.chmodSync(path.join(packageRoot, 'dist', 'index.js'), 0o755);
}
