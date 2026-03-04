# SpareRental Backend

This is a minimal Node.js + Express backend for the SpareRental demo.

## Setup

1. Make sure you have [Node.js](https://nodejs.org/) installed (v16+ recommended).
2. Install dependencies:
   ```bash
   cd Backend
   npm install
   ```
3. Copy `.env.example` to `.env` and adjust values if needed (MongoDB URI, JWT secret, port).
   ```bash
   cp .env.example .env
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
- `POST /api/auth/login` - login with `email` and `password`; returns `{ token, user }`.

### Products
- `GET /api/products` - public list of products.
- `POST /api/products` - **admin only** - add a product.
- `PUT /api/products/:id` - **admin only** - update product.
- `DELETE /api/products/:id` - **admin only** - delete product.

### Users (admin)
- `GET /api/users` - get all users.
- `DELETE /api/users/:id` - delete a user.

## Testing with Postman

1. Create a new collection.
2. Register a user via `POST http://localhost:5000/api/auth/register` with JSON body.
3. Login via `POST /api/auth/login`, copy the returned token.
4. For protected routes (products/users), add header `Authorization: Bearer <token>`.

A default admin user (`admin@example.com` / `admin123`) is created automatically on first run.

## Frontend Integration

The frontend files in `Frontend/` now use these API endpoints instead of localStorage. Serve them using any static server (e.g., VS Code Live Server extension) and update API base URL if needed.
