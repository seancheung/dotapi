#!/usr/bin/env node
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import Module from 'module';
import { dirname } from 'path';
import { ModuleKind } from 'ts-morph';
import { transpileModule } from 'typescript';
import { hideBin } from 'yargs/helpers';
import yargs from 'yargs/yargs';
import { Config } from './config';
import { NestJsExtractor } from './extractor/nestjs.extractor';

yargs(hideBin(process.argv))
  .option('config', {
    alias: 'c',
    type: 'string',
    desc: 'Path to config file',
  })
  .option('stream', {
    alias: 's',
    type: 'boolean',
    desc: 'Emit output to stdout instead of to files',
  })
  .command(
    '$0',
    'Parse and emit client sdk from nodejs project',
    {},
    runCommand,
  )
  .parse();

function runCommand() {
  const config = resolveConfig();
  if (config.input.type === 'nestjs') {
    const extractor = new NestJsExtractor(config.input);
    extractor.run();
  }
}

function resolveConfig(filename?: string): Config {
  if (filename && !execSync(filename)) {
    throw new Error(`Config file "${filename}" does not exist.`);
  }
  filename =
    filename ||
    tryFiles('.dotapirc.ts', '.dotapirc.js', '.dotapirc.json', '.dotapirc');
  if (!filename) {
    throw new Error('Config file not found');
  }
  if (/\.[tj]s$/.test(filename)) {
    const res = transpileModule(readFileSync(filename, 'utf-8'), {
      compilerOptions: { module: ModuleKind.CommonJS, allowJs: true },
    });
    const mod: Module = new Module(filename, require.main) as any;
    mod.filename = filename;
    mod.paths = (Module as any)._nodeModulePaths(dirname(filename));
    (mod as any)._compile(res.outputText, filename);
    return mod.exports.default;
  } else {
    return JSON.parse(readFileSync(filename, 'utf-8'));
  }
}

function tryFiles(...args: string[]): string | undefined {
  for (const arg of args) {
    if (existsSync(arg)) {
      return arg;
    }
  }
}
