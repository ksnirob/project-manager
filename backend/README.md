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

- `DATABASE_URL=mysql://DATABASE_USER:DATABASE_PASSWORD@localhost:3306/DATABASE_NAME`
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

## Production deployment commands

### Do not routinely run these commands

```bash
npx prisma migrate deploy
npx prisma db push
npx prisma generate
```

Run these commands after pushing backend changes:

```bash
source /home/footgxhh/nodevenv/project-manager-backend/22/bin/activate
cd /home/footgxhh/project-manager-backend
npm install --ignore-scripts
npx prisma generate
```

After the commands finish, restart the `api.ksnirob.com` Node.js application from cPanel.

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
