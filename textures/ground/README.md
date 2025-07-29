 # Текстуры фона площадки

Эта папка содержит все текстуры для различных типов фона площадки.

## Файлы

### 🌱 Трава
- `grass_texture.png` - Текстура травы (8.5MB)
  - Цвет: #4CAF50 (зеленый)
  - Roughness: 0.7
  - Metalness: 0.1

### 🏖️ Песок
- `smooth-sand-dunes-2048x2048.png` - Гладкие песчаные дюны (4.3MB)
  - Цвет: #F4D03F (желтый песок)
  - Roughness: 0.9
  - Metalness: 0.05

### 🌍 Земля
- `red-sand-ground-2048x2048.png` - Красноватая земля (7.6MB)
  - Цвет: #8B4513 (коричневый)
  - Roughness: 0.8
  - Metalness: 0.1

### 🧱 Бетон
- `concrete-wall-2048x2048.png` - Бетонная стена (8.3MB)
  - Цвет: #95A5A6 (серый)
  - Roughness: 0.6
  - Metalness: 0.2

## Замена текстур

Для замены текстур:
1. Подготовьте изображение в формате PNG
2. Рекомендуемый размер: 2048x2048 пикселей
3. Замените соответствующий файл
4. Убедитесь, что текстура хорошо повторяется (seamless)

## Использование в коде

Текстуры автоматически загружаются через `backgroundManager.js`:
- Трава: `textures/ground/grass_texture.png`
- Песок: `textures/ground/smooth-sand-dunes-2048x2048.png`
- Земля: `textures/ground/red-sand-ground-2048x2048.png`
- Бетон: `textures/ground/concrete-wall-2048x2048.png` 