# Pitahaya Vision Frontend

Frontend del sistema de diagnóstico inteligente de cultivos. Construido con React + Vite. Interfaz para registro, autenticación, recuperación de contraseña y dashboard principal.


## Requisitos

- Node.js 18+

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). El frontend espera un backend en `http://localhost:8000`.

## Tailwind CSS v4

El proyecto usa Tailwind CSS v4 con el plugin `@tailwindcss/vite`. Está listo para usarse con clases utilitarias en cualquier componente JSX. Ver `src/index.css` para la importación base.

## Build

```bash
npm run build
```

Genera los archivos estáticos en `dist/`.

## Rutas

| Ruta | Página |
|---|---|
| `/login` | Inicio de sesión |
| `/registro` | Registro de usuario |
| `/recuperar-cuenta` | Solicitar cambio de contraseña |
| `/recuperar-cuenta/confirmar` | Ingresar nueva contraseña |
| `/verificar-correo` | Verificación de email |
| `/` | Dashboard (requiere autenticación) |
