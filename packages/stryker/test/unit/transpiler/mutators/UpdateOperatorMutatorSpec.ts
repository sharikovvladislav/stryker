import { types } from 'babel-core';
import { expect } from 'chai';
import { Identified } from 'stryker-api/mutant';
import JavaScriptTranspiler from '../../../../src/transpiler/JavaScriptTranspiler';
import UpdateOperatorMutator from '../../../../src/transpiler/mutators/UpdateOperatorMutator';
import { copy } from '../../../../src/utils/objectUtils';

describe('UpdateOperatorMutator', () => {
  let sut: UpdateOperatorMutator;

  beforeEach(() => sut = new UpdateOperatorMutator());

  describe('should mutate', () => {
    it('"i++" to "i--"', () => {
      // Arrange
      const ast = JavaScriptTranspiler.getAst(`i++`) as types.File;
      const expression = (ast.program.body[0] as types.ExpressionStatement).expression as types.Expression & Identified;

      // Act
      const result = sut.mutate(expression, copy) as types.UpdateExpression & Identified;

      // Assert
      expect(result).to.be.ok;
      expect(result.nodeID).to.eq(expression.nodeID);
      expect(result.operator).to.be.eq('--');
    });

    it('"i--" to "i++"', () => {
      // Arrange
      const ast = JavaScriptTranspiler.getAst(`i--`) as types.File;
      const expression = (ast.program.body[0] as types.ExpressionStatement).expression as types.Expression & Identified;

      // Act
      const result = sut.mutate(expression, copy) as types.UpdateExpression & Identified;

      // Assert
      expect(result).to.be.ok;
      expect(result.nodeID).to.eq(expression.nodeID);
      expect(result.operator).to.be.eq('++');
    });

    it('"++i" to "--i"', () => {
      // Arrange
      const ast = JavaScriptTranspiler.getAst(`++i`) as types.File;
      const expression = (ast.program.body[0] as types.ExpressionStatement).expression as types.Expression & Identified;

      // Act
      const result = sut.mutate(expression, copy) as types.UpdateExpression & Identified;

      // Assert
      expect(result).to.be.ok;
      expect(result.nodeID).to.eq(expression.nodeID);
      expect(result.operator).to.be.eq('--');
    });

    it('"--i" to "++i"', () => {
      // Arrange
      const ast = JavaScriptTranspiler.getAst(`--i`) as types.File;
      const expression = (ast.program.body[0] as types.ExpressionStatement).expression as types.Expression & Identified;

      // Act
      const result = sut.mutate(expression, copy) as types.UpdateExpression & Identified;

      // Assert
      expect(result).to.be.ok;
      expect(result.nodeID).to.eq(expression.nodeID);
      expect(result.operator).to.be.eq('++');
    });
  });

  describe('should not mutate', () => {
    it('"+i" to "-i"', () => {
      // Arrange
      const ast = JavaScriptTranspiler.getAst(`-i`) as types.File;
      const expression = (ast.program.body[0] as types.ExpressionStatement).expression as types.Expression & Identified;

      // Act
      const result = sut.mutate(expression, copy);

      // Assert
      expect(result).to.be.undefined;
    });
  });

});
