FROM node:20.3.0-alpine

WORKDIR /app

COPY web/install-pyenv.sh ./

RUN apk add --no-cache \
    git \
    bash \
    build-base \
    libffi-dev \
    openssl-dev \
    bzip2-dev \
    zlib-dev \
    readline-dev \
    sqlite-dev

RUN sh ./install-pyenv.sh

# Set environment variables for pyenv
ENV PATH="/root/.pyenv/shims:/root/.pyenv/bin:$PATH"
ENV PYENV_ROOT="/root/.pyenv"

# Install Python 3.11.4 using pyenv
RUN pyenv install 3.11.4
RUN pyenv global 3.11.4

RUN mkdir -p web

COPY web/.yarnrc.yml ./yarn.lock web/package.json ./web

WORKDIR /app/web

# to enable mac builds
# https://github.com/nodejs/docker-node/issues/1912#issuecomment-2133772534
ENV UV_USE_IO_URING=0

RUN yarn set version 4.3.1

RUN yarn install

WORKDIR /app

COPY . .

RUN yarn set version 4.3.1

RUN yarn install

# Build extension
WORKDIR /app/extension
RUN yarn install
RUN yarn build

# Copy extension build to web public directory
RUN cp -r /app/extension/build /app/web/public/extension-build

WORKDIR /app/web

RUN yarn install

ENV PATH="/app/node_modules/.bin:$PATH"

# CMD ["sh", "-c", "sleep 300"]
ENV NODE_OPTIONS="--max-old-space-size=2048"

RUN yarn build

CMD ["yarn", "serve"]
