const mysql = require('mysql2/promise');

let pool;
function getPool() {
    if (!pool) {
        pool = mysql.createPool(process.env.DATABASE_URL || 'mysql://localhost:3306/test');
    }
    return pool;
}

function parseJsonFields(row) {
    if (!row) return row;
    const res = { ...row };
    if ('showOnHome' in res) res.showOnHome = Boolean(res.showOnHome);
    if ('active' in res) res.active = Boolean(res.active);
    if ('isDefault' in res) res.isDefault = Boolean(res.isDefault);
    if ('value' in res && typeof res.value === 'string') {
        try { res.value = JSON.parse(res.value); } catch(e){}
    }
    return res;
}

function createModelHandler(tableName) {
    return {
        async findMany(args = {}) {
            let sql = `SELECT * FROM \`${tableName}\``;
            const params = [];
            const whereClauses = [];

            if (args.where) {
                for (const [key, val] of Object.entries(args.where)) {
                    if (val !== undefined && val !== null) {
                        if (typeof val === 'boolean') {
                            whereClauses.push(`\`${key}\` = ?`);
                            params.push(val ? 1 : 0);
                        } else {
                            whereClauses.push(`\`${key}\` = ?`);
                            params.push(val);
                        }
                    }
                }
            }

            if (whereClauses.length > 0) {
                sql += ' WHERE ' + whereClauses.join(' AND ');
            }

            if (args.orderBy) {
                const orderEntries = Object.entries(args.orderBy);
                if (orderEntries.length > 0) {
                    sql += ` ORDER BY \`${orderEntries[0][0]}\` ${orderEntries[0][1].toUpperCase()}`;
                }
            }

            if (args.take) {
                sql += ` LIMIT ${parseInt(args.take)}`;
            }

            const [rows] = await getPool().query(sql, params);
            return rows.map(parseJsonFields);
        },

        async findUnique(args = {}) {
            if (!args.where) return null;
            const key = Object.keys(args.where)[0];
            const val = args.where[key];
            const sql = `SELECT * FROM \`${tableName}\` WHERE \`${key}\` = ? LIMIT 1`;
            const [rows] = await getPool().query(sql, [val]);
            return rows.length > 0 ? parseJsonFields(rows[0]) : null;
        },

        async findFirst(args = {}) {
            const list = await this.findMany({ ...args, take: 1 });
            return list.length > 0 ? list[0] : null;
        },

        async create(args = {}) {
            const data = args.data || {};
            const keys = Object.keys(data);
            const cols = keys.map(k => `\`${k}\``).join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => {
                const v = data[k];
                if (typeof v === 'boolean') return v ? 1 : 0;
                if (typeof v === 'object' && v !== null && !(v instanceof Date)) return JSON.stringify(v);
                return v;
            });

            const sql = `INSERT INTO \`${tableName}\` (${cols}) VALUES (${placeholders})`;
            const [result] = await getPool().query(sql, values);

            if (data.id) {
                return this.findUnique({ where: { id: data.id } });
            } else if (result.insertId) {
                return this.findUnique({ where: { id: result.insertId } });
            }
            return data;
        },

        async update(args = {}) {
            const { where, data } = args;
            if (!where || !data) return null;
            const whereKey = Object.keys(where)[0];
            const whereVal = where[whereKey];

            const setClauses = [];
            const values = [];

            for (const [key, val] of Object.entries(data)) {
                setClauses.push(`\`${key}\` = ?`);
                if (typeof val === 'boolean') values.push(val ? 1 : 0);
                else if (typeof val === 'object' && val !== null && !(val instanceof Date)) values.push(JSON.stringify(val));
                else values.push(val);
            }
            values.push(whereVal);

            const sql = `UPDATE \`${tableName}\` SET ${setClauses.join(', ')} WHERE \`${whereKey}\` = ?`;
            await getPool().query(sql, values);
            return this.findUnique({ where });
        },

        async upsert(args = {}) {
            const { where, update: updateData, create: createData } = args;
            const existing = await this.findUnique({ where });
            if (existing) {
                return this.update({ where, data: updateData });
            } else {
                return this.create({ data: createData });
            }
        },

        async delete(args = {}) {
            if (!args.where) return null;
            const key = Object.keys(args.where)[0];
            const val = args.where[key];
            const sql = `DELETE FROM \`${tableName}\` WHERE \`${key}\` = ?`;
            await getPool().query(sql, [val]);
            return { success: true };
        }
    };
}

const db = {
    product: createModelHandler('Product'),
    category: createModelHandler('Category'),
    offer: createModelHandler('Offer'),
    order: createModelHandler('Order'),
    orderItem: createModelHandler('OrderItem'),
    user: createModelHandler('User'),
    campaign: createModelHandler('Campaign'),
    configuration: createModelHandler('Configuration'),
    $queryRaw: async (query, ...params) => {
        const [rows] = await getPool().query(query, params);
        return rows;
    }
};

module.exports = db;

