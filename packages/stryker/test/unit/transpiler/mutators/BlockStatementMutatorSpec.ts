import { types } from 'babel-core';
import { expect } from 'chai';
import { Identified } from 'stryker-api/mutant';
import JavaScriptTranspiler from '../../../../src/transpiler/JavaScriptTranspiler';
import BlockStatementMutator from '../../../../src/transpiler/mutators/BlockStatementMutator';
import { copy } from '../../../../src/utils/objectUtils';

describe('BlockStatementMutator', () => {
  let sut: BlockStatementMutator;

  beforeEach(() => sut = new BlockStatementMutator());

  it('should mutate when supplied a block statement', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`function a () { 
      'use strict';
    }`) as types.File;
    const useStrictBlockStatement = (ast.program.body[0] as types.FunctionDeclaration).body as types.BlockStatement & Identified;

    // Act
    const actual = sut.mutate(useStrictBlockStatement, copy) as types.BlockStatement & Identified;

    // Assert
    expect(actual).to.be.ok;
    expect(actual.nodeID).to.eq(useStrictBlockStatement.nodeID);
    expect(actual.body).to.have.length(0);
  });

  it('should not mutate an empty expression', () => {
    // Arrange
    const ast = JavaScriptTranspiler.getAst(`function a () { 
      
    }`) as types.File;
    const emptyBlockStatement = (ast.program.body[0] as types.FunctionDeclaration).body as types.BlockStatement & Identified;

    // Act
    const actual = sut.mutate(emptyBlockStatement, copy);
    expect(actual).to.not.be.ok;
  });
});