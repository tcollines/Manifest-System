# Manifest Forms — Backend

This folder contains **all** backend code specific to the **Manifest Forms** product.
It is mounted under the `/forms` API prefix and is completely isolated from the
main Manifest Management System routes.

## Folder Structure

```
forms/
├── controllers/    # Request handlers (thin layer — call services, return responses)
├── middleware/     # Forms-specific middleware (auth guards, validators)
├── routes/         # Express router definitions for /forms/* endpoints
├── services/       # Business logic for forms operations
└── types/          # TypeScript interfaces and types for the Forms domain
```

## API Base Path

All routes are prefixed with `/forms` and registered in `src/server.ts`.

### Planned Endpoints
| Method | Path                      | Description                   |
|--------|---------------------------|-------------------------------|
| POST   | /forms/auth/signup        | Register a new Forms user     |
| POST   | /forms/auth/signin        | Sign in a Forms user          |
| GET    | /forms                    | List all forms for a user     |
| POST   | /forms                    | Create a new form             |
| GET    | /forms/:id                | Get a single form             |
| PUT    | /forms/:id                | Update a form                 |
| DELETE | /forms/:id                | Delete a form                 |
| GET    | /forms/:id/responses      | Get all responses for a form  |
| POST   | /forms/:id/responses      | Submit a response to a form   |
