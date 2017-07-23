import { types } from 'babel-core';
import { expect } from 'chai';
import { Identified } from 'stryker-api/mutant';
import JavaScriptTranspiler from '../../../../src/transpiler/JavaScriptTranspiler';
import LogicalOperatorMutator from '../../../../src/transpiler/mutators/LogicalOperatorMutator';
import { copy } from '../../../../src/utils/objectUtils';

describe('LogicalOperatorMutator', () => {
  let sut: LogicalOperatorMutator;

  beforeEach(() => sut = new LogicalOperatorMutator());

  it('should mutate \'||\' to \'&&\'', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`true || false`) as types.File;
    const logicalOperator = ((ast.program.body[0] as types.ExpressionStatement).expression as types.LogicalExpression & Identified);

    // Act
    const result = sut.mutate(logicalOperator, copy) as types.LogicalExpression & Identified;

    // Assert
    expect(result).to.be.ok;
    expect(result.nodeID).to.eq(logicalOperator.nodeID);
    expect(result.operator).to.be.eq('&&');
  });

  it('should mutate \'&&\' to \'||\'', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`false && false`) as types.File;
    const logicalOperator = ((ast.program.body[0] as types.ExpressionStatement).expression as types.LogicalExpression & Identified);
    
    // Act
    const result = sut.mutate(logicalOperator, copy) as types.LogicalExpression & Identified;

    // Assert
    expect(result).to.be.ok;
    expect(result.nodeID).to.eq(logicalOperator.nodeID);
    expect(result.operator).to.be.eq('||');
  });
});
