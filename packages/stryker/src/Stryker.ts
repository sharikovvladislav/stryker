import * as fs from 'mz/fs';
import JavaScriptTranspiler from './transpiler/JavaScriptTranspiler';
import { Config, ConfigWriterFactory } from 'stryker-api/config';
import { StrykerOptions, InputFile } from 'stryker-api/core';
import { MutantResult, SourceFile } from 'stryker-api/report';
import { TestFramework } from 'stryker-api/test_framework';
import SandboxCoordinator from './SandboxCoordinator';
import ReporterOrchestrator from './ReporterOrchestrator';
import { RunResult, TestResult, RunStatus, TestStatus } from 'stryker-api/test_runner';
import TestFrameworkOrchestrator from './TestFrameworkOrchestrator';
import MutantTestMatcher from './MutantTestMatcher';
import InputFileResolver from './InputFileResolver';
import ConfigReader from './ConfigReader';
import PluginLoader from './PluginLoader';
import CoverageInstrumenter from './coverage/CoverageInstrumenter';
import { freezeRecursively, isPromise } from './utils/objectUtils';
import StrykerTempFolder from './utils/StrykerTempFolder';
import * as log4js from 'log4js';
import Timer from './utils/Timer';
import StrictReporter from './reporters/StrictReporter';
const log = log4js.getLogger('Stryker');

const humanReadableTestState = (testState: TestStatus) => {
  switch (testState) {
    case TestStatus.Success:
      return 'SUCCESS';
    case TestStatus.Failed:
      return 'FAILED';
    case TestStatus.Skipped:
      return 'SKIPPED';
  }
};

export default class Stryker {

  config: Config;
  private timer = new Timer();
  private reporter: StrictReporter;
  private testFramework: TestFramework | null;
  private coverageInstrumenter: CoverageInstrumenter;

  /**
   * The Stryker mutation tester.
   * @constructor
   * @param {String[]} mutateFilePatterns - A comma seperated list of globbing expression used for selecting the files that should be mutated
   * @param {String[]} allFilePatterns - A comma seperated list of globbing expression used for selecting all files needed to run the tests. These include library files, test files and files to mutate, but should NOT include test framework files (for example jasmine)
   * @param {Object} [options] - Optional options.
   */
  constructor(options: StrykerOptions) {
    let configReader = new ConfigReader(options);
    this.config = configReader.readConfig();
    this.setGlobalLogLevel(); // loglevel could be changed
    this.loadPlugins();
    this.applyConfigWriters();
    this.setGlobalLogLevel(); // loglevel could be changed
    this.freezeConfig();
    this.reporter = new ReporterOrchestrator(this.config).createBroadcastReporter();
    this.testFramework = new TestFrameworkOrchestrator(this.config).determineTestFramework();
    this.coverageInstrumenter = new CoverageInstrumenter(this.config.coverageAnalysis, this.testFramework);
    this.verify();
  }


  /**
   * Runs mutation testing. This may take a while.
   * @function
   */
  async runMutationTest(): Promise<MutantResult[]> {
    this.timer.reset();

    let inputFiles = await new InputFileResolver(this.config.mutate, this.config.files).resolve();
    let { runResult, sandboxCoordinator } = await this.initialTestRun(inputFiles);
    if (runResult && inputFiles && sandboxCoordinator) {
      let mutantResults = await this.generateAndRunMutations(inputFiles, runResult, sandboxCoordinator);

      await this.wrapUpReporter();
      await StrykerTempFolder.clean();
      await this.logDone();

      return mutantResults;
    } else {
      throw new Error('Resulting object did not contain runResult, inputFiles or sandboxCoordinator');
    }
  }

  private filterOutFailedTests(runResult: RunResult) {
    return runResult.tests.filter(testResult => testResult.status === TestStatus.Failed);
  }

  private loadPlugins() {
    if (this.config.plugins) {
      new PluginLoader(this.config.plugins).load();
    }
  }

  private verify() {
    if (this.config.coverageAnalysis === 'perTest' && !this.testFramework) {
      log.fatal('Configured coverage analysis "perTest" requires there to be a testFramework configured. Either configure a testFramework or set coverageAnalysis to "all" or "off".');
      process.exit(1);
    }
  }

