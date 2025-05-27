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
    user_id INTEGER REFERENCES users(id) UNIQUE,
    session_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавляем комментарии
COMMENT ON TABLE sessions IS 'Таблица для хранения сессий пользователей';
COMMENT ON COLUMN sessions.session_data IS 'JSON данные сессии, включая размещенные модели и их координаты'; 

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_models_name ON models(name);
CREATE INDEX IF NOT EXISTS idx_models_category ON models(category);

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

-- Вставка тестового пользователя
INSERT INTO users (user_id) 
VALUES ('id_12345678')
ON CONFLICT (user_id) DO NOTHING;

-- Вставка моделей
INSERT INTO models (article, name, description, category) VALUES
    ('ЛГД-19', 'ЛГД-19 Домик Белочка (TE319)', 'Детский игровой домик ''Белочка''', 'Домики'),
    ('ЛГК-24.7', 'ЛГК-24.7 Качалка на пружине Рыбка', 'Качалка на пружине в виде рыбки', 'Качалки'),
    ('ЛГИК-7.26', 'ЛГИК-7.26 Игровой комплекс Весна-6 (TE706)', 'Игровой комплекс ''Весна-6''', 'Комплексы'),
    ('ЛГИК-7.03', 'ЛГИК-7.03 Игровой комплекс Черепашка (TE703)', 'Игровой комплекс ''Черепашка''', 'Комплексы'),
    ('ЛГИК-7.01', 'ЛГИК-7.01 Игровой комплекс Весна (TE701)', 'Игровой комплекс ''Весна''', 'Комплексы'),
    ('ЛГД-29', 'ЛГД-29 Домик Спускаемый модуль (1384)', 'Детский игровой домик ''Спускаемый модуль''', 'Домики'),
    ('ЛГД-25', 'ЛГД-25 Домик Вертолет (3701.2)', 'Детский игровой домик ''Вертолет''', 'Домики'),
    ('ЛГД-23', 'ЛГД-23 Домик Деревня (TE323)', 'Детский игровой домик ''Деревня''', 'Домики'),
    ('ЛГД-14', 'ЛГД-14 Беседка Хижина (1364)', 'Детская беседка ''Хижина''', 'Беседки'),
    ('ЛГВО-421', 'ЛГВО-421 Спортивный комплекс ЛГВО-421 (Нержавеющая сталь) (2279.50)', 'Спортивный комплекс из нержавеющей стали', 'Спортивные комплексы')
ON CONFLICT (article) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category;