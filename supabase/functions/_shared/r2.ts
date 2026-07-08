// supabase/functions/_shared/r2.ts
// Shared helpers for treating R2 as temporary-only staging storage.
// Files live under `temp/{userId}/{documentId}/{fileName}` and are deleted
// as soon as extraction + embedding finish (or fail).

import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

export function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Server misconfiguration: ${name} is missing.`);
  return value;
}

function encodeR2Key(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function getR2Config() {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requiredEnv("R2_BUCKET_NAME");
  const endpoint = (Deno.env.get("R2_ENDPOINT") || `https://${accountId}.r2.cloudflarestorage.com`).replace(/\/$/, "");
  const client = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });
  return { client, endpoint, bucket };
}

export function buildTempR2Key(userId: string, documentId: string, fileName: string) {
  return `temp/${userId}/${documentId}/${fileName}`;
}

export async function createPresignedPutUrl(
  r2Key: string,
  contentType: string,
  ttlSeconds = 900,
  extraSignedHeaders: Record<string, string> = {},
) {
  const { client, endpoint, bucket } = getR2Config();
  const url = `${endpoint}/${bucket}/${encodeR2Key(r2Key)}`;
  // Any x-amz-* header sent at upload time must be part of the signed
  // headers here or R2 will reject the PUT with SignatureDoesNotMatch.
  const signed = await client.sign(url, {
    method: "PUT",
    headers: { "Content-Type": contentType, ...extraSignedHeaders },
    aws: { signQuery: true, expires: ttlSeconds },
  });
  return signed.url;
}

export async function downloadR2Object(r2Key: string) {
  const { client, endpoint, bucket } = getR2Config();
  const url = `${endpoint}/${bucket}/${encodeR2Key(r2Key)}`;
  const response = await client.fetch(url, { method: "GET" });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`R2 download failed (${response.status}): ${details || response.statusText}`);
  }
  return response;
}

export async function deleteR2Object(r2Key: string) {
  const { client, endpoint, bucket } = getR2Config();
  const url = `${endpoint}/${bucket}/${encodeR2Key(r2Key)}`;
  const response = await client.fetch(url, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    const details = await response.text().catch(() => "");
    throw new Error(`R2 delete failed (${response.status}): ${details || response.statusText}`);
  }
}

export type R2ObjectSummary = { key: string; size: number; lastModified: string };

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

export async function listR2Objects(prefix: string): Promise<R2ObjectSummary[]> {
  const { client, endpoint, bucket } = getR2Config();
  const objects: R2ObjectSummary[] = [];
  let continuationToken: string | undefined;

  do {
    const params = new URLSearchParams({ "list-type": "2", "prefix": prefix, "max-keys": "1000" });
    if (continuationToken) params.set("continuation-token", continuationToken);
    const url = `${endpoint}/${bucket}?${params.toString()}`;
    const response = await client.fetch(url, { method: "GET" });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`R2 list failed (${response.status}): ${details || response.statusText}`);
    }
    const xml = await response.text();
    for (const match of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const block = match[1];
      const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
      const size = Number(block.match(/<Size>([\s\S]*?)<\/Size>/)?.[1] || 0);
      const lastModified = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1] || "";
      if (key) objects.push({ key: decodeXmlEntities(key), size, lastModified });
    }
    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
    continuationToken = truncated
      ? xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1]
      : undefined;
  } while (continuationToken);

  return objects;
}

export async function getR2UserTempUsageBytes(userId: string) {
  const objects = await listR2Objects(`temp/${userId}/`);
  return objects.reduce((sum, obj) => sum + obj.size, 0);
}
