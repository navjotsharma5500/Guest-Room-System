// controllers/imagekitController.js
import ImageKit from "imagekit";
import fetch from 'node-fetch'; // Make sure to install: npm install node-fetch

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// ========================================
// UPLOAD IMAGE TO IMAGEKIT - Supports both URL and Base64)
// ========================================
export const uploadImageToImageKit = async (req, res) => {
  try {
    const { file, fileName, folder, useUrl } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    console.log("📤 Uploading to ImageKit:", {
      fileName,
      folder,
      useUrl,
      filePreview: file.substring(0, 100) + '...'
    });

    let fileToUpload = file;

    // ✅ NEW: If useUrl flag is true, fetch the URL and convert to base64
    if (useUrl && file.startsWith('http')) {
      try {
        console.log('🌐 Fetching image from URL:', file);
        
        const response = await fetch(file);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const buffer = await response.buffer();
        const base64 = buffer.toString('base64');
        fileToUpload = `data:image/jpeg;base64,${base64}`;
        
        console.log('✅ Successfully converted URL to base64');
      } catch (fetchError) {
        console.error('❌ URL fetch error:', fetchError);
        return res.status(400).json({
          success: false,
          message: "Failed to fetch image from URL",
          error: fetchError.message,
        });
      }
    }

    // Upload to ImageKit
    const response = await imagekit.upload({
      file: fileToUpload,
      fileName: fileName || `image-${Date.now()}.jpg`,
      folder: folder || "/guest-profiles",
      useUniqueFileName: true,
      tags: ["guest-feedback", "profile-picture"],
    });

    console.log("✅ ImageKit upload successful:", response.url);

    res.json({
      success: true,
      message: "Image uploaded successfully",
      url: response.url,
      fileId: response.fileId,
      thumbnailUrl: response.thumbnailUrl,
    });

  } catch (err) {
    console.error("❌ ImageKit upload error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to upload image",
      error: err.message,
    });
  }
};

// ========================================
// DELETE IMAGE FROM IMAGEKIT
// ========================================
export const deleteImageFromImageKit = async (req, res) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: "File ID is required",
      });
    }

    console.log("🗑️ Deleting from ImageKit:", fileId);

    await imagekit.deleteFile(fileId);

    console.log("✅ ImageKit deletion successful");

    res.json({
      success: true,
      message: "Image deleted successfully",
    });

  } catch (err) {
    console.error("❌ ImageKit deletion error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete image",
      error: err.message,
    });
  }
};

// ========================================
// GET IMAGEKIT AUTH PARAMS (for client-side upload)
// ========================================
export const getImageKitAuthParams = async (req, res) => {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();

    res.json({
      success: true,
      ...authenticationParameters,
    });

  } catch (err) {
    console.error("❌ ImageKit auth error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get auth parameters",
      error: err.message,
    });
  }
};