# NEO_GEST

Sistema NeoGest para gestion y venta de muebles.

## Estructura principal

- `3_desarrollo/backend`: API FastAPI conectada a MySQL.
- `3_desarrollo/frontend`: aplicacion React/Vite.
- `3_desarrollo/neogest.sql`: script principal de base de datos.
- `4_pruebas/pruebas`: scripts de verificacion automatizada.
- `MANUAL_ESTADO_ACTUAL.md`: guia funcional y tecnica del estado vigente.

## Ejecucion local

Backend:

```powershell
cd 3_desarrollo\backend
py -m uvicorn app.main:app --reload
```

Frontend:

```powershell
cd 3_desarrollo\frontend
npm run dev
```

Validacion frontend:

```powershell
cd 3_desarrollo\frontend
npm run lint
npm run build
```
