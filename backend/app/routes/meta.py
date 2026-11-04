from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.transaction import MerchantCategoryRead
from app.services.eligibility import CATEGORY_RULES

router = APIRouter(prefix="/api", tags=["meta"])


@router.get("/health", summary="API and database health check")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}


@router.get(
    "/merchant-categories",
    response_model=list[MerchantCategoryRead],
    summary="Merchant categories and their simulated HSA eligibility",
)
def merchant_categories() -> list[MerchantCategoryRead]:
    return [
        MerchantCategoryRead(
            value=category, label=rule.label, eligible=rule.eligible, description=rule.description
        )
        for category, rule in CATEGORY_RULES.items()
    ]
