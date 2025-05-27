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
4. Change [App.tsx](../src/Template/App.tsx) and [PrepareData.ts](../src/Data/PrepareData.ts) to something that you want to display

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
Starting point is [App.tsx](../src/Template/App.tsx) <br>
It's easier to collect all variables and data [in one place](../src/Data/PrepareData.ts), before components. But you can
change to any structure that you prefer.

## Layout design limitations
- Satori supports **CSS Flexbox** layout engine only
- [it’s not a complete CSS standards implementation](https://github.com/vercel/satori?tab=readme-ov-file#css) 
- Each element (like `<div>`) with a few child nodes should have explicit "display: flex"

## Using fonts

To render screen you have to [provide a font file](../src/Utils/JSXtoPNG.ts). One is [attached by default](../assets/fonts/).

## Including images

You can include local images by using [LocalImage](../src/Template/LocalImage.tsx) component or specify public url to
somewhere.

## Your Server

To run your TRMNL server you need any form of server (VM, droplet, pod, instance) somewhere, for example AWS, Google
Cloud, Digital Ocean.

- it can be run via [Dockerfile](../Dockerfile) or command `npm run start`
- Better to pass ENV parameters from secure storage that your cloud provider has

Docker example:
```shell
docker run --name trmnl-container -p 3000:3000 \
  -e SECRET_KEY=PUT_YOUR_UNIQUE_SECRET_KEY_HERE \
  -e PUBLIC_URL_ORIGIN=http://localhost:3000 \
  trmnl
```

## Troubleshooting

Check log of errors on device:

```
https://usetrmnl.com/dashboard > top right dropdown > gear icon > scroll down to "Logs"
```

Fetch Screen Content as your device (Developer edition):

```
curl https://usetrmnl.com/api/display --header "access-token:xxxxxx"
```

## Bring your own server (BYOS)
This repo implements [basic BYOS server](https://docs.usetrmnl.com/go/diy/byos) for one device.<br>
You can setup it with those steps:
1. Put your device's MAC value to ENV (can be .env.local). If you don't know it: just put anything and check server logs.
2. Hold round button on your device for more than5 seconds - you should see connection instructions on screen.
3. Connect your phone to wifi called `TRMNL`
4. On setup choose `Custom server` (see screenshot below)
5. Check logs of server
6. If it still `wrong access-token value from device` - you may need to choose `Soft reset` on setup stage

<img src="BYOS_setup.png" alt="BYOS setup" height="400">


---
Goal of this repo: simple and easy to customize.
