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

RUN yarn set version 4.3.1

RUN yarn install

WORKDIR /app

COPY . .

RUN yarn set version 4.3.1

RUN yarn install

WORKDIR /app/web

ENV PATH="/app/node_modules/.bin:$PATH"

# CMD ["sh", "-c", "sleep 300"]

RUN yarn build

CMD ["yarn", "serve"]