  private async initialTestRun(inputFiles: InputFile[]) {
    const sandboxCoordinator = new SandboxCoordinator(this.config, inputFiles, this.testFramework, this.reporter);
    let runResult = await sandboxCoordinator.initialRun(this.coverageInstrumenter);
    switch (runResult.status) {
      case RunStatus.Complete:
        let failedTests = this.filterOutFailedTests(runResult);
        if (failedTests.length) {
          this.logFailedTestsInInitialRun(failedTests);
          throw new Error('There were failed tests in the initial test run:');
        } else {
          this.logInitialTestRunSucceeded(runResult.tests);
          return { runResult, sandboxCoordinator };
        }
      case RunStatus.Error:
        this.logErrorredInitialRun(runResult);
        break;
      case RunStatus.Timeout:
        this.logTimeoutInitialRun(runResult);
        break;
    }
    throw new Error('Something went wrong in the initial test run');
  }

  private generateAndRunMutations(inputFiles: InputFile[], initialRunResult: RunResult, sandboxCoordinator: SandboxCoordinator): Promise<MutantResult[]> {
    let sourceFiles = this.readSourceFiles(inputFiles);
    let mutants = this.generateMutants(sourceFiles, initialRunResult);
    if (mutants.length) {
      return sandboxCoordinator.runMutants(mutants);
    } else {
      log.info('It\'s a mutant-free world, nothing to test.');
      return Promise.resolve([]);
    }
  }

  private readSourceFiles(inputFiles: InputFile[]) {
    let sourceFiles: SourceFile[] = [];

    let filesToMutate = inputFiles.filter(i => i.mutated).map(i => i.path);
    filesToMutate.forEach(path => {
      let content = fs.readFileSync(path, 'utf8');
      let sourceFile: SourceFile = { path, content };
      freezeRecursively(sourceFile);
      sourceFiles.push(sourceFile);
      this.reporter.onSourceFileRead(sourceFile);
    });

    if (sourceFiles.length > 0) {
      freezeRecursively(sourceFiles);
      this.reporter.onAllSourceFilesRead(sourceFiles);
    }

    return sourceFiles
  }

  private generateMutants(sourceFiles: SourceFile[], runResult: RunResult) {
    let transpiler = new JavaScriptTranspiler(sourceFiles);
    transpiler.compile();
    let mutants = transpiler.mutate();
    log.info(`${mutants.length} Mutant(s) generated`);
    let mutantRunResultMatcher = new MutantTestMatcher(mutants, runResult, this.coverageInstrumenter.retrieveStatementMapsPerFile(), this.config, this.reporter);
    mutantRunResultMatcher.matchWithMutants();
    return mutants;
  }

  private wrapUpReporter(): Promise<void> {
    let maybePromise = this.reporter.wrapUp();
    if (isPromise(maybePromise)) {
      return maybePromise;
    } else {
      return Promise.resolve();
    }
  }

  private applyConfigWriters() {
    ConfigWriterFactory.instance().knownNames().forEach(configWriterName => {
      ConfigWriterFactory.instance().create(configWriterName, undefined).write(this.config);
    });
  }

  private freezeConfig() {
    freezeRecursively(this.config);
    if (log.isDebugEnabled()) {
      log.debug(`Using config: ${JSON.stringify(this.config)}`);
    }
  }

  private logInitialTestRunSucceeded(tests: TestResult[]) {
    log.info('Initial test run succeeded. Ran %s tests in %s.', tests.length, this.timer.humanReadableElapsed());
  }

  private logDone() {
    log.info('Done in %s.', this.timer.humanReadableElapsed());
  }

  private setGlobalLogLevel() {
    log4js.setGlobalLogLevel(this.config.logLevel);
  }

  private logFailedTestsInInitialRun(failedTests: TestResult[]): void {
    let message = 'One or more tests failed in the initial test run:';
    failedTests.forEach(test => {
      message += `\n\t${test.name}`;
      if (test.failureMessages && test.failureMessages.length) {
        message += `\n\t${test.failureMessages.join('\n\t')}`;
      }
    });
    log.error(message);
  }
  private logErrorredInitialRun(runResult: RunResult) {
    let message = 'One or more tests errored in the initial test run:';
    if (runResult.errorMessages && runResult.errorMessages.length) {
      runResult.errorMessages.forEach(error => message += `\n\t${error}`);
    }
    log.error(message);
  }

  private logTimeoutInitialRun(runResult: RunResult) {
    let message = 'Initial test run timed out! Ran following tests before timeout:';
    runResult.tests.forEach(test => `\n\t${test.name} ${humanReadableTestState(test.status)}`);
    log.error(message);
  }
}
