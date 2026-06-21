FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates ghostscript

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
