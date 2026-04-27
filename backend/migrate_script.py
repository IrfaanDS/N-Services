import re

with open('d:/N-Services/backend/app/api/routes/shopify.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('from config import', 'from app.services.shopify.config import')
content = content.replace('from memory_manager import', 'from app.services.shopify.memory_manager import')
content = content.replace('from store_manager import', 'from app.services.shopify.store_manager import')
content = content.replace('from rag_engine import', 'from app.services.shopify.rag_engine import')
content = content.replace('from onboarding_service import', 'from app.services.shopify.onboarding_service import')
content = content.replace('from leads_router import router as leads_router', 'from app.api.routes.shopify_leads import router as leads_router')

content = content.replace('app = FastAPI(', 'from fastapi import APIRouter\nrouter = APIRouter(\n')
content = content.replace('@app.', '@router.')
content = content.replace('app.include_router', 'router.include_router')
content = content.replace('app.exception_handler', 'router.exception_handler') # wait, APIRouter doesn't have exception_handler. I'll remove it.
content = re.sub(r'@router\.exception_handler.*?return JSONResponse.*?\n\s*\n', '', content, flags=re.DOTALL)
content = re.sub(r'if __name__ == "__main__":.*?reload=True\)', '', content, flags=re.DOTALL)

with open('d:/N-Services/backend/app/api/routes/shopify.py', 'w', encoding='utf-8') as f:
    f.write(content)

with open('d:/N-Services/backend/app/api/routes/shopify_leads.py', 'r', encoding='utf-8') as f:
    leads_content = f.read()

leads_content = leads_content.replace('from config import', 'from app.services.shopify.config import')
leads_content = leads_content.replace('from onboarding_service import', 'from app.services.shopify.onboarding_service import')

with open('d:/N-Services/backend/app/api/routes/shopify_leads.py', 'w', encoding='utf-8') as f:
    f.write(leads_content)
