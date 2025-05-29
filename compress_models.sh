#!/bin/bash

# Создаем директорию для сжатых моделей, если она не существует
mkdir -p models_compressed

# Проходим по всем .glb файлам в директории models
for model in models/*.glb; do
    if [ -f "$model" ]; then
        # Получаем имя файла без пути
        filename=$(basename "$model")
        echo "Сжимаем модель: $filename"
        
        # Сжимаем модель с помощью gltf-pipeline
        gltf-pipeline -i "$model" -o "models_compressed/$filename" -d
        
        # Выводим размеры оригинального и сжатого файлов
        original_size=$(du -h "$model" | cut -f1)
        compressed_size=$(du -h "models_compressed/$filename" | cut -f1)
        echo "Оригинальный размер: $original_size"
        echo "Сжатый размер: $compressed_size"
        echo "------------------------"
    fi
done

echo "Сжатие завершено!" 