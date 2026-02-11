/**
 * Migration script to download remote media (S3 URLs) to local public storage
 * and update DB URLs to local paths.
 *
 * Usage:
 *   ts-node scripts/migrate-aws-media-to-local.ts
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import prisma from "../src/configs/db";

const resolvePublicDir = (): string => {
  const cwd = process.cwd();
  const publicInCwd = path.join(cwd, "public");
  const publicInParent = path.join(cwd, "..", "public");
  if (fs.existsSync(publicInCwd)) {
    return publicInCwd;
  }
  return publicInParent;
};

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "-");

const deriveFolderAndFile = (url: string) => {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.replace(/^\/+/, "");
    const parts = pathname.split("/");
    if (parts.length >= 2) {
      const folder = parts[0];
      const filename = sanitizeFileName(parts.slice(1).join("-"));
      return { folder, filename };
    }
    const filename = sanitizeFileName(parts[0] || "media");
    return { folder: "uploads", filename };
  } catch {
    const fallbackName = sanitizeFileName(
      crypto.randomBytes(6).toString("hex")
    );
    return { folder: "uploads", filename: fallbackName };
  }
};

const downloadFile = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const saveFile = (publicDir: string, folder: string, filename: string, data: Buffer) => {
  const targetDir = path.join(publicDir, folder);
  ensureDir(targetDir);
  const targetPath = path.join(targetDir, filename);
  fs.writeFileSync(targetPath, data);
  return `/${folder}/${filename}`;
};

const migrateMediaTable = async (publicDir: string) => {
  const mediaItems = await prisma.media.findMany();
  let updated = 0;

  for (const item of mediaItems) {
    if (!item.url || item.url.startsWith("/")) {
      continue;
    }

    try {
      const { folder, filename } = deriveFolderAndFile(item.url);
      const data = await downloadFile(item.url);
      const localUrl = saveFile(publicDir, folder, filename, data);

      await prisma.media.update({
        where: { id: item.id },
        data: { url: localUrl },
      });

      updated++;
      console.log(`✅ Migrated media ${item.id} to ${localUrl}`);
    } catch (error) {
      console.error(`❌ Failed to migrate media ${item.id}:`, error);
    }
  }

  return updated;
};

const migrateHomeImages = async (publicDir: string) => {
  const homeImages = await prisma.homePageImage.findMany();
  let updated = 0;

  for (const image of homeImages) {
    const updates: { imageUrl?: string; mobileImageUrl?: string } = {};

    try {
      if (image.imageUrl && !image.imageUrl.startsWith("/")) {
        const { folder, filename } = deriveFolderAndFile(image.imageUrl);
        const data = await downloadFile(image.imageUrl);
        updates.imageUrl = saveFile(publicDir, folder, filename, data);
      }

      if (image.mobileImageUrl && !image.mobileImageUrl.startsWith("/")) {
        const { folder, filename } = deriveFolderAndFile(image.mobileImageUrl);
        const data = await downloadFile(image.mobileImageUrl);
        updates.mobileImageUrl = saveFile(publicDir, folder, filename, data);
      }

      if (Object.keys(updates).length > 0) {
        await prisma.homePageImage.update({
          where: { id: image.id },
          data: updates,
        });
        updated++;
        console.log(`✅ Migrated home image ${image.id}`);
      }
    } catch (error) {
      console.error(`❌ Failed to migrate home image ${image.id}:`, error);
    }
  }

  return updated;
};

const main = async () => {
  const publicDir = resolvePublicDir();
  ensureDir(publicDir);

  const mediaUpdated = await migrateMediaTable(publicDir);
  const homeUpdated = await migrateHomeImages(publicDir);

  console.log(`\n✅ Migration complete.`);
  console.log(`Media records updated: ${mediaUpdated}`);
  console.log(`Home page images updated: ${homeUpdated}`);
};

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
