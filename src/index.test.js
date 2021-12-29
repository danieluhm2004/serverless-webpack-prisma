'use strict';

const fse = require('fs-extra');
const glob = require('fast-glob');
const childProcess = require('child_process');
const ServerlessWebpackPrisma = require('.');
const { randomBytes } = require('crypto');
const { join } = require('path');

jest.mock('fs-extra');
jest.mock('fast-glob');
jest.mock('child_process');

describe('Check serverless-webpack-prisma plugin', () => {
  let plugin;
  beforeEach(() => {
    plugin = new ServerlessWebpackPrisma({
      cli: { log: console.log },
      configurationInput: { package: { individually: false } },
      config: { servicePath: '' },
      service: {
        provider: {},
        getAllFunctions: () => [],
        getFunction: () => ({}),
        custom: { webpack: {} },
      },
    });
  });

  test('after:webpack:package:packExternalModules hook is registered', () => {
    const fromFunction = plugin.onBeforeWebpackPackage.bind(plugin);
    const fromHook = plugin.hooks['after:webpack:package:packExternalModules'];
    expect(fromFunction.toString()).toEqual(fromHook.toString());
  });

  test('getPackageManager() is "npm"', () =>
    expect(plugin.getPackageManager()).toEqual('npm'));

  test('getPackageManager() is "yarn"', () => {
    plugin.serverless.service.custom.webpack = { packager: 'yarn' };
    expect(plugin.getPackageManager()).toEqual('yarn');
  });

  test('runPackageInstallCommand() install package by npm', () => {
    const packageName = `${randomBytes(4).toString('hex')}`;
    const cwd = `/fake-path/${randomBytes(4).toString('hex')}`;
    childProcess.execSync.mockImplementation((command, options) => {
      expect(command).toEqual(`npm install ${packageName}`);
      expect(options).toEqual({ cwd });
    });

    plugin.runPackageInstallCommand({ packageName, cwd, dev: false });
  });

  test('runPackageInstallCommand() install package by yarn', () => {
    plugin.serverless.service.custom.webpack = { packager: 'yarn' };
    const packageName = `${randomBytes(4).toString('hex')}`;
    const cwd = `/fake-path/${randomBytes(4).toString('hex')}`;
    childProcess.execSync.mockImplementation((command, options) => {
      expect(command).toEqual(`yarn add ${packageName}`);
      expect(options).toEqual({ cwd });
    });

    plugin.runPackageInstallCommand({ packageName, cwd, dev: false });
  });

  test('runPackageInstallCommand() install package by npm (with devDependencies)', () => {
    const packageName = `${randomBytes(4).toString('hex')}`;
    const cwd = `/fake-path/${randomBytes(4).toString('hex')}`;
    childProcess.execSync.mockImplementation((command, options) => {
      expect(command).toEqual(`npm install -D ${packageName}`);
      expect(options).toEqual({ cwd });
    });

    plugin.runPackageInstallCommand({ packageName, cwd, dev: true });
  });

  test('runPackageInstallCommand() install package by yarn (with devDependencies)', () => {
    plugin.serverless.service.custom.webpack = { packager: 'yarn' };
    const packageName = `${randomBytes(4).toString('hex')}`;
    const cwd = `/fake-path/${randomBytes(4).toString('hex')}`;
    childProcess.execSync.mockImplementation((command, options) => {
      expect(command).toEqual(`yarn add -D ${packageName}`);
      expect(options).toEqual({ cwd });
    });

    plugin.runPackageInstallCommand({ packageName, cwd, dev: true });
  });

  test('installPrismaPackage() install prisma devDeprendencies', () => {
    const cwd = `/fake-path/${randomBytes(4).toString('hex')}`;
    childProcess.execSync.mockImplementation((command, options) => {
      expect(command).toEqual(`npm install -D prisma`);
      expect(options).toEqual({ cwd });
    });

    plugin.installPrismaPackage({ cwd });
  });

  test('copyPrismaSchemaToFunction must copy prisma schema', () => {
    const functionName = 'this-is-copy-prisma-schema-to-function-test';
    const cwd = `/fake-path/${randomBytes(4).toString('hex')}`;
    const prismaDir = `/fake-path/${randomBytes(4).toString('hex')}`;
    fse.copySync.mockImplementation((src, dest) => {
      expect(src).toEqual(prismaDir);
      expect(dest).toEqual(join(cwd, 'prisma'));
    });

    expect(plugin.copyPrismaSchemaToFunction({ functionName, cwd, prismaDir }));
  });

  test('generatePrismaSchema must generate engines', () => {
    const functionName = 'this-is-generate-prisma-schema-test';
    const cwd = `/fake-path/${randomBytes(4).toString('hex')}`;
    childProcess.execSync.mockImplementation((command, options) => {
      expect(command).toEqual('npx prisma generate');
      expect(options).toEqual({ cwd });
    });

    expect(plugin.generatePrismaSchema({ functionName, cwd }));
  });

  test('deleteUnusedEngines must delete engines', () => {
    const cwd = `/fake-path/${randomBytes(4).toString('hex')}`;
    const randomPath = `/fake-path/${randomBytes(4).toString('hex')}`;
    glob.sync.mockImplementation((engines, options) => {
      expect(Array.isArray(engines)).toEqual(true);
      expect(options).toEqual({ cwd });
      return [randomPath];
    });

    fse.removeSync.mockImplementation((path, options) => {
      expect(path).toEqual(join(cwd, randomPath));
      expect(options).toEqual({ force: true });
    });

    plugin.deleteUnusedEngines({ cwd });
  });

  test('getFunctionNamesForProcess is empty', () => {
    plugin.serverless.configurationInput.package.individually = true;
    expect(plugin.getFunctionNamesForProcess()).toEqual([]);
  });

  test('getFunctionNamesForProcess on not individually mode', () =>
    expect(plugin.getFunctionNamesForProcess()).toEqual(['service']));

  test('getFunctionNamesForProcess on individually mode', () => {
    const functionNames = ['apple', 'bag', 'cat'];
    plugin.serverless.configurationInput.package.individually = true;
    plugin.serverless.service.getAllFunctions = () => functionNames;
    expect(plugin.getFunctionNamesForProcess()).toEqual(functionNames);
  });

  test('getAllNodeFunctions() is empty', () =>
    expect(plugin.getAllNodeFunctions()).toEqual([]));

  test('getAllNodeFunctions() is ["apple"]', () => {
    plugin.serverless.service.provider.runtime = 'python';
    plugin.serverless.service.getAllFunctions = () => ['apple', 'bag', 'cat'];
    plugin.serverless.service.getFunction = (func) => {
      if (func === 'apple') return { runtime: 'nodejs' };
      if (func === 'bag') return { image: 'fake-image', url: 'fake-url' };
      return {};
    };

    expect(plugin.getAllNodeFunctions()).toEqual(['apple']);
  });

  test('isNodeRuntime("nodejs") is true', () =>
    expect(!!plugin.isNodeRuntime('nodejs')).toEqual(true));

  test('isNodeRuntime("python") is false', () =>
    expect(!!plugin.isNodeRuntime('python')).toEqual(false));
});
