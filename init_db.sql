-- Создание таблицы пользователей
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(50) UNIQUE NOT NULL,
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
    project_id INTEGER REFERENCES projects(id) UNIQUE,
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
COMMENT ON TABLE projects IS 'Таблица проектов';
COMMENT ON TABLE models IS 'Таблица моделей игрового оборудования';
COMMENT ON TABLE sessions IS 'Таблица сессий, связывающая пользователей и модели';

-- Добавление комментариев к колонкам
COMMENT ON COLUMN projects.project_id IS 'Уникальный идентификатор проекта';
COMMENT ON COLUMN models.article IS 'Артикул модели';
COMMENT ON COLUMN models.name IS 'Название модели';
COMMENT ON COLUMN models.description IS 'Описание модели';
COMMENT ON COLUMN models.category IS 'Категория модели';

-- Вставка тестового проекта
INSERT INTO projects (project_id) 
VALUES ('id_12345678')
ON CONFLICT (project_id) DO NOTHING;

-- Вставка моделей
INSERT INTO models (article, name, description, category) VALUES
    ('ЛГД-19', 'ЛГД-19 Домик Белочка (TE319)', 'Детский игровой домик "Белочка"', 'Домики'),
    ('ЛГК-24.7', 'ЛГК-24.7 Качалка на пружине Рыбка', 'Качалка на пружине "Рыбка"', 'Качалки'),
    ('ЛГИК-7.26', 'ЛГИК-7.26 Игровой комплекс Весна-6 (TE706)', 'Игровой комплекс "Весна-6"', 'Комплексы'),
    ('ЛГИК-7.03', 'ЛГИК-7.03 Игровой комплекс Черепашка (TE703)', 'Игровой комплекс "Черепашка"', 'Комплексы'),
    ('ЛГИК-7.01', 'ЛГИК-7.01 Игровой комплекс Весна (TE701)', 'Игровой комплекс "Весна"', 'Комплексы'),
    ('ЛГД-29', 'ЛГД-29 Домик Спускаемый модуль (1384)', 'Детский игровой домик "Спускаемый модуль"', 'Домики'),
    ('ЛГД-25', 'ЛГД-25 Домик Вертолет (3701.2)', 'Детский игровой домик "Вертолет"', 'Домики'),
    ('ЛГД-23', 'ЛГД-23 Домик Деревня (TE323)', 'Детский игровой домик "Деревня"', 'Домики'),
    ('ЛГД-14', 'ЛГД-14 Беседка Хижина (1364)', 'Детская беседка "Хижина"', 'Беседки'),
    ('ЛГВО-421', 'ЛГВО-421 Спортивный комплекс ЛГВО-421 (Нержавеющая сталь) (2279.50)', 'Спортивный комплекс из нержавеющей стали', 'Спортивные комплексы')
