import sys, io, os
import pandas as pd
sys.path.insert(0, os.path.abspath('.'))
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.core.database import SessionLocal
from app.models.user import User
from app.models.project import Project
from app.models.dataset import Dataset, DatasetVersion
from app.data_processing.loader import load_dataframe

db = SessionLocal()
ds = db.query(Dataset).filter(Dataset.id == '407ace07-ea64-4d66-98dd-910a3c57dbbf').first()
if ds:
    print(f"Dataset: {ds.original_filename}")
    ver = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == ds.id).first()
    if ver:
        print(f"Version: {ver.version_number}, rows: {ver.row_count}, cols: {ver.column_count}")
        print(f"Storage path: {ver.storage_path}")
        if os.path.exists(ver.storage_path):
            df = load_dataframe(ver.storage_path, ds.file_type)
            print("Columns:", list(df.columns))
            print("Dtypes:\n", df.dtypes)
            print("Head 3:\n", df.head(3))
db.close()
