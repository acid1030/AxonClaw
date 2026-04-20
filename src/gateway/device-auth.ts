import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

type DeviceIdentity = {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
};

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const spki = crypto.createPublicKey(publicKeyPem).export({
    type: 'spki',
    format: 'der',
  }) as Buffer;
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32
    && spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length);
  }
  return spki;
}

function signDevicePayload(privateKeyPem: string, payload: string): string {
  const key = crypto.createPrivateKey(privateKeyPem);
  return base64UrlEncode(crypto.sign(null, Buffer.from(payload, 'utf8'), key));
}

function buildDeviceAuthPayload(params: {
  deviceId: string;
  clientId: string;
  clientMode: string;
  role: string;
  scopes: string[];
  signedAtMs: number;
  token?: string | null;
  nonce: string;
}): string {
  const scopes = params.scopes.join(',');
  const token = params.token ?? '';
  return [
    'v2',
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
    params.nonce,
  ].join('|');
}

function readDeviceIdentity(homeDir = os.homedir()): DeviceIdentity | null {
  try {
    const p = path.join(homeDir, '.openclaw', 'identity', 'device.json');
    if (!fs.existsSync(p)) return null;
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as Record<string, unknown>;
    const deviceId = String(parsed.deviceId || '').trim();
    const publicKeyPem = String(parsed.publicKeyPem || '').trim();
    const privateKeyPem = String(parsed.privateKeyPem || '').trim();
    if (!deviceId || !publicKeyPem || !privateKeyPem) return null;
    return { deviceId, publicKeyPem, privateKeyPem };
  } catch {
    return null;
  }
}

export function buildSignedGatewayDevice(
  nonce: string,
  token: string | null | undefined,
  clientId: string,
  clientMode: string,
  role: string,
  scopes: string[],
  homeDir = os.homedir(),
): {
  id: string;
  publicKey: string;
  signature: string;
  signedAt: number;
  nonce: string;
} | null {
  const n = String(nonce || '').trim();
  if (!n) return null;
  const identity = readDeviceIdentity(homeDir);
  if (!identity) return null;

  const signedAt = Date.now();
  const payload = buildDeviceAuthPayload({
    deviceId: identity.deviceId,
    clientId,
    clientMode,
    role,
    scopes,
    signedAtMs: signedAt,
    token: token ?? null,
    nonce: n,
  });

  const signature = signDevicePayload(identity.privateKeyPem, payload);
  const publicKey = base64UrlEncode(derivePublicKeyRaw(identity.publicKeyPem));
  return {
    id: identity.deviceId,
    publicKey,
    signature,
    signedAt,
    nonce: n,
  };
}
