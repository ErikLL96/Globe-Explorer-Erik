/** Generate compact, in-memory circular-marker previews from a local journal photo.
 * Only the first saved photo is used on the globe. No images are uploaded or cached remotely.
 * The caller MUST revoke the returned object URL when the marker changes or unmounts.
 */
export async function createMarkerThumbnailURL(blob: Blob): Promise<string> {
  if (typeof createImageBitmap !== 'function') return URL.createObjectURL(blob);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    // Older browsers can still display the original image in an <img> element.
    return URL.createObjectURL(blob);
  }

  try {
    const SIZE = 96;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext('2d');
    if (!context) return URL.createObjectURL(blob);
    const scale = Math.max(SIZE / bitmap.width, SIZE / bitmap.height);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.drawImage(bitmap, (SIZE - width) / 2, (SIZE - height) / 2, width, height);
    const compact = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
    return URL.createObjectURL(compact ?? blob);
  } catch {
    return URL.createObjectURL(blob);
  } finally {
    bitmap.close();
  }
}
