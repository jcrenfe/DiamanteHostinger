// Filtra y convierte los datos que llegan del navegador antes de guardarlos con Prisma.
// Solo se aceptan los campos declarados para cada modelo (el resto se ignora: id, createdAt, updatedAt…
// no se pueden cambiar desde fuera) y cada valor se convierte al tipo de su columna.

class InputError extends Error {
    constructor(message) { super(message); this.status = 400; }
}

const CONVERT = {
    string: (v) => (v === null ? null : String(v)),
    float: (v) => {
        if (v === null || v === '') return null;
        const n = Number(v);
        if (!Number.isFinite(n)) throw new InputError('número no válido');
        return n;
    },
    int: (v) => {
        if (v === null || v === '') return null;
        const n = Number(v);
        if (!Number.isInteger(n)) throw new InputError('número entero no válido');
        return n;
    },
    bool: (v) => v === true || v === 1 || v === '1' || v === 'true',
    date: (v) => {
        if (v === null || v === '') return null;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) throw new InputError('fecha no válida');
        return d;
    }
};

/**
 * Devuelve solo los campos de `spec` presentes en `body`, convertidos a su tipo.
 * Los campos ausentes (undefined) no se incluyen, así una actualización parcial no borra el resto.
 */
function pick(body, spec) {
    const out = {};
    for (const [field, type] of Object.entries(spec)) {
        if (!body || body[field] === undefined) continue;
        try {
            out[field] = CONVERT[type](body[field]);
        } catch (e) {
            throw new InputError(`Campo «${field}»: ${e.message}`);
        }
    }
    return out;
}

const PRODUCT_FIELDS = {
    name: 'string', price: 'float', description: 'string', category: 'string',
    local_image_path: 'string', url_origen: 'string', tipo: 'string', showOnHome: 'bool'
};

const CATEGORY_FIELDS = { name: 'string', description: 'string', order: 'int', isDefault: 'bool' };

const OFFER_FIELDS = {
    title: 'string', description: 'string', code: 'string', discountPercent: 'float', active: 'bool',
    type: 'string', imageUrl: 'string', validUntil: 'date', backgroundImage: 'string', backgroundColor: 'string',
    productId: 'string', ribbonText: 'string', ribbonColor: 'string', ribbonTextColor: 'string',
    titleColor: 'string', descriptionColor: 'string', badgeColor: 'string', codeColor: 'string',
    discountCorner: 'bool', discountColor: 'string', discountBgColor: 'string'
};

module.exports = { pick, InputError, PRODUCT_FIELDS, CATEGORY_FIELDS, OFFER_FIELDS };
