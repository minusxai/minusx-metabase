<div align="center" style="text-align: center;">
<!-- <a href="https://minusx.ai"><img width="600" src="https://raw.githubusercontent.com/minusxai/.github/master/profile/logo_big.png"></a> -->
<h1>MinusX</h1>
<p>
  <b>MinusX is an AI Data Scientist that works on tools you use and love</b>
  <br>
  Currently, it can operate <a href="https://minusx.ai/tools/jupyter">Jupyter</a> and <a href="https://minusx.ai/tools/metabase">Metabase</a>, with more tools on the way.
</p>
<h3>
  <a href="https://minusx.ai/chrome-extension">Install Extension</a>
  <span> · </span>
  <a href="https://minusx.ai/playground">Playground</a>
  <span> · </span>
  <a href="https://minusx.ai/blog">Blog</a>
  <span> · </span>
  <a href="https://github.com/minusxai/minusx/blob/main/CONTRIBUTING.md">Contribute</a>
  <span> · </span>
  <a href="https://minusx.ai/discord">Community</a>
</h3>

<div align="center">
<a href="https://www.youtube.com/watch?v=lcO9XGofW40"><img width="650" src="https://raw.githubusercontent.com/minusxai/.github/master/assets/thumbnail.png"></a>
</div>
</div>

## How does MinusX work?
MinusX adds a side-chat to your app, and when given an instruction, it operates the app - via clicking and typing - to analyze data and answer queries. It is deeply integrated into the app you use it on. It uses a simplified context of the app, predefined actions, routines and goals to decide the next action. With MinusX, you can broadly do 3 types of tasks:
- Explore data: Ask for hypotheses and make MinusX work through them.
- Modify content: Cmd+k / Ctrl+k to invoke MinusX and extend existing jupyter notebooks / metabase queries
- Select & Ask: Select a region (screenshot like action) and ask questions


<div>
  <br>
<table>
  <tr>
    <td><a href="https://minusx.ai/#feature-0" style="display:flex"><img src="https://raw.githubusercontent.com/minusxai/.github/master/assets/gifgif_1.gif"></a></td>
    <td><a href="https://minusx.ai/#feature-1"><img src="https://raw.githubusercontent.com/minusxai/.github/master/assets/gifgif_2.gif"></a></td>
    <td><a href="https://minusx.ai/#feature-2"><img src="https://raw.githubusercontent.com/minusxai/.github/master/assets/gifgif_3.gif"></a></td>
  </tr>
</table>
</div>


  
## Supported Analytics Tools
<a href="https://minusx.ai/tools/jupyter"><img src="https://minusx.ai/_next/static/media/jupyter.0fedaa2d.svg" width="80" height="80" alt=""/></a>
<a href="https://minusx.ai/tools/metabase"><img src="https://minusx.ai/_next/static/media/metabase.e2bebbef.svg" width="80" height="80" alt=""/></a>

---

## Using MinusX
- Install the [Chrome extension](https://minusx.ai/chrome-extension)
- Take MinusX for a spin in our [playground](https://minusx.ai/playground), or in your own Jupyter/Metabase instances!
- Don't see your favorite tool in our list? Here’s a [google form](https://minusx.ai/tool-request) you can fill out so that we can notify you when we support your tool!

---

## Developing MinusX Locally

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
