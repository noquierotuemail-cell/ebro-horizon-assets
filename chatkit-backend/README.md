# HABRO ChatKit backend

Backend independiente para **HABRO Assistant**, basado en la integración self-hosted de OpenAI ChatKit y Agents SDK.

## Seguridad

- `OPENAI_API_KEY` **nunca** debe subirse a GitHub ni incluirse en el JavaScript de la web.
- La landing de `habroremote.com` actúa como proxy `/chatkit`, por lo que la URL real del backend no se expone al frontend.
- El Worker genera una cookie anónima `HttpOnly` y transmite al backend un identificador de visitante. El store de esta beta separa los hilos por visitante.
- Los adjuntos están desactivados en v1.

## Variables del backend

Copia `.env.example` a `.env` únicamente en desarrollo:

```bash
OPENAI_API_KEY=...
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
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Comprobación:

```bash
curl http://localhost:8000/health
```

## Docker

```bash
docker build -t habro-chatkit .
docker run --rm -p 8080:8080 -e OPENAI_API_KEY="..." habro-chatkit
```

## Conexión con la landing

El Worker principal solo activa ChatKit cuando dispone de estas dos variables de entorno:

- `CHATKIT_BACKEND_URL`: URL **completa** del endpoint del backend, por ejemplo `https://chat.example.com/chatkit`.
- `CHATKIT_DOMAIN_KEY`: domain key de ChatKit registrado para `habroremote.com`.

Mientras falte cualquiera de las dos, la landing mantiene el botón de HABRO Assistant y muestra un estado de preparación, sin provocar errores en producción.

## Persistencia

`VisitorMemoryStore` es intencionadamente temporal para la primera beta: conserva conversaciones mientras vive el proceso, pero se reinicia con el backend. Antes de depender de historial permanente debe sustituirse por un Store persistente (por ejemplo D1, Durable Objects o una base de datos equivalente).

## Soporte humano

El agente debe escalar dudas específicas que no pueda resolver al grupo Ebro Tech Lab o al contacto de Telegram `@el_pedrjas`, sin inventar información sobre HABRO o EBRO.
