/**
 * Модуль валидации площадок
 * Проверяет корректность создаваемых площадок и их соответствие стандартам
 */

class PlaygroundValidator {
    constructor(editor) {
        this.editor = editor;
        this.minArea = 20; // минимальная площадь в м²
        this.maxArea = 2000; // максимальная площадь в м²
        this.minWidth = 3; // минимальная ширина в м
        this.maxWidth = 100; // максимальная ширина в м
    }

    /**
     * Валидация всех объектов площадки
     */
    validateAll() {
        const playgroundObjects = this.editor.canvas.getObjects()
            .filter(obj => obj.objectType === 'playground');
        
        const results = {
            isValid: true,
            warnings: [],
            errors: [],
            suggestions: []
        };

        playgroundObjects.forEach((obj, index) => {
            const objResult = this.validateObject(obj, index);
            
            if (!objResult.isValid) {
                results.isValid = false;
            }
            
            results.warnings.push(...objResult.warnings);
            results.errors.push(...objResult.errors);
            results.suggestions.push(...objResult.suggestions);
        });

        // Общие проверки
        this.validateOverallDesign(playgroundObjects, results);

        return results;
    }

    /**
     * Валидация отдельного объекта
     */
    validateObject(obj, index) {
        const result = {
            isValid: true,
            warnings: [],
            errors: [],
            suggestions: []
        };

        // Проверка размеров
        const bounds = obj.getBoundingRect();
        const widthM = bounds.width * this.editor.scale;
        const heightM = bounds.height * this.editor.scale;
        const area = this.calculateObjectArea(obj);

        // Проверка минимальных размеров
        if (widthM < this.minWidth || heightM < this.minWidth) {
            result.errors.push({
                type: 'size',
                message: `Объект ${index + 1}: Слишком маленькие размеры (мин. ${this.minWidth}м)`,
                object: obj
            });
            result.isValid = false;
        }

        // Проверка максимальных размеров
        if (widthM > this.maxWidth || heightM > this.maxWidth) {
            result.warnings.push({
                type: 'size',
                message: `Объект ${index + 1}: Очень большие размеры (${widthM.toFixed(1)}×${heightM.toFixed(1)}м)`,
                object: obj
            });
        }

        // Проверка площади
        if (area < this.minArea) {
            result.errors.push({
                type: 'area',
                message: `Объект ${index + 1}: Площадь слишком мала (${area.toFixed(1)}м², мин. ${this.minArea}м²)`,
                object: obj
            });
            result.isValid = false;
        }

        if (area > this.maxArea) {
            result.warnings.push({
                type: 'area',
                message: `Объект ${index + 1}: Площадь очень большая (${area.toFixed(1)}м²)`,
                object: obj
            });
        }

        // Проверка формы
        this.validateShape(obj, result, index);

        return result;
    }

    /**
     * Валидация формы объекта
     */
    validateShape(obj, result, index) {
        if (obj.type === 'polygon') {
            const points = obj.points;
            
            // Проверка количества точек
            if (points.length < 3) {
                result.errors.push({
                    type: 'shape',
                    message: `Объект ${index + 1}: Недостаточно точек для многоугольника`,
                    object: obj
                });
                result.isValid = false;
            }

            // Проверка самопересечения
            if (this.hasSelfintersection(points)) {
                result.warnings.push({
                    type: 'shape',
                    message: `Объект ${index + 1}: Многоугольник имеет самопересечения`,
                    object: obj
                });
            }

            // Проверка выпуклости
            if (!this.isConvex(points)) {
                result.suggestions.push({
                    type: 'shape',
                    message: `Объект ${index + 1}: Рассмотрите использование выпуклой формы для лучшей безопасности`,
                    object: obj
                });
            }
        }

        // Проверка соотношения сторон
        const bounds = obj.getBoundingRect();
        const ratio = Math.max(bounds.width, bounds.height) / Math.min(bounds.width, bounds.height);
        
        if (ratio > 10) {
            result.warnings.push({
                type: 'shape',
                message: `Объект ${index + 1}: Слишком вытянутая форма (соотношение ${ratio.toFixed(1)}:1)`,
                object: obj
            });
        }
    }

