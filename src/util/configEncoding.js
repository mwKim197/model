const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const { TextDecoder } = require('node:util');

function normalizeConfigEncoding(file) {
    let bytes;
    try {
        bytes = fs.readFileSync(file);
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
    const hasBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    let source = 'UTF-8 BOM';
    let content;
    try {
        content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes.subarray(hasBom ? 3 : 0));
        if (!hasBom) return null;
    } catch (error) {
        if (hasBom) throw error;
        source = 'CP949';
        content = new TextDecoder('euc-kr', { fatal: true }).decode(bytes);
    }

    const config = JSON.parse(content);
    if (typeof config?.user?.userId !== 'string' || !config.user.userId.trim()) {
        throw new Error('Missing config userId');
    }

    const suffix = randomUUID();
    const backup = `${file}.${suffix}.bak`;
    const temporary = `${file}.${suffix}.tmp`;
    fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL);
    try {
        fs.writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
        fs.renameSync(temporary, file);
    } finally {
        fs.rmSync(temporary, { force: true });
    }
    return source;
}

module.exports = { normalizeConfigEncoding };
