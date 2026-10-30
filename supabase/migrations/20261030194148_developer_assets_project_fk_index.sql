-- Cover the composite project ownership foreign key for efficient deletes and updates.
CREATE INDEX developer_assets_project_user_idx
  ON public.developer_assets(project_id, user_id)
  WHERE project_id IS NOT NULL;
