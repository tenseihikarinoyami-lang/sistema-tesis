from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import random
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

# Initialize Firebase Admin
try:
    firebase_admin.get_app()
except ValueError:
    firebase_admin.initialize_app()

db = firebase_admin.firestore.client()

app = FastAPI(title="ThesisForge AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from services.ai_generator import ThesisForgePipeline
from fastapi import BackgroundTasks

class ThesisRequest(BaseModel):
    university: str
    faculty: str
    program: str
    level: str
    author: str
    director: str
    norm: str
    chapters: List[str]
    title: str
    description: str
    keywords: str
    language: str
    aiModel: str
    tone: str

@app.get("/")
async def root():
    return {"message": "OBELISCO Academic Intelligence System - Backend Active"}

@app.post("/api/thesis/generate")
async def generate_thesis(request: ThesisRequest, background_tasks: BackgroundTasks):
    project_id = f"proj_{random.randint(10000, 99999)}"
    created_at = datetime.now().isoformat()
    
    # Save project metadata to Firestore
    project_data = {
        "id": project_id,
        "title": request.title,
        "university": request.university,
        "author": request.author,
        "status": "processing",
        "progress": 5,
        "current_phase": "Protocolo SIGA Iniciado",
        "created_at": created_at
    }
    db.collection("projects").document(project_id).set(project_data)

    pipeline = ThesisForgePipeline(provider=request.aiModel)
    # Run pipeline in background
    background_tasks.add_task(pipeline.run, request.dict(), project_id)
    
    return {
        "status": "processing",
        "project_id": project_id,
        "message": "Protocolo SIGA iniciado."
    }

@app.get("/api/thesis/status/{project_id}")
async def get_status(project_id: str):
    doc = db.collection("projects").document(project_id).get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    return doc.to_dict()

@app.get("/api/thesis/list")
async def list_projects():
    docs = db.collection("projects").order_by("created_at", direction=firebase_admin.firestore.Query.DESCENDING).stream()
    return [doc.to_dict() for doc in docs]

from fastapi.responses import FileResponse
from docx import Document
from docx.shared import Cm, Pt
from docx.enum.text import WD_LINE_SPACING
import io
import os

@app.get("/api/thesis/download/{project_id}")
async def download_thesis(project_id: str, background_tasks: BackgroundTasks):
    doc = db.collection("projects").document(project_id).get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    project = doc.to_dict()
    content = project.get('content')
            
    # Create DOCX
    doc = Document()
    
    # Apply APA 7 formatting to the document
    for section in doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(2.54)
        section.right_margin = Cm(2.54)
        
    # Normal Style (Paragraphs)
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(12)
    style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    
    # Heading 1 Style
    h1_style = doc.styles['Heading 1']
    h1_style.font.name = 'Times New Roman'
    h1_style.font.size = Pt(12)
    h1_style.font.bold = True
    h1_style.paragraph_format.line_spacing_rule = WD_LINE_SPACING.DOUBLE
    
    doc.add_heading(project['title'], 0)
    doc.add_paragraph(f"Universidad: {project['university']}")
    doc.add_paragraph(f"Autor: {project['author']}")
    doc.add_paragraph(f"ID del Proyecto: {project['id']}")
    doc.add_page_break()
    
    if isinstance(content, dict):
        for section, text in content.items():
            doc.add_heading(section, level=1)
            doc.add_paragraph(text)
            doc.add_page_break()
    else:
        doc.add_paragraph(str(content))
        
    file_path = f"temp_{project_id}.docx"
    doc.save(file_path)
    
    background_tasks.add_task(os.remove, file_path)
    
    return FileResponse(
        path=file_path,
        filename=f"Tesis_{project_id}.docx",
        media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )

@app.delete("/api/thesis/delete/{project_id}")
async def delete_thesis(project_id: str):
    db.collection("projects").document(project_id).delete()
    return {"message": "Proyecto eliminado exitosamente"}

# --- Admin Endpoints ---

class UserCreateRequest(BaseModel):
    email: str
    password: str
    displayName: str
    role: str = "researcher"

@app.post("/api/admin/users/create")
async def create_user(request: UserCreateRequest):
    try:
        # Create user in Firebase Auth
        user_record = firebase_auth.create_user(
            email=request.email,
            password=request.password,
            display_name=request.displayName
        )
        
        # Set custom claims for role
        firebase_auth.set_custom_user_claims(user_record.uid, {request.role: True})
        
        return {
            "uid": user_record.uid,
            "message": "Usuario creado exitosamente en Auth"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class UserStatusRequest(BaseModel):
    uid: str
    status: str # 'active' or 'disabled'

@app.post("/api/admin/users/toggle-status")
async def toggle_user_status(request: UserStatusRequest):
    try:
        disabled = True if request.status == 'disabled' else False
        firebase_auth.update_user(request.uid, disabled=disabled)
        return {"message": f"Usuario {'inhabilitado' if disabled else 'habilitado'} en Auth"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/admin/users/delete/{uid}")
async def delete_user(uid: str):
    try:
        firebase_auth.delete_user(uid)
        return {"message": "Usuario eliminado de Auth"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/admin/users/update-role")
async def update_user_role(request: UserCreateRequest): # Reuse model but only email/role matter
    try:
        # Get user by email to find UID
        user = firebase_auth.get_user_by_email(request.email)
        # Set custom claims
        firebase_auth.set_custom_user_claims(user.uid, {request.role: True})
        return {"message": f"Rol actualizado a {request.role} en Auth"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
