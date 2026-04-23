#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const CHANGELOG_PATH = path.resolve('CHANGELOG.md');

function parseArgs(argv) {
  const options = {};

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

  for (const requiredKey of ['version', 'tag', 'channel', 'image']) {
    if (!options[requiredKey]) {
      throw new Error(`Missing required argument: --${requiredKey}`);
    }
  }

  return options;
}

function extractSection(version) {
  const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const heading = `## [${version}] - `;
  const start = changelog.indexOf(heading);

  if (start === -1) {
    throw new Error(`Version ${version} not found in CHANGELOG.md`);
  }

  const next = changelog.indexOf('\n## [', start + heading.length);
  return (next === -1 ? changelog.slice(start) : changelog.slice(start, next)).trim();
}

function buildCompareUrl(repository, previousTag, tag) {
  if (!repository || !previousTag) {
    return '';
  }

  return `https://github.com/${repository}/compare/${previousTag}...${tag}`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const changelogSection = extractSection(options.version);
  const compareUrl = buildCompareUrl(options.repository || '', options.previousTag || '', options.tag);
  const dockerTag = options.channel === 'stable' ? options.version : options.version;
  const dockerLatestTag = options.channel === 'stable' ? 'latest' : 'dev';

  const lines = [
    `# Neko Master ${options.version}`,
    '',
    `- Channel: \`${options.channel}\``,
    `- Git tag: \`${options.tag}\``,
    `- Docker image: \`${options.image}:${dockerTag}\``,
    `- Floating tag: \`${options.image}:${dockerLatestTag}\``,
  ];

  if (compareUrl) {
    lines.push(`- Compare: ${compareUrl}`);
  }

  lines.push('', '## Docker', '', '```bash');
  lines.push(`docker pull ${options.image}:${dockerTag}`);
  lines.push('```', '', '## Changelog', '', changelogSection, '');

  const output = lines.join('\n');
  if (options.output) {
    fs.writeFileSync(path.resolve(options.output), output);
    return;
  }

  process.stdout.write(`${output}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
