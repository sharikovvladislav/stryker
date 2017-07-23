import { types } from 'babel-core';
import { expect } from 'chai';
import { Identified, IdentifiedNode } from 'stryker-api/mutant';
import JavaScriptTranspiler from '../../../../src/transpiler/JavaScriptTranspiler';
import BooleanSubstitutionMutator from '../../../../src/transpiler/mutators/BooleanSubstitutionMutator';
import { copy } from '../../../../src/utils/objectUtils';

describe('BooleanSubstitutionMutator', () => {
  let sut: BooleanSubstitutionMutator;

  beforeEach(() => {
    sut = new BooleanSubstitutionMutator();
  });
  
  it('should mutate when supplied a expression with !', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`!a.a()`) as types.File;
    const node = ((ast.program.body[0] as types.ExpressionStatement).expression as types.UnaryExpression & Identified);
    const originalExpression = node.argument as types.CallExpression;

    // Act
    const result = sut.mutate(node, copy)[0] as types.Expression & Identified;

    // Assert
    expect(result).to.be.ok;
    expect(types.isCallExpression(result)).to.be.true;
    let callExpression = result as types.CallExpression;
    expect(result.nodeID).to.be.eq(node.nodeID);
    expect(callExpression.arguments).to.eq(originalExpression.arguments);
    expect(callExpression.callee).to.eq(originalExpression.callee);
  });

  it('should mutate true -> false', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`true`) as types.File;
    const nodeLiteral = ((ast.program.body[0] as types.ExpressionStatement).expression as types.Literal & Identified);

    // Act
    const result = sut.mutate(nodeLiteral, copy)[0];

    // Assert
    expect(result).to.be.ok;
    expect(types.isBooleanLiteral(result)).to.be.true;
    expect((result as types.BooleanLiteral & Identified).value).to.be.false;
    expect(result.nodeID).to.be.eq(nodeLiteral.nodeID);
  });

  it('should mutate false -> true', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`false`) as types.File;
    const nodeLiteral = ((ast.program.body[0] as types.ExpressionStatement).expression as types.Literal & Identified);

    // Act
    const result = sut.mutate(nodeLiteral, copy)[0];

    // Assert
    expect(result).to.be.ok;
    expect(types.isBooleanLiteral(result)).to.be.true;
    expect((result as types.BooleanLiteral & Identified).value).to.be.true;
    expect(result.nodeID).to.be.eq(nodeLiteral.nodeID);
  });

  it('should not mutate other nodes', () => {
    // Arrange
    const invalidNode: IdentifiedNode = {
      type: 'Identifier',
    } as types.Node & Identified;

    // Act
    const result = sut.mutate(invalidNode, copy);

    // Assert
    expect(result).to.have.lengthOf(0);
  });


});