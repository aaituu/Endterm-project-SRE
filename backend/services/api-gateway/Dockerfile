FROM node:20-alpine

WORKDIR /app
COPY backend/services/api-gateway/package.json ./
RUN npm install --omit=dev
COPY backend/services/api-gateway/src ./src

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
