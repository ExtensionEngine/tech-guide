# Docker image guide

The following handbook offers best practices for creating small and secure NodeJs
Docker images suitable for production use.
You will find it helpfull no matter what type of NodeJs application you aim to build.

Examples with each step explained will be used to guide you through best practices.

## Simple NodeJs application

### The application

Let's start with the simple nodejs application. Here is an overview of the files
included in the project:

```
├── index.js
├── package.json
├── package-lock.json
├── Dockerfile
├── .dockerignore
├── .npmrc
```

```js
// index.js
const express = require("express");
const os = require("os");

const app = express();

app.use("/", (req, res) => {
  res.send(`Hello world from ${os.hostname()}.`);
});

app.listen(3000, () => {
  console.log("App is listening on port 3000");
});
```

### The Dockerfile

```dockerfile
# https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#1-use-explicit-and-deterministic-docker-base-image-tags
# https://snyk.io/blog/choosing-the-best-node-js-docker-image
FROM node:20.9-bookworm-slim@sha256:c325fe5059c504933948ae6483f3402f136b96492dff640ced5dfa1f72a51716 AS base
# https://docs.docker.com/build/cache/#combine-commands-together-wherever-possible
# https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#5-properly-handle-events-to-safely-terminate-a-nodejs-docker-web-application
# https://github.com/Yelp/dumb-init
RUN apt update && apt install -y --no-install-recommends dumb-init

FROM node:20.9-bookworm@sha256:3c48678afb1ae5ca5931bd154d8c1a92a4783555331b535bbd7e0822f9ca8603 AS install
# https://www.pathname.com/fhs/pub/fhs-2.3.html#USRSRCSOURCECODE
WORKDIR /usr/src/app
# https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#3-optimize-nodejs-tooling-for-production
ENV NODE_ENV production
COPY package*.json .
# https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#2-install-only-production-dependencies-in-the-nodejs-docker-image
# when NODE_ENV is set to production, npm ci automatically omits dev dependencies
# https://docs.npmjs.com/cli/v10/commands/npm-ci#omit
# NOTE: if we don't have secrets, this is how we install npm packages, however if we
# do have npmrc secret, we skip this step and proceed to the next.
RUN npm ci --omit=dev
# we can mount .npmrc secret file without leaving the secrets in the final built image
# refer to docs https://docs.docker.com/build/building/secrets/
RUN --mount=type=secret,id=npmrc_secret,target=/usr/src/app/.npmrc,required npm ci --omit=dev

FROM base AS configure
WORKDIR /usr/src/app
COPY --chown=node:node --from=install /usr/src/app/node_modules ./node_modules
# https://docs.docker.com/build/cache/#dont-include-unnecessary-files
COPY --chown=node:node ./index.js .

FROM configure AS run
ENV NODE_ENV production
# https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#4-dont-run-containers-as-root
USER node
# https://docs.docker.com/build/building/best-practices/#entrypoint
ENTRYPOINT ["dumb-init", "--"]
CMD [ "node", "index.js" ]
```

### Important notes:

1. **Always** specify `.dockerignore` files to reduce security risks and image
   footprint size. Also, by avoiding sending unwanted files to the builder,
   build speed is improved. The file should at least include
   `node_modules`, `.git` and `.env` files.

