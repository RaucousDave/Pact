# FastAPI Server

A modern FastAPI boilerplate project managed with `uv`.

## Features

- **FastAPI**: Modern, fast web framework for building APIs with Python.
- **uv**: Fast Python package installer and dependency resolver.
- **Pydantic v2 & Pydantic Settings**: Data validation and settings management using environment variables.
- **Structured Routers**: Modular API v1 router organization with endpoint submodules.
- **CORS Configured**: Ready to connect with frontend applications.

## Project Structure

```
server/
├── app/
│   ├── api/
│   │   ├── router.py
│   │   └── v1/
│   │       ├── router.py
│   │       └── endpoints/
│   │           ├── health.py
│   │           └── items.py
│   ├── core/
│   │   └── config.py
│   ├── schemas/
│   │   ├── health.py
│   │   └── item.py
│   └── main.py
├── .env.example
├── pyproject.toml
└── README.md
```

## Getting Started

### 1. Install Dependencies

Sync dependencies with `uv`:

```bash
uv sync
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Set `SECRET_KEY` to a unique random value and `USDC_ISSUER` to the public key
of the testnet account that issues USDC. The issuer account and asset must exist
before creator registration can establish a trustline. Never put the issuer's
secret key in this application configuration.

### Creator account setup

The auth endpoints are available under `/api/v1/auth`. Registration funds a
testnet account, establishes its USDC trustline, and stores the generated
wallet secret in the database; the secret is not returned by the API or logged.
Apply `migrations/001_creator_unique_constraints.sql` to the PostgreSQL
database once before using registration so concurrent requests cannot create
duplicate email addresses or handles.

Apply `migrations/002_creator_pages.sql` to add JSONB-backed creator pages.
Creators can read and replace their page at `/api/v1/users/me/page`; public
pages are available at `/api/v1/users/{handle}/page`. Upload page images at
`/api/v1/users/me/page/assets`; the endpoint stores them in the public
`page-assets` bucket, and page image fields only accept URLs from that bucket.

This generated-key flow is for testnet demos only. A production wallet flow
should use passkey wallets rather than storing creator secret keys in the
application database.

### 3. Run Development Server

```bash
uv run uvicorn app.main:app --reload
```

### 4. Interactive API Documentation

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
