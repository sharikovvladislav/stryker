import { types } from 'babel-core';
import { Mutator, IdentifiedNode } from 'stryker-api/mutant';

export default class LogicalOperatorMutator implements Mutator {
  name = 'LogicalOperator';

  private operators: { [targetedOperator: string]: string } = {
    '&&': '||',
    '||': '&&'
  };

  mutate(node: IdentifiedNode, copy: <T extends IdentifiedNode>(obj: T, deep?: boolean) => T): void | IdentifiedNode | IdentifiedNode[] {
    if (types.isLogicalExpression(node) && this.operators[node.operator]) {
      let mutatedNode = copy(node);
      mutatedNode.operator = this.operators[node.operator] as any;
      return mutatedNode
    }
    return undefined;
  }
}