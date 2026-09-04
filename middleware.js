// middleware.mjs - Kielsa CI
// Exige usuario/contraseña (HTTP Basic Auth) antes de servir cualquier archivo del sitio,
// incluido index.html y app.js. Así la app deja de ser públicamente accesible sin credencial.
//
// Configuración requerida en Vercel (Project Settings -> Environment Variables),
// para los entornos Production y Preview:
//   SITE_USER = usuario que compartirás con tu equipo
//   SITE_PASS = contraseña que compartirás con tu equipo
//
// Si esas variables no están configuradas, el middleware NO bloquea nada (para evitar
// que un olvido de configuración te deje fuera de tu propia app).

import { next } from '@vercel/functions';

export default function middleware(request) {
  const expectedUser = process.env.SITE_USER;
  const expectedPass = process.env.SITE_PASS;

  if (!expectedUser || !expectedPass) {
    return next();
  }

  const auth = request.headers.get('authorization');

  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      let decoded = '';
      try {
        decoded = atob(encoded);
      } catch (e) {
        decoded = '';
      }
      const idx = decoded.indexOf(':');
      const user = idx === -1 ? decoded : decoded.slice(0, idx);
      const pass = idx === -1 ? '' : decoded.slice(idx + 1);
      if (user === expectedUser && pass === expectedPass) {
        return next();
      }
    }
  }

  return new Response('Acceso restringido — Kielsa Farmacéutica CI', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Kielsa CI", charset="UTF-8"',
      'content-type': 'text/plain; charset=utf-8',
    },
  });
}
