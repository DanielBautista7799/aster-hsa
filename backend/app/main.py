"""FastAPI application: wires routers and maps domain errors to HTTP responses."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.config import ENABLE_CONCURRENCY_LAB
from app.errors import ConflictError, InvalidCursorError, NotFoundError
from app.routes import accounts, cards, deposits, lab, meta, purchases, transactions

app = FastAPI(
    title="Aster HSA API",
    version="1.0.0",
    # Served under /api so the same proxy rule (Vite in dev, nginx in Docker)
    # exposes the interactive docs next to the app.
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
    description=(
        "A local HSA account simulator. Demonstration only: no real money, cards, "
        "payments or tax advice. All amounts are integer cents."
    ),
)


@app.exception_handler(NotFoundError)
def handle_not_found(_request: Request, error: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(error)})


@app.exception_handler(ConflictError)
def handle_conflict(_request: Request, error: ConflictError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": str(error)})


@app.exception_handler(InvalidCursorError)
def handle_invalid_cursor(_request: Request, error: InvalidCursorError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(error)})


app.include_router(meta.router)
app.include_router(accounts.router)
app.include_router(deposits.router)
app.include_router(cards.router)
app.include_router(purchases.router)
app.include_router(transactions.router)
if ENABLE_CONCURRENCY_LAB:
    app.include_router(lab.router)
