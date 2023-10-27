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
FROM node:20.8.1-bookworm-slim@sha256:01e0a13c8c2daecd73908e922207e9695a82d9d41019a96628751fa9f7c0d853 AS configure
# https://docs.docker.com/build/cache/#combine-commands-together-wherever-possible
# https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#5-properly-handle-events-to-safely-terminate-a-nodejs-docker-web-application
# https://github.com/Yelp/dumb-init
RUN apt update && apt install dumb-init
ENTRYPOINT ["dumb-init", "--"]

FROM configure AS install
# https://www.pathname.com/fhs/pub/fhs-2.3.html#USRSRCSOURCECODE
WORKDIR /usr/src/app
# https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#3-optimize-nodejs-tooling-for-production
ENV NODE_ENV production
# https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#4-dont-run-containers-as-root
COPY --chown=node:node package*.json .
# https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#2-install-only-production-dependencies-in-the-nodejs-docker-image
RUN npm ci --only=production
COPY --chown=node:node . .

FROM install AS run
# https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#4-dont-run-containers-as-root
USER node
CMD [ "node", "index.js" ]
```

### Important notes:

1. **Always** specify `.dockerignore` files to reduce security risks and image
   footprint size. Also, by avoiding sending unwanted files to the builder,
   build speed is also improved. The file should at least include
   `node_modules`, `.git` and `.env` files.

2. [The order of Dockerfile instructions matters](https://docs.docker.com/build/guide/layers/).

3. `FROM node:20.8.1-bookworm-slim@sha256:01...53 AS configure`

- Selecting the appropriate Docker image is crucial to achieve minimal resource
  utilization and minimize vulnerability risks.
- It is recommended to always use official docker images even though they are not the smallest
  ones. An excellent illustration of this is the "alpine" image, which, while having
  a minimal footprint, has experimental support.
- Include image sha256 hash to ensure that always the same image is downloaded.
- Use explicit and deterministic Docker base image tags to improve readability
  and maintainability.
- Currently, the official `bookworm-slim` image appears to be the most suitable
  choice for a Node.js image, given its minimal size (nearly equivalent to the
  Alpine version). Read more about chosing the best NodeJs Docker image
  [here](https://snyk.io/blog/choosing-the-best-node-js-docker-image).

4. `RUN apt update && apt install dumb-init`

- NodeJs is not designed to be a PID 1 process so we are using a process wrapper
  to handle termination signals for us instead of doing it manually inside our
  NodeJs application.
- Notice how these two commands (apt update and apt install dumb-init) are chained.
  By doing so we are saving some image footprint size because each docker image step
  adds an additional layer which affects the final size. That being said, it is
  recommended whenever is possible to chain RUN commands into single command.

5. `ENTRYPOINT ["dumb-init", "--"]`

- As explained above, we are using dump-init as PID 1 process.

6. `WORKDIR /usr/src/app`

- Application code should be placed inside `/usr/src` subdirectory.

7. `ENV NODE_ENV production`

- If you are building your image for production this ensures that all frameworks
  and libraries are using the optimal settings for performance and security.

8. `COPY --chown=node:node package*.json .`

- The default Docker behavior is that copied files are owned by `root`.
  By specifying `--chown=node:node` we are telling that `package\*.json` files
  will be owned by `node` user instead of `root`.
  `node` is the least privileged user and by selecting it, we are limiting the
  number of actions an attacker can do in case our application gets compromised.
- It's important to notice here that we are copying `package*.json` files
  separate from the rest of the codebase. By doing so, we are leveraging Docker
  layers caching functionality mentioned in step 2. When source code
  changes, we don't want to reinstall dependencies because they remain unchanged.
  By copying source code files after dependency installation, we are only
  re-executing those steps that come after that step, including that step.

9. `RUN npm ci --only=production`

- devDependencies are not essential for the application to work. By installing
  only production dependencies we are reducing security risks and image
  footprint size and also improving build speed.

10. `COPY --chown=node:node . .`

- Copy the rest of the codebase as described in step 8.

11. `USER node`

- The process should be owned by the `node` user instead of `root`.

## Typescript NodeJs application

### The application

```
├── src
│   ├── index.ts
├── dist
│   ├── index.js
├── node_modules
├── package.json
├── package-lock.json
├── Dockerfile
├── .dockerignore
```

### The Dockerfile

```dockerfile
FROM node:20.8.1-bookworm-slim@sha256:01e0a13c8c2daecd73908e922207e9695a82d9d41019a96628751fa9f7c0d853 AS build
WORKDIR /usr/src/app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build

FROM node:20.8.1-bookworm-slim@sha256:01e0a13c8c2daecd73908e922207e9695a82d9d41019a96628751fa9f7c0d853 AS configure
RUN apt update && apt install dumb-init
ENTRYPOINT ["dumb-init", "--"]

FROM configure AS install
WORKDIR /usr/src/app
COPY --chown=node:node package*.json .
ENV NODE_ENV production
RUN npm ci --only=production
COPY --from=build --chown=node:node /usr/src/app/dist ./dist

FROM install AS run
USER node
CMD ["node", "dist/index.js"]
```

### Important notes:

1. [Use multi-stage builds](https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#8-use-multi-stage-builds).
   By splitting the docker image into multiple stages, we are ensuring that the
   final image only contains essential files which reduces image footprint size
   and security risks. In the given example, we begin by building a TypeScript
   application in the build stage.
   Ultimately, in the installation phase, we exclusively copy the `dist`
   output from the build stage to the final Docker image.
   Another benefit of using a multi-stage build is that the Docker builder will
   work out dependencies between the stages and run them using the most
   efficient strategy. This even allows you to run multiple builds concurrently.

## Resources

- [NodeJs Docker Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NodeJS_Docker_Cheat_Sheet.html#nodejs-docker-cheat-sheet)
- [Choosing the best NodeJs Docker image](https://snyk.io/blog/choosing-the-best-node-js-docker-image)
- [Docker guide](https://docs.docker.com/build/guide/)
