import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Разрешить CORS
app.use(cors());

const modelsDir = path.join(__dirname, '..', 'models');

function collectGlbModels(dir, baseDir = dir) {
    let models = [];
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        // if (file.isDirectory()) {
        //     models = models.concat(collectGlbModels(fullPath, baseDir));
        if (file.isFile() && file.name.endsWith('.glb')) {
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            models.push(relativePath);
        }
    }

    return models;
}

app.get('/api/models', (req, res) => {
    try {
        const models = collectGlbModels(modelsDir).sort();
        res.json({ models });
    } catch (err) {
        res.status(500).json({ error: 'Error reading model files' });
    }
});

app.use('/models', express.static(modelsDir));

app.listen(PORT, () => {
    console.log(`API сервер запущен на http://localhost:${PORT}`);
});
