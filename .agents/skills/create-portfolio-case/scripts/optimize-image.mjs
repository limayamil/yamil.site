#!/usr/bin/env node

import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

function usage() {
  console.error(
    'Usage: node optimize-image.mjs <input> <output.webp> [--width 1920] [--quality 82]',
  );
}

const args = process.argv.slice(2);
const input = args[0];
const output = args[1];

if (!input || !output) {
  usage();
  process.exit(2);
}

if (path.extname(output).toLowerCase() !== '.webp') {
  console.error('Output must use the .webp extension.');
  process.exit(2);
}

function numberOption(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value <= 0) {
    console.error(`${name} must be a positive integer.`);
    process.exit(2);
  }
  return value;
}

const width = numberOption('--width', 1920);
const quality = numberOption('--quality', 82);

if (quality > 100) {
  console.error('--quality must be between 1 and 100.');
  process.exit(2);
}

const inputPath = path.resolve(input);
const outputPath = path.resolve(output);

if (inputPath === outputPath) {
  console.error('Input and output must be different files.');
  process.exit(2);
}

await mkdir(path.dirname(outputPath), { recursive: true });

const source = await stat(inputPath);
const result = await sharp(inputPath)
  .rotate()
  .resize({ width, withoutEnlargement: true })
  .webp({ quality, effort: 6, smartSubsample: true })
  .toFile(outputPath);

const reduction = source.size > 0 ? 1 - result.size / source.size : 0;

console.log(
  JSON.stringify(
    {
      input: inputPath,
      output: outputPath,
      width: result.width,
      height: result.height,
      inputBytes: source.size,
      outputBytes: result.size,
      reductionPercent: Number((reduction * 100).toFixed(1)),
    },
    null,
    2,
  ),
);