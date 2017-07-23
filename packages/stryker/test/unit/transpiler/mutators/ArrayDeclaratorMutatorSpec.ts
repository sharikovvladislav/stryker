import {types} from 'babel-core';
import { expect } from 'chai';
import { Identified } from 'stryker-api/mutant';
import JavaScriptTranspiler from '../../../../src/transpiler/JavaScriptTranspiler';
import ArrayDeclaratorMutator from '../../../../src/transpiler/mutators/ArrayDeclaratorMutator';
import { copy } from '../../../../src/utils/objectUtils';

describe('BlockStatementMutator', () => {
  let sut: ArrayDeclaratorMutator;

  beforeEach(() => sut = new ArrayDeclaratorMutator());
  
  const getVariableDeclaration = (ast: types.File) => (ast.program.body[0] as types.VariableDeclaration);

  const getArrayExpression = (ast: types.File) => {
    const variableDeclaration = getVariableDeclaration(ast);
    return (variableDeclaration.declarations[0].init as types.ArrayExpression & Identified);
  };

  const getArrayCallExpression = (ast: types.File) => {
    const variableDeclaration = getVariableDeclaration(ast);
    return (variableDeclaration.declarations[0].init as types.CallExpression & Identified);
  };

  const getArrayNewExpression = (ast: types.File) => {
    const variableDeclaration = getVariableDeclaration(ast);
    return (variableDeclaration.declarations[0].init as types.NewExpression & Identified);
  };
  
  it('should mutate when supplied with an array expression', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`var array = [1,2,3];`) as types.File;
    const arrayExpression = getArrayExpression(ast);

    // Act
    const actual = sut.mutate(arrayExpression, copy) as types.ArrayExpression & Identified;

    // Assert
    expect(actual).to.be.ok;
    expect(actual.nodeID).to.eq(arrayExpression.nodeID);
    expect(actual.elements).to.have.length(0);
  });

  it('should mutate when supplied with an array `call` expression', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`var array = Array(1,2,3);`) as types.File;
    const arrayExpression = getArrayCallExpression(ast);

    // Act
    const actual = sut.mutate(arrayExpression, copy) as types.CallExpression & Identified;

    // Assert
    expect(actual).to.be.ok;
    expect(actual.nodeID).to.eq(arrayExpression.nodeID);
    expect(actual.arguments).to.have.length(0);
  });

  it('should mutate when supplied with an array `new` expression', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`var array = new Array(1,2,3);`) as types.File;
    const arrayExpression = getArrayNewExpression(ast);

    // Act
    const actual = sut.mutate(arrayExpression, copy) as types.CallExpression & Identified;

    // Assert
    expect(actual).to.be.ok;
    expect(actual.nodeID).to.eq(arrayExpression.nodeID);
    expect(actual.arguments).to.have.length(0);
  });

  it('should not mutate an empty expression', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`var array = []`) as types.File;
    const emptyArrayExpression = getArrayExpression(ast);

    // Act
    const actual = sut.mutate(emptyArrayExpression, copy);
    expect(actual).to.be.undefined;
  });

  it('should not mutate an empty `call` expression', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`var array = Array()`) as types.File;
    const emptyCallExpression = getArrayExpression(ast);

    // Act
    const actual = sut.mutate(emptyCallExpression, copy);
    expect(actual).to.be.undefined;
  });

  it('should not mutate an empty `new` expression', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`var array = new Array()`) as types.File;
    const emptyNewExpression = getArrayExpression(ast);

    // Act
    const actual = sut.mutate(emptyNewExpression, copy);
    expect(actual).to.be.undefined;
  });
});