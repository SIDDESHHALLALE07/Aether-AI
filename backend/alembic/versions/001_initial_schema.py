"""Initial baseline schema migration

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-23

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    # Define dialect-aware type helpers
    guid_type = sa.UUID(as_uuid=False) if is_postgres else sa.String(36)
    json_type = postgresql.JSONB() if is_postgres else sa.JSON()

    # 1. users
    op.create_table(
        'users',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('role', sa.String(50), server_default='user', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # 2. user_sessions
    op.create_table(
        'user_sessions',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('user_id', guid_type, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('refresh_token_hash', sa.String(255), nullable=False),
        sa.Column('user_agent', sa.String(512), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('is_revoked', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'])

    # 3. user_settings
    op.create_table(
        'user_settings',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('user_id', guid_type, sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('workspace_name', sa.String(255), server_default='My Workspace', nullable=False),
        sa.Column('workspace_description', sa.String(512), nullable=True),
        sa.Column('default_project_id', guid_type, nullable=True),
        sa.Column('default_dataset_id', guid_type, nullable=True),
        sa.Column('copilot_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('suggested_prompts_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('automatic_insights_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('analysis_assistance_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('response_style', sa.String(50), server_default='balanced', nullable=False),
        sa.Column('email_notifications_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('dataset_notifications_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('analysis_notifications_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('insight_notifications_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('report_notifications_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('copilot_notifications_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_user_settings_user_id', 'user_settings', ['user_id'], unique=True)

    # 4. projects
    op.create_table(
        'projects',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('user_id', guid_type, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_archived', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_projects_user_id', 'projects', ['user_id'])

    # 5. activity_logs
    op.create_table(
        'activity_logs',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('project_id', guid_type, sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', guid_type, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('action_type', sa.String(100), nullable=False),
        sa.Column('details', json_type, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_activity_logs_project_id', 'activity_logs', ['project_id'])
    op.create_index('ix_activity_logs_user_id', 'activity_logs', ['user_id'])

    # 6. datasets
    op.create_table(
        'datasets',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('project_id', guid_type, sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', guid_type, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('storage_path', sa.String(512), nullable=False),
        sa.Column('file_type', sa.String(50), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('current_version_num', sa.Integer(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_datasets_project_id', 'datasets', ['project_id'])
    op.create_index('ix_datasets_user_id', 'datasets', ['user_id'])
    op.create_index('ix_datasets_user_project', 'datasets', ['user_id', 'project_id'])

    # 7. dataset_versions
    op.create_table(
        'dataset_versions',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('dataset_id', guid_type, sa.ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('storage_path', sa.String(512), nullable=False),
        sa.Column('row_count', sa.Integer(), nullable=False),
        sa.Column('column_count', sa.Integer(), nullable=False),
        sa.Column('columns_meta', json_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint('dataset_id', 'version_number', name='uq_dataset_version_number')
    )
    op.create_index('ix_dataset_versions_dataset_id', 'dataset_versions', ['dataset_id'])
    op.create_index('ix_dataset_versions_dataset_version', 'dataset_versions', ['dataset_id', 'version_number'])

    # 8. data_profiles
    op.create_table(
        'data_profiles',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('dataset_version_id', guid_type, sa.ForeignKey('dataset_versions.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('numeric_summary', json_type, nullable=True),
        sa.Column('categorical_summary', json_type, nullable=True),
        sa.Column('datetime_summary', json_type, nullable=True),
        sa.Column('data_types', json_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_data_profiles_dataset_version_id', 'data_profiles', ['dataset_version_id'], unique=True)

    # 9. quality_scores
    op.create_table(
        'quality_scores',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('dataset_version_id', guid_type, sa.ForeignKey('dataset_versions.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('overall_score', sa.Float(), nullable=False),
        sa.Column('completeness_score', sa.Float(), nullable=False),
        sa.Column('uniqueness_score', sa.Float(), nullable=False),
        sa.Column('validity_score', sa.Float(), nullable=False),
        sa.Column('consistency_score', sa.Float(), nullable=False),
        sa.Column('detected_issues', json_type, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_quality_scores_dataset_version_id', 'quality_scores', ['dataset_version_id'], unique=True)

    # 10. cleaning_operations
    op.create_table(
        'cleaning_operations',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('dataset_id', guid_type, sa.ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_version_id', guid_type, sa.ForeignKey('dataset_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_version_id', guid_type, sa.ForeignKey('dataset_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('operation_type', sa.String(100), nullable=False),
        sa.Column('parameters', json_type, nullable=False),
        sa.Column('affected_rows_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_cleaning_operations_dataset_id', 'cleaning_operations', ['dataset_id'])
    op.create_index('ix_cleaning_operations_source_version_id', 'cleaning_operations', ['source_version_id'])
    op.create_index('ix_cleaning_operations_target_version_id', 'cleaning_operations', ['target_version_id'])

    # 11. pattern_results
    op.create_table(
        'pattern_results',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('dataset_version_id', guid_type, sa.ForeignKey('dataset_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('pattern_type', sa.String(100), nullable=False),
        sa.Column('variables', json_type, nullable=False),
        sa.Column('statistical_metrics', json_type, nullable=False),
        sa.Column('evidence', json_type, nullable=False),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_pattern_results_dataset_version_id', 'pattern_results', ['dataset_version_id'])

    # 12. insights
    op.create_table(
        'insights',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('dataset_version_id', guid_type, sa.ForeignKey('dataset_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('insight_type', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('computed_evidence', json_type, nullable=False),
        sa.Column('ai_interpretation', sa.Text(), nullable=False),
        sa.Column('confidence_score', sa.Float(), server_default='1.0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_insights_dataset_version_id', 'insights', ['dataset_version_id'])

    # 13. conversations
    op.create_table(
        'conversations',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('dataset_id', guid_type, sa.ForeignKey('datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', guid_type, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_conversations_dataset_id', 'conversations', ['dataset_id'])
    op.create_index('ix_conversations_user_id', 'conversations', ['user_id'])

    # 14. messages
    op.create_table(
        'messages',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('conversation_id', guid_type, sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('sender', sa.String(20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('evidence', json_type, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("sender IN ('user', 'bot', 'system')", name='ck_messages_sender')
    )
    op.create_index('ix_messages_conversation_id', 'messages', ['conversation_id'])

    # 15. reports
    op.create_table(
        'reports',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('dataset_version_id', guid_type, sa.ForeignKey('dataset_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', guid_type, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('file_format', sa.String(20), nullable=False),
        sa.Column('storage_path', sa.String(512), nullable=False),
        sa.Column('summary_data', json_type, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("file_format IN ('pdf', 'csv', 'xlsx', 'html')", name='ck_reports_file_format')
    )
    op.create_index('ix_reports_dataset_version_id', 'reports', ['dataset_version_id'])
    op.create_index('ix_reports_user_id', 'reports', ['user_id'])

    # 16. embeddings
    if is_postgres:
        from pgvector.sqlalchemy import Vector
        vec_type = Vector(384)
    else:
        vec_type = sa.Text()

    op.create_table(
        'embeddings',
        sa.Column('id', guid_type, primary_key=True),
        sa.Column('user_id', guid_type, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('project_id', guid_type, sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('dataset_version_id', guid_type, sa.ForeignKey('dataset_versions.id', ondelete='CASCADE'), nullable=True),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', guid_type, nullable=True),
        sa.Column('content_chunk', sa.Text(), nullable=False),
        sa.Column('embedding_data', vec_type, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("entity_type IN ('insight', 'pattern', 'report_section', 'conversation')", name='ck_embeddings_entity_type')
    )
    op.create_index('ix_embeddings_user_id', 'embeddings', ['user_id'])
    op.create_index('ix_embeddings_project_id', 'embeddings', ['project_id'])
    op.create_index('ix_embeddings_dataset_version_id', 'embeddings', ['dataset_version_id'])
    op.create_index('ix_embeddings_entity', 'embeddings', ['entity_type', 'entity_id'])

    if is_postgres:
        op.create_index(
            'ix_embeddings_vector_hnsw',
            'embeddings',
            ['embedding_data'],
            postgresql_using='hnsw',
            postgresql_with={'m': 16, 'ef_construction': 64},
            postgresql_ops={'embedding_data': 'vector_cosine_ops'}
        )


def downgrade() -> None:
    op.drop_table('embeddings')
    op.drop_table('reports')
    op.drop_table('messages')
    op.drop_table('conversations')
    op.drop_table('insights')
    op.drop_table('pattern_results')
    op.drop_table('cleaning_operations')
    op.drop_table('quality_scores')
    op.drop_table('data_profiles')
    op.drop_table('dataset_versions')
    op.drop_table('datasets')
    op.drop_table('activity_logs')
    op.drop_table('projects')
    op.drop_table('user_settings')
    op.drop_table('user_sessions')
    op.drop_table('users')
