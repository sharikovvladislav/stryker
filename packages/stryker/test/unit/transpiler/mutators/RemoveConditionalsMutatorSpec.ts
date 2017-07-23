import { types } from 'babel-core';
import * as chai from 'chai';
import { Identified, IdentifiedNode } from 'stryker-api/mutant';
import JavaScriptTranspiler from '../../../../src/transpiler/JavaScriptTranspiler';
import RemoveConditionalsMutator from '../../../../src/transpiler/mutators/RemoveConditionalsMutator';
import { copy } from '../../../../src/utils/objectUtils';

let expect = chai.expect;

describe('RemoveConditionalsMutator', () => {
  let sut: RemoveConditionalsMutator;
  let doWhileLoop: types.DoWhileStatement & Identified;
  let forLoop: types.ForStatement & Identified;
  let infiniteForLoop: types.ForStatement & Identified;
  let whileLoop: types.WhileStatement & Identified;
  let ifStatement: types.IfStatement & Identified;
  let ternaryExpression: types.ConditionalExpression & Identified;

  beforeEach(() => {
    sut = new RemoveConditionalsMutator();
    let code =
      `var price = 99.95;
    if(price > 25){
      console.log("Too expensive");
    }
    while(price > 50){
      price = price * 0.25;
    }
    do {
      console.log("I\'m sorry. The price is still too high");
      price = price - 5;
    } while(price > 30);
    for(var i = 0; i < 10; i++) {
      console.log("I would like to buy the item");
    }
    for(var j = 0; ; j++) {
      console.log("Infinite loop");
    }
    price < 20? 40 : 10;
    `;

    const ast = JavaScriptTranspiler.getAst(code) as types.File;
    const body = ast.program.body;
    ifStatement = body[1] as types.IfStatement & Identified;
    whileLoop = body[2] as types.WhileStatement & Identified;
    doWhileLoop = body[3] as types.DoWhileStatement & Identified;
    forLoop = body[4] as types.ForStatement & Identified;
    infiniteForLoop = body[5] as types.ForStatement & Identified;
    ternaryExpression = (body[6] as types.ExpressionStatement).expression as types.ConditionalExpression & Identified;
  });

  function mutateNode(node: IdentifiedNode) {
    const mutants = sut.mutate(node, copy);
    if (Array.isArray(mutants)) {
      return mutants;
    } else {
      return [];
    }
  }

  describe('should not generate an infinite loop', () => {

    it('when given a do-while loop', () => {
      const mutatedNodes = mutateNode(doWhileLoop);

      const testValue = (mutatedNodes[0] as types.BooleanLiteral & Identified).value;
      expect(testValue).to.be.false;
      expect(mutatedNodes[0].nodeID).to.not.eq(doWhileLoop.nodeID);
      expect(mutatedNodes[0].nodeID).to.eq((doWhileLoop.test as types.BinaryExpression & Identified).nodeID);
    });

    it('when given a while loop', () => {
      const mutatedNodes = mutateNode(whileLoop);

      const testValue = (mutatedNodes[0] as types.BooleanLiteral & Identified).value;
      expect(testValue).to.be.false;
      expect(mutatedNodes[0].nodeID).to.not.eq(whileLoop.nodeID);
      expect(mutatedNodes[0].nodeID).to.eq((whileLoop.test as types.BinaryExpression & Identified).nodeID);
    });

    it('when given a for loop', () => {
      let mutatedNodes = mutateNode(forLoop);

      let testValue = (mutatedNodes[0] as types.BooleanLiteral & Identified).value;
      expect(testValue).to.be.false;
      expect(mutatedNodes[0].nodeID).to.not.eq(forLoop.nodeID);
      if (forLoop.test) {
        expect(mutatedNodes[0].nodeID).to.eq((forLoop.test as types.BinaryExpression & Identified).nodeID);
      } else {
        expect.fail('test.nodeID was expected to be not undefined');
      }
    });

    it('when given an infinite-for loop', () => {
      const forStatementNode = mutateNode(infiniteForLoop)[0];
      if (types.isForStatement(forStatementNode) && forStatementNode.test && types.isBooleanLiteral(forStatementNode.test)) {
        expect(forStatementNode.test.value).to.be.false;
        expect(forStatementNode.nodeID).to.eq(infiniteForLoop.nodeID);
      } else {
        expect.fail(`Node ${forStatementNode} unexpected.`);
      }
    });
  });

  describe('should generate a single mutant', () => {
    it('when given a do-while loop', () => {
      let mutatedNodes = mutateNode(doWhileLoop);

      expect(mutatedNodes).to.have.lengthOf(1);
    });

    it('when given a while loop', () => {
      let mutatedNodes = mutateNode(whileLoop);

      expect(mutatedNodes).to.have.lengthOf(1);
    });

    it('when given a for loop', () => {
      let mutatedNodes = mutateNode(forLoop);

      expect(mutatedNodes).to.have.lengthOf(1);
    });
  });

  describe('should generate multiple mutants', () => {
    it('when given an if-statement', () => {
      let originalTestStatement = ifStatement.test as types.BinaryExpression & Identified;

      let mutatedNodes = mutateNode(ifStatement) as [types.BooleanLiteral & Identified];

      expect(mutatedNodes).to.have.length(2);
      expect(mutatedNodes[0].nodeID).not.to.eq(ifStatement.nodeID);
      expect(mutatedNodes[1].nodeID).not.to.eq(ifStatement.nodeID);
      expect(mutatedNodes[0].nodeID).to.eq(originalTestStatement.nodeID);
      expect(mutatedNodes[1].nodeID).to.eq(originalTestStatement.nodeID);
      expect(mutatedNodes[0].value).to.be.false;
      expect(mutatedNodes[1].value).to.be.true;
    });

    it('when given a ternary-statement', () => {
      let originalTestStatement = ifStatement.test as types.BinaryExpression & Identified;

      let mutatedNodes = mutateNode(ternaryExpression) as [types.BooleanLiteral & Identified];

      expect(mutatedNodes).to.have.length(2);
      expect(mutatedNodes[0].nodeID).not.to.eq(ternaryExpression.nodeID);
      expect(mutatedNodes[1].nodeID).not.to.eq(ternaryExpression.nodeID);
      expect(mutatedNodes[1].nodeID).to.eq(originalTestStatement.nodeID);
      expect(mutatedNodes[1].nodeID).to.eq(originalTestStatement.nodeID);
      expect(mutatedNodes[0].value).to.be.false;
      expect(mutatedNodes[1].value).to.be.true;
    });
  });

  describe('should not crash', () => {
    it('when given an for-loop', () => {
      let mutatedNodes = mutateNode(infiniteForLoop);

      expect(mutatedNodes).to.have.length(1);
      expect(mutatedNodes[0].nodeID).eq(infiniteForLoop.nodeID);
    });
  });
});