ON CONFLICT (article) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- Вставка моделей из GLB файлов
INSERT INTO models (article, name, description, category) VALUES
    ('ЛГИК-02.01', 'ЛГИК-02.01 Игровой комплекс Рёло 02.01', 'Игровой комплекс Рёло 02.01', 'Комплексы'),
    ('ЛГИК-02.18', 'ЛГИК-02.18 Игровой комплекс Рёло 02.18', 'Игровой комплекс Рёло 02.18', 'Комплексы'),
    ('ЛГИК-02.17-1', 'ЛГИК-02.17-1 Игровой комплекс Рёло', 'Игровой комплекс Рёло', 'Комплексы'),
    ('ЛГИК-02.17', 'ЛГИК-02.17 Игровой комплекс Рёло 02.17', 'Игровой комплекс Рёло 02.17', 'Комплексы'),
    ('ЛГИК-02.16', 'ЛГИК-02.16 Игровой комплекс Рёло 02.16', 'Игровой комплекс Рёло 02.16', 'Комплексы'),
    ('ЛГИК-02.14', 'ЛГИК-02.14 Игровой комплекс Рёло 02.14', 'Игровой комплекс Рёло 02.14', 'Комплексы'),
    ('ЛГИК-02.13', 'ЛГИК-02.13 Игровой комплекс Рёло 02.13', 'Игровой комплекс Рёло 02.13', 'Комплексы'),
    ('ЛГИК-02.12', 'ЛГИК-02.12 Игровой комплекс Рёло 02.12', 'Игровой комплекс Рёло 02.12', 'Комплексы'),
    ('ЛГИК-02.11', 'ЛГИК-02.11 Игровой комплекс Рёло 02.11', 'Игровой комплекс Рёло 02.11', 'Комплексы'),
    ('ЛГИК-02.04', 'ЛГИК-02.04 Игровой комплекс Рёло 02.04', 'Игровой комплекс Рёло 02.04', 'Комплексы'),
    ('ЛГИК-02.03', 'ЛГИК-02.03 Игровой комплекс Рёло 02.03', 'Игровой комплекс Рёло 02.03', 'Комплексы'),
    ('ЛГИК-02.02', 'ЛГИК-02.02 Игровой комплекс Рёло 02.02', 'Игровой комплекс Рёло 02.02', 'Комплексы'),
    ('ЛГД-16.06', 'ЛГД-16.06 Домик Бриум 16.06', 'Домик Бриум 16.06', 'Домики'),
    ('ЛГИК-16.01', 'ЛГИК-16.01 Игровой комплекс Бриум', 'Игровой комплекс Бриум', 'Комплексы'),
    ('ЛГИК-16.02', 'ЛГИК-16.02 Игровой комплекс Бриум', 'Игровой комплекс Бриум', 'Комплексы'),
    ('ЛГИК-16.03', 'ЛГИК-16.03 Игровой комплекс Бриум', 'Игровой комплекс Бриум', 'Комплексы'),
    ('ЛГИК-16.04', 'ЛГИК-16.04 Игровой комплекс Бриум', 'Игровой комплекс Бриум', 'Комплексы'),
    ('ЛГИК-16.05', 'ЛГИК-16.05 Игровой комплекс Бриум', 'Игровой комплекс Бриум', 'Комплексы'),
    ('ЛГИК-16.10', 'ЛГИК-16.10 Игровой комплекс Бриум', 'Игровой комплекс Бриум', 'Комплексы'),
    ('ЛГИК-16.11', 'ЛГИК-16.11 Игровой комплекс Бриум', 'Игровой комплекс Бриум', 'Комплексы'),
    ('ЛГИК-16.12', 'ЛГИК-16.12 Игровой комплекс Бриум', 'Игровой комплекс Бриум', 'Комплексы'),
    ('ЛГИК-16.13', 'ЛГИК-16.13 Игровой комплекс Бриум', 'Игровой комплекс Бриум', 'Комплексы'),
    ('ЛГИК-16.14', 'ЛГИК-16.14 Игровой комплекс Бриум', 'Игровой комплекс Бриум', 'Комплексы'),
    ('ЛГИК-16.15', 'ЛГИК-16.15 Игровой комплекс Бриум', 'Игровой комплекс Бриум', 'Комплексы')
