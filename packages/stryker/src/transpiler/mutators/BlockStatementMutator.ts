import { types } from 'babel-core';
import { Mutator, IdentifiedNode } from 'stryker-api/mutant';

/**
 * Represents a mutator which can remove the content of a BlockStatement.
 */
export default class BlockStatementMutator implements Mutator {
  name = 'BlockStatement';

<<<<<<< HEAD:packages/stryker/src/transpiler/mutators/BlockStatementMutator.ts
  mutate(node: IdentifiedNode, copy: <T extends IdentifiedNode>(obj: T, deep?: boolean) => T): void | IdentifiedNode {
    if (types.isBlockStatement(node) && node.body.length > 0) {
=======
  constructor() { }

  applyMutations(node: IdentifiedNode, copy: <T extends IdentifiedNode> (obj: T, deep?: boolean) => T): void | IdentifiedNode {
    if (node.type === this.type && node.body.length > 0) {
>>>>>>> master:packages/stryker/src/mutators/BlockStatementMutator.ts
      let mutatedNode = copy(node);
      mutatedNode.body = [];
      return mutatedNode;
    }
  }
}
