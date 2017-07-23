import * as _ from 'lodash';
import * as babel from 'babel-core';
import { NodePath } from 'babel-traverse';
import * as log4js from 'log4js';
import { IdentifiedNode, MutatorFactory } from 'stryker-api/mutant';
import { SourceFile } from 'stryker-api/report';
import Mutant from '../Mutant';
import BinaryOperatorMutator from './mutators/BinaryOperatorMutator';

const log = log4js.getLogger('JavaScriptTranspiler');

interface ParsedFile {
  file: SourceFile,
  ast: babel.types.File,
  nodes: IdentifiedNode[]
}

function copy<T>(obj: T, deep?: boolean) {
  if (deep) {
    return _.cloneDeep(obj);
  } else {
    return _.clone(obj);
  }
};

export default class JavaScriptTranspiler {
  private parsedFiles: ParsedFile[] = [];

  constructor(private sourceFiles: SourceFile[]) {
    this.registerMutators();
  }

  static getAst(code: string): babel.types.Node | undefined {
    return babel.transform(code).ast;
  }

  static getNodes(ast: babel.types.Node): IdentifiedNode[] {
    const nodes: IdentifiedNode[] = [];

    if (ast) {
      babel.traverse(ast, {
        enter(path: NodePath<IdentifiedNode>) {
          const node = path.node;
          node.nodeID = nodes.length + 1;
          Object.freeze(node);
          nodes.push(node);
        }
      });
    }

    return nodes;
  }

  compile(): SourceFile[] {
    this.sourceFiles.forEach(file => {
      const ast = JavaScriptTranspiler.getAst(file.content) as babel.types.File;
      const nodes = JavaScriptTranspiler.getNodes(ast);
      this.parsedFiles.push({ file, ast, nodes });
      log.trace(`Found ${nodes.length} nodes in file ${file.path}`);
    });

    return this.sourceFiles;
  }

  mutate(): Mutant[] {
    let mutants: Mutant[] = [];
    const factory = MutatorFactory.instance();
    const mutators = factory.knownNames().map(name => factory.create(name, undefined));

    this.parsedFiles.forEach(parsedFile => {
      const baseAst = copy(parsedFile.ast, true);
      parsedFile.nodes.forEach(node => {
        mutators.forEach(mutator => {
          let mutatedNodes = mutator.mutate(node, copy);

          if (mutatedNodes) {
            if (!Array.isArray(mutatedNodes)) {
              mutatedNodes = [mutatedNodes];
            }
            const newMutants = this.generateMutants(mutatedNodes, baseAst, parsedFile.file, mutator.name);
            mutants = mutants.concat(newMutants);
          }
        });
      });
    });

    return mutants;
  }

  private registerMutators() {
    const factory = MutatorFactory.instance();
    factory.register('BinaryOperator', BinaryOperatorMutator);
  }

  private generateMutants(nodes: IdentifiedNode[], ast: babel.types.File, file: SourceFile, mutatorName: string) {
    const mutants: Mutant[] = [];

    nodes.forEach(node => {
      ast.program.body = [node as any]; // We can only add statements
      const replacement = babel.transformFromAst(ast);
      if (replacement.code) {
        const range: [number, number] = [node.start, node.end];
        const mutant = new Mutant(mutatorName, file.path, file.content, replacement.code, node.loc, range);
        log.trace(`Generated mutant for mutator ${mutatorName} in file ${file.path} with replacement code "${replacement.code}"`);
        mutants.push(mutant);
      }
    });

    return mutants;
  }
}