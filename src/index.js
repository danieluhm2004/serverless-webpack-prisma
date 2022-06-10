'use strict';

const childProcess = require('child_process');
const { join } = require('path');
const fse = require('fs-extra');
const glob = require('fast-glob');
const _ = require('lodash');

class ServerlessWebpackPrisma {
  engines = [
    'node_modules/.prisma/client/libquery_engine*',
    '!node_modules/.prisma/client/libquery_engine-rhel*',

    'node_modules/prisma/libquery_engine*',
    '!node_modules/prisma/libquery_engine-rhel*',

    'node_modules/@prisma/engines/libquery_engine*',
    '!node_modules/@prisma/engines/libquery_engine-rhel*',

    'node_modules/@prisma/engines/migration-engine*',
    '!node_modules/@prisma/engines/migration-engine-rhel*',

    'node_modules/@prisma/engines/prisma-fmt*',
    '!node_modules/@prisma/engines/prisma-fmt-rhel*',

    'node_modules/@prisma/engines/introspection-engine*',
    '!node_modules/@prisma/engines/introspection-engine-rhel*',

    'node_modules/prisma/engines/**',
  ];

  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.commands = {};
    this.hooks = {
      'after:webpack:package:packExternalModules':
        this.onBeforeWebpackPackage.bind(this),
    };
  }

  onBeforeWebpackPackage() {
    const servicePath = this.getSchemaPath();
    const prismaDir = join(servicePath, 'prisma');
    const functionNames = this.getFunctionNamesForProcess();
    for (const functionName of functionNames) {
      const cwd = join(servicePath, '.webpack', functionName);
      if (this.getDepsParam()) this.installPrismaPackage({ cwd });
      this.copyPrismaSchemaToFunction({ functionName, cwd, prismaDir });
      this.generatePrismaSchema({ functionName, cwd });
      this.deleteUnusedEngines({ functionName, cwd });
      if (this.getDepsParam()) this.removePrismaPackage({ cwd });
    }
  }

  getPackageManager() {
    return _.get(this.serverless, 'service.custom.webpack.packager', 'npm');
  }

  runPackageInstallCommand({ packageName, cwd, dev }) {
    let params = '';
    if (dev) params += '-D ';
    const command =
      this.getPackageManager() === 'npm'
        ? `npm install ${params}${packageName}`
        : `yarn add ${params}${packageName}`;
    childProcess.execSync(command, { cwd });
  }

  runPackageRemoveCommand({ packageName, cwd }) {
    const command =
      this.getPackageManager() === 'npm'
        ? `npm remove ${packageName}`
        : `yarn remove ${packageName}`;
    childProcess.execSync(command, { cwd });
  }

  installPrismaPackage({ cwd }) {
    this.serverless.cli.log('Install prisma devDependencies for generate');
    this.runPackageInstallCommand({ packageName: 'prisma', cwd, dev: true });
  }

  removePrismaPackage({ cwd }) {
    this.serverless.cli.log('Remove prisma devDependencies');
    this.runPackageRemoveCommand({ packageName: 'prisma', cwd });
  }

  copyPrismaSchemaToFunction({ functionName, cwd, prismaDir }) {
    const targetPrismaDir = join(cwd, 'prisma');
    this.serverless.cli.log(`Copy prisma schema for ${functionName}...`);
    fse.copySync(prismaDir, targetPrismaDir);
  }

  generatePrismaSchema({ functionName, cwd }) {
    this.serverless.cli.log(`Generate prisma client for ${functionName}...`);
    childProcess.execSync('npx prisma generate', { cwd });
  }

  deleteUnusedEngines({ cwd }) {
    const unusedEngines = glob.sync(this.engines, { cwd });
    if (unusedEngines.length <= 0) return;
    this.serverless.cli.log(`Remove unused prisma engine:`);
    unusedEngines.forEach((engine) => {
      this.serverless.cli.log(`  - ${engine}`);
      const enginePath = join(cwd, engine);
      fse.removeSync(enginePath, { force: true });
    });
  }

  getFunctionNamesForProcess() {
    const packageIndividually =
      this.serverless.configurationInput.package &&
      this.serverless.configurationInput.package.individually;
    return packageIndividually ? this.getAllNodeFunctions() : ['service'];
  }

  getSchemaPath() {
    return _.get(
      this.serverless,
      'service.custom.prisma.prismaPath',
      this.serverless.config.servicePath
    );
  }

  getDepsParam() {
    return _.get(this.serverless, 'service.custom.prisma.installDeps', true);
  }

  // Ref: https://github.com/serverless-heaven/serverless-webpack/blob/4785eb5e5520c0ce909b8270e5338ef49fab678e/lib/utils.js#L115
  getAllNodeFunctions() {
    const functions = this.serverless.service.getAllFunctions();

    return functions.filter((funcName) => {
      const func = this.serverless.service.getFunction(funcName);

      // if `uri` is provided or simple remote image path, it means the
      // image isn't built by Serverless so we shouldn't take care of it
      if (
        (func.image && func.image.uri) ||
        (func.image && typeof func.image == 'string')
      ) {
        return false;
      }

      return this.isNodeRuntime(
        func.runtime || this.serverless.service.provider.runtime || 'nodejs'
      );
    });
  }

  isNodeRuntime(runtime) {
    return runtime.match(/node/);
  }
}

module.exports = ServerlessWebpackPrisma;
