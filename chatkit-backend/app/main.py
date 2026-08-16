"""FastAPI entrypoint for the self-hosted HABRO ChatKit backend."""

from __future__ import annotations

import os
import re
import secrets

from chatkit.server import StreamingResult
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse

from .server import HabroChatServer

VISITOR_PATTERN = re.compile(r"^[A-Za-z0-9_-]{16,128}$")
BACKEND_TOKEN = os.getenv("HABRO_BACKEND_TOKEN", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "HABRO_ALLOWED_ORIGINS",
        "https://habroremote.com,http://localhost:8787,http://localhost:5173",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="HABRO ChatKit API", docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS", "GET"],
    allow_headers=[
        "content-type",
        "x-habro-visitor-id",
        "x-habro-locale",
        "x-habro-backend-token",
    ],
)

chatkit_server = HabroChatServer()


def runtime_ready() -> bool:
    return bool(BACKEND_TOKEN and OPENAI_API_KEY)


@app.get("/health")
async def health() -> JSONResponse:
    ready = runtime_ready()
    return JSONResponse(
        {"ok": ready, "service": "habro-chatkit"},
        status_code=200 if ready else 503,
        headers={"Cache-Control": "no-store"},
    )


@app.post("/chatkit")
async def chatkit_endpoint(request: Request) -> Response:
    if not runtime_ready():
        return JSONResponse(
            {"error": "service_not_configured", "message": "Chat service is not configured."},
            status_code=503,
            headers={"Cache-Control": "no-store"},
        )

    supplied_token = (request.headers.get("x-habro-backend-token") or "").strip()
    if not supplied_token or not secrets.compare_digest(supplied_token, BACKEND_TOKEN):
        return JSONResponse(
            {"error": "unauthorized", "message": "Unauthorized backend request."},
            status_code=401,
            headers={"Cache-Control": "no-store"},
        )

    visitor_id = (request.headers.get("x-habro-visitor-id") or "").strip()
    if not VISITOR_PATTERN.fullmatch(visitor_id):
        return JSONResponse(
            {"error": "invalid_visitor", "message": "Missing or invalid visitor context."},
            status_code=401,
            headers={"Cache-Control": "no-store"},
        )

    locale_header = (request.headers.get("x-habro-locale") or "es").lower()
    locale = "pt" if locale_header.startswith("pt") else "es"
    payload = await request.body()
    context = {
        "request": request,
        "visitor_id": visitor_id,
        "locale": locale,
    }
    result = await chatkit_server.process(payload, context)

    if isinstance(result, StreamingResult):
        return StreamingResponse(
            result,
            media_type="text/event-stream",
            headers={"Cache-Control": "no-store"},
        )
    if hasattr(result, "json"):
        return Response(
            content=result.json,
            media_type="application/json",
            headers={"Cache-Control": "no-store"},
        )
    return JSONResponse(result, headers={"Cache-Control": "no-store"})
