/**
 * Generates src/static.ts from the public folder HTML/CSS files.
 * Run this before deploying to update embedded static assets.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const outputPath = join(__dirname, '..', 'src', 'static.ts');

function escapeTemplate(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$');
}

const indexHtml = readFileSync(join(publicDir, 'index.html'), 'utf8');
const adminHtml = readFileSync(join(publicDir, 'admin.html'), 'utf8');
const stylesCSS = readFileSync(join(publicDir, 'styles.css'), 'utf8');

const output = `// Auto-generated from public folder - do not edit directly
// Run \`npm run build:static\` to regenerate

export const indexHtml = \`${escapeTemplate(indexHtml)}\`;

export const adminHtml = \`${escapeTemplate(adminHtml)}\`;

export const stylesCSS = \`${escapeTemplate(stylesCSS)}\`;
`;

writeFileSync(outputPath, output);
console.log('✓ Generated src/static.ts');
