import os
import time
import json
import logging
import re
from typing import Dict, Any, List, Optional, Tuple, AsyncGenerator
from sqlalchemy.orm import Session
import httpx
import google.generativeai as genai

from app.core.config import settings
from app.ai.intent_router import intent_router, IntentType
from app.ai import tools

logger = logging.getLogger(__name__)

# Cache for user settings to avoid reading disk on every chat message
_settings_cache: Dict[str, Any] = {}
_settings_cache_mtime: float = 0.0

def get_cached_user_copilot_settings() -> Tuple[str, str]:
    """Retrieves user copilot style and explanation level with mtime-checked caching."""
    global _settings_cache, _settings_cache_mtime
    settings_file = os.path.join(settings.settings_storage_dir, "app_settings.json")
    if os.path.exists(settings_file):
        try:
            mtime = os.path.getmtime(settings_file)
            if mtime > _settings_cache_mtime:
                with open(settings_file, "r", encoding="utf-8") as f:
                    _settings_cache = json.load(f)
                _settings_cache_mtime = mtime
        except Exception:
            pass
    return (
        _settings_cache.get("copilot_style", "balanced"),
        _settings_cache.get("copilot_level", "beginner")
    )


class GeminiCopilotGateway:
    def __init__(self):
        self.api_key = settings.clean_gemini_api_key
        self.model_name = settings.GEMINI_MODEL or "gemini-3.5-flash"
        self._async_http_client: Optional[httpx.AsyncClient] = None
        self._model_cache: Dict[str, genai.GenerativeModel] = {}
        self._last_error: Optional[str] = None
        self._ensure_configured()

    def _ensure_configured(self):
        key = settings.clean_gemini_api_key
        if key:
            self.api_key = key
            try:
                genai.configure(api_key=self.api_key, transport="rest")
            except Exception as e:
                logger.warning(f"Failed to configure Gemini SDK: {e}")

    def _get_async_client(self) -> httpx.AsyncClient:
        """Returns or initializes a connection-pooled HTTPX async client for streaming Gemini responses."""
        if self._async_http_client is None or self._async_http_client.is_closed:
            self._async_http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(connect=5.0, read=45.0, write=10.0, pool=5.0),
                limits=httpx.Limits(max_keepalive_connections=15, max_connections=30, keepalive_expiry=60.0)
            )
        return self._async_http_client

    async def aclose(self):
        """Closes the async HTTP client gracefully during application shutdown."""
        if self._async_http_client and not self._async_http_client.is_closed:
            await self._async_http_client.aclose()

    def _get_candidate_models(self) -> List[str]:
        """
        Builds priority-ordered, deduplicated candidate models.
        Evaluates responsive models first to minimize time-to-first-token while preserving analytical accuracy.
        """
        candidates: List[str] = []
        # Configured model first
        priority_list = [
            self.model_name,
            "gemini-3-flash-preview",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite-preview",
            "gemini-3.8-flash",
            "gemini-3.5-flash",
            "gemini-flash-latest"
        ]
        for m in priority_list:
            if m and m not in candidates:
                candidates.append(m)
        return candidates

    def _prepare_evidence_and_tools(
        self,
        user_message: str,
        user_id: str,
        db: Session,
        dataset_id: Optional[str],
        history: List[Dict[str, Any]],
        intent_info: Dict[str, Any]
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Executes verified backend analytical tools against real data based on classified intent.
        Returns (tool_results, evidence).
        """
        evidence: Dict[str, Any] = {
            "grounded": True,
            "intent": intent_info.get("primary_intent", IntentType.GENERAL_CHAT),
            "requires_data": intent_info.get("requires_data", False)
        }

        last_chart = self._find_last_in_history(history, "chart")
        last_report = self._find_last_in_history(history, "report")

        tool_results: Dict[str, Any] = {}

        if dataset_id and intent_info.get("requires_data", False):
            try:
                action = intent_info.get("action", "")
                primary_intent = intent_info.get("primary_intent", "")

                # 1. Dataset Overview & General Analysis
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

                # 2. Data Quality, Missing Values, Outliers & Cleaning
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

                # 3. Statistics & Distributions
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

                # 4. Correlations & Patterns
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

                # 5. Visualizations
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

                # 6. Report & PDF actions
                elif primary_intent == IntentType.REPORT or action in ["create_report", "enhance_report", "add_to_report"]:
                    opts: Dict[str, Any] = {"title": "Executive Intelligence Report", "author": "Aether AI"}
                    if action == "enhance_report":
                        opts["executive_level"] = True
                        opts["tone"] = "boardroom"
                    rep_res = tools.generate_report(dataset_id, db, user_id, options=opts)
                    evidence["report"] = rep_res
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

        return tool_results, evidence

    def _build_prompt(
        self,
        user_message: str,
        tool_results: Dict[str, Any],
        conversation_history: List[Dict[str, Any]],
        intent_info: Dict[str, Any],
        response_style: str,
        explanation_level: str
    ) -> str:
        """
        Constructs a lean, highly grounded prompt for Gemini.
        Uses compact JSON serialization to reduce token overhead and minimize generation latency.
        """
        style_instruction = "Provide a direct, natural, and clear response."
        if response_style == "concise":
            style_instruction = "Be crisp, direct, and concise with bullet points. Avoid fluff."
        elif response_style == "detailed":
            style_instruction = "Provide a comprehensive, structured response with deep analytical context."

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
1. DIRECTNESS & GREETING: When greeted (e.g., "Hello", "Hi") or asked who you are, introduce yourself as Aether Copilot and explain how you can help analyze datasets, explore patterns, generate visualizations, and compile executive reports. Answer user questions directly from the very first sentence. Avoid repetitive generic pleasantries (e.g., do NOT say "As an AI").
2. GENERAL CONVERSATION & CONCEPTS: When the user asks general questions (e.g. coding, algorithms, definitions, explanations like "What is correlation?", "What is machine learning?", "What is Python?", "Explain recursion"), provide clear, insightful, well-structured answers. Do NOT force dataset references into unrelated general questions.
3. DATASET GROUNDING: When an active dataset is present and data questions are asked, all numerical figures, column names, row counts, correlations, and quality scores MUST be grounded STRICTLY in the verified computations provided below. NEVER invent, hallucinate, or estimate dataset statistics when verified computations are present.
4. MULTI-TURN CONTEXT: Understand conversational follow-ups, pronouns, and relative terms (such as "why?", "show me", "what about missing values?", "explain that", "which column is worst?", "add this to my report") by referencing the preceding conversation turns.
5. VISUALIZATIONS & CHARTS: If a visualization/chart was generated or the user asks to explain a chart ("explain that chart", "explain the chart"), explicitly refer to the chart, distribution of values, and variable relationships, highlighting the primary analytical takeaways.
6. REPORTS: If a report or PDF was generated, confirm the action and highlight the primary strategic findings.
7. FORMATTING: Use clean markdown with short paragraphs, bullet points when summarizing key points, code blocks for code, and tables when comparing statistics.

Style: {style_instruction}
Audience Level: {audience_instruction}
"""

        evidence_str = ""
        if tool_results:
            # Use compact JSON representation to minimize token overhead and latency
            compact_results = json.dumps(tool_results, separators=(',', ':'), default=str)
            evidence_str = f"\nVERIFIED DATASET COMPUTATIONS (Authoritative Backend Results):\n{compact_results}\n"

        # Format recent history (up to last 6 messages / 3 turns for lean context)
        history_context = ""
        if conversation_history:
            recent = conversation_history[-6:]
            formatted = []
            for m in recent:
                sender = "User" if m.get("sender") == "user" else "Aether AI"
                content = m.get("content", "").strip()
                if content:
                    formatted.append(f"{sender}: {content}")
            if formatted:
                history_context = "CONVERSATION HISTORY:\n" + "\n".join(formatted) + "\n\n"

        return f"{system_instruction}\n\n{history_context}{evidence_str}USER MESSAGE:\n{user_message}\n\nAETHER AI RESPONSE:"

    async def stream_chat(
        self,
        user_message: str,
        user_id: str,
        db: Session,
        dataset_id: Optional[str] = None,
        project_id: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        response_style: str = "balanced",
        explanation_level: str = "beginner"
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Asynchronously streams the Aether AI conversation to the client.
        1. Emits 'metadata' with intent, evidence, chart payloads, and suggested actions.
        2. Progressively yields 'delta' text chunks as generated by Gemini.
        3. Concludes with 'done' containing the complete accumulated response and evidence.
        """
        history = conversation_history or []
        intent_info = intent_router.classify_intent(
            message=user_message,
            has_active_dataset=bool(dataset_id),
            conversation_history=history
        )

        tool_results, evidence = self._prepare_evidence_and_tools(
            user_message=user_message,
            user_id=user_id,
            db=db,
            dataset_id=dataset_id,
            history=history,
            intent_info=intent_info
        )

        # Attach dynamic suggested actions
        evidence["suggested_actions"] = self._generate_suggested_actions(intent_info, dataset_id, evidence)

        # 1. Immediately yield metadata event with analytical evidence
        yield {
            "type": "metadata",
            "evidence": evidence,
            "intent": intent_info,
            "suggested_actions": evidence.get("suggested_actions", [])
        }

        # 2. Build lean prompt
        prompt = self._build_prompt(
            user_message=user_message,
            tool_results=tool_results,
            conversation_history=history,
            intent_info=intent_info,
            response_style=response_style,
            explanation_level=explanation_level
        )

        accumulated_text = ""
        stream_succeeded = False
        self._ensure_configured()

        if self.api_key:
            client = self._get_async_client()
            candidates = self._get_candidate_models()

            for m_name in candidates:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{m_name}:streamGenerateContent?alt=sse&key={self.api_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.2,
                        "topP": 0.9,
                        "maxOutputTokens": 2048,
                    }
                }

                try:
                    async with client.stream("POST", url, json=payload) as resp:
                        # If quota exceeded, model not found, or temporary server busy: immediately try next candidate
                        if resp.status_code in [429, 404, 503, 500]:
                            logger.warning(f"Candidate Gemini model {m_name} returned HTTP {resp.status_code}. Immediately trying next candidate.")
                            continue
                        
                        if resp.status_code != 200:
                            logger.warning(f"Candidate Gemini model {m_name} returned status {resp.status_code}.")
                            continue

                        async for line in resp.aiter_lines():
                            if line.startswith("data:"):
                                raw_json = line[5:].strip()
                                if not raw_json:
                                    continue
                                try:
                                    chunk_data = json.loads(raw_json)
                                    text_delta = (
                                        chunk_data.get("candidates", [{}])[0]
                                        .get("content", {})
                                        .get("parts", [{}])[0]
                                        .get("text", "")
                                    )
                                    if text_delta:
                                        accumulated_text += text_delta
                                        yield {
                                            "type": "delta",
                                            "text": text_delta
                                        }
                                except Exception:
                                    pass

                        if accumulated_text:
                            stream_succeeded = True
                            break

                except Exception as stream_err:
                    logger.warning(f"Stream generation error on candidate model {m_name}: {stream_err}")
                    continue

        # 3. If API is unavailable or all models failed, provide grounded fallback response
        if not stream_succeeded or not accumulated_text:
            fallback_text = self._generate_fallback_response(
                user_message=user_message,
                intent_info=intent_info,
                tool_results=tool_results,
                dataset_id=dataset_id,
                evidence=evidence
            )
            accumulated_text = fallback_text
            yield {
                "type": "delta",
                "text": fallback_text
            }

        # 4. Conclude with 'done' event
        yield {
            "type": "done",
            "total_text": accumulated_text,
            "evidence": evidence
        }

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
        Synchronous / standard entry point for Aether AI conversation (backward compatible).
        Executes tools and queries Gemini with fast failover and grounded fallback.
        """
        history = conversation_history or []
        intent_info = intent_router.classify_intent(
            message=user_message,
            has_active_dataset=bool(dataset_id),
            conversation_history=history
        )

        tool_results, evidence = self._prepare_evidence_and_tools(
            user_message=user_message,
            user_id=user_id,
            db=db,
            dataset_id=dataset_id,
            history=history,
            intent_info=intent_info
        )

        ai_response_text = ""
        self._ensure_configured()
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
                logger.error(f"Gemini API call failed across candidates: {gemini_err}")

        if not ai_response_text:
            ai_response_text = self._generate_fallback_response(
                user_message=user_message,
                intent_info=intent_info,
                tool_results=tool_results,
                dataset_id=dataset_id,
                evidence=evidence
            )

        evidence["suggested_actions"] = self._generate_suggested_actions(intent_info, dataset_id, evidence)
        return ai_response_text, evidence

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
        Synchronous execution with system instructions, conversation turns, verified facts,
        and instant candidate failover.
        """
        prompt = self._build_prompt(
            user_message=user_message,
            tool_results=tool_results,
            conversation_history=conversation_history,
            intent_info=intent_info,
            response_style=response_style,
            explanation_level=explanation_level
        )

        candidates = self._get_candidate_models()
        last_error = None

        for m_name in candidates:
            try:
                # Cache GenerativeModel instances to avoid repeated constructor overhead
                if m_name not in self._model_cache:
                    self._model_cache[m_name] = genai.GenerativeModel(
                        m_name,
                        generation_config={
                            "temperature": 0.2,
                            "top_p": 0.9,
                            "max_output_tokens": 2048,
                        }
                    )
                model = self._model_cache[m_name]
                response = model.generate_content(prompt, request_options={"timeout": 30})
                if response and response.text:
                    text = response.text.strip()
                    if text:
                        return text
            except Exception as exc:
                last_error = exc
                err_msg = str(exc).lower()

                # If quota exceeded or 404, immediately try next candidate without sleeping
                if any(k in err_msg for k in ["429", "quota", "resourceexhausted", "404", "not found"]):
                    logger.warning(f"Candidate model {m_name} hit quota/404. Moving immediately to next candidate.")
                    continue

                if any(k in err_msg for k in ["400", "401", "403", "invalid argument", "api key"]):
                    logger.warning(f"Auth or configuration error on Gemini: {exc}")
                    self._last_error = str(exc)
                    return ""

                # Transient server errors: move immediately to next candidate
                logger.warning(f"Candidate model {m_name} failed: {exc}. Moving to next candidate.")
                continue

        if last_error:
            self._last_error = str(last_error)
        return ""

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

    def _extract_matching_columns(self, message: str, schema: Dict[str, Any]) -> List[str]:
        """Identifies any columns explicitly mentioned in the user's query."""
        cols = [c["name"] for c in schema.get("columns", [])]
        msg_lower = message.lower()
        matched = []
        for c in cols:
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
