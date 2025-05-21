-- Удаляем существующий обычный индекс
DROP INDEX IF EXISTS idx_sessions_user_id;

-- Добавляем уникальный индекс
ALTER TABLE sessions
DROP CONSTRAINT IF EXISTS sessions_user_id_key;

ALTER TABLE sessions
ADD CONSTRAINT sessions_user_id_key UNIQUE (user_id);

-- Добавляем комментарий
COMMENT ON CONSTRAINT sessions_user_id_key ON sessions IS 'Уникальный ключ для user_id в sessions - у пользователя может быть только одна активная сессия';
