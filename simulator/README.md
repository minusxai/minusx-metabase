# Simulator

A simulator to run e2e MinusX tests

## Init Setup Stuff
1. Only first time, have to install Chromium stuff 
```
yarn playwright install
```
2. On macs, have to start docker app

## Run local tests (GUI)
Ensure there is a valid extension build in `../extension/build` and that it points to a valid MinusX web server (Typically localhost:3005, for development builds). Then run:

```sh
yarn test
```

## Test configs
Test configs can be edited at `src/configs.ts`

## See reports

To see test reports, run:

```sh
yarn report
```

## Run headless or production tests

To run additional tests, you can pass `HEADLESS=true` and `PROD=true` to run headless tests and tests against the production build respectively. For example:

```sh
HEADLESS=true PROD=true yarn test
```