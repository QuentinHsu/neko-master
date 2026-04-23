#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHANGELOG_PATH = path.resolve('CHANGELOG.md');
const INTRO_SEPARATOR = '\n## [';
const CATEGORY_TITLES = {
  added: '新增',
  fixed: '修复',
  changed: '变更',
  docs: '文档',
  other: '其他',
};

function parseArgs(argv) {
  const options = {
    toRef: 'HEAD',
    mode: 'write',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) {
      throw new Error(`Unknown argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    options[key] = value;
    index += 1;
  }

  if (!options.version) {
    throw new Error('Missing required argument: --version');
  }

  return options;
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function getRange(fromRef, toRef) {
  return fromRef ? `${fromRef}..${toRef}` : toRef;
}

function loadCommits(range) {
  const separator = '\u001e';
  const fieldSeparator = '\u001f';
  const output = git(['log', '--reverse', `--format=%H${fieldSeparator}%s${fieldSeparator}%b${separator}`, range]);

  return output
    .split(separator)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash, subject, body] = entry.split(fieldSeparator);
      return {
        hash,
        subject: subject.trim(),
        body: (body || '').trim(),
      };
    });
}

function normalizeSubject(subject) {
  return subject
    .replace(/^[a-z]+(\([^)]+\))?!?:\s*/i, '')
    .replace(/\s+\(#\d+\)$/, '')
    .trim();
}

function categorizeCommit(subject) {
  if (/^feat(\([^)]+\))?!?:/i.test(subject)) {
    return 'added';
  }

  if (/^(fix|perf)(\([^)]+\))?!?:/i.test(subject)) {
    return 'fixed';
  }

  if (/^docs(\([^)]+\))?!?:/i.test(subject)) {
    return 'docs';
  }

  if (/^(refactor|build|ci|chore|style|test|revert)(\([^)]+\))?!?:/i.test(subject)) {
    return 'changed';
  }

  return 'other';
}

function formatBullet(commit) {
  const shortHash = commit.hash.slice(0, 7);
  return `- ${normalizeSubject(commit.subject)} (${shortHash})`;
}

function buildSection(version, commits) {
  const grouped = {
    added: [],
    fixed: [],
    changed: [],
    docs: [],
    other: [],
  };

  for (const commit of commits) {
    grouped[categorizeCommit(commit.subject)].push(formatBullet(commit));
  }

  const parts = [`## [${version}] - ${new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()).replace(/\//g, '-')}`, ''];

  for (const category of ['added', 'fixed', 'changed', 'docs', 'other']) {
    if (grouped[category].length === 0) {
      continue;
    }

    parts.push(`### ${CATEGORY_TITLES[category]}`);
    parts.push('');
    parts.push(...grouped[category]);
    parts.push('');
  }

  return parts.join('\n').trimEnd();
}

function upsertChangelog(version, section) {
  const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const entryHeader = `## [${version}] - `;

  if (changelog.includes(entryHeader)) {
    const entryStart = changelog.indexOf(entryHeader);
    const nextEntryStart = changelog.indexOf('\n## [', entryStart + entryHeader.length);
    const before = changelog.slice(0, entryStart).trimEnd();
    const after = nextEntryStart === -1 ? '' : `\n${changelog.slice(nextEntryStart).trimStart()}`;
    return `${before}\n\n${section}${after}\n`;
  }

  const insertIndex = changelog.indexOf(INTRO_SEPARATOR);
  if (insertIndex === -1) {
    throw new Error('Unable to find the first changelog entry boundary.');
  }

  const head = changelog.slice(0, insertIndex).trimEnd();
  const tail = changelog.slice(insertIndex).trimStart();
  return `${head}\n\n${section}\n\n${tail}`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const range = getRange(options.fromRef || '', options.toRef);
  const commits = loadCommits(range);

  if (commits.length === 0) {
    throw new Error(`No commits found in range ${range}`);
  }

  const section = buildSection(options.version, commits);
  if (options.mode === 'stdout') {
    process.stdout.write(`${section}\n`);
    return;
  }

  fs.writeFileSync(CHANGELOG_PATH, upsertChangelog(options.version, section));
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
