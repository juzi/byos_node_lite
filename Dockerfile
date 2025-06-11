FROM node:alpine
WORKDIR /app
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
# against cache of package.json
COPY package.json ./
RUN npm i
COPY . ./
CMD ["node", "--import", "tsx", "src/Main.ts"]