ON CONFLICT (article) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- Добавление моделей деревьев, кустарников, пальм и людей
INSERT INTO models (article, name, description, category) VALUES
    -- Деревья
    ('TREE-001', 'tree_test', 'Тестовое дерево', 'Деревья'),
    ('TREE-002', 'tree_for_games', 'Дерево для игр', 'Деревья'),
    ('TREE-003', 'tree_elm', 'Вяз', 'Деревья'),
    ('TREE-004', 'tree_3d_model_linden_tree', '3D модель липы', 'Деревья'),
    ('TREE-005', 'realistic_tree', 'Реалистичное дерево', 'Деревья'),
    ('TREE-006', 'realistic_tree_2_free', 'Реалистичное дерево 2', 'Деревья'),
    ('TREE-007', 'realistic_high_poly_tree', 'Реалистичное высокополигональное дерево', 'Деревья'),
    ('TREE-008', 'maple_tree', 'Клён', 'Деревья'),
    ('TREE-009', 'pine_tree (2)', 'Сосна', 'Деревья'),
    ('TREE-010', 'realistic_hd_hong_kong_orchid_tree_1540', 'Гонконгское орхидейное дерево', 'Деревья'),
    -- Пальмы
    ('PALM-001', 'realistic_palm_tree_4_free', 'Реалистичная пальма 4', 'Пальмы'),
    ('PALM-002', 'realistic_hd_christmas_palm_935', 'Рождественская пальма', 'Пальмы'),
    ('PALM-003', 'realistic_hd_alexander_palm_2830', 'Пальма Александра', 'Пальмы'),
    ('PALM-004', 'realistic_hd_alexander_palm_2830 (1)', 'Пальма Александра (вариант 2)', 'Пальмы'),
    ('PALM-005', 'palm_tree_55k_triangles', 'Пальма (55k треугольников)', 'Пальмы'),
    ('PALM-006', 'palm_tree', 'Пальма', 'Пальмы'),
    ('PALM-007', 'free_game_ready_palm', 'Игровая пальма', 'Пальмы'),
    ('PALM-008', 'date_palm', 'Финиковая пальма', 'Пальмы'),
    ('PALM-009', 'coconut_tree_low_poly', 'Кокосовая пальма (низкополигональная)', 'Пальмы'),
    ('PALM-010', 'coconut_palm', 'Кокосовая пальма', 'Пальмы'),
    -- Кустарники и растения
    ('BUSH-001', 'bush', 'Кустарник базовый', 'Кустарники'),
    ('BUSH-002', 'realistic_bushtree_dwarf_umbrella', 'Карликовое зонтичное дерево-куст', 'Кустарники'),
    ('BUSH-003', 'photorealistic_bush', 'Фотореалистичный куст', 'Кустарники'),
    ('BUSH-004', 'low_poly_bush_buxus', 'Самшит (низкополигональный)', 'Кустарники'),
    ('BUSH-005', 'realistic_hd_yellow_bush_lupine_2425', 'Жёлтый куст люпина 2425', 'Кустарники'),
    ('BUSH-006', 'realistic_hd_yellow_bush_lupine_2425 (1)', 'Жёлтый куст люпина 2425 (вариант 2)', 'Кустарники'),
    ('BUSH-007', 'realistic_hd_yellow_bush_lupine_225', 'Жёлтый куст люпина 225', 'Кустарники'),
    ('BUSH-008', 'realistic_hd_yellow_bush_lupine_2225', 'Жёлтый куст люпина 2225', 'Кустарники'),
    ('BUSH-009', 'realistic_hd_yellow_bush_lupine_2025', 'Жёлтый куст люпина 2025', 'Кустарники'),
    ('BUSH-010', 'realistic_hd_yellow_bush_lupine_1625', 'Жёлтый куст люпина 1625', 'Кустарники'),
    ('BUSH-011', 'realistic_hd_yellow_bush_lupine_1525', 'Жёлтый куст люпина 1525', 'Кустарники'),
    ('BUSH-012', 'realistic_hd_yellow_bush_lupine_125', 'Жёлтый куст люпина 125', 'Кустарники'),
    ('BUSH-013', 'realistic_hd_yellow_bush_lupine_1125', 'Жёлтый куст люпина 1125', 'Кустарники'),
    -- Люди
    ('PEOPLE-001', 'teen_boy_running__rigged__free', 'Бегущий подросток (с риггингом)', 'Люди'),
    ('PEOPLE-002', 'nathan_animated_003_-_walking_3d_man', 'Натан - идущий человек (анимированный)', 'Люди')
ON CONFLICT (article) DO UPDATE 
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- ============================================================================
-- СТРУКТУРА ДЛЯ КЛИМАТИЧЕСКИХ ЗОН
-- ============================================================================

