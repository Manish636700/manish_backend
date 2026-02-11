import fs from "fs";
import path from "path";
import sharp from "sharp";
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

const urlToLocalPath = (publicDir: string, url: string): string => {
  const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
  return path.join(publicDir, cleanUrl);
};

async function compressImage(filePath: string): Promise<boolean> {
  const buffer = fs.readFileSync(filePath);
  const image = sharp(buffer);
  const metadata = await image.metadata();

  let outputBuffer: Buffer | null = null;

  if (metadata.format === "jpeg" || metadata.format === "jpg") {
    outputBuffer = await image.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  } else if (metadata.format === "png") {
    outputBuffer = await image.png({ quality: 80, compressionLevel: 9 }).toBuffer();
  } else if (metadata.format === "webp") {
    outputBuffer = await image.webp({ quality: 80 }).toBuffer();
  }

  if (!outputBuffer) {
    return false;
  }

  fs.writeFileSync(filePath, outputBuffer);
  return true;
}

async function compressAllLocalProductImages(): Promise<void> {
  const publicDir = resolvePublicDir();
  let totalProcessed = 0;
  let failures = 0;

  const productImages = await prisma.media.findMany({
    where: {
      productId: { not: null },
      type: "product",
    },
  });

  console.log(`Found ${productImages.length} product images to process`);

  for (const image of productImages) {
    try {
      if (!image.url || !image.url.startsWith("/")) {
        console.log(`Skipping non-local image: ${image.url}`);
        continue;
      }

      const filePath = urlToLocalPath(publicDir, image.url);
      if (!fs.existsSync(filePath)) {
        console.log(`File not found on disk: ${filePath}`);
        continue;
      }

      const success = await compressImage(filePath);
      if (success) {
        totalProcessed++;
        console.log(`✅ Compressed ${image.url}`);
      } else {
        console.log(`⏭️ Skipped unsupported format: ${image.url}`);
      }
    } catch (error) {
      failures++;
      console.error(`❌ Error processing image: ${image.url}`, error);
    }
  }

  console.log("\n=== Compression Summary ===");
  console.log(`Total images processed: ${totalProcessed}`);
  console.log(`Failed operations: ${failures}`);
}

compressAllLocalProductImages()
  .then(() => console.log("Compression complete!"))
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
