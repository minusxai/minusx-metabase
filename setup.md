# Develop MinusX Locally

To install all dependencies, run:

```sh
yarn
cd web && yarn
```

### To start the chrome extension in dev mode, in the root folder run:

```sh
yarn extension
```

### To run the web app in dev mode, in the root folder run:

```sh
yarn web
```

Alternatively, to run the web app in production preview-mode, add `IS_PROD=true` to the .env.development file. Then re-run `yarn web`

### To run the web app in production mode, run:

```sh
yarn web-prod
```

### Install extension
1. You have to enable [developer mode](https://support.google.com/chrome/thread/155712634/where-do-i-go-to-turn-on-the-chrome-developer-mode) in chrome.
2. Go to chrome://extensions , select "Load unpacked", and select the `extension/build` directory

### To run tests for the current extension build, run

```sh
yarn tests
```

To run additional tests, you can pass `HEADLESS=true` and `PROD=true` to run headless tests and tests against the production build respectively. For example:

```sh
HEADLESS=true PROD=true yarn tests
```

#### See test reports

To see test reports, run:

```sh
yarn test-reports
```

## Troubleshooting

### No module named 'distutils'
Python 3.12 has deprecated distutils. If you have pyenv, you can set the local folder to use a version of python <= 3.11 .

```sh
pyenv local 3.11.4
```

If you do not have pyenv installed, you can run the following command to install it.
```
sh web/install-pyenv.sh
```
