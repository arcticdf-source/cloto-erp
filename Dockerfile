FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .

RUN mkdir -p /app/uploads/client-files && chown -R node:node /app

USER node

EXPOSE 8080

CMD ["npm", "run", "serve:auth"]