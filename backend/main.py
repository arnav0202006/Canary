from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import agents, versions, deployments, audit, api_usages, monitoring, execution, auth
from .routers.versions import versions_direct_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Canary", description="Version control and CI/CD for AI agents", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(versions.router)
app.include_router(versions_direct_router)
app.include_router(deployments.router)
app.include_router(audit.router)
app.include_router(api_usages.router)
app.include_router(monitoring.router)
app.include_router(execution.router)
app.include_router(auth.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "canary-backend"}
