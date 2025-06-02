# Image server for TRMNL built with Node.js, JSX and CSS
Design custom layout, content, retrieve secure data and generate image for your TRMNL screen.
You can use it via [Redirect](https://help.usetrmnl.com/en/articles/11035846-redirect-plugin)
or [Alias](https://help.usetrmnl.com/en/articles/10701448-alias-plugin) plugins, or run it as own [BYOS](#bring-your-own-server-byos).

Goal: simple and easy to customize starter for people who are already familiar with the JavaScript and CSS ecosystem.

<img src="preview.png" alt="preview">

## Quick Start

1. Press button `Use this template` on Github, or clone this repository
2. Copy .env.local to .env.example and change values to yours
3. Run `npm run watch` for local preview

Or run via Docker:
```shell
docker build -t trmnl . && docker run --env-file .env.local -p 3000:3000 trmnl
```

After run, you can change [App.tsx](../src/Template/JSX/App.tsx) and [PrepareData.ts](../src/Data/PrepareData.ts) to something that you want to display.

Later, to display screen on device you would need to [deploy](#your-server), provide [endpoints](#endpoints-for-plugins) in plugin settings, or setup your device to [BYOS](#bring-your-own-server-byos).

--------

## Technologies used:

- [Satori](https://www.npmjs.com/package/satori) for rendering JSX to SVG
- [resvg-js](https://www.npmjs.com/package/@resvg/resvg-js) for rendering SVG to PNG
- [Express.js](https://expressjs.com) as API server
- [TSX](https://tsx.is) for supporting JSX/TSX files

## Endpoints for plugins

**Image** https://yourserver.com/image?secret_key=... <br>
↑ can be used for preview and [Alias](https://help.usetrmnl.com/en/articles/10701448-alias-plugin) plugin

**JSON** https://yourserver.com/plugin/redirect?secret_key=... <br>
↑ can be used for [Redirect](https://help.usetrmnl.com/en/articles/11035846-redirect-plugin) plugin

## JSX components

You can use regular JSX components (similar to React), but without hooks, as screen is rendering only once.<br>
Starting point is [App.tsx](../src/Template/JSX/App.tsx) <br>
It's easier to collect all variables and data [in one place](../src/Data/PrepareData.ts), before components. But you can
change to any structure that you prefer.

## Layout design limitations
- Satori supports **CSS Flexbox** layout engine only
- [it’s not a complete CSS standards implementation](https://github.com/vercel/satori?tab=readme-ov-file#css) 
- Each element (like `<div>`) with a few child nodes should have explicit "display: flex"

## Using fonts

To render screen you have to [provide a font file](../src/Screen/JSXtoPNG.ts). One is [attached by default](../assets/fonts/).

## Including images

You can include local images by using [LocalImage](../src/Template/JSX/LocalImage.tsx) component or specify public url to
somewhere.

## Your Server

To run your TRMNL server you need any form of server (VM, droplet, pod, instance) somewhere, for example AWS, Google
Cloud, Digital Ocean.

- it can be run via [Dockerfile](../Dockerfile) or command `npm run start`
- Better to pass ENV parameters from secure storage that your cloud provider has

## Bring your own server (BYOS)
You can skip using plugins and connect your device to your server directly by using [BYOS](https://docs.usetrmnl.com/go/diy/byos) mode. After changing configuration to BYOS your device will stop doing API requests to [usetrmnl.com](https://usetrmnl.com) servers. You can even close it in private network for data security.

This repo implements basic BYOS server for one device.<br>

You can enable it with those steps:
1. Set `BYOS_ENABLED = true` in [Config](../src/Config.ts)
2. Put your device's MAC value to ENV key BYOS_DEVICE_MAC (it can be via .env.local). If you don't know it - you can do this step later.
3. Generate or use usetrmnl.com access token in ENV key BYOS_DEVICE_ACCESS_TOKEN 
4. Hold round button on your device for more than 5 seconds - you should see connection instructions on screen.
5. Connect your phone to wifi called `TRMNL`
6. On setup choose `Custom server` (see screenshot below) and provide address of your server. In case of local computer in same WiFi network it would be something like http://192.168.0.26:3000

<img src="BYOS_setup.png" alt="BYOS setup" height="400">

Troubleshooting:
- To find out MAC address for step 1 you can check logs of server: it will be attempts to connect
- If you see error `wrong access-token value from device` - you may need to click button `Soft reset` on device setup stage

## BYOS Proxy
You can use both own server with own screen and some plugins from usetrmnl.com (aka core) by using Proxy mode. In this mode you will see your screen, one of screens from core after, and etc, one by one.

You can enable it with those steps:
1. Set `BYOS_PROXY = true` in [Config](../src/Config.ts)
2. Repeat setup process for `BYOS` with doing `soft reset`
3. Check `access-token` received from usetrmnl.com and change ENV key BYOS_DEVICE_ACCESS_TOKEN to it

---
Goal of this repo: simple and easy to customize.
