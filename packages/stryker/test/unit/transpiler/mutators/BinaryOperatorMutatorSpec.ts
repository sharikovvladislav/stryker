import { types } from 'babel-core';
import { expect } from 'chai';
import * as _ from 'lodash';
import JavaScriptTranspiler from '../../../../src/transpiler/JavaScriptTranspiler';
import BinaryOperatorMutator from '../../../../src/transpiler/mutators/BinaryOperatorMutator';
import { Identified } from 'stryker-api/mutant';

describe('BinaryOperatorMutator', () => {
  let mutator: BinaryOperatorMutator;

  beforeEach(() => {
    mutator = new BinaryOperatorMutator();
  });

  const getExpression = (ast: types.File) => {
    const declaration = ast.program.body[0] as types.VariableDeclaration;
    return declaration.declarations[0].init as types.Expression & Identified;
  };

  describe('should mutate', () => {
    it('a valid Node', () => {
      const ast = JavaScriptTranspiler.getAst(`var a = 6 + 7;`) as types.File;
      const node = getExpression(ast);

      let mutatedNodes = mutator.mutate(node, _.cloneDeep);

      expect(mutatedNodes).to.have.lengthOf(1);
    });
  });

  describe('should not mutate', () => {
    it('an invalid Node', () => {
      const ast = JavaScriptTranspiler.getAst(`var a = 6;`) as types.File;
      const node = getExpression(ast);

      let mutatedNodes = mutator.mutate(node, _.cloneDeep);

      expect(mutatedNodes).to.have.lengthOf(0);
    });
  });
});
