# HABRO ChatKit backend

Backend independiente para **HABRO Assistant**, basado en la integración self-hosted de OpenAI ChatKit y Agents SDK.

## Seguridad

- `OPENAI_API_KEY` **nunca** debe subirse a GitHub ni incluirse en el JavaScript de la web.
- `HABRO_BACKEND_TOKEN` protege el endpoint público del backend para que solo el Worker de HABRO pueda utilizarlo.
- La landing de `habroremote.com` actúa como proxy `/chatkit`, por lo que la URL real del backend no se expone al frontend.
- El Worker genera una cookie anónima `HttpOnly` y transmite al backend un identificador de visitante. El store de esta beta separa los hilos por visitante.
- Los adjuntos están desactivados en v1.

## Variables del backend

Copia `.env.example` a `.env` únicamente en desarrollo:

```bash
OPENAI_API_KEY=...
HABRO_BACKEND_TOKEN=un-secreto-largo-y-aleatorio
HABRO_CHAT_MODEL=gpt-4.1-mini
HABRO_ALLOWED_ORIGINS=https://habroremote.com,http://localhost:8787,http://localhost:5173
```

## Desarrollo local

Requiere Python 3.11 o superior.

```bash
cd chatkit-backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
export OPENAI_API_KEY="..."
export HABRO_BACKEND_TOKEN="un-secreto-largo-y-aleatorio"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Comprobación:

```bash
curl http://localhost:8000/health
```

## Docker

```bash
docker build -t habro-chatkit .
docker run --rm -p 8080:8080 \
  -e OPENAI_API_KEY="..." \
  -e HABRO_BACKEND_TOKEN="un-secreto-largo-y-aleatorio" \
  habro-chatkit
```

## Despliegue en Koyeb

El repositorio es un monorepo. Al crear el Web Service en Koyeb usa esta configuración:

- **Source:** GitHub, repositorio `noquierotuemail-cell/ebro-horizon-assets`, rama `main`.
- **Builder:** Dockerfile.
- **Work directory:** `chatkit-backend`.
- **Dockerfile:** `Dockerfile`.
- **Port:** `8080`, protocolo HTTP, ruta `/`.
- **Health check:** HTTP `GET /health`.
- **Region:** Frankfurt si está disponible en el plan elegido.

Variables/secretos en Koyeb:

- `OPENAI_API_KEY`: Secret.
- `HABRO_BACKEND_TOKEN`: Secret. Genera un valor largo y aleatorio; debe coincidir con `CHATKIT_BACKEND_TOKEN` en Cloudflare.
- `HABRO_CHAT_MODEL`: `gpt-4.1-mini`.
- `HABRO_ALLOWED_ORIGINS`: `https://habroremote.com`.

Una vez desplegado, la URL que necesita HABRO es el endpoint completo, por ejemplo:

```text
https://<servicio>.koyeb.app/chatkit
```

La raíz `/health` devuelve `200` únicamente cuando están presentes `OPENAI_API_KEY` y `HABRO_BACKEND_TOKEN`. Esto evita considerar saludable un despliegue incompleto.

## Conexión con la landing

El Worker principal solo activa ChatKit cuando dispone de estas tres variables/secretos:

- `CHATKIT_BACKEND_URL`: URL **completa** del endpoint del backend, por ejemplo `https://<servicio>.koyeb.app/chatkit`.
- `CHATKIT_BACKEND_TOKEN`: el mismo secreto definido como `HABRO_BACKEND_TOKEN` en Koyeb.
- `CHATKIT_DOMAIN_KEY`: domain key de ChatKit registrado para `habroremote.com`.

Mientras falte cualquiera de las tres, la landing mantiene el botón de HABRO Assistant y muestra un estado de preparación, sin provocar errores en producción.

## Persistencia

`VisitorMemoryStore` es intencionadamente temporal para la primera beta: conserva conversaciones mientras vive el proceso, pero se reinicia con el backend. Antes de depender de historial permanente debe sustituirse por un Store persistente (por ejemplo D1, Durable Objects o una base de datos equivalente).

## Soporte humano

El agente debe escalar dudas específicas que no pueda resolver al grupo Ebro Tech Lab o al contacto de Telegram `@el_pedrjas`, sin inventar información sobre HABRO o EBRO.
