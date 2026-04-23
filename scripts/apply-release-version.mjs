#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const options = {
    files: ['package.json'],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--file') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('Missing value for --file');
      }

      if (!options.filesProvided) {
        options.files = [];
        options.filesProvided = true;
      }

      options.files.push(value);
      index += 1;
      continue;
    }

    if (arg === '--version') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('Missing value for --version');
      }

      options.version = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.version) {
    throw new Error('Missing required argument: --version');
  }

  return options;
}

function updatePackageVersion(file, version) {
  const absolutePath = path.resolve(file);
  const current = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  current.version = version;
  fs.writeFileSync(absolutePath, `${JSON.stringify(current, null, 2)}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  for (const file of options.files) {
    updatePackageVersion(file, options.version);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
