import numpy as np
import json
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.embedding import Embedding

def generate_embedding_vector(text: str, dim: int = 384) -> List[float]:
    # Deterministic feature hashing vectorizer for fast lightweight 384-d embeddings
    vec = np.zeros(dim, dtype=np.float32)
    words = text.lower().split()
    if not words:
        return vec.tolist()
    
    for word in words:
        idx = hash(word) % dim
        vec[idx] += 1.0
        
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    a = np.array(v1, dtype=np.float32)
    b = np.array(v2, dtype=np.float32)
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))

def index_dataset_context(
    db: Session,
    user_id: str,
    project_id: str,
    dataset_version_id: str,
    chunks: List[Tuple[str, str, str]] # (entity_type, entity_id, chunk_text)
) -> int:
    indexed_count = 0
    for entity_type, entity_id, chunk_text in chunks:
        vec = generate_embedding_vector(chunk_text)
        vec_str = json.dumps(vec) # Store as JSON string or pgvector format
        
        emb = Embedding(
            user_id=user_id,
            project_id=project_id,
            dataset_version_id=dataset_version_id,
            entity_type=entity_type,
            entity_id=entity_id,
            content_chunk=chunk_text,
            embedding_data=vec_str
        )
        db.add(emb)
        indexed_count += 1
        
    db.commit()
    return indexed_count

def query_relevant_context(
    db: Session,
    user_id: str,
    dataset_version_id: str,
    query_text: str,
    top_k: int = 3
) -> List[Dict[str, Any]]:
    query_vec = generate_embedding_vector(query_text)
    
    embeddings = db.query(Embedding).filter(
        Embedding.user_id == user_id,
        Embedding.dataset_version_id == dataset_version_id
    ).all()

    if not embeddings:
        return []

    scored_chunks = []
    for emb in embeddings:
        try:
            vec = json.loads(emb.embedding_data) if isinstance(emb.embedding_data, str) else list(emb.embedding_data)
            score = cosine_similarity(query_vec, vec)
            scored_chunks.append({
                "id": emb.id,
                "entity_type": emb.entity_type,
                "chunk": emb.content_chunk,
                "score": round(score, 4)
            })
        except Exception:
            continue

    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    return scored_chunks[:top_k]
