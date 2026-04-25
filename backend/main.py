from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from .database import engine, Base
from .routers import agents, versions, deployments, audit

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Canary", description="Version control and CI/CD for AI agents", version="0.1.0")

app.include_router(agents.router)
app.include_router(versions.router)
app.include_router(deployments.router)
app.include_router(audit.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "canary-backend"}
