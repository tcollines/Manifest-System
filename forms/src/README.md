# Manifest Forms — Frontend

This folder contains **all** frontend code specific to the **Manifest Forms** product.
It is completely isolated from the main Manifest Management System.

## Folder Structure

```
forms/
├── auth/           # FormsSignIn + FormsSignUp screens (orange-tinted login)
├── components/     # Shared UI components used across Manifest Forms
├── context/        # FormsAuthContext and any other Forms-specific React contexts
├── dashboard/      # Main Forms dashboard and its sub-pages
├── hooks/          # Custom React hooks for Forms
├── pages/          # Top-level page components (routed views)
└── services/       # API calls and Supabase queries specific to Forms
```

## Routing

All routes under `/forms/*` are handled by `FormsApp.tsx` which is mounted in `Root.tsx`.
Authentication is managed by `FormsAuthContext` (separate session from the main system).
