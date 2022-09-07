# Serverless Webpack Prisma

When using serverless webpack, you can save up to 50% of package capacity by deleting unnecessary Prisma engines.

## How to use?

First, install the package by entering the following command.

```sh
npm install -D serverless-webpack-prisma
```

Add the corresponding plugin under the webpack plugin as shown below.

```yaml
plugins:
  - serverless-webpack
  - serverless-webpack-prisma
```

If you have already used the generate script below, please delete it.

```yaml
custom:
  webpack:
    packagerOptions:
      scripts:
        - prisma generate
```

This plugin also has some additional configs:

```yaml
custom:
  prisma:
    installDeps: false # Passing false will not install Prisma dependency during the build process. Default: true
    prismaPath: ../../ # Passing this param, plugin will change the directory to find the dir prisma containing the prisma/prisma.schema
    dataProxy: false # Passing this param, plugin will create the prisma client for use with a data proxy see: https://www.prisma.io/docs/data-platform/data-proxy
```

Congratulations. The setup is complete. In the future, packaging will automatically delete unnecessary resources.

```
Serverless: Generate prisma client for app...
Serverless: Remove unused prisma engine:
Serverless: - node_modules/.prisma/client/libquery_engine-darwin.dylib.node
Serverless: - node_modules/@prisma/engines/introspection-engine-darwin
Serverless: - node_modules/@prisma/engines/libquery_engine-darwin.dylib.node
Serverless: - node_modules/@prisma/engines/migration-engine-darwin
Serverless: - node_modules/@prisma/engines/prisma-fmt-darwin
```
