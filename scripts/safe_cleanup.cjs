#!/usr/bin/env node
/**
 * AppSec Safe Project Cleanup Utility
 * 
 * Safely removes verified temporary build artifacts, compiler caches, and temporary logs.
 * Defaults to a non-destructive DRY RUN preview.
 * 
 * Safety invariants:
 * - NEVER deletes database files (*.db, *.sqlite)
 * - NEVER deletes source code (src/, src-tauri/src/)
 * - NEVER deletes tools/ or downloaded models
 * - NEVER deletes user settings or environment configurations (.env)
 * 
 * Usage:
 *   node scripts/safe_cleanup.js           # Preview what will be removed (Dry Run)
 *   node scripts/safe_cleanup.js --execute # Perform the actual cleanup
 *   node scripts/safe_cleanup.js --target  # Also include Rust target/ build artifacts
 */

const fs = require('fs');
const path = require('path');

const isExecute = process.argv.includes('--execute');
const includeTarget = process.argv.includes('--target');

console.log('====================================================');
console.log('AppSec Safe Project Cleanup Utility');
console.log(`Mode: ${isExecute ? 'EXECUTE (REAL CLEANUP)' : 'PREVIEW (DRY RUN - No files will be deleted)'}`);
console.log('====================================================\n');

// Strictly allowlisted paths for safe cleanup
const APPROVED_GENERATED_TARGETS = [
  { path: 'dist', description: 'Vite production frontend build artifacts' },
  { path: 'dist-ssr', description: 'Vite SSR build artifacts' },
  { path: 'appsec_startup.log', description: 'Development startup diagnostic log' },
  { path: 'npm-debug.log', description: 'NPM debug log' },
  { path: 'yarn-error.log', description: 'Yarn error log' },
];

if (includeTarget) {
  APPROVED_GENERATED_TARGETS.push(
    { path: 'src-tauri/target/debug', description: 'Rust development debug artifacts' },
    { path: 'src-tauri/target/release/incremental', description: 'Rust release incremental compilation caches' }
  );
}

// Protected prefixes and extensions
const FORBIDDEN_DELETIONS = [
  '.git',
  'src',
  'src-tauri/src',
  'tools',
  'node_modules',
  '.env',
  'appsec.db',
  'appsec.sqlite',
];

function getDirSize(targetPath) {
  if (!fs.existsSync(targetPath)) return 0;
  const stat = fs.statSync(targetPath);
  if (!stat.isDirectory()) return stat.size;

  let total = 0;
  const files = fs.readdirSync(targetPath);
  for (const file of files) {
    const full = path.join(targetPath, file);
    try {
      const s = fs.statSync(full);
      if (s.isDirectory()) {
        total += getDirSize(full);
      } else {
        total += s.size;
      }
    } catch (e) {}
  }
  return total;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

let totalSpaceReclaimable = 0;
const actionableItems = [];

for (const target of APPROVED_GENERATED_TARGETS) {
  const resolved = path.resolve(target.path);
  const rel = path.relative('.', resolved);

  // Safety invariant check
  const isForbidden = FORBIDDEN_DELETIONS.some(f => rel === f || rel.startsWith(f + path.sep));
  if (isForbidden || rel.endsWith('.db') || rel.endsWith('.sqlite')) {
    console.warn(`[SAFETY BLOCKED] Refusing to touch protected path: ${rel}`);
    continue;
  }

  if (fs.existsSync(resolved)) {
    const size = getDirSize(resolved);
    totalSpaceReclaimable += size;
    actionableItems.push({ path: rel, description: target.description, size, resolved });
  }
}

console.log('Candidate Cleanup Items:');
if (actionableItems.length === 0) {
  console.log('  No temporary build artifacts or logs found. Workspace is already clean!\n');
} else {
  for (const item of actionableItems) {
    console.log(`  - [${formatSize(item.size)}] ${item.path} (${item.description})`);
  }
  console.log(`\nTotal Reclaimable Space: ${formatSize(totalSpaceReclaimable)}\n`);
}

if (isExecute) {
  let reclaimed = 0;
  for (const item of actionableItems) {
    try {
      const stat = fs.statSync(item.resolved);
      if (stat.isDirectory()) {
        fs.rmSync(item.resolved, { recursive: true, force: true });
      } else {
        fs.unlinkSync(item.resolved);
      }
      reclaimed += item.size;
      console.log(`  [DELETED] ${item.path}`);
    } catch (err) {
      console.error(`  [ERROR] Failed to remove ${item.path}: ${err.message}`);
    }
  }
  console.log(`\nCleanup Complete! Successfully reclaimed: ${formatSize(reclaimed)}`);
} else {
  console.log('To execute this cleanup, run:');
  console.log('  node scripts/safe_cleanup.js --execute');
  console.log('To also clean development debug targets, run:');
  console.log('  node scripts/safe_cleanup.js --execute --target\n');
}
