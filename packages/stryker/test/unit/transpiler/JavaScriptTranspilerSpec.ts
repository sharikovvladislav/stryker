import { expect } from 'chai';
import Mutant from '../../../src/Mutant';
import JavaScriptTranspiler from '../../../src/transpiler/JavaScriptTranspiler';
import { Mutator, MutatorFactory, IdentifiedNode, Identified } from 'stryker-api/mutant';
import * as sinon from 'sinon';
import StrykerTempFolder from '../../../src/utils/StrykerTempFolder';
import * as babel from 'babel-core';

describe('JavaScriptTranspiler', () => {
  it('should return an empty array if nothing could be mutated', () => {
    const transpiler = new JavaScriptTranspiler([{ content: '', path: 'file.js' }]);
    transpiler.compile();

    const mutants = transpiler.mutate();

    expect(mutants.length).to.equal(0);
  });

  describe('with single input file with a one possible mutation', () => {
    let originalCode: string;
    let mutatedCode: string;
    let mutants: Mutant[];
    let transpiler: JavaScriptTranspiler;

    beforeEach(() => {
      originalCode = '\n\nvar i = 1 + 2;';
      mutatedCode = '\n\nvar i = 1 - 2;';
      transpiler = new JavaScriptTranspiler([{ content: originalCode, path: 'file.js' }]);
      transpiler.compile();
      mutants = transpiler.mutate();
    });

    it('should return an array with a single mutant', () => {
      expect(mutants.length).to.equal(1);
    });

    it('should be able to mutate code', () => {
      mutants[0].save('some file');
      expect(mutants[0].mutatedLines).to.equal(mutatedCode);
    });

    it('should set the mutated line number', () => {
      expect(mutants[0].location.start.line).to.equal(3);
    });
  });

  describe('should be able to handle a Mutator that returns', () => {
    let sandbox: sinon.SinonSandbox;

    class StubMutator implements Mutator {
      name: 'stub';
      mutate(node: IdentifiedNode, copy: (obj: any, deep?: boolean) => any): IdentifiedNode[] {
        let nodes: IdentifiedNode[] = [];
        if (babel.types.isBinaryExpression(node)) {
          // eg: '1 * 2': push child node
          nodes.push(node.left as babel.types.Expression & Identified);
        } else if (babel.types.isIfStatement(node)) {
          // eg: 'if(true);': push original node
          nodes.push(node);
        }
        return nodes;
      }
    }

    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      sandbox.stub(MutatorFactory.instance(), 'knownNames', () => ['test']);
      sandbox.stub(MutatorFactory.instance(), 'create', () => new StubMutator());
    });

    afterEach(() => {
      sinon.restore(MutatorFactory.instance().knownNames);
      sinon.restore(MutatorFactory.instance().create);
      sandbox.restore();
    });

    it('the same nodeID', () => {
      const transpiler = new JavaScriptTranspiler([{ content: 'if (true);', path: 'file.js' }]);
      transpiler.compile();

      let mutants = transpiler.mutate();
      mutants[0].save('some file');

      expect(StrykerTempFolder.writeFile).to.have.been.calledWith('some file', 'if (true);');
    });

    it('a different nodeID', () => {
      const transpiler = new JavaScriptTranspiler([{ content: '1 * 2', path: 'file.js' }]);
      transpiler.compile();

      let mutants = transpiler.mutate();
      mutants[0].save('some file');

      expect(StrykerTempFolder.writeFile).to.have.been.calledWith('some file', '1 * 2');
    });
  });

});
