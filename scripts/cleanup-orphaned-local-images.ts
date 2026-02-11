/**
 * Cleanup script to find and delete orphaned local images
 *
 * This script:
 * 1. Fetches all image URLs from the database (Media + HomePageImage)
 * 2. Lists all files in the local public folder
 * 3. Finds files not referenced in the database
 * 4. Optionally deletes the orphaned files
 *
 * Usage:
 *   ts-node scripts/cleanup-orphaned-local-images.ts [--dry-run] [--delete]
 *
 *   --dry-run: Only list orphaned images without deleting (default)
 *   --delete: Actually delete the orphaned images
 */

import fs from "fs";
import path from "path";
import prisma from "../src/configs/db";

const DRY_RUN = !process.argv.includes("--delete");

const resolvePublicDir = (): string => {
  const cwd = process.cwd();
  const publicInCwd = path.join(cwd, "public");
  const publicInParent = path.join(cwd, "..", "public");
  if (fs.existsSync(publicInCwd)) {
    return publicInCwd;
  }
  return publicInParent;
};

const walkDirectory = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDirectory(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
};

const normalizeUrl = (url: string) =>
  url.startsWith("/") ? url : `/${url}`;

const urlToLocalPath = (publicDir: string, url: string): string => {
  const cleanUrl = normalizeUrl(url).replace(/^\/+/, "");
  return path.join(publicDir, cleanUrl);
};

async function getAllDatabaseImageUrls(): Promise<Set<string>> {
  console.log("📊 Fetching all image URLs from database...");

  const mediaImages = await prisma.media.findMany({
    select: { url: true },
  });

  const homePageImages = await prisma.homePageImage.findMany({
    select: { imageUrl: true, mobileImageUrl: true },
  });

  const dbUrls = new Set<string>();

  mediaImages.forEach((img) => {
    if (img.url && img.url.startsWith("/")) {
      dbUrls.add(normalizeUrl(img.url));
    }
  });

  homePageImages.forEach((img) => {
    if (img.imageUrl && img.imageUrl.startsWith("/")) {
      dbUrls.add(normalizeUrl(img.imageUrl));
    }
    if (img.mobileImageUrl && img.mobileImageUrl.startsWith("/")) {
      dbUrls.add(normalizeUrl(img.mobileImageUrl));
    }
  });

  console.log(`✅ Found ${dbUrls.size} local image URLs in database`);
  return dbUrls;
}

async function findOrphanedImages(publicDir: string): Promise<string[]> {
  const dbUrls = await getAllDatabaseImageUrls();
  const allFiles = walkDirectory(publicDir);

  const orphaned: string[] = [];

  for (const filePath of allFiles) {
    const relativePath = path.relative(publicDir, filePath);
    const urlPath = normalizeUrl(relativePath);
    if (!dbUrls.has(urlPath)) {
      orphaned.push(filePath);
    }
  }

  return orphaned;
}

async function deleteOrphanedImages(orphaned: string[]): Promise<void> {
  if (orphaned.length === 0) {
    console.log("\n✅ No orphaned images found!");
    return;
  }

  console.log(
    `\n${DRY_RUN ? "🔍 DRY RUN" : "🗑️  DELETING"} ${
      orphaned.length
    } orphaned images...`
  );

  let deleted = 0;
  let failed = 0;

  for (const imagePath of orphaned) {
    try {
      if (!DRY_RUN) {
        fs.unlinkSync(imagePath);
      }
      deleted++;
      console.log(`${DRY_RUN ? "[DRY RUN]" : "✅"} Deleted: ${imagePath}`);
    } catch (error) {
      failed++;
      console.error(`❌ Failed to delete ${imagePath}:`, error);
    }
  }

  console.log(`\n${DRY_RUN ? "📊 DRY RUN SUMMARY" : "✅ DELETION SUMMARY"}:`);
  console.log(`   Total orphaned images: ${orphaned.length}`);
  console.log(`   ${DRY_RUN ? "Would delete" : "Deleted"}: ${deleted}`);
  console.log(`   Failed: ${failed}`);
}

async function main() {
  console.log("🚀 Starting local orphaned images cleanup...\n");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no deletions)" : "DELETE MODE"}\n`);

  try {
    const publicDir = resolvePublicDir();
    if (!fs.existsSync(publicDir)) {
      console.error("❌ Public directory not found:", publicDir);
      process.exit(1);
    }

    const orphaned = await findOrphanedImages(publicDir);

    if (orphaned.length > 0) {
      console.log(`\n⚠️  Found ${orphaned.length} orphaned images:`);
      orphaned.slice(0, 10).forEach((img) => {
        console.log(`   - ${img}`);
      });
      if (orphaned.length > 10) {
        console.log(`   ... and ${orphaned.length - 10} more`);
      }

      await deleteOrphanedImages(orphaned);
    } else {
      console.log("\n✅ No orphaned images found! Local storage is clean.");
    }
  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
