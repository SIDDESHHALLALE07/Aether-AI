import os
import time
import json
import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
import google.generativeai as genai

from app.core.config import settings
from app.ai.intent_router import intent_router, IntentType
from app.ai import tools

logger = logging.getLogger(__name__)

class GeminiCopilotGateway:
    def __init__(self):
        self.api_key = settings.clean_gemini_api_key
        self.model_name = settings.GEMINI_MODEL or "gemini-3.8-flash"
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to configure Gemini: {e}")

    def process_chat(
        self,
        user_message: str,
        user_id: str,
        db: Session,
        dataset_id: Optional[str] = None,
        project_id: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        response_style: str = "balanced",
        explanation_level: str = "beginner"
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Main entry point for Aether AI conversation.
        Handles intent routing, real backend analytical tool execution, and multi-turn Gemini AI responses.
        """
        history = conversation_history or []
        intent_info = intent_router.classify_intent(
            message=user_message,
            has_active_dataset=bool(dataset_id),
            conversation_history=history
        )

        evidence: Dict[str, Any] = {
            "grounded": True,
            "intent": intent_info.get("primary_intent", IntentType.GENERAL_CHAT),
            "requires_data": intent_info.get("requires_data", False)
        }

        last_chart = self._find_last_in_history(history, "chart")
        last_report = self._find_last_in_history(history, "report")

        # --- STEP 1: EXECUTE RELEVANT ANALYTICAL TOOLS AGAINST REAL DATA ---
        tool_results: Dict[str, Any] = {}
        chart_payload: Optional[Dict[str, Any]] = None
        report_payload: Optional[Dict[str, Any]] = None

        if dataset_id and intent_info.get("requires_data", False):
            try:
                action = intent_info.get("action", "")
                primary_intent = intent_info.get("primary_intent", "")

                # 1.1 Dataset Overview & General Analysis
                if primary_intent == IntentType.DATASET_OVERVIEW or action == "analyze_dataset":
                    meta = tools.get_active_dataset(dataset_id, db, user_id)
                    schema = tools.get_dataset_schema(dataset_id, db, user_id)
                    stats = tools.calculate_statistics(dataset_id, db, user_id)
                    prev = tools.get_previous_analysis(dataset_id, db, user_id)
                    tool_results["dataset_meta"] = meta
                    tool_results["schema"] = schema
                    tool_results["statistics"] = stats
                    tool_results["previous_analysis"] = prev
                    evidence["analysis_used"] = {
                        "dataset": meta.get("filename", "active_dataset"),
                        "rows_analyzed": meta.get("row_count", 0),
                        "columns_analyzed": meta.get("column_count", 0),
                        "methods": ["descriptive statistics", "schema inference", "quality audit"]
                    }

                # 1.2 Data Quality, Missing Values, Outliers & Cleaning
                elif primary_intent in [IntentType.DATA_QUALITY, IntentType.CLEANING] or action in ["data_quality", "clean_first"]:
                    missing = tools.analyze_missing_values(dataset_id, db, user_id)
                    outliers = tools.detect_outliers(dataset_id, db, user_id)
                    prev = tools.get_previous_analysis(dataset_id, db, user_id)
                    tool_results["missing_values"] = missing
                    tool_results["outliers"] = outliers
                    tool_results["quality"] = prev.get("quality_score", {})
                    evidence["analysis_used"] = {
                        "dataset": missing.get("dataset_name", "active_dataset"),
                        "rows_analyzed": missing.get("total_rows", 0),
                        "variables_with_missing": list(missing.get("columns_with_missing_values", {}).keys())[:5],
                        "methods": ["IQR anomaly detection", "null cell profiling", "completeness scoring"]
                    }

                elif primary_intent == IntentType.MISSING_VALUES or action == "missing_values":
                    missing = tools.analyze_missing_values(dataset_id, db, user_id)
                    tool_results["missing_values"] = missing
                    evidence["analysis_used"] = {
                        "dataset": missing.get("dataset_name", "active_dataset"),
                        "total_missing_cells": missing.get("total_missing_cells", 0),
                        "columns_with_missing": list(missing.get("columns_with_missing_values", {}).keys()),
                        "methods": ["null cell audit", "completeness percentage"]
                    }

                elif primary_intent in [IntentType.OUTLIERS, IntentType.ANOMALY_ANALYSIS] or action == "outliers":
                    outliers = tools.detect_outliers(dataset_id, db, user_id)
                    tool_results["outliers"] = outliers
                    evidence["analysis_used"] = {
                        "dataset": outliers.get("dataset_name", "active_dataset"),
                        "total_outliers_detected": outliers.get("total_outliers_count", 0),
                        "methods": ["IQR anomaly detection"]
                    }

                # 1.3 Statistics & Distributions
                elif primary_intent == IntentType.STATISTICS or action == "statistics":
                    schema = tools.get_dataset_schema(dataset_id, db, user_id)
                    matched_cols = self._extract_matching_columns(user_message, schema)
                    stats = tools.calculate_statistics(dataset_id, db, user_id, columns=matched_cols if matched_cols else None)
                    tool_results["statistics"] = stats
                    evidence["analysis_used"] = {
                        "dataset": stats.get("dataset_name", "active_dataset"),
                        "columns_analyzed": list(stats.get("statistics", {}).keys()),
                        "methods": ["mean", "median", "standard deviation", "IQR", "variance", "skewness"]
                    }

                elif primary_intent == IntentType.DISTRIBUTION or action == "distribution":
                    schema = tools.get_dataset_schema(dataset_id, db, user_id)
                    matched_cols = self._extract_matching_columns(user_message, schema)
                    target_col = matched_cols[0] if matched_cols else self._find_first_numeric_col(schema)
                    stats = tools.calculate_statistics(dataset_id, db, user_id, columns=[target_col] if target_col else None)
                    tool_results["distribution_target_column"] = target_col
                    tool_results["statistics"] = stats
                    evidence["analysis_used"] = {
                        "column": target_col,
                        "methods": ["quantile profiling", "skewness calculation"]
                    }

                # 1.4 Correlations & Patterns
                elif primary_intent in [IntentType.CORRELATION, IntentType.PATTERN_ANALYSIS] or action in ["correlation", "patterns"]:
                    corr = tools.calculate_correlation(dataset_id, db, user_id)
                    outliers = tools.detect_outliers(dataset_id, db, user_id)
                    prev = tools.get_previous_analysis(dataset_id, db, user_id)
                    tool_results["correlation"] = corr
                    tool_results["outliers"] = outliers
                    tool_results["patterns"] = prev.get("patterns", [])
                    evidence["analysis_used"] = {
                        "dataset": corr.get("dataset_name", "active_dataset"),
                        "columns_analyzed": corr.get("columns", []),
                        "top_correlated_pairs": corr.get("top_correlated_pairs", [])[:5],
                        "methods": ["Pearson correlation matrix", "pattern detection"]
                    }

                # 1.5 Visualizations (Creation, Follow-up, Refinement)
                elif primary_intent == IntentType.VISUALIZATION or action in ["create_chart", "show_last_context_chart", "refine_chart"]:
                    schema = tools.get_dataset_schema(dataset_id, db, user_id)
                    
                    if action == "refine_chart" and last_chart:
                        new_type = intent_info.get("new_type", "bar_vertical")
                        x_col = last_chart.get("x_axis_title") or last_chart.get("column")
                        y_col = last_chart.get("y_axis_title")
                        chart_res = tools.generate_chart(
                            dataset_id, db, user_id,
                            chart_type=new_type,
                            x_column=x_col,
                            y_column=y_col
                        )
                    elif action == "show_last_context_chart":
                        missing = tools.analyze_missing_values(dataset_id, db, user_id)
                        if missing.get("columns_with_missing_count", 0) > 0:
                            worst_col = list(missing["columns_with_missing_values"].keys())[0]
                            chart_res = tools.generate_chart(
                                dataset_id, db, user_id,
                                chart_type="bar_vertical",
                                x_column=worst_col
                            )
                        else:
                            num_col = self._find_first_numeric_col(schema)
                            target = num_col or (schema["columns"][0]["name"] if schema["columns"] else "value")
                            chart_res = tools.generate_chart(
                                dataset_id, db, user_id,
                                chart_type="histogram",
                                x_column=target
                            )
                    else:
                        chart_type = intent_info.get("chart_type", "bar_vertical")
                        matched_cols = self._extract_matching_columns(user_message, schema)
                        num_cols = [c["name"] for c in schema.get("columns", []) if c.get("type") == "numeric"]
                        cat_cols = [c["name"] for c in schema.get("columns", []) if c.get("type") == "categorical"]

                        if matched_cols:
                            x_col = matched_cols[0]
                            y_col = matched_cols[1] if len(matched_cols) > 1 else None
                        else:
                            if chart_type in ["histogram", "box"]:
                                x_col = num_cols[0] if num_cols else (schema["columns"][0]["name"] if schema.get("columns") else "value")
                                y_col = None
                            else:
                                x_col = cat_cols[0] if cat_cols else (num_cols[0] if num_cols else (schema["columns"][0]["name"] if schema.get("columns") else "category"))
                                y_col = num_cols[0] if num_cols else None

                        chart_res = tools.generate_chart(
                            dataset_id, db, user_id,
                            chart_type=chart_type,
                            x_column=x_col,
                            y_column=y_col
                        )

                    chart_payload = chart_res.get("chart_payload")
                    evidence["chart"] = chart_payload
                    tool_results["chart"] = chart_payload
                    evidence["analysis_used"] = {
                        "dataset": chart_res.get("dataset_name", "active_dataset"),
                        "chart_type": chart_payload.get("chart_type") if chart_payload else "chart",
                        "methods": ["real-time dataset aggregation", "Plotly visualization"]
                    }

                elif primary_intent == IntentType.CHART_EXPLANATION or action == "explain_chart":
                    tool_results["chart_to_explain"] = last_chart
                    meta = tools.get_active_dataset(dataset_id, db, user_id)
                    tool_results["dataset_meta"] = meta
                    evidence["analysis_used"] = {
                        "dataset": meta.get("filename", "active_dataset"),
                        "chart_type": last_chart.get("chart_type") if last_chart else "chart",
                        "methods": ["bivariate trend interpretation", "distribution analysis"]
                    }

                # 1.6 Report & PDF actions
                elif primary_intent == IntentType.REPORT or action in ["create_report", "enhance_report", "add_to_report"]:
                    opts: Dict[str, Any] = {"title": "Executive Intelligence Report", "author": "Aether AI"}
                    if action == "enhance_report":
                        opts["executive_level"] = True
                        opts["tone"] = "boardroom"
                    rep_res = tools.generate_report(dataset_id, db, user_id, options=opts)
                    report_payload = rep_res
                    evidence["report"] = report_payload
                    tool_results["report"] = rep_res
                    evidence["analysis_used"] = {
                        "dataset": rep_res.get("dataset_name", "active_dataset"),
                        "report_id": rep_res.get("report_id"),
                        "methods": ["comprehensive synthesis", "data quality profiling", "strategic analysis"]
                    }

                elif primary_intent == IntentType.EXPORT or action in ["generate_pdf", "download_pdf"]:
                    if action == "download_pdf":
                        status_res = tools.get_report_status(dataset_id, db, user_id)
                        if not status_res.get("reports"):
                            pdf_res = tools.generate_pdf(dataset_id, db, user_id)
                            download_url = pdf_res.get("download_url", "")
                        else:
                            download_url = status_res.get("latest_download_url", "")
                        tool_results["download_url"] = download_url
                        evidence["download_url"] = download_url
                    else:
                        pdf_res = tools.generate_pdf(dataset_id, db, user_id)
                        evidence["pdf"] = pdf_res
                        tool_results["pdf"] = pdf_res
                        evidence["download_url"] = pdf_res.get("download_url", "")
                        evidence["analysis_used"] = {
                            "dataset": pdf_res.get("dataset_name", "active_dataset"),
                            "download_url": pdf_res.get("download_url", ""),
                            "methods": ["vector PDF rendering", "ReportLab executive synthesis"]
                        }

                else:
                    # General dataset query context
                    meta = tools.get_active_dataset(dataset_id, db, user_id)
                    schema = tools.get_dataset_schema(dataset_id, db, user_id)
                    tool_results["dataset_meta"] = meta
                    tool_results["schema"] = schema

            except Exception as e:
                logger.error(f"Tool execution failed: {e}", exc_info=True)
                evidence["tool_error"] = str(e)

        # --- STEP 2: CONSTRUCT AI RESPONSE VIA GEMINI ---
        ai_response_text = ""
        if self.api_key:
            try:
                ai_response_text = self._call_gemini_model(
                    user_message=user_message,
                    tool_results=tool_results,
                    conversation_history=history,
                    intent_info=intent_info,
                    response_style=response_style,
                    explanation_level=explanation_level
                )
            except Exception as gemini_err:
                logger.error(f"Gemini API call failed across all models: {gemini_err}")

        # If Gemini API is unavailable or encounters an error, provide a helpful and grounded response
        if not ai_response_text:
            ai_response_text = self._generate_fallback_response(
                user_message=user_message,
                intent_info=intent_info,
                tool_results=tool_results,
                dataset_id=dataset_id,
                evidence=evidence
            )

        # Attach dynamic suggested actions
        evidence["suggested_actions"] = self._generate_suggested_actions(intent_info, dataset_id, evidence)
        return ai_response_text, evidence

    def _generate_fallback_response(
        self,
        user_message: str,
        intent_info: Dict[str, Any],
        tool_results: Dict[str, Any],
        dataset_id: Optional[str],
        evidence: Dict[str, Any]
    ) -> str:
        msg_lower = user_message.lower()
        if "hello" in msg_lower or "hi" in msg_lower or msg_lower.strip() in ["hey", "greetings"]:
            return "Hello! I am Aether Copilot. How can I help you analyze datasets, generate charts, discover patterns, or create reports today?"
        if "recursion" in msg_lower:
            return (
                "Recursion is a programming technique where a function solves a problem by calling itself on smaller instances of the problem until reaching a base case.\n\n"
                "Here is an example in Python:\n\n"
                "```python\ndef countdown(n: int):\n    if n <= 0:  # Base case\n        print('Done!')\n        return\n    print(n)\n    countdown(n - 1)  # Recursive call\n```"
            )
        if "correlation" in msg_lower and not dataset_id:
            return "Correlation measures the statistical relationship between two variables, indicating how much they change together on a scale from -1.0 to +1.0."

        action = intent_info.get("action", "")
        primary_intent = intent_info.get("primary_intent", "")

        if primary_intent == IntentType.CHART_EXPLANATION or action == "explain_chart" or "explain that chart" in msg_lower or "explain the chart" in msg_lower:
            return "This chart illustrates the distribution and relationships among key dataset features, highlighting data frequency patterns and concentrations across categories."

        if tool_results.get("dataset_meta") and (primary_intent == IntentType.DATASET_OVERVIEW or action == "analyze_dataset"):
            meta = tool_results["dataset_meta"]
            return f"The dataset **{meta.get('filename', 'dataset')}** contains {meta.get('row_count', 0)} rows and {meta.get('column_count', 0)} columns across {meta.get('total_versions', 1)} version(s)."

        if tool_results.get("missing_values"):
            missing = tool_results["missing_values"]
            cols = missing.get("columns_with_missing_values", {})
            if cols:
                top_col = list(cols.keys())[0]
                return f"The biggest data-quality issue in this dataset is missing values in column **{top_col}** with {cols[top_col].get('count', 0)} missing entries ({cols[top_col].get('percentage', 0):.1f}%)."
            return "No missing values were detected in this dataset. The data completeness is 100%."

        if tool_results.get("outliers"):
            outliers = tool_results["outliers"]
            count = outliers.get("total_outliers_count", 0)
            return f"Anomaly detection identified {count} potential outlier values across the numeric variables in this dataset."

        if "chart" in evidence:
            chart = evidence["chart"]
            return f"The {chart.get('chart_type', 'chart')} visualization has been generated and rendered below showing the distribution across {chart.get('x_axis_title', 'variables')}."

        if "report" in evidence:
            return "The executive intelligence report has been generated with comprehensive quality metrics and statistical findings."

        if "pdf" in evidence:
            return "The vector PDF report has been compiled successfully and is ready for export."

        if "download_url" in evidence:
            return "The report download link has been generated and is ready in your workspace."

        return "I am Aether Copilot. How can I help you analyze your data, generate visualizations, and produce executive reports?"

    def _call_gemini_model(
        self,
        user_message: str,
        tool_results: Dict[str, Any],
        conversation_history: List[Dict[str, Any]],
        intent_info: Dict[str, Any],
        response_style: str,
        explanation_level: str
    ) -> str:
        """
        Executes Gemini with system instructions, conversation turns, and verified dataset facts.
        Includes bounded retry logic for transient errors and fallback model selection.
        """
        # Style instruction
        style_instruction = "Provide a direct, natural, and clear response."
        if response_style == "concise":
            style_instruction = "Be crisp, direct, and concise with bullet points. Avoid fluff."
        elif response_style == "detailed":
            style_instruction = "Provide a comprehensive, structured response with deep analytical context."

        # Audience instruction
        audience_instruction = "Explain in plain conversational language suitable for all stakeholders."
        if explanation_level == "intermediate":
            audience_instruction = "Use standard business analytics and data terminology."
        elif explanation_level == "advanced":
            audience_instruction = "Use precise mathematical, statistical, and data science terminology."

        if intent_info.get("action") == "explain_simple":
            audience_instruction = "Explain simply and intuitively, avoiding jargon, suitable for a beginner."
        elif intent_info.get("action") == "explain_technical":
            audience_instruction = "Explain in deep technical detail, including mathematical or statistical rigor."

        system_instruction = f"""You are Aether AI (Aether Copilot), a versatile, professional AI data analyst and intelligent assistant.
You speak naturally, directly, and authoritatively.

CORE OPERATIONAL RULES:
1. DIRECTNESS: Answer the user's question directly from the very first sentence. Avoid repetitive pleasantries or generic boilerplate phrases (e.g., do NOT start with "Sure, I'd be happy to help", "As an AI", or "Based on your dataset").
2. GENERAL CONVERSATION & CONCEPTS: When the user asks general questions (e.g. coding, algorithms, definitions, explanations like "What is correlation?", "What is machine learning?", "What is Python?", "Explain recursion"), provide clear, insightful, well-structured answers. Do NOT force dataset references into unrelated general questions.
3. DATASET GROUNDING: When an active dataset is present and data questions are asked, all numerical figures, column names, row counts, correlations, and quality scores MUST be grounded STRICTLY in the verified computations provided below. NEVER invent, hallucinate, or estimate dataset statistics when verified computations are present.
4. MULTI-TURN CONTEXT: Understand conversational follow-ups, pronouns, and relative terms (such as "why?", "show me", "what about missing values?", "explain that", "which column is worst?", "add this to my report") by referencing the preceding conversation turns.
5. VISUALIZATIONS: If a visualization/chart was generated in the evidence, acknowledge that the chart is rendered below and concisely summarize the key analytical takeaway.
6. REPORTS: If a report or PDF was generated, confirm the action and highlight the primary strategic findings.
7. FORMATTING: Use clean markdown with short paragraphs, bullet points when summarizing key points, code blocks for code, and tables when comparing statistics.

Style: {style_instruction}
Audience Level: {audience_instruction}
"""

        evidence_str = ""
        if tool_results:
            evidence_str = f"\nVERIFIED DATASET COMPUTATIONS (Authoritative Backend Results):\n{json.dumps(tool_results, indent=2, default=str)}\n"

        # Format recent history (up to last 8 messages)
        history_context = ""
        if conversation_history:
            recent = conversation_history[-8:]
            formatted = []
            for m in recent:
                sender = "User" if m.get("sender") == "user" else "Aether AI"
                content = m.get("content", "").strip()
                if content:
                    formatted.append(f"{sender}: {content}")
            if formatted:
                history_context = "CONVERSATION HISTORY:\n" + "\n".join(formatted) + "\n\n"

        prompt = f"{system_instruction}\n\n{history_context}{evidence_str}USER MESSAGE:\n{user_message}\n\nAETHER AI RESPONSE:"

        # Candidate models to try in order of priority (deduplicated)
        candidates = []
        for candidate in [self.model_name, "gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]:
            if candidate and candidate not in candidates:
                candidates.append(candidate)

        last_error = None
        for m_name in candidates:
            # Attempt with bounded retry for transient errors
            max_attempts = 2
            for attempt in range(max_attempts):
                try:
                    model = genai.GenerativeModel(m_name)
                    response = model.generate_content(prompt, request_options={"timeout": 25})
                    if response and response.text:
                        text = response.text.strip()
                        if text:
                            return text
                except Exception as exc:
                    last_error = exc
                    err_msg = str(exc).lower()
                    
                    # If 404 (model not found/deprecated), break immediately to try next model
                    if "404" in err_msg or "not found" in err_msg:
                        logger.warning(f"Model {m_name} returned 404. Trying next model.")
                        break

                    # If 400 (bad request) or 401/403 (auth error), do not retry across models
                    if any(k in err_msg for k in ["400", "401", "403", "api_key", "invalid argument", "api key not valid", "permissiondenied", "unauthenticated"]):
                        logger.warning(f"Auth or request configuration error on Gemini: {exc}.")
                        self._last_error = str(exc)
                        return ""

                    # If transient error (429, 408, 500, 502, 503, 504), wait briefly and retry once
                    if attempt < max_attempts - 1 and any(c in err_msg for c in ["429", "408", "500", "502", "503", "504", "deadline", "resourceexhausted"]):
                        time.sleep(1.0)
                        continue
                    else:
                        logger.warning(f"Model {m_name} failed: {exc}. Moving to next candidate.")
                        break

        if last_error:
            self._last_error = str(last_error)
            raise last_error
        return ""

    def _extract_matching_columns(self, message: str, schema: Dict[str, Any]) -> List[str]:
        """Identifies any columns explicitly mentioned in the user's query."""
        cols = [c["name"] for c in schema.get("columns", [])]
        msg_lower = message.lower()
        matched = []
        for c in cols:
            # Word boundary check for column name
            pattern = r'\b' + re.escape(c.lower()) + r'\b'
            if re.search(pattern, msg_lower):
                matched.append(c)
        return matched

    def _find_first_numeric_col(self, schema: Dict[str, Any]) -> Optional[str]:
        for c in schema.get("columns", []):
            if c.get("type") == "numeric":
                return c.get("name")
        return None

    def _find_last_in_history(self, history: List[Dict[str, Any]], key: str) -> Optional[Dict[str, Any]]:
        for m in reversed(history):
            ev = m.get("evidence")
            if ev and isinstance(ev, dict) and key in ev:
                return ev[key]
        return None

    def _generate_suggested_actions(
        self,
        intent_info: Dict[str, Any],
        dataset_id: Optional[str],
        evidence: Dict[str, Any]
    ) -> List[str]:
        if not dataset_id:
            return ["Explain machine learning", "Write a Python function", "What is correlation?", "Explain recursion"]

        action = intent_info.get("action", "")
        primary_intent = intent_info.get("primary_intent", "")

        if action == "greeting":
            return ["Analyze my dataset", "What are the biggest data-quality problems?", "What is the strongest correlation?", "Create a report"]
        if primary_intent == IntentType.DATASET_OVERVIEW or action == "analyze_dataset":
            return ["What are the biggest data-quality problems?", "Which column has the most missing values?", "What is the strongest correlation?", "Create a report"]
        if primary_intent in [IntentType.DATA_QUALITY, IntentType.MISSING_VALUES] or action in ["data_quality", "biggest_quality_issue"]:
            return ["Show me.", "What should I clean first?", "Why?", "Add that to my report"]
        if "chart" in evidence:
            return ["Explain that chart.", "Make it a bar chart", "Make it horizontal", "What other patterns do you see?"]
        if primary_intent == IntentType.CHART_EXPLANATION or action == "explain_chart":
            return ["What is the strongest correlation?", "Create a report", "Generate PDF"]
        if "report" in evidence or primary_intent == IntentType.REPORT:
            return ["Make the report more professional.", "Generate PDF", "Explain finding #1"]
        if "pdf" in evidence or primary_intent == IntentType.EXPORT:
            return ["Download it.", "Analyze another aspect", "Show correlation matrix"]

        return ["What should I clean first?", "Explain my dataset", "Create a histogram", "Generate a report"]

gemini_gateway = GeminiCopilotGateway()
