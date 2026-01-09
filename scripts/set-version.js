#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get version from command line argument
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Error: Version argument is required');
  console.log('Usage: npm run set-version <version>');
  console.log('Example: npm run set-version 0.1.0-alpha.5');
  process.exit(1);
}

// Validate version format (basic semver check)
const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
if (!versionRegex.test(newVersion)) {
  console.error('Error: Invalid version format. Expected semver format (e.g., 0.1.0 or 0.1.0-alpha.5)');
  process.exit(1);
}

const rootDir = join(__dirname, '..');

// Files to update
const files = {
  packageJson: join(rootDir, 'package.json'),
  tauriConf: join(rootDir, 'src-tauri', 'tauri.conf.json'),
  cargoToml: join(rootDir, 'src-tauri', 'Cargo.toml')
};

try {
  // Update package.json
  console.log('Updating package.json...');
  const packageJson = JSON.parse(readFileSync(files.packageJson, 'utf8'));
  packageJson.version = newVersion;
  writeFileSync(files.packageJson, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  console.log(`✓ package.json version updated to ${newVersion}`);

  // Update tauri.conf.json
  console.log('Updating src-tauri/tauri.conf.json...');
  const tauriConf = JSON.parse(readFileSync(files.tauriConf, 'utf8'));
  tauriConf.version = newVersion;
  writeFileSync(files.tauriConf, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
  console.log(`✓ src-tauri/tauri.conf.json version updated to ${newVersion}`);

  // Update Cargo.toml
  console.log('Updating src-tauri/Cargo.toml...');
  let cargoToml = readFileSync(files.cargoToml, 'utf8');
  cargoToml = cargoToml.replace(/^version = "[^"]+"$/m, `version = "${newVersion}"`);
  writeFileSync(files.cargoToml, cargoToml, 'utf8');
  console.log(`✓ src-tauri/Cargo.toml version updated to ${newVersion}`);

  console.log('\n✅ All versions successfully updated to:', newVersion);
} catch (error) {
  console.error('Error updating version:', error.message);
  process.exit(1);
}
