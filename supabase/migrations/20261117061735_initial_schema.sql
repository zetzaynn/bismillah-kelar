-- =========================================================
-- BISMILLAH KELAR
-- INITIAL DATABASE SCHEMA
-- Version: 1.0
-- =========================================================


-- =========================================================
-- 1. HELPER FUNCTIONS
-- =========================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.version = OLD.version + 1;
    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


-- =========================================================
-- 2. PROFILES
-- =========================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,

    full_name TEXT,
    avatar_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 3. USER SETTINGS
-- =========================================================

CREATE TABLE public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE
        REFERENCES auth.users(id) ON DELETE CASCADE,

    theme TEXT NOT NULL DEFAULT 'system'
        CHECK (theme IN ('light', 'dark', 'system')),

    timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',

    pomodoro_duration INTEGER NOT NULL DEFAULT 25
        CHECK (pomodoro_duration BETWEEN 1 AND 180),

    short_break_duration INTEGER NOT NULL DEFAULT 5
        CHECK (short_break_duration BETWEEN 1 AND 60),

    long_break_duration INTEGER NOT NULL DEFAULT 15
        CHECK (long_break_duration BETWEEN 1 AND 120),

    version INTEGER NOT NULL DEFAULT 1,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- 4. CATEGORIES
-- =========================================================

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    name TEXT NOT NULL,

    color TEXT NOT NULL DEFAULT '#A8CFA8',
    icon TEXT NOT NULL DEFAULT 'folder',

    sort_order INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,

    UNIQUE (id, user_id),
    UNIQUE (user_id, name)
);


-- =========================================================
-- 5. RECURRING RULES
-- =========================================================

CREATE TABLE public.recurring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    title TEXT NOT NULL,

    recurrence_rule JSONB NOT NULL,

    timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',

    starts_on DATE NOT NULL,
    ends_on DATE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,

    UNIQUE (id, user_id),

    CHECK (length(trim(title)) > 0),
    CHECK (ends_on IS NULL OR ends_on >= starts_on)
);


-- =========================================================
-- 6. TASKS
-- =========================================================

CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    category_id UUID,
    recurring_rule_id UUID,

    title TEXT NOT NULL,
    description TEXT,

    status TEXT NOT NULL DEFAULT 'todo'
        CHECK (
            status IN (
                'backlog',
                'todo',
                'in_progress',
                'done'
            )
        ),

    priority TEXT NOT NULL DEFAULT 'medium'
        CHECK (
            priority IN (
                'high',
                'medium',
                'low'
            )
        ),

    scheduled_start_at TIMESTAMPTZ,
    scheduled_end_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,

    completed_at TIMESTAMPTZ,

    occurrence_key TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,

    UNIQUE (id, user_id),

    FOREIGN KEY (category_id, user_id)
        REFERENCES public.categories(id, user_id),

    FOREIGN KEY (recurring_rule_id, user_id)
        REFERENCES public.recurring_rules(id, user_id),

    CHECK (length(trim(title)) > 0),

    CHECK (
        scheduled_end_at IS NULL
        OR scheduled_start_at IS NULL
        OR scheduled_end_at > scheduled_start_at
    )
);


-- Mencegah duplikasi occurrence tugas berulang

CREATE UNIQUE INDEX tasks_recurring_occurrence_unique
ON public.tasks (recurring_rule_id, occurrence_key)
WHERE recurring_rule_id IS NOT NULL
AND occurrence_key IS NOT NULL;


-- =========================================================
-- 7. TASK HISTORY
-- =========================================================

CREATE TABLE public.task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    task_id UUID NOT NULL,

    action TEXT NOT NULL,

    old_value JSONB,
    new_value JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (task_id, user_id)
        REFERENCES public.tasks(id, user_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 8. DAILY GOALS
-- =========================================================

CREATE TABLE public.daily_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    title TEXT NOT NULL,

    target_date DATE NOT NULL,

    is_completed BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ,

    CHECK (length(trim(title)) > 0)
);


-- =========================================================
-- 9. NOTES
-- =========================================================

CREATE TABLE public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    title TEXT NOT NULL DEFAULT 'Untitled',
    content TEXT NOT NULL DEFAULT '',

    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    version INTEGER NOT NULL DEFAULT 1,
    deleted_at TIMESTAMPTZ
);


-- =========================================================
-- 10. FOCUS SESSIONS
-- =========================================================

CREATE TABLE public.focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    task_id UUID,

    planned_duration_minutes INTEGER NOT NULL DEFAULT 25,
    actual_duration_seconds INTEGER NOT NULL DEFAULT 0,

    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,

    status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (
        status IN (
            'in_progress',
            'completed',
            'interrupted',
            'cancelled'
        )
    ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (task_id, user_id)
        REFERENCES public.tasks(id, user_id),

    CHECK (planned_duration_minutes > 0),
    CHECK (actual_duration_seconds >= 0),

    CHECK (
        ended_at IS NULL
        OR ended_at >= started_at
    )
);


-- =========================================================
-- 11. SYNC METADATA
-- =========================================================

CREATE TABLE public.sync_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    device_id TEXT NOT NULL,

    last_pulled_at TIMESTAMPTZ,
    last_pushed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, device_id)
);


-- =========================================================
-- 12. INDEXES
-- =========================================================

CREATE INDEX idx_categories_user
ON public.categories(user_id);

CREATE INDEX idx_recurring_rules_user
ON public.recurring_rules(user_id);

CREATE INDEX idx_tasks_user
ON public.tasks(user_id);

CREATE INDEX idx_tasks_category
ON public.tasks(category_id);

CREATE INDEX idx_tasks_status
ON public.tasks(user_id, status);

CREATE INDEX idx_tasks_due_at
ON public.tasks(user_id, due_at);

CREATE INDEX idx_tasks_scheduled_start
ON public.tasks(user_id, scheduled_start_at);

CREATE INDEX idx_tasks_updated_at
ON public.tasks(user_id, updated_at);

CREATE INDEX idx_task_history_task
ON public.task_history(task_id, created_at);

CREATE INDEX idx_daily_goals_user_date
ON public.daily_goals(user_id, target_date);

CREATE INDEX idx_notes_user
ON public.notes(user_id);

CREATE INDEX idx_focus_sessions_user
ON public.focus_sessions(user_id, started_at);

CREATE INDEX idx_sync_metadata_user
ON public.sync_metadata(user_id);


-- =========================================================
-- 13. AUTOMATIC UPDATED_AT AND VERSION
-- =========================================================

CREATE TRIGGER categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_version();

CREATE TRIGGER recurring_rules_updated_at
BEFORE UPDATE ON public.recurring_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_version();

CREATE TRIGGER tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_version();

CREATE TRIGGER daily_goals_updated_at
BEFORE UPDATE ON public.daily_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_version();

CREATE TRIGGER notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_version();

CREATE TRIGGER user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_version();

CREATE TRIGGER sync_metadata_updated_at
BEFORE UPDATE ON public.sync_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();


CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();


-- =========================================================
-- 14. AUTOMATIC USER INITIALIZATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN

    INSERT INTO public.profiles (id, full_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name'
    );

    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id);

    INSERT INTO public.categories
        (user_id, name, color, icon, sort_order, is_default)
    VALUES
        (NEW.id, 'Academic', '#A8CFA8', 'graduation-cap', 1, TRUE),
        (NEW.id, 'Personal Development', '#F2D49B', 'book-open', 2, TRUE),
        (NEW.id, 'Organization', '#B9B5E8', 'users', 3, TRUE),
        (NEW.id, 'Health & Fitness', '#E9AFAF', 'heart-pulse', 4, TRUE),
        (NEW.id, 'Finance', '#A9C8E8', 'wallet', 5, TRUE),
        (NEW.id, 'Personal', '#E8C4A8', 'user', 6, TRUE);

    RETURN NEW;

END;
$$;


CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();


-- =========================================================
-- 15. ENABLE ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_metadata ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- 16. PROFILES POLICIES
-- =========================================================

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));


-- =========================================================
-- 17. USER SETTINGS POLICIES
-- =========================================================

CREATE POLICY "Users manage own settings"
ON public.user_settings
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));


-- =========================================================
-- 18. CATEGORIES POLICIES
-- =========================================================

CREATE POLICY "Users manage own categories"
ON public.categories
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));


-- =========================================================
-- 19. RECURRING RULES POLICIES
-- =========================================================

CREATE POLICY "Users manage own recurring rules"
ON public.recurring_rules
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));


-- =========================================================
-- 20. TASKS POLICIES
-- =========================================================

CREATE POLICY "Users manage own tasks"
ON public.tasks
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));


-- =========================================================
-- 21. TASK HISTORY POLICIES
-- =========================================================

CREATE POLICY "Users can view own task history"
ON public.task_history
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own task history"
ON public.task_history
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));


-- =========================================================
-- 22. DAILY GOALS POLICIES
-- =========================================================

CREATE POLICY "Users manage own daily goals"
ON public.daily_goals
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));


-- =========================================================
-- 23. NOTES POLICIES
-- =========================================================

CREATE POLICY "Users manage own notes"
ON public.notes
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));


-- =========================================================
-- 24. FOCUS SESSIONS POLICIES
-- =========================================================

CREATE POLICY "Users manage own focus sessions"
ON public.focus_sessions
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));


-- =========================================================
-- 25. SYNC METADATA POLICIES
-- =========================================================

CREATE POLICY "Users manage own sync metadata"
ON public.sync_metadata
FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));


-- =========================================================
-- 26. TABLE PERMISSIONS
-- =========================================================

REVOKE ALL ON TABLE
    public.profiles,
    public.user_settings,
    public.categories,
    public.recurring_rules,
    public.tasks,
    public.task_history,
    public.daily_goals,
    public.notes,
    public.focus_sessions,
    public.sync_metadata
FROM anon;

GRANT SELECT, UPDATE
ON public.profiles
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE
    public.user_settings,
    public.categories,
    public.recurring_rules,
    public.tasks,
    public.daily_goals,
    public.notes,
    public.focus_sessions,
    public.sync_metadata
TO authenticated;

GRANT SELECT, INSERT
ON public.task_history
TO authenticated;


-- =========================================================
-- END OF BISMILLAH KELAR INITIAL SCHEMA
-- =========================================================