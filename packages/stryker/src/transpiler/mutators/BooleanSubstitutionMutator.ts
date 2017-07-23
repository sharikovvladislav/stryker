<<<<<<< HEAD:packages/stryker/src/transpiler/mutators/BooleanSubstitutionMutator.ts
import { types } from 'babel-core';
import { Mutator, IdentifiedNode, Identified } from 'stryker-api/mutant';
=======
import { Mutator, IdentifiedNode, Identified } from 'stryker-api/mutant';
import { Syntax } from 'esprima';
import { Expression } from 'estree';
>>>>>>> master:packages/stryker/src/mutators/BooleanSubstitutionMutator.ts

export default class BooleanSubstitutionMutator implements Mutator {
  name = 'BooleanSubstitution';

<<<<<<< HEAD:packages/stryker/src/transpiler/mutators/BooleanSubstitutionMutator.ts
  mutate(node: IdentifiedNode, copy: <T extends IdentifiedNode>(obj: T, deep?: boolean) => T): IdentifiedNode[] {
    const nodes: IdentifiedNode[] = [];
    
    // !a -> a
    if (types.isUnaryExpression(node) && node.operator === '!') {
      let mutatedNode = copy(node.argument as types.Expression & Identified);
=======
  applyMutations(node: IdentifiedNode, copy: <T extends IdentifiedNode> (obj: T, deep?: boolean) => T): IdentifiedNode[] {
    const nodes: IdentifiedNode[] = [];
    
    // !a -> a
    if (node.type === Syntax.UnaryExpression && node.operator === '!') {
      let mutatedNode = copy(node.argument as Expression & Identified) as IdentifiedNode;
>>>>>>> master:packages/stryker/src/mutators/BooleanSubstitutionMutator.ts
      mutatedNode.nodeID = node.nodeID;
      nodes.push(mutatedNode);
    }

    // true -> false or false -> true
    if (types.isBooleanLiteral(node)) {
      let mutatedNode = copy(node);
      mutatedNode.value = !mutatedNode.value;
      nodes.push(mutatedNode);
    }
    return nodes;
  }

}