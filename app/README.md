## Commands

```bash
npm run dev
npm run start
npx prisma migrate dev --name init
docker ps -a
docker compose -p smoke up --build -d
docker logs smoke-app
docker stop smoke-app smoke-db
docker rm -f smoke-app smoke-db
docker exec -it smoke-app sh
```

```
npx prisma db pull
npx prisma generate

select * from pg_sequences
SELECT nextval('"Location_id_seq"');
```

[http://localhost:3001](http://localhost:3001)
