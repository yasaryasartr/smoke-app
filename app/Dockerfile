FROM node:23-bullseye
RUN apt-get update && apt-get install -y bash curl ca-certificates wget
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
ENV PATH /app/node_modules/.bin:$PATH
COPY . .
RUN npx prisma generate
RUN npm run build
# EXPOSE 3001 8080 5432
EXPOSE 3001 5432
CMD ["npm", "run", "start"]