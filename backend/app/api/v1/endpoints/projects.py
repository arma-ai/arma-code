"""
Projects API endpoints

Manage user projects and their materials.
"""
from uuid import uuid4, UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.dependencies import get_db, get_current_user
from app.infrastructure.database.models.project import Project
from app.infrastructure.database.models.material import Material, ProcessingStatus
from app.infrastructure.database.models.user import User

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_project(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new project."""
    project = Project(
        id=uuid4(),
        owner_id=current_user.id,
        name=name,  # This maps to 'title' column in DB
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    return {
        "id": project.id,
        "name": project.name,
        "created_at": project.created_at,
    }


@router.get("")
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all projects for the current user with material counts."""
    result = await db.execute(
        select(Project)
        .where(Project.owner_id == current_user.id)
        .order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()

    # Get material counts for each project
    projects_with_counts = []
    for project in projects:
        material_count = await db.execute(
            select(func.count(Material.id))
            .where(Material.project_id == project.id, Material.deleted_at.is_(None))
        )
        count = material_count.scalar()
        
        projects_with_counts.append({
            "id": project.id,
            "name": project.name,
            "created_at": project.created_at,
            "material_count": count or 0,
        })

    return projects_with_counts


@router.get("/{project_id}")
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific project with materials."""
    result = await db.execute(
        select(Project)
        .where(
            Project.id == project_id,
            Project.owner_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Get materials for this project
    materials_result = await db.execute(
        select(Material)
        .where(
            Material.project_id == project_id,
            Material.deleted_at.is_(None),
        )
        .order_by(Material.created_at.asc())
    )
    materials = materials_result.scalars().all()
    
    return {
        "id": project.id,
        "name": project.name,
        "created_at": project.created_at,
        "materials": [
            {
                "id": m.id,
                "title": m.title,
                "type": m.type,
                "processing_status": m.processing_status,
                "processing_progress": m.processing_progress,
                "created_at": m.created_at,
            }
            for m in materials
        ],
    }


@router.delete("/{project_id}")
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a project and all its materials."""
    result = await db.execute(
        select(Project)
        .where(
            Project.id == project_id,
            Project.owner_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Delete project (materials will be deleted via CASCADE)
    await db.delete(project)
    await db.commit()
    
    return {"message": "Project deleted successfully"}
