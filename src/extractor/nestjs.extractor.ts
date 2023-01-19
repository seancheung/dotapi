import {
  ClassDeclaration,
  Decorator,
  Node,
  ObjectLiteralElementLike,
  Project,
  SourceFile,
  SyntaxKind,
  ts,
} from 'ts-morph';
import { Config } from '../config';
import { ExtractedRequest, Extractor } from './extractor';

export class NestJsExtractor extends Extractor {
  protected readonly project: Project;

  constructor(protected readonly config: Config.NestJsInput) {
    super();
    this.project = new Project({
      tsConfigFilePath: config.tsConfigFilePath,
    });
  }

  protected *extractRequests(): Iterable<ExtractedRequest> {
    const entryModuleFile = this.project.getSourceFile(
      this.config.entryModulePath,
    );
    if (!entryModuleFile) {
      throw new Error(
        `Entry (root) application module class file path does not exist: "${this.config.entryModulePath}"`,
      );
    }
    const entryModuleClass = entryModuleFile.getClass((cls) => {
      const decorator = this.getDecorator(
        cls,
        NestJsExtractor.ModuleNamedImport,
      );
      return decorator != null;
    });
    if (!entryModuleClass) {
      throw new Error(
        `Entry (root) application module class file does not contain a valid Module definition: "${this.config.entryModulePath}"`,
      );
    }
    for (const controllerClass of this.getControllerClasses(entryModuleClass)) {
      console.log(controllerClass.getName());
    }
  }

  /**
   * Recursively get controller class definitions in the given module
   * @param moduleClass Module class definition
   */
  protected *getControllerClasses(
    moduleClass: ClassDeclaration,
  ): Iterable<ClassDeclaration> {
    const moduleDecorator = this.getDecorator(
      moduleClass,
      NestJsExtractor.ModuleNamedImport,
    );
    if (!moduleDecorator) {
      throw new Error(
        `Invalid module found at "${this.getNodeAddress(moduleClass)}"`,
      );
    }
    const metadata = moduleDecorator.getArguments()[0];
    if (!metadata || !metadata.isKind(SyntaxKind.ObjectLiteralExpression)) {
      throw new Error(
        `Invalid decorator argument found at "${this.getNodeAddress(
          moduleDecorator,
        )}"`,
      );
    }
    const controllersProp = metadata.getProperty('controllers');
    if (controllersProp) {
      for (const definition of this.getImports(controllersProp)) {
        const controllerDecorator = this.getDecorator(
          definition,
          NestJsExtractor.ControllerNamedImport,
        );
        if (!controllerDecorator) {
          throw new Error(
            `Invalid controller found at "${this.getNodeAddress(definition)}"`,
          );
        }
        yield definition;
      }
    }
    const importsProp = metadata.getProperty('imports');
    if (importsProp) {
      for (const definition of this.getImports(importsProp)) {
        yield* this.getControllerClasses(definition);
      }
    }
  }

  /**
   * Get imported declarations from metadata property
   * @param property Object literal property
   * @returns Identifiers array
   */
  protected *getImports(
    property: ObjectLiteralElementLike,
  ): Iterable<ClassDeclaration> {
    if (!property.isKind(SyntaxKind.PropertyAssignment)) {
      throw new Error(
        `Invalid value found at "${this.getNodeAddress(property)}"`,
      );
    }
    const array = property.getInitializer();
    if (!array || !array.isKind(SyntaxKind.ArrayLiteralExpression)) {
      throw new Error(
        `Invalid value found at "${this.getNodeAddress(property)}"`,
      );
    }
    for (const element of array.getElements()) {
      if (!element.isKind(SyntaxKind.Identifier)) {
        continue;
      }
      for (const definition of element.getDefinitionNodes()) {
        if (definition.getSourceFile().isFromExternalLibrary()) {
          continue;
        }
        if (definition.isKind(SyntaxKind.ClassDeclaration)) {
          yield definition;
          break;
        }
      }
    }
  }

  /**
   * Gets the first decorator that matches the named import.
   * @param cls Class declaration
   * @param decoratorName Decorator named import
   * @returns First matched decorator or `undefined`
   */
  protected getDecorator(
    cls: ClassDeclaration,
    decoratorName: NestJsExtractor.NamedImport,
  ): Decorator | undefined {
    const name = this.getImportedName(cls.getSourceFile(), decoratorName);
    if (!name) {
      return;
    }
    for (const decorator of cls.getDecorators()) {
      if (decorator.getName() === name) {
        return decorator;
      }
    }
  }

  /**
   * Get the imported name of the named import
   * @param sourceFile Source file
   * @param namedImport Named import
   * @returns Alias or name, or `undefined` if not found
   */
  protected getImportedName(
    sourceFile: SourceFile,
    namedImport: NestJsExtractor.NamedImport,
  ): string | undefined {
    for (const importDeclaration of sourceFile.getImportDeclarations()) {
      if (
        importDeclaration.getModuleSpecifier().getLiteralValue() !==
        namedImport.moduleSpecifier
      ) {
        continue;
      }
      for (const importSpecifier of importDeclaration.getNamedImports()) {
        if (importSpecifier.getName() !== namedImport.importSpecifier) {
          continue;
        }
        const aliasNode = importSpecifier.getAliasNode();
        return aliasNode ? aliasNode.getText() : importSpecifier.getName();
      }
    }
  }

  /**
   * Get the node's address in the format of `/path/to/source/file.ts(lineNumber,columnNumber)`
   * @param node Node
   * @returns Address string
   */
  protected getNodeAddress(node: Node<ts.Node>) {
    const pos = node.getNonWhitespaceStart();
    const sourceFile = node.getSourceFile();
    const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
    return `${sourceFile.getFilePath()}(${line},${column})`;
  }
}
export namespace NestJsExtractor {
  export interface NamedImport {
    moduleSpecifier: string;
    importSpecifier: string;
  }
  export const ModuleNamedImport: NamedImport = {
    moduleSpecifier: '@nestjs/common',
    importSpecifier: 'Module',
  };

  export const ControllerNamedImport: NamedImport = {
    moduleSpecifier: '@nestjs/common',
    importSpecifier: 'Controller',
  };
}
