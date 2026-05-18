FROM node:20-alpine

WORKDIR /app
COPY backend/services/analytics-service/package.json ./
RUN npm install --omit=dev
COPY backend/services/analytics-service/src ./src
COPY backend/src ./backend/src
COPY backend/resources ./resources

ENV BACKEND_SRC_PATH=/app/backend/src
ENV NODE_ENV=production
EXPOSE 3007
CMD ["npm", "start"]
