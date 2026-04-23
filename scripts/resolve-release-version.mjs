#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const options = {
    channel: 'stable',
    bump: 'auto',
    output: 'json',
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

  return options;
}

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function readRepositoryVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  if (typeof packageJson.version !== 'string' || packageJson.version.length === 0) {
    throw new Error('package.json is missing a valid version field.');
  }

  return packageJson.version;
}

function getVersionAnchorCommit(version) {
  try {
    return git(['log', '-S', `"version": "${version}"`, '--format=%H', '-n', '1', '--', 'package.json']);
  } catch {
    return '';
  }
}

function normalizeStableBaseVersion(version) {
  const stable = parseStableVersion(version);
  if (stable) {
    return stable.version;
  }

  const dev = parseDevVersion(version);
  if (dev) {
    return dev.baseVersion;
  }

  throw new Error(`package.json version "${version}" is neither stable nor dev semver.`);
}

function listTags(pattern) {
  const output = git(['tag', '-l', pattern, '--sort=-v:refname']);
  return output ? output.split('\n').filter(Boolean) : [];
}

function parseStableVersion(raw) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(raw);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    version: `${match[1]}.${match[2]}.${match[3]}`,
  };
}

function parseDevVersion(raw) {
  const normalized = raw.startsWith('dev-') ? raw.slice(4) : raw;
  const match = /^v?(\d+)\.(\d+)\.(\d+)-dev\.(\d+)$/.exec(normalized);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: Number(match[4]),
    version: `${match[1]}.${match[2]}.${match[3]}-dev.${match[4]}`,
    baseVersion: `${match[1]}.${match[2]}.${match[3]}`,
  };
}

function getCommitText(range) {
  try {
    return git(['log', '--format=%s%n%b', range]);
  } catch {
    return '';
  }
}

function detectBump(commitText) {
  if (/(BREAKING CHANGE|^[^\s]+(\([^)]+\))?!:)/m.test(commitText)) {
    return 'major';
  }

  if (/^feat(\([^)]+\))?:/m.test(commitText)) {
    return 'minor';
  }

  if (/^(fix|perf|refactor|build|ci|revert|chore|docs|style|test)(\([^)]+\))?:/m.test(commitText)) {
    return 'patch';
  }

  return null;
}

function bumpVersion(baseVersion, bump) {
  const [rawMajor, rawMinor, rawPatch] = baseVersion.split('.');
  let major = Number(rawMajor);
  let minor = Number(rawMinor);
  let patch = Number(rawPatch);

  switch (bump) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
      patch += 1;
      break;
    default:
      throw new Error(`Unsupported bump type: ${bump}`);
  }

  return `${major}.${minor}.${patch}`;
}

function resolveStableVersion({ inputTag, bump }) {
  const stableTags = listTags('v[0-9]*.[0-9]*.[0-9]*');
  const latestStableTag = stableTags[0] ?? '';
  const repositoryVersion = readRepositoryVersion();
  const fallbackBaseVersion = normalizeStableBaseVersion(repositoryVersion);
  const versionAnchorCommit = latestStableTag ? '' : getVersionAnchorCommit(repositoryVersion);
  const previousRef = latestStableTag || versionAnchorCommit;

  if (inputTag) {
    const parsed = parseStableVersion(inputTag);
    if (!parsed) {
      throw new Error(`Invalid stable tag: ${inputTag}`);
    }

    const [major, minor] = parsed.version.split('.');

    return {
      channel: 'stable',
      version: parsed.version,
      tag: `v${parsed.version}`,
      previousTag: previousRef,
      baseVersion: parsed.version,
      bump: 'manual',
      prereleaseNumber: '',
      majorVersion: major,
      minorVersion: `${major}.${minor}`,
    };
  }

  const baseVersion = latestStableTag ? latestStableTag.slice(1) : fallbackBaseVersion;
  const range = previousRef ? `${previousRef}..HEAD` : 'HEAD';
  const resolvedBump = bump === 'auto' ? detectBump(getCommitText(range)) : bump;

  if (!resolvedBump) {
    throw new Error(
      `No releasable commits found since ${previousRef || 'repository start'}. Set --bump manually.`,
    );
  }

  const version = bumpVersion(baseVersion, resolvedBump);

  const [major, minor] = version.split('.');

  return {
    channel: 'stable',
    version,
    tag: `v${version}`,
    previousTag: previousRef,
    baseVersion: version,
    bump: resolvedBump,
    prereleaseNumber: '',
    majorVersion: major,
    minorVersion: `${major}.${minor}`,
  };
}

function resolveDevVersion({ inputTag, bump }) {
  const stableTags = listTags('v[0-9]*.[0-9]*.[0-9]*');
  const devTags = listTags('dev-v[0-9]*.[0-9]*.[0-9]*-dev.[0-9]*');
  const latestStableTag = stableTags[0] ?? '';
  const latestDevTag = devTags[0] ?? '';
  const repositoryVersion = readRepositoryVersion();
  const fallbackBaseVersion = normalizeStableBaseVersion(repositoryVersion);
  const versionAnchorCommit = latestStableTag || latestDevTag ? '' : getVersionAnchorCommit(repositoryVersion);
  const previousRef = latestDevTag || latestStableTag || versionAnchorCommit;

  if (inputTag) {
    const parsed = parseDevVersion(inputTag);
    if (!parsed) {
      throw new Error(`Invalid dev tag: ${inputTag}`);
    }

    return {
      channel: 'dev',
      version: parsed.version,
      tag: `dev-v${parsed.version}`,
      previousTag: previousRef,
      baseVersion: parsed.baseVersion,
      bump: 'manual',
      prereleaseNumber: String(parsed.prerelease),
      majorVersion: String(parsed.major),
      minorVersion: `${parsed.major}.${parsed.minor}`,
    };
  }

  const stableBaseVersion = latestStableTag ? latestStableTag.slice(1) : fallbackBaseVersion;
  const bumpRange = previousRef ? `${previousRef}..HEAD` : 'HEAD';
  const resolvedBump = bump === 'auto' ? detectBump(getCommitText(bumpRange)) : bump;

  if (!resolvedBump) {
    throw new Error(
      `No releasable commits found since ${previousRef || 'repository start'}. Set --bump manually.`,
    );
  }

  const nextBaseVersion = bumpVersion(stableBaseVersion, resolvedBump);
  const latestDevVersion = latestDevTag ? parseDevVersion(latestDevTag) : null;
  const prereleaseNumber =
    latestDevVersion && latestDevVersion.baseVersion === nextBaseVersion
      ? latestDevVersion.prerelease + 1
      : 1;

  const [major, minor] = nextBaseVersion.split('.');

  return {
    channel: 'dev',
    version: `${nextBaseVersion}-dev.${prereleaseNumber}`,
    tag: `dev-v${nextBaseVersion}-dev.${prereleaseNumber}`,
    previousTag: previousRef,
    baseVersion: nextBaseVersion,
    bump: resolvedBump,
    prereleaseNumber: String(prereleaseNumber),
    majorVersion: major,
    minorVersion: `${major}.${minor}`,
  };
}

function printGithubOutput(payload) {
  for (const [key, value] of Object.entries(payload)) {
    process.stdout.write(`${key}=${value ?? ''}\n`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const resolver = options.channel === 'dev' ? resolveDevVersion : resolveStableVersion;
  const payload = resolver({
    inputTag: options.tag || '',
    bump: options.bump || 'auto',
  });

  if (options.output === 'github') {
    printGithubOutput(payload);
    return;
  }

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
