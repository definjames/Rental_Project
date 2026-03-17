# SpareRental Backend

This is a minimal Node.js + Express backend for the SpareRental demo.

## Setup

1. Make sure you have [Node.js](https://nodejs.org/) installed (v16+ recommended).
2. Install dependencies:
   ```bash
   cd Backend
   npm install
   ```
3. Create a `Backend/.env` (MongoDB URI, JWT secret, port). Example:
   ```bash
   MONGODB_URI=mongodb://localhost:27017/sparerental
   JWT_SECRET=replace_me
   PORT=5000
   ```
   You can run a local MongoDB instance (e.g. via Docker or install) or use MongoDB Atlas.

4. Start the server:
   ```bash
   npm run dev      # requires nodemon, defined in package.json
   # or
   npm start
   ```

   The API will be accessible at `http://localhost:5000` by default.

## API Endpoints

### Authentication
- `POST /api/auth/register` - register new user. Request body fields: `email`, `password`, `name`, `userid` plus optional extra profile fields (`address`, `country`, `zip`, etc.).
- `POST /api/auth/login` - login with `email` and `password`; sets an `httpOnly` cookie and returns `{ token, user }`.
- `GET /api/auth/me` - get current user (requires login).
- `POST /api/auth/logout` - clear auth cookie.

### Products
- `GET /api/products` - public list of products.
- `POST /api/products` - **admin only** - add a product.
- `PUT /api/products/:id` - **admin only** - update product.
- `DELETE /api/products/:id` - **admin only** - delete product.

### Admin
- `GET /api/admin/users` - get all users.
- `DELETE /api/admin/users/:id` - delete a user.

## Testing with Postman

1. Create a new collection.
2. Register a user via `POST http://localhost:5000/api/auth/register` with JSON body.
3. Login via `POST /api/auth/login`.
4. For protected routes (products/admin), either use the cookie set by login or add header `Authorization: Bearer <token>`.

A default admin user (`admin@example.com` / `admin123`) is created automatically on first run.

## Frontend Integration

The frontend files in `Frontend/` call the API endpoints and use the `httpOnly` auth cookie (no `localStorage`). For best results, open the UI from the backend at `http://localhost:5000/` so it’s same-origin with the API.
