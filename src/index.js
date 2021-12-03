'use strict';
const path = require('path');
const fse = require('fs-extra');
const childProcess = require('child_process');
const glob = require('fast-glob');

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
    '!node_modules/@prisma/engines/introsㅁpection-engine-rhel*',
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
    const { servicePath } = this.serverless.config;
    const prismaDir = path.join(servicePath, 'prisma');
    for (const functionName of this.getFunctions()) {
      const cwd = path.join(servicePath, '.webpack', functionName);
      const targetPrismaDir = path.join(cwd, 'prisma');
      this.serverless.cli.log(`Copy prisma schema for ${functionName}...`);
      fse.copySync(prismaDir, targetPrismaDir);
      this.serverless.cli.log(`Generate prisma client for ${functionName}...`);
      childProcess.execSync('npx prisma generate', { cwd });
      const unusedEngines = glob.sync(this.engines, { cwd });
      if (unusedEngines.length <= 0) continue;
      this.serverless.cli.log(`Remove unused prisma engine: `);
      unusedEngines.forEach((engine) => {
        this.serverless.cli.log(`- ${engine}`);
        const enginePath = path.join(cwd, engine);
        fse.removeSync(enginePath, { force: true });
      });
    }
  }

  getFunctions() {
    return ['service'];
  }

  isNodeRuntime(runtime) {
    return runtime.match(/node/);
  }
}

module.exports = ServerlessWebpackPrisma;
