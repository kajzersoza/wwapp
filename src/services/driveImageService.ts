import driveImagesMap from '../data/driveImagesMap.json';

export const GOOGLE_DRIVE_ROOT_FOLDER_URL =
  'https://drive.google.com/drive/folders/1y_GVCSppjrqAcU3Mw6vb-Ki7mhqlvOBq?usp=sharing';
export const GOOGLE_DRIVE_PRODUCTS_IMAGES_FOLDER_ID = '1bGAd4RRJM8-ZuNTK-yxR5CwotJb9Ndzb';

interface DriveMapData {
  folderId: string;
  productsImagesFolderId: string;
  updatedAt: string;
  files: Record<string, string>;
  products: Record<string, string>;
}

// In-memory / loaded mapping
const mapData: DriveMapData = driveImagesMap as DriveMapData;

/**
 * Normalizes an image path, relative filename, or Google Drive link
 * into a directly displayable Google CDN image URL.
 * Also checks by product ID if no direct file match is found.
 */
export function resolveDriveImageUrl(
  imagePath?: string,
  productId?: string
): string | undefined {
  if (!imagePath && !productId) return undefined;

  const raw = (imagePath || '').trim();

  // 1. If it is an explicit Google Drive URL, extract the ID
  if (raw) {
    const fileIdMatch = raw.match(
      /(?:id=|\/file\/d\/|\/d\/|open\?id=)([a-zA-Z0-9_-]{25,})/
    );
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }

    // 2. If it's another full external URL or data URI, return as-is
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('data:image/') ||
      raw.startsWith('blob:')
    ) {
      return raw;
    }

    // 3. Clean up relative path: strip leading slashes and quotes
    const cleanPath = raw.replace(/^["'\s./\\]+|["'\s]+$/g, '');
    const basename = cleanPath.replace(/^.*[\\/]/, '');

    // Check exact matches in map
    const candidates = [
      cleanPath,
      cleanPath.toLowerCase(),
      basename,
      basename.toLowerCase(),
      `Products_Images/${basename}`,
      `products_images/${basename.toLowerCase()}`,
      `Menu_Images/${basename}`,
      `Note_Images/${basename}`,
    ];

    for (const cand of candidates) {
      if (mapData.files[cand]) {
        return `https://lh3.googleusercontent.com/d/${mapData.files[cand]}`;
      }
    }

    // If filename has pattern like "40107.00.33.Image...", try extracting product ID from filename
    const dotImageIdx = basename.toLowerCase().indexOf('.image.');
    if (dotImageIdx !== -1) {
      const extractedProdId = basename.substring(0, dotImageIdx).trim();
      const driveId =
        mapData.products[extractedProdId] ||
        mapData.products[extractedProdId.toLowerCase()];
      if (driveId) {
        return `https://lh3.googleusercontent.com/d/${driveId}`;
      }
    }
  }

  // 4. Fallback lookup by Product ID
  if (productId) {
    const cleanId = productId.replace(/^["'\s]+|["'\s]+$/g, '').trim();
    const driveId =
      mapData.products[cleanId] ||
      mapData.products[cleanId.toLowerCase()] ||
      mapData.products[cleanId.replace(/\s+/g, '')];

    if (driveId) {
      return `https://lh3.googleusercontent.com/d/${driveId}`;
    }
  }

  // 5. If nothing matched and raw exists, return raw
  return raw || undefined;
}

/**
 * Returns statistics about the indexed Google Drive images
 */
export function getDriveImageStats() {
  const totalFiles = Object.keys(mapData.files).length;
  const totalProducts = Object.keys(mapData.products).length;
  return {
    totalFiles,
    totalProducts,
    updatedAt: mapData.updatedAt,
    folderUrl: GOOGLE_DRIVE_ROOT_FOLDER_URL,
  };
}
