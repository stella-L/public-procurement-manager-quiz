import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const reportDir = path.join(root, 'skills', 'extraction-reports');

const sources = [
  {
    id: 'subject-1-core',
    subject: 1,
    label: '공공조달의 이해',
    path: 'docs/공식책/공공조달의 이해.pdf',
    mode: 'text',
  },
  {
    id: 'subject-2-core',
    subject: 2,
    label: '공공조달 계획분석',
    path: 'docs/공식책/공공조달 계획분석.pdf',
    mode: 'text',
  },
];

const parseMetadataPath = (output) => {
  const match = output.match(/Meta\s+->\s+(.+)/);
  return match?.[1]?.trim();
};

fs.mkdirSync(reportDir, { recursive: true });

const reports = [];

for (const source of sources) {
  const absoluteSource = path.join(root, source.path);
  if (!fs.existsSync(absoluteSource)) {
    reports.push({ ...source, status: 'missing', error: `${source.path} not found` });
    continue;
  }

  const result = spawnSync(
    'book-to-skill',
    [absoluteSource, '--mode', source.mode, '--install-missing', 'no'],
    { cwd: root, encoding: 'utf8' },
  );
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  const metadataPath = parseMetadataPath(output);
  const report = {
    ...source,
    status: result.status === 0 ? 'ok' : 'failed',
    extractedAt: new Date().toISOString(),
    command: `book-to-skill ${source.path} --mode ${source.mode} --install-missing no`,
    exitCode: result.status,
    output: output.trim().split('\n').slice(-24),
  };

  if (metadataPath && fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    report.metadata = {
      filename: metadata.filename,
      extractionMethod: metadata.extraction_method,
      extractionMode: metadata.extraction_mode,
      pages: metadata.pages,
      chars: metadata.chars,
      words: metadata.words,
      estimatedTokens: metadata.estimated_tokens,
      chaptersDetected: metadata.chapters_detected,
      chaptersMethod: metadata.chapters_method,
      hasToc: metadata.has_toc,
      chapterHeadingsSample: metadata.chapter_headings_sample,
    };
  }

  fs.writeFileSync(
    path.join(reportDir, `${source.id}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  reports.push(report);
}

const failed = reports.filter((report) => report.status !== 'ok');
console.log(
  `Extraction reports written: ${reports.length - failed.length} ok, ${failed.length} failed -> ${path.relative(root, reportDir)}`,
);

if (failed.length) {
  for (const report of failed) {
    console.error(`${report.id}: ${report.error ?? `exit ${report.exitCode}`}`);
  }
  process.exit(1);
}
