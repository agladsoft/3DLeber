#!/bin/bash

# Скрипт для безопасной миграции на новые стили

echo "🎨 Начинаем миграцию на новый дизайн..."

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: запустите скрипт из корневой директории проекта"
    exit 1
fi

# Создаем резервные копии
echo "📦 Создаем резервные копии..."
mkdir -p backup_$(date +%Y%m%d_%H%M%S)
cp -r css backup_$(date +%Y%m%d_%H%M%S)/
cp index.html backup_$(date +%Y%m%d_%H%M%S)/
cp -r js backup_$(date +%Y%m%d_%H%M%S)/

# Проверяем, что новые файлы созданы
if [ ! -f "css/styles_new.css" ]; then
    echo "❌ Ошибка: новый CSS файл не найден"
    exit 1
fi

if [ ! -f "index_new.html" ]; then
    echo "❌ Ошибка: новый HTML файл не найден"
    exit 1
fi

# Применяем новые стили
echo "🔄 Применяем новые стили..."
cp css/styles_new.css css/styles.css
cp index_new.html index.html

# Добавляем шрифты Google Fonts в index.html если их нет
if ! grep -q "fonts.googleapis.com" index.html; then
    echo "📝 Добавляем подключение шрифтов..."
    sed -i '' '/<\/head>/i\
    <link href="https://fonts.googleapis.com/css2?family=TT+Lakes+Neue:wght@300;400;500;700&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">' index.html
fi

echo "✅ Миграция завершена!"
echo ""
echo "📋 Что было сделано:"
echo "  - Созданы резервные копии в папке backup_*"
echo "  - Применены новые стили из Figma"
echo "  - Обновлен HTML с новой структурой"
echo "  - Добавлены необходимые шрифты"
echo ""
echo "🚀 Теперь запустите проект командой: npm run dev"