2. [The order of Dockerfile instructions matters](https://docs.docker.com/build/guide/layers/).

3. `FROM node:20.9-bookworm-slim@sha256:c32...16 AS base`

- Selecting the appropriate Docker image is crucial to achieve minimal resource
  utilization and minimize vulnerability risks.
- It is recommended to always use official docker images even though they are
  not the smallest ones. An excellent illustration of this is the "alpine" image,
  which, while having a minimal footprint, has experimental support.
- Include image sha256 hash to ensure that always the same image is downloaded.
- Use explicit and deterministic Docker base image tags to improve readability
  and maintainability.
- Currently, the official `bookworm-slim` image appears to be the most suitable
  choice for a Node.js runner image, given its minimal size (nearly equivalent
  to the Alpine version). Read more about chosing the best NodeJs Docker image
  [here](https://snyk.io/blog/choosing-the-best-node-js-docker-image).

4. `RUN apt update && apt install -y --no-install-recommends dumb-init`

- NodeJs is not designed to be a PID 1 process so we are using a process wrapper
  to handle termination signals for us instead of doing it manually inside our
  NodeJs application.
- Notice how these two commands (apt update and apt install dumb-init) are chained.
  By doing so we are saving some image footprint size because each docker image step
  adds an additional layer which affects the final size. That being said, it is
  recommended whenever is possible to chain RUN commands into single command.

5. `FROM node:20.9-bookworm@sha256:3c...603 AS install`

- For dependency installation (and later for the build phase), we use the
  standard `bookworm` image instead of the `slim` version because certain
  dependencies require additional tools for the compilation step.

6. `WORKDIR /usr/src/app`

- Application code should be placed inside `/usr/src` subdirectory.

7. `ENV NODE_ENV production`

- If you are building your image for production this ensures that all frameworks
  and libraries are using the optimal settings for performance and security.

8. `COPY package*.json .`

- It's important to notice here that we are copying `package*.json` files
  separate from the rest of the codebase. By doing so, we are leveraging Docker
  layers caching functionality mentioned in step 2. When source code
  changes, we don't want to reinstall dependencies because they remain unchanged.
  By copying source code files after dependency installation, we are only
  re-executing those steps that come after that step, including that step.

9. `RUN npm ci --omit=dev`

- devDependencies are not essential for the application to work. By installing
  only production dependencies we are reducing security risks and image
  footprint size and also improving build speed.

10. `COPY --chown=node:node --from=install /usr/src/app/node_modules ./node_modules`

- From the install phase we are copying only the node_modules folder in order
  to keep the final Docker image minimal.
- The default Docker behavior is that copied files are owned by `root`.
  By specifying `--chown=node:node` we are telling that `node_modules` files
  will be owned by `node` user instead of `root`.
  `node` is the least privileged user and by selecting it, we are limiting the
  number of actions an attacker can do in case our application gets compromised.

11. `COPY --chown=node:node ./index.js .`

- Copy the rest of the codebase as described in step 9. For this example, we
  are copying only the `index.js` file because that is the only file we need in
  order to run our application. Avoid adding unnecessary files to your builds by
  explicitly stating the files or directories you intend to copy over.

12. `USER node`

- The process should be owned by the `node` user instead of `root`.

13. `ENTRYPOINT ["dumb-init", "--"]`

- Use the exec form to run as PID 1 process and provide default arguments with `CMD`.
- Define runtime configuration (`ENTRYPOINT` and `CMD`) in the final stage of
  multi-stage build to enforce consistency, explicitness, and security.

14. `RUN --mount=type=secret,id=npmrc_secret,target=/usr/src/app/.npmrc,required npm ci --omit=dev`

- The files mounted as secrets will be available during build, but they will not
  remain in the final image. The secret can be any file, but npmrc is most common
  so we use it as an example.
  To be able to use the secret, we must pass it either as a param to Docker build or
  define it in Docker compose.

- Docker build example:
  `docker build -t ntc-lms . --secret id=npmrc_secret,src=.npmrc`

- Docker compose.yaml example:

  ```yaml
    services:
      app:
        build:
          context: .
          secrets:
            - npmrc_secret

    ...

    secrets:
      npmrc_secret:
       file: .npmrc
  ```

## Typescript NodeJs application

### The application

```
├── src
│   ├── index.ts
├── dist
│   ├── index.js
├── node_modules
├── tsconfig.json
├── package.json
├── package-lock.json
├── Dockerfile
├── .dockerignore
```

### The Dockerfile

```dockerfile
FROM node:20.9-bookworm-slim@sha256:c325fe5059c504933948ae6483f3402f136b96492dff640ced5dfa1f72a51716 AS base
RUN apt update && apt install -y --no-install-recommends dumb-init

FROM node:20.9-bookworm@sha256:3c48678afb1ae5ca5931bd154d8c1a92a4783555331b535bbd7e0822f9ca8603 AS build
WORKDIR /usr/src/app
COPY package*.json .
RUN npm ci
COPY ./src tsconfig.json ./
RUN npm run build

FROM node:20.9-bookworm@sha256:3c48678afb1ae5ca5931bd154d8c1a92a4783555331b535bbd7e0822f9ca8603 AS install
WORKDIR /usr/src/app
ENV NODE_ENV production
COPY package*.json .
RUN npm ci --omit=dev

FROM base AS configure
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=install /usr/src/app/node_modules ./node_modules

FROM configure AS run
ENV NODE_ENV production
USER node
ENTRYPOINT ["dumb-init", "--"]
CMD [ "node", "dist/index.js" ]
```

### Important notes:

1. [Use multi-stage builds](https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#8-use-multi-stage-builds).
   By splitting the docker image into multiple stages, we are ensuring that the
   final image only contains essential files which reduces image footprint size
   and security risks. In the given example, we begin by building a TypeScript
   application in the build stage.
   Ultimately, in the configure phase, we exclusively copy the `dist`
   output from the build stage to the final Docker image.
   Another benefit of using a multi-stage build is that the Docker builder will
   work out dependencies between the stages and run them using the most
   efficient strategy. This even allows you to run multiple builds concurrently.

## Bonus Tips

### Caching

Often, Docker images are built inside CI/CD pipeline. To enhance the efficiency
of CI/CD and minimize computation costs, leveraging caching is crucial.

Caching depends on the platform that is being used.
For detailed guidance on caching Docker image layers with CircleCI, refer to
this [link](https://circleci.com/docs/docker-layer-caching).

Also, on this
[link](https://courses.devopsdirective.com/docker-beginner-to-pro/lessons/06-building-container-images/02-api-node-dockerfile#use-a-cache-mount-to-speed-up-dependency-installation-%EF%B8%8F)
you can find how to cache npm dependencies between builds.

## Resources

- [NodeJs Docker Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#nodejs-docker-cheat-sheet)
- [Choosing the best NodeJs Docker image](https://snyk.io/blog/choosing-the-best-node-js-docker-image)
- [Docker guide](https://docs.docker.com/build/guide/)
- [10 best practices to containerize NodeJs web applications with Docker](https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/)
- [NodeJs API Dockerfile](https://courses.devopsdirective.com/docker-beginner-to-pro/lessons/06-building-container-images/02-api-node-dockerfile#nodejs-api-dockerfile)
