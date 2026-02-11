import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/**
 * Upload image to public folder
 * Returns the public URL path (e.g., "/home-images/hero-123.jpg")
 */
export const uploadToPublic = async (
  file: Express.Multer.File,
  subfolder: string = "home-images"
): Promise<string> => {
  try {
    console.log("Starting uploadToPublic");
    console.log("Current working directory:", process.cwd());
    console.log("__dirname:", __dirname);
    
    // Get the public folder path
    // Try multiple approaches to find the project root
    let publicFolder: string;
    
    // Approach 1: If running from project root, public folder is directly accessible
    const cwd = process.cwd();
    const publicInCwd = path.join(cwd, "public");
    const publicInParent = path.join(cwd, "..", "public");
    
    console.log("Checking paths:");
    console.log("  - public in cwd:", publicInCwd, "exists:", fs.existsSync(publicInCwd));
    console.log("  - public in parent:", publicInParent, "exists:", fs.existsSync(publicInParent));
    
    if (fs.existsSync(publicInCwd)) {
      publicFolder = path.join(cwd, "public", subfolder);
      console.log("Using approach 1, publicFolder:", publicFolder);
    } 
    // Approach 2: If running from SassyBackend, go up one level
    else if (fs.existsSync(publicInParent)) {
      publicFolder = path.join(cwd, "..", "public", subfolder);
      console.log("Using approach 2, publicFolder:", publicFolder);
    }
    // Approach 3: Use __dirname to resolve (for compiled code)
    else {
      const backendRoot = path.resolve(__dirname, "../..");
      const frontendRoot = path.resolve(backendRoot, "..");
      publicFolder = path.join(frontendRoot, "public", subfolder);
      console.log("Using approach 3");
      console.log("  - backendRoot:", backendRoot);
      console.log("  - frontendRoot:", frontendRoot);
      console.log("  - publicFolder:", publicFolder);
    }

    // Create subfolder if it doesn't exist
    console.log("Creating folder if needed:", publicFolder);
    if (!fs.existsSync(publicFolder)) {
      fs.mkdirSync(publicFolder, { recursive: true });
      console.log("Folder created successfully");
    } else {
      console.log("Folder already exists");
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${crypto.randomUUID()}${fileExtension}`;
    const filePath = path.join(publicFolder, fileName);
    
    console.log("Writing file:", filePath);
    console.log("File size:", file.buffer.length, "bytes");

    // Write file to public folder
    fs.writeFileSync(filePath, file.buffer);
    console.log("File written successfully");

    // Return the public URL path (relative to public folder)
    const publicUrl = `/${subfolder}/${fileName}`;
    console.log("Public folder upload successful, URL:", publicUrl);

    return publicUrl;
  } catch (error) {
    console.error("Public folder upload error:", error);
    console.error("Error details:", error instanceof Error ? error.stack : error);
    throw new Error(
      `Failed to upload to public folder: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

/**
 * Delete image from public folder
 */
export const deleteFromPublic = async (publicUrl: string): Promise<void> => {
  try {
    // Remove leading slash if present
    const cleanUrl = publicUrl.startsWith("/") ? publicUrl.slice(1) : publicUrl;
    
    // Get the public folder path (same logic as uploadToPublic)
    let filePath: string;
    const cwd = process.cwd();
    
    if (fs.existsSync(path.join(cwd, "public"))) {
      filePath = path.join(cwd, "public", cleanUrl);
    } else if (fs.existsSync(path.join(cwd, "..", "public"))) {
      filePath = path.join(cwd, "..", "public", cleanUrl);
    } else {
      const backendRoot = path.resolve(__dirname, "../..");
      const frontendRoot = path.resolve(backendRoot, "..");
      filePath = path.join(frontendRoot, "public", cleanUrl);
    }

    // Check if file exists and delete
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log("File deleted from public folder:", filePath);
    } else {
      console.warn("File not found in public folder:", filePath);
    }
  } catch (error) {
    console.error("Error deleting file from public folder:", error);
    throw new Error(
      `Failed to delete from public folder: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

