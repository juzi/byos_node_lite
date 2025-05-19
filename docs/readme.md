# Image server for TRMNL built with Node.js, JSX and CSS

You can build a custom screen for [Redirect](https://help.usetrmnl.com/en/articles/11035846-redirect-plugin)
or [Alias](https://help.usetrmnl.com/en/articles/10701448-alias-plugin) plugins.

Goal of this repo: simple and easy to customize.

## Technologies used:

- [Satori](https://www.npmjs.com/package/satori) for rendering JSX to SVG
- [resvg-js](https://www.npmjs.com/package/@resvg/resvg-js) for rendering SVG to PNG
- [Express.js](https://expressjs.com) as API server
- [TSX](https://tsx.is) for supporting JSX/TSX files

## Quick Start

1. Press button `Use this template` on Github or clone this repository
2. Example of JSX code already in repo and you can change it
3. Create file .env.local based on .env.example
3. You can preview result locally `npm run watch`
5. After changes you should deploy your version of this repo to your server

## Endpoints of server
**Image** http://localhost:3000/image?secret_key=... <br>
-- can be used for preview and [Alias](https://help.usetrmnl.com/en/articles/10701448-alias-plugin) plugin

**API** http://localhost:3000/api?secret_key=... <br>
-- can be used for [Redirect](https://help.usetrmnl.com/en/articles/11035846-redirect-plugin) plugin


## JSX components

You can use regular JSX components (similar to React), but without hooks, as screen is rendering only once.<br>
Starting point is [App.tsx](../src/Template/App.tsx) <br>
It's easier to collect all variables and data [in one place](../src/Data/PrepareData.ts), before components. But you can
change to any structure that you prefer.

## Layout design limitations

Satori uses the same **CSS Flexbox** layout engine, bus it’s not a complete CSS standards implementation.<br>
However, it supports a subset of the spec that covers most
common [CSS features](https://github.com/vercel/satori?tab=readme-ov-file#css)

## Using fonts

To render screen you have to [provide a font file](../src/Utils/JSXtoPNG.ts). By default is
attached [Inter](../assets/fonts/Inter_18pt-Regular.ttf).

## Including images

You can include local images by using [LocalImage](../src/Template/LocalImage.tsx) component or specify public url to
somewhere.

## Your Server (Production)

To run your TRMNL server you need any form of server (VM, droplet, pod, instance) somewhere, for example AWS, Google
Cloud, Digital Ocean.

- it can be run via [Dockerfile](../Dockerfile) or command `npm run start`
- Better to pass ENV parameters from secure storage that your cloud provider has

## Troubleshooting

Check log of errors on device:

```
https://usetrmnl.com/dashboard > top right dropdown > gear icon > scroll down to "Logs"
```

Fetch Screen Content as your device (Developer edition):

```
curl https://usetrmnl.com/api/display --header "access-token:xxxxxx"
```
