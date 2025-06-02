import crypto from "crypto";

export function sha256(data: string | NodeJS.ArrayBufferView): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}