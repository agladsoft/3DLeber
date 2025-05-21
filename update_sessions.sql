-- Обновляем структуру таблицы sessions
ALTER TABLE sessions 
DROP COLUMN IF EXISTS model_id,
DROP COLUMN IF EXISTS quantity,
ADD COLUMN IF NOT EXISTS session_data JSONB;

-- Создаем индекс для быстрого поиска по user_id
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Добавляем комментарии
COMMENT ON TABLE sessions IS 'Таблица для хранения сессий пользователей';
COMMENT ON COLUMN sessions.session_data IS 'JSON данные сессии, включая размещенные модели и их координаты'; 