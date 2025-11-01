FROM node:24-bullseye
RUN apt-get update && apt-get install -y bash curl ca-certificates wget
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
ENV PATH /app/node_modules/.bin:$PATH
COPY . .
RUN npx prisma generate
RUN rm -rf .next
RUN npm run build
EXPOSE 3001 5432 1883
CMD ["npm", "start"]