    /**
     * Валидация общего дизайна
     */
    validateOverallDesign(objects, results) {
        if (objects.length === 0) {
            results.errors.push({
                type: 'general',
                message: 'Площадка не содержит ни одного элемента'
            });
            results.isValid = false;
            return;
        }

        // Проверка общей площади
        const totalArea = objects.reduce((sum, obj) => sum + this.calculateObjectArea(obj), 0);
        
        if (totalArea < this.minArea) {
            results.errors.push({
                type: 'general',
                message: `Общая площадь слишком мала: ${totalArea.toFixed(1)}м² (мин. ${this.minArea}м²)`
            });
            results.isValid = false;
        }

        // Проверка пересечений между объектами
        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                if (this.objectsIntersect(objects[i], objects[j])) {
                    results.warnings.push({
                        type: 'intersection',
                        message: `Объекты ${i + 1} и ${j + 1} пересекаются`
                    });
                }
            }
        }

        // Предложения по улучшению
        if (objects.length === 1) {
            results.suggestions.push({
                type: 'design',
                message: 'Рассмотрите добавление нескольких зон для разнообразия'
            });
        }

        if (totalArea > 500) {
            results.suggestions.push({
                type: 'design',
                message: 'Большая площадка - рассмотрите разделение на функциональные зоны'
            });
        }
    }

    /**
     * Расчет площади объекта
     */
    calculateObjectArea(obj) {
        const scale = this.editor.scale;
        
        switch (obj.type) {
            case 'polygon':
                return this.calculatePolygonArea(obj.points) * scale * scale;
                
            case 'rect':
                return (obj.width * obj.scaleX) * (obj.height * obj.scaleY) * scale * scale;
                
            case 'circle':
                const radius = obj.radius * obj.scaleX * scale;
                return Math.PI * radius * radius;
                
            case 'path':
                // Приблизительный расчет для свободного рисования
                const bounds = obj.getBoundingRect();
                return bounds.width * bounds.height * scale * scale * 0.6; // коэффициент заполнения
                
            default:
                return 0;
        }
    }

    /**
     * Расчет площади многоугольника
     */
    calculatePolygonArea(points) {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
    }

    /**
     * Проверка самопересечения многоугольника
     */
    hasSelfintersection(points) {
        for (let i = 0; i < points.length; i++) {
            const line1 = {
                start: points[i],
                end: points[(i + 1) % points.length]
            };
            
            for (let j = i + 2; j < points.length; j++) {
                if (j === points.length - 1 && i === 0) continue; // пропускаем смежные стороны
                
                const line2 = {
                    start: points[j],
                    end: points[(j + 1) % points.length]
                };
                
                if (this.linesIntersect(line1.start, line1.end, line2.start, line2.end)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Проверка пересечения двух линий
     */
    linesIntersect(p1, p2, p3, p4) {
        const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (denominator === 0) return false;
        
        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
        
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    /**
     * Проверка выпуклости многоугольника
     */
    isConvex(points) {
        if (points.length < 3) return false;
        
        let sign = 0;
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            const p3 = points[(i + 2) % points.length];
            
            const cross = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
            
            if (cross !== 0) {
                if (sign === 0) {
                    sign = cross > 0 ? 1 : -1;
                } else if ((cross > 0 ? 1 : -1) !== sign) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Проверка пересечения двух объектов
     */
    objectsIntersect(obj1, obj2) {
        const bounds1 = obj1.getBoundingRect();
        const bounds2 = obj2.getBoundingRect();
        
        return !(bounds1.left + bounds1.width < bounds2.left ||
                bounds2.left + bounds2.width < bounds1.left ||
                bounds1.top + bounds1.height < bounds2.top ||
                bounds2.top + bounds2.height < bounds1.top);
    }

    /**
     * Получение рекомендаций по улучшению
     */
    getOptimizationSuggestions(objects) {
        const suggestions = [];
        const totalArea = objects.reduce((sum, obj) => sum + this.calculateObjectArea(obj), 0);
        
        // Рекомендации по размеру
        if (totalArea < 50) {
            suggestions.push({
                type: 'optimization',
                message: 'Увеличьте площадь для размещения большего количества оборудования'
            });
        }
        
        // Рекомендации по форме
        const complexShapes = objects.filter(obj => obj.type === 'polygon' && obj.points.length > 6);
        if (complexShapes.length > 0) {
            suggestions.push({
                type: 'optimization',
                message: 'Упростите сложные формы для удобства обслуживания'
            });
        }
        
        // Рекомендации по безопасности
        const verySmallObjects = objects.filter(obj => {
            const bounds = obj.getBoundingRect();
            const minDimension = Math.min(bounds.width, bounds.height) * this.editor.scale;
            return minDimension < 5;
        });
        
        if (verySmallObjects.length > 0) {
            suggestions.push({
                type: 'safety',
                message: 'Увеличьте размеры мелких элементов для безопасности детей'
            });
        }
        
        return suggestions;
    }

    /**
     * Экспорт отчета валидации
     */
    exportValidationReport() {
        const validation = this.validateAll();
        const objects = this.editor.canvas.getObjects().filter(obj => obj.objectType === 'playground');
        const suggestions = this.getOptimizationSuggestions(objects);
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                isValid: validation.isValid,
                objectCount: objects.length,
                totalArea: objects.reduce((sum, obj) => sum + this.calculateObjectArea(obj), 0),
                errorCount: validation.errors.length,
                warningCount: validation.warnings.length,
                suggestionCount: validation.suggestions.length + suggestions.length
            },
            validation: validation,
            optimizationSuggestions: suggestions,
            details: objects.map((obj, index) => ({
                index: index + 1,
                type: obj.type,
                area: this.calculateObjectArea(obj),
                bounds: obj.getBoundingRect(),
                properties: {
                    fill: obj.fill,
                    stroke: obj.stroke,
                    opacity: obj.opacity
                }
            }))
        };
        
        return report;
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PlaygroundValidator;
} else {
    window.PlaygroundValidator = PlaygroundValidator;
}