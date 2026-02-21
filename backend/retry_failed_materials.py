#!/usr/bin/env python3
"""Retry failed materials"""
from app.infrastructure.queue.tasks import process_material_task
import psycopg2

# Get queued materials
conn = psycopg2.connect(
    host="localhost",
    user="eduplatform",
    password="dev123",
    database="eduplatform_dev"
)
cur = conn.cursor()
cur.execute("SELECT id, type, file_path, source FROM materials WHERE processing_status = 'QUEUED' LIMIT 5")
materials = cur.fetchall()
cur.close()
conn.close()

print(f"Found {len(materials)} queued materials")

for mat_id, mat_type, file_path, source in materials:
    print(f"Queuing task for {mat_id} ({mat_type})")
    task_kwargs = {
        "material_id": str(mat_id),
        "material_type": mat_type,
    }
    if mat_type.lower() == "pdf":
        task_kwargs["file_path"] = file_path
    elif mat_type.lower() == "youtube":
        task_kwargs["source"] = source

    task = process_material_task.apply_async(kwargs=task_kwargs)
    print(f"  Task ID: {task.id}")

print("Done!")
