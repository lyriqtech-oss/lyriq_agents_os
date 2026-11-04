const IDENTIFIER = /^[a-z][a-z0-9_]{1,31}$/;
const FIELD_TYPES = new Set(['text', 'number', 'boolean', 'date']);
const CORE_FILES = ['index.html', 'styles.css', 'script.js'];

export function validateCodeFiles(files) {
  if (!files || typeof files !== 'object' || Array.isArray(files)) return false;
  const names = Object.keys(files);
  return names.length >= 3 && names.length <= 20 && names.every(name =>
    (/^[a-zA-Z0-9_-]+\.(html|css|js)$/.test(name) || name === 'app.json') &&
    typeof files[name] === 'string' && files[name].length <= 100_000) &&
    CORE_FILES.every(name => typeof files[name] === 'string');
}

export function parseAppManifest(value) {
  if (typeof value !== 'string' || value.length > 20_000) throw new Error('APP_MANIFEST_INVALID');
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw new Error('APP_MANIFEST_INVALID'); }
  if (!parsed || typeof parsed.name !== 'string' || parsed.name.trim().length < 2 || parsed.name.length > 80 ||
      !Array.isArray(parsed.collections) || parsed.collections.length < 1 || parsed.collections.length > 5) throw new Error('APP_MANIFEST_INVALID');
  const names = new Set();
  const collections = parsed.collections.map(collection => {
    if (!collection || typeof collection.name !== 'string' || !IDENTIFIER.test(collection.name) || names.has(collection.name) ||
        !Array.isArray(collection.fields) || collection.fields.length < 1 || collection.fields.length > 12) throw new Error('APP_MANIFEST_INVALID');
    names.add(collection.name);
    const fields = new Set();
    return {
      name: collection.name,
      fields: collection.fields.map(field => {
        if (!field || typeof field.name !== 'string' || !IDENTIFIER.test(field.name) || ['id', 'created_at', 'updated_at'].includes(field.name) ||
            fields.has(field.name) || !FIELD_TYPES.has(field.type) || (field.required !== undefined && typeof field.required !== 'boolean')) throw new Error('APP_MANIFEST_INVALID');
        fields.add(field.name);
        return { name: field.name, type: field.type, required: field.required === true };
      })
    };
  });
  return { name: parsed.name.trim(), collections };
}

export function validateRecordInput(collection, input, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('APP_RECORD_INVALID');
  const allowed = new Map(collection.fields.map(field => [field.name, field]));
  const entries = Object.entries(input);
  if (entries.length === 0 || entries.some(([name]) => !allowed.has(name))) throw new Error('APP_RECORD_INVALID');
  const clean = {};
  for (const [name, value] of entries) {
    const field = allowed.get(name);
    const valid = field.type === 'text' ? typeof value === 'string' && value.length <= 2000 :
      field.type === 'number' ? typeof value === 'number' && Number.isFinite(value) :
      field.type === 'boolean' ? typeof value === 'boolean' :
      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
    if (!valid || (field.required && field.type === 'text' && !value.trim())) throw new Error('APP_RECORD_INVALID');
    clean[name] = value;
  }
  if (!partial && collection.fields.some(field => field.required && clean[field.name] === undefined)) throw new Error('APP_RECORD_INVALID');
  return clean;
}
