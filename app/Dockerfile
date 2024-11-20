FROM node:23-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN echo "yes" | prisma migrate dev --name init
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start"]