# Serverless Webpack Prisma

When using serverless webpack, you can save up to 50% of package capacity by deleting unnecessary Prisma engine.

## How to use?

First, install the package by entering the following command.

```sh
npm install -D serverless-webpack-prisma
```

Add the corresponding plugin under the webpack plugin as shown below.

```yaml
plugins:
  - serverless-webpack
  - serverless-prisma-plugin
```

If you have already used the generate script below, please delete it.

```yaml
custom:
  webpack:
    packagerOptions:
      scripts:
        - prisma generate
```

Congratulations. Setup is complete. In the future, packaging will automatically delete unnecessary resources.

```
Serverless: Generate prisma client for app...
Serverless: Remove unused prisma engine:
Serverless: - node_modules/.prisma/client/libquery_engine-darwin.dylib.node
Serverless: - node_modules/@prisma/engines/introspection-engine-darwin
Serverless: - node_modules/@prisma/engines/libquery_engine-darwin.dylib.node
Serverless: - node_modules/@prisma/engines/migration-engine-darwin
Serverless: - node_modules/@prisma/engines/prisma-fmt-darwin
```
