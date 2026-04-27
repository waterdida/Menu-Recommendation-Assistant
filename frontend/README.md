# Frontend

This is the Vite + React frontend for Menu Recommendation Assistant.

During development, Vite proxies `/api` requests to the backend at `http://127.0.0.1:8000`.

## Development

Start the backend from the project root:

```powershell
python web_server.py
```

Start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

## Build

```powershell
cd frontend
npm install
npm run build
```

After building, start `web_server.py` from the project root and open `http://127.0.0.1:8000`. The backend serves `frontend/dist` automatically when it exists.

## Source Layout

See `src/README.md` for the frontend component, hook, and utility structure.
