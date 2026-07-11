FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 7860

VOLUME /app/.baileys_auth

CMD ["node", "server.js"]
