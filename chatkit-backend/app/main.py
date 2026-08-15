"""FastAPI entrypoint for the self-hosted HABRO ChatKit backend."""

from __future__ import annotations

import os
import re

from chatkit.server import StreamingResult
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse

from .server import HabroChatServer

VISITOR_PATTERN = re.compile(r"^[A-Za-z0-9_-]{16,128}$")
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
    allow_headers=["content-type", "x-habro-visitor-id", "x-habro-locale"],
)

chatkit_server = HabroChatServer()


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"ok": True, "service": "habro-chatkit"})


@app.post("/chatkit")
async def chatkit_endpoint(request: Request) -> Response:
    visitor_id = (request.headers.get("x-habro-visitor-id") or "").strip()
    if not VISITOR_PATTERN.fullmatch(visitor_id):
        return JSONResponse(
            {"error": "invalid_visitor", "message": "Missing or invalid visitor context."},
            status_code=401,
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