-- Таблица климатических зон
CREATE TABLE IF NOT EXISTS climate_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица настроек окружения для климатических зон (объединенная)
CREATE TABLE IF NOT EXISTS climate_environment_settings (
    id SERIAL PRIMARY KEY,
    climate_zone_id INTEGER REFERENCES climate_zones(id) ON DELETE CASCADE,
    -- Настройки HDRI и камеры
    hdri_file_path VARCHAR(255) NOT NULL,
    hdri_display_name VARCHAR(100) NOT NULL,
    camera_fov DECIMAL(5,2) DEFAULT 75.0, -- Поле зрения камеры
    camera_near DECIMAL(5,2) DEFAULT 0.1, -- Ближняя плоскость отсечения
    camera_far DECIMAL(8,2) DEFAULT 1000.0, -- Дальняя плоскость отсечения
    background_size DECIMAL(8,2) DEFAULT 1000.0, -- Размер фоновой поверхности
    -- Настройки поверхности
    surface_texture_path VARCHAR(255) NOT NULL,
    surface_display_name VARCHAR(100) NOT NULL,
    surface_color VARCHAR(7) DEFAULT '#4CAF50', -- HEX цвет
    surface_roughness DECIMAL(3,2) DEFAULT 0.7,
    surface_metalness DECIMAL(3,2) DEFAULT 0.1,
    texture_repeat_factor DECIMAL(5,2) DEFAULT 20.0,
    -- Настройки освещения
    tone_mapping_exposure DECIMAL(3,2) DEFAULT 0.5, -- Экспозиция tone mapping рендерера
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица связи моделей с климатическими зонами
CREATE TABLE IF NOT EXISTS model_climate_zones (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    climate_zone_id INTEGER REFERENCES climate_zones(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(model_id, climate_zone_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_climate_zones_name ON climate_zones(name);
CREATE INDEX IF NOT EXISTS idx_climate_zones_active ON climate_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_climate_environment_settings_zone ON climate_environment_settings(climate_zone_id);
CREATE INDEX IF NOT EXISTS idx_model_climate_zones_model ON model_climate_zones(model_id);
CREATE INDEX IF NOT EXISTS idx_model_climate_zones_climate ON model_climate_zones(climate_zone_id);

-- Комментарии к таблицам
COMMENT ON TABLE climate_zones IS 'Таблица климатических зон';
COMMENT ON TABLE climate_environment_settings IS 'Объединенные настройки окружения, поверхности и освещения для климатических зон';
COMMENT ON TABLE model_climate_zones IS 'Связь моделей с климатическими зонами';

-- Комментарии к колонкам
COMMENT ON COLUMN climate_zones.name IS 'Уникальное имя климатической зоны (для кода)';
COMMENT ON COLUMN climate_zones.display_name IS 'Отображаемое имя климатической зоны';
COMMENT ON COLUMN climate_environment_settings.hdri_file_path IS 'Путь к HDRI файлу';
COMMENT ON COLUMN climate_environment_settings.camera_fov IS 'Поле зрения камеры (FOV) в градусах';
COMMENT ON COLUMN climate_environment_settings.camera_near IS 'Ближняя плоскость отсечения камеры';
COMMENT ON COLUMN climate_environment_settings.camera_far IS 'Дальняя плоскость отсечения камеры';
COMMENT ON COLUMN climate_environment_settings.background_size IS 'Размер фоновой поверхности';
COMMENT ON COLUMN climate_environment_settings.surface_texture_path IS 'Путь к текстуре поверхности';
COMMENT ON COLUMN climate_environment_settings.texture_repeat_factor IS 'Коэффициент повторения текстуры';
COMMENT ON COLUMN climate_environment_settings.tone_mapping_exposure IS 'Экспозиция tone mapping рендерера (0.1-2.0)';


-- ============================================================================
-- ДАННЫЕ ДЛЯ КЛИМАТИЧЕСКИХ ЗОН
-- ============================================================================


-- Вставка климатических зон
INSERT INTO climate_zones (name, display_name, description) VALUES
    ('russia_cis', 'Россия и СНГ', 'Климатическая зона для России и стран СНГ с умеренным климатом'),
    ('middle_east', 'Средний Восток', 'Климатическая зона для стран Среднего Востока с жарким климатом')
ON CONFLICT (name) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;



-- Настройки окружения для России и СНГ (Осенний парк + Трава)
INSERT INTO climate_environment_settings (
    climate_zone_id, 
    hdri_file_path, hdri_display_name,
    camera_fov, camera_near, camera_far, background_size,
    surface_texture_path, surface_display_name, surface_color, surface_roughness, surface_metalness, texture_repeat_factor,
    tone_mapping_exposure
) 
SELECT 
    cz.id, 
    'textures/hdri/autumn_park_4k.exr', 'Осенний парк',
    75.0, 0.1, 1000.0, 1000.0,
    'textures/ground/grass_texture.png', 'Трава', '#7CB342', 0.8, 0.0, 20.0,
    0.5 -- Умеренная экспозиция для осеннего климата
FROM climate_zones cz WHERE cz.name = 'russia_cis';




-- Настройки окружения для России и СНГ (Летний парк + Трава)
INSERT INTO climate_environment_settings (
    climate_zone_id, 
    hdri_file_path, hdri_display_name,
    camera_fov, camera_near, camera_far, background_size,
    surface_texture_path, surface_display_name, surface_color, surface_roughness, surface_metalness, texture_repeat_factor,
    tone_mapping_exposure
) 
SELECT 
    cz.id, 
    'textures/hdri/green_point_park_4k.exr', 'Летний парк',
    75.0, 0.1, 1000.0, 1000.0,
    'textures/ground/grass_texture.png', 'Трава', '#7CB342', 0.8, 0.0, 20.0,
    0.5 -- Умеренная экспозиция для летнего климата
FROM climate_zones cz WHERE cz.name = 'russia_cis';



-- Настройки окружения для России и СНГ (Городской парк + Трава)
INSERT INTO climate_environment_settings (
    climate_zone_id, 
    hdri_file_path, hdri_display_name,
    camera_fov, camera_near, camera_far, background_size,
    surface_texture_path, surface_display_name, surface_color, surface_roughness, surface_metalness, texture_repeat_factor,
    tone_mapping_exposure
) 
SELECT 
    cz.id, 
    'textures/hdri/buikslotermeerplein_4k.exr', 'Городской парк',
    75.0, 0.1, 1000.0, 1000.0,
    'textures/ground/grass_texture.png', 'Трава', '#7CB342', 0.8, 0.0, 20.0,
    0.5 -- Умеренная экспозиция для городского климата
FROM climate_zones cz WHERE cz.name = 'russia_cis';

-- Настройки окружения для России и СНГ (Городской парк + Песок)
INSERT INTO climate_environment_settings (
    climate_zone_id, 
    hdri_file_path, hdri_display_name,
    camera_fov, camera_near, camera_far, background_size,
    surface_texture_path, surface_display_name, surface_color, surface_roughness, surface_metalness, texture_repeat_factor,
    tone_mapping_exposure
) 
SELECT 
    cz.id, 
    'textures/hdri/buikslotermeerplein_4k.exr', 'Городской парк',
    75.0, 0.1, 1000.0, 1000.0,
    'textures/ground/smooth-sand-dunes-2048x2048.png', 'Песок', '#F4D03F', 0.95, 0.0, 15.0,
    0.5 -- Умеренная экспозиция для городского климата
FROM climate_zones cz WHERE cz.name = 'russia_cis';

-- Настройки окружения для России и СНГ (Городской парк + Земля)
INSERT INTO climate_environment_settings (
    climate_zone_id, 
    hdri_file_path, hdri_display_name,
    camera_fov, camera_near, camera_far, background_size,
    surface_texture_path, surface_display_name, surface_color, surface_roughness, surface_metalness, texture_repeat_factor,
    tone_mapping_exposure
) 
SELECT 
    cz.id, 
    'textures/hdri/buikslotermeerplein_4k.exr', 'Городской парк',
    75.0, 0.1, 1000.0, 1000.0,
    'textures/ground/red-sand-ground-2048x2048.png', 'Земля', '#db9e6c', 0.9, 0.0, 12.0,
    0.5 -- Умеренная экспозиция для городского климата
FROM climate_zones cz WHERE cz.name = 'russia_cis';

-- Настройки окружения для России и СНГ (Городской парк + Бетон)
INSERT INTO climate_environment_settings (
    climate_zone_id, 
    hdri_file_path, hdri_display_name,
    camera_fov, camera_near, camera_far, background_size,
    surface_texture_path, surface_display_name, surface_color, surface_roughness, surface_metalness, texture_repeat_factor,
    tone_mapping_exposure
) 
SELECT 
    cz.id, 
    'textures/hdri/buikslotermeerplein_4k.exr', 'Городской парк',
    75.0, 0.1, 1000.0, 1000.0,
    'textures/ground/concrete-wall-2048x2048.png', 'Бетон', '#95A5A6', 0.7, 0.1, 25.0,
    0.5 -- Умеренная экспозиция для городского климата
FROM climate_zones cz WHERE cz.name = 'russia_cis';




-- Настройки окружения для Среднего Востока (Осенний парк)
INSERT INTO climate_environment_settings (
    climate_zone_id, 
    hdri_file_path, hdri_display_name,
    camera_fov, camera_near, camera_far, background_size,
    surface_texture_path, surface_display_name, surface_color, surface_roughness, surface_metalness, texture_repeat_factor,
    tone_mapping_exposure
) 
SELECT 
    cz.id, 
    'textures/hdri/autumn_park_4k.exr', 'Осенний парк',
    75.0, 0.1, 1000.0, 1000.0,
    'textures/ground/grass_texture.png', 'Трава', '#7CB342', 0.8, 0.0, 20.0,
    0.5 -- Умеренная экспозиция для осеннего климата
FROM climate_zones cz WHERE cz.name = 'middle_east';






-- Связь моделей с климатическими зонами (Россия и СНГ)
INSERT INTO model_climate_zones (model_id, climate_zone_id)
SELECT m.id, cz.id
FROM models m, climate_zones cz 
WHERE cz.name = 'russia_cis' 
AND m.category IN ('Пальмы', 'Кустарники')
ON CONFLICT (model_id, climate_zone_id) DO NOTHING;

-- Связь моделей с климатическими зонами (Средний Восток)
INSERT INTO model_climate_zones (model_id, climate_zone_id)
SELECT m.id, cz.id
FROM models m, climate_zones cz 
WHERE cz.name = 'middle_east' 
AND m.category IN ('Деревья', 'Кустарники')
ON CONFLICT (model_id, climate_zone_id) DO NOTHING;