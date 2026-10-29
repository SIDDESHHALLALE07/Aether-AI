import sys, io, os
sys.path.insert(0, os.path.abspath('.'))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core.database import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.dataset import Dataset, DatasetVersion

db = SessionLocal()
print('=== ALL PROJECTS & DATASETS ===')
projects = db.query(Project).all()
for p in projects:
    u = db.query(User).filter(User.id == p.user_id).first()
    email = u.email if u else 'UNKNOWN'
    ds_list = db.query(Dataset).filter(Dataset.project_id == p.id).all()
    print(f'Project ID: {p.id} | Name: "{p.name}" | User: {email}')
    for d in ds_list:
        v_count = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == d.id).count()
        print(f'   -> Dataset ID: {d.id} | Filename: "{d.original_filename}" | Versions: {v_count}')
db.close()
