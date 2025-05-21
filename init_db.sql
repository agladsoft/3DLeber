-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы моделей
CREATE TABLE IF NOT EXISTS models (
    id SERIAL PRIMARY KEY,
    article VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание таблицы сессий
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    model_id INTEGER REFERENCES models(id),
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_models_article ON models(article);
CREATE INDEX IF NOT EXISTS idx_models_name ON models(name);
CREATE INDEX IF NOT EXISTS idx_models_category ON models(category);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_model_id ON sessions(model_id);

-- Добавление комментариев к таблицам
COMMENT ON TABLE users IS 'Таблица пользователей';
COMMENT ON TABLE models IS 'Таблица моделей игрового оборудования';
COMMENT ON TABLE sessions IS 'Таблица сессий, связывающая пользователей и модели';

-- Добавление комментариев к колонкам
COMMENT ON COLUMN users.user_id IS 'Уникальный идентификатор пользователя';
COMMENT ON COLUMN models.article IS 'Артикул модели';
COMMENT ON COLUMN models.name IS 'Название модели';
COMMENT ON COLUMN models.description IS 'Описание модели';
COMMENT ON COLUMN models.category IS 'Категория модели';
COMMENT ON COLUMN sessions.quantity IS 'Количество моделей в сессии'; 