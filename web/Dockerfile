FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914

COPY scripts/patch-npm.mjs /tmp/patch-npm.mjs
RUN npm install --global --no-audit --no-fund npm@12.2.1 \
    && node /tmp/patch-npm.mjs \
    && npm cache clean --force

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY web/package.json ./web/package.json
COPY extension/package.json ./extension/package.json
COPY simulator/package.json ./simulator/package.json
COPY apps/package.json ./apps/package.json
# Install the complete workspace graph once, including native build hooks.
RUN corepack enable && corepack yarn install --immutable
COPY . .
ENV UV_USE_IO_URING=0
ARG GIT_COMMIT_ID=container
ENV GIT_COMMIT_ID=$GIT_COMMIT_ID
# Optional public extension configuration: --secret id=extension-env,src=path/to/config
RUN --mount=type=secret,id=extension-env,target=/app/extension/.env.production \
    corepack yarn workspace extension build

# Copy extension build to web public directory
RUN cp -r /app/extension/build /app/web/public/extension-build

WORKDIR /app/web

ENV PATH="/app/node_modules/.bin:$PATH"

# CMD ["sh", "-c", "sleep 300"]
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Optional public web configuration: --secret id=web-env,src=path/to/config
RUN --mount=type=secret,id=web-env,target=/app/web/.env.production \
    corepack yarn workspace web build

CMD ["yarn", "serve"]
