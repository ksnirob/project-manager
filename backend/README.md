# Backend (cPanel)

This folder is a standalone backend API for the project manager app.

## What to upload to cPanel

Upload the entire `backend` folder contents:

- `server.js`
- `package.json`
- `.env` (create this on server from `.env.example`)
- `prisma/schema.prisma`
- `src/**`

Do not upload `node_modules` from local machine.

## cPanel environment variables

Set these in cPanel Node.js app:

- `DATABASE_URL=mysql://footgxhh_project-manager:Ml3p%23TAN%2Ca%2Cw@162.0.215.44:3306/footgxhh_project-manager`
- `FRONTEND_URL=https://your-vercel-app.vercel.app`
- `NODE_ENV=production`

If DB connection fails with shared IP, try `localhost` as DB host.

## Commands on cPanel terminal (inside backend folder)

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm start
```

If you imported SQL manually and do not have migration files:

```bash
npx prisma db pull
npx prisma generate
npm start
```

## API endpoints

- `GET /health`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET/POST/PATCH/DELETE /clients`
- `GET/POST/PATCH/DELETE /projects`
- `GET/POST/PATCH/DELETE /tasks`
- `PATCH /tasks/:id/status`
- `GET/POST/PATCH/DELETE /invoices`
- `PATCH /invoices/:id/status`
- `GET /stats`
