from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, "backend")
from app.models.user import User

pg_url = "postgresql+psycopg2://postgres.vxdgllkkhxewwtqgmynq:ADT25SOCB1285007@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
engine = create_engine(pg_url)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    user = db.query(User).filter(User.email == 'hallalesiddesh@gmail.com').first()
    print("PostgreSQL Query succeeded! User:", user.id, user.email, type(user.id))
    
    # Now test get_current_user filter: User.id == str(user.id)
    user_by_id = db.query(User).filter(User.id == str(user.id)).first()
    print("Filter by str(id) succeeded! User:", user_by_id.email)
except Exception as e:
    print("PostgreSQL Query failed:", e)
finally:
    db.close()
