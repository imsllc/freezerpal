export const MAX_PHOTO_LENGTH = 512 * 1024;

export function validatePhoto(uri: string): string {
  if (uri.length > MAX_PHOTO_LENGTH)
    throw new Error("This photo is too large. Choose a smaller photo.");
  if (!/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(uri)) {
    throw new Error("This photo could not be read. Choose another image.");
  }
  return uri;
}
