import type { FormatCodeSettings, Statement } from 'typescript';

export interface Config {
  input: Config.NestJsInput | Config.OpenAPIInput;
  output: Config.OpenAPIOutput | Config.ModuleOuput;
}
export namespace Config {
  export interface NestJsInput {
    type: 'nestjs';
    /**
     * Nestjs project tsconfig file
     */
    tsConfigFilePath: string;
    /**
     * Entry (root) application module class file path
     */
    entryModulePath: string;
  }
  export interface OpenAPIInput {
    type: 'openapi';
    src: string;
  }
  export interface OpenAPIOutput {
    type: 'openapi';
    dest: string;
  }
  export interface ModuleOuput {
    type: 'module';
    lang: 'ts' | 'js';
    functionWriter:
      | 'axios'
      | 'fetch'
      | 'XMLHttpRequest'
      | ModuleOuput.CustomFunctionWriter;
    dest: string | ModuleOuput.DestObject | ModuleOuput.DestFunction;
    preppend?: string | ModuleOuput.CustomContentWriter;
    append?: string | ModuleOuput.CustomContentWriter;
    formmat?: FormatCodeSettings;
  }
  export namespace ModuleOuput {
    export interface DestObject {
      functions: string;
      types: string;
    }
    export interface DestFunction {
      (entry: FunctionEntry | TypeEntry): string;
    }
    export interface FunctionEntry {
      kind: 'function';
      name: string;
      url: string;
      method: string;
    }
    export interface TypeEntry {
      kind: 'type';
      name: string;
    }
    export interface CustomFunctionWriter {
      (): string | Statement;
    }
    export interface CustomContentWriter {
      (fileName: string): string | Statement;
    }
  }
}
