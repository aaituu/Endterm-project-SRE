FROM node:20-alpine

WORKDIR /app
COPY backend/services/academic-service/package.json ./
RUN npm install --omit=dev
COPY backend/services/academic-service/src ./src
COPY backend/src ./backend/src
COPY backend/resources ./resources

ENV BACKEND_SRC_PATH=/app/backend/src
ENV NODE_ENV=production
EXPOSE 3004
CMD ["npm", "start"]
