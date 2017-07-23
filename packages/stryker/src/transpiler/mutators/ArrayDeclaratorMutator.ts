import { types } from 'babel-core';
import { Mutator, IdentifiedNode } from 'stryker-api/mutant';

/**
 * Represents a mutator which can remove the content of an array's elements.
 */
export default class ArrayDeclaratorMutator implements Mutator {
  name = 'ArrayDeclarator';
  
  mutate(node: IdentifiedNode, copy: <T extends IdentifiedNode>(obj: T, deep?: boolean) => T): void | IdentifiedNode {
    if ((types.isCallExpression(node) || types.isNewExpression(node)) && types.isIdentifier(node.callee) && node.callee.name === 'Array' && node.arguments.length > 0) {
      let mutatedNode = copy(node);
      mutatedNode.arguments = [];
      return mutatedNode;
    }

    if (types.isArrayExpression(node) && node.elements.length > 0) {
      let mutatedNode = copy(node);
      mutatedNode.elements = [];
      return mutatedNode;
    }
  }
}

