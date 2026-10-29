import os
import sys
sys.path.insert(0, os.path.abspath("."))
sys.stdout.reconfigure(encoding="utf-8")
import json

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

from app.core.database import engine, SessionLocal
from app.models.user import User
from app.models.dataset import Dataset, DatasetVersion
from app.ai.gateway import gemini_gateway

def main():
    db = SessionLocal()
    try:
        # Find user and real dataset
        user = db.query(User).filter(User.email.like("%hallale%")).first() or db.query(User).first()
        assert user, "No user found in DB"
        print(f"Testing with User: {user.email} (ID: {user.id})")

        # Find real dataset
        dataset = db.query(Dataset).filter(Dataset.user_id == user.id).first()
        if not dataset:
            dataset = db.query(Dataset).first()
        assert dataset, "No dataset found in DB"
        print(f"Testing with Dataset: {dataset.original_filename} (ID: {dataset.id})")

        # Conversational state
        history = []
        conversation_id = None

        prompts = [
            "Hello",
            "What can you do?",
            "Analyze my dataset.",
            "What is the biggest data-quality issue?",
            "Show me.",
            "Explain that chart.",
            "What other important patterns do you see?",
            "Create a detailed report.",
            "Make the report more professional.",
            "Generate PDF.",
            "Download it."
        ]

        print("\n" + "="*70)
        print("BEGINNING SECTION 50 EXACT CONVERSATIONAL PROGRESSION TEST")
        print("="*70)

        for step_idx, prompt in enumerate(prompts, 1):
            print(f"\n[STEP {step_idx}] USER: {prompt}")
            
            # If step 1 or 2, we can test with or without dataset context
            ds_id = dataset.id if step_idx >= 3 else None

            ai_text, evidence = gemini_gateway.process_chat(
                user_message=prompt,
                user_id=user.id,
                db=db,
                dataset_id=dataset.id, # provide active dataset
                conversation_history=history,
                response_style="balanced",
                explanation_level="beginner"
            )

            print(f"\n[STEP {step_idx}] AI RESPONSE:\n{ai_text}")
            
            evidence_summary = {
                "intent": evidence.get("intent"),
                "grounded": evidence.get("grounded"),
                "has_chart": "chart" in evidence,
                "has_report": "report" in evidence,
                "has_pdf": "pdf" in evidence,
                "download_url": evidence.get("download_url"),
                "analysis_used": evidence.get("analysis_used")
            }
            print(f"\n[STEP {step_idx}] EVIDENCE SUMMARY:\n{json.dumps(evidence_summary, indent=2)}")

            # Validation assertions for Section 50
            if step_idx == 1:
                assert len(ai_text) > 10, "Step 1 greeting failed"
            elif step_idx == 2:
                assert "dataset" in ai_text.lower() or "copilot" in ai_text.lower(), "Step 2 capabilities failed"
            elif step_idx == 3:
                assert dataset.original_filename in ai_text or "record" in ai_text.lower(), "Step 3 analysis failed"
            elif step_idx == 4:
                assert "quality" in ai_text.lower() or "complete" in ai_text.lower() or "outlier" in ai_text.lower() or "missing" in ai_text.lower(), "Step 4 quality failed"
            elif step_idx == 5:
                assert "chart" in evidence, "Step 5 chart payload missing"
            elif step_idx == 6:
                assert "chart" in ai_text.lower() or "distribution" in ai_text.lower() or "relationship" in ai_text.lower(), "Step 6 explain chart failed"
            elif step_idx == 7:
                assert "pattern" in ai_text.lower() or "correlation" in ai_text.lower() or "outlier" in ai_text.lower(), "Step 7 patterns failed"
            elif step_idx == 8:
                assert "report" in evidence, "Step 8 report payload missing"
            elif step_idx == 9:
                assert "report" in ai_text.lower() or "recommendation" in ai_text.lower(), "Step 9 professional report failed"
            elif step_idx == 10:
                assert "pdf" in evidence or "download_url" in evidence, "Step 10 PDF generation failed"
            elif step_idx == 11:
                assert evidence.get("download_url") or "pdf" in evidence, "Step 11 download URL missing"

            # Append to history for next turn
            history.append({"sender": "user", "content": prompt})
            history.append({"sender": "bot", "content": ai_text, "evidence": evidence})

        print("\n" + "="*70)
        print("ALL 11 STEPS OF SECTION 50 ACCEPTANCE TEST PASSED WITH 100% SUCCESS!")
        print("="*70)

    finally:
        db.close()

if __name__ == "__main__":
    main()
