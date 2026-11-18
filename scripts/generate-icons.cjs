/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const Jimp = require('jimp-compact');

const root = path.join(__dirname, '..');
const assets = path.join(root, 'assets');
const previewDirectory = path.join(root, '.build-temp');
const { expo } = require('../app.json');
const background = Jimp.cssColorToHex(expo.android.adaptiveIcon.backgroundColor);
const canvasSize = 1024;
const artworkSize = 640;
const padding = (canvasSize - artworkSize) / 2;
const edgeFade = 32;
const resizeMode = Jimp.RESIZE_BICUBIC;

function centerArtwork(artwork) {
  const canvas = new Jimp(canvasSize, canvasSize, 0);
  for (let row = 0; row < artworkSize; row++) {
    const sourceOffset = row * artworkSize * 4;
    const canvasOffset = ((row + padding) * canvasSize + padding) * 4;
    artwork.bitmap.data.copy(canvas.bitmap.data, canvasOffset, sourceOffset, sourceOffset + artworkSize * 4);
  }
  return canvas;
}

function createPreviewTile(layer, color, mask) {
  const viewportSize = Math.round(canvasSize * 72 / 108);
  const inset = (canvasSize - viewportSize) / 2;
  const renderedSize = 384;
  const tile = new Jimp(canvasSize, canvasSize, color)
    .composite(layer, 0, 0)
    .crop(inset, inset, viewportSize, viewportSize)
    .resize(renderedSize, renderedSize, resizeMode);

  tile.scan(0, 0, renderedSize, renderedSize, function (x, y, offset) {
    const normalizedX = Math.abs((x + 0.5) * 2 / renderedSize - 1);
    const normalizedY = Math.abs((y + 0.5) * 2 / renderedSize - 1);
    if (!mask(normalizedX, normalizedY)) this.bitmap.data[offset + 3] = 0;
  });

  return tile.resize(192, 192, resizeMode);
}

async function generateIcons() {
  const source = await Jimp.read(path.join(root, 'app_icon.jpg'));
  const standard = source.clone().resize(canvasSize, canvasSize, resizeMode);
  const artwork = source.clone().resize(artworkSize, artworkSize, resizeMode);
  const monochromeArtwork = artwork.clone();

  // Keep the entire square and feather the outer navy edge into the launcher background.
  artwork.scan(0, 0, artworkSize, artworkSize, function (x, y, offset) {
    const distance = Math.min(x, y, artworkSize - 1 - x, artworkSize - 1 - y);
    this.bitmap.data[offset + 3] = Math.round(255 * Math.min(1, distance / edgeFade));
  });

  // Use luminance as coverage for the existing white line art, filtering out navy JPEG noise.
  monochromeArtwork.scan(0, 0, artworkSize, artworkSize, function (_x, _y, offset) {
    const pixels = this.bitmap.data;
    const luma = 0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2];
    const coverage = Math.max(0, Math.min(1, (luma - 42) / (238 - 42)));
    pixels.fill(255, offset, offset + 3);
    pixels[offset + 3] = Math.round(coverage * 255);
  });

  const foreground = centerArtwork(artwork);
  const monochrome = centerArtwork(monochromeArtwork);
  await standard.writeAsync(path.join(assets, 'icon.png'));
  await foreground.writeAsync(path.join(assets, 'adaptive-icon.png'));
  await monochrome.writeAsync(path.join(assets, 'adaptive-icon-monochrome.png'));

  const circle = (x, y) => x ** 2 + y ** 2 <= 1;
  const squircle = (x, y) => x ** 4 + y ** 4 <= 1;
  const roundedSquare = (x, y) => Math.max(0, x - 0.64) ** 2 + Math.max(0, y - 0.64) ** 2 <= 0.36 ** 2;
  const themed = monochrome.clone().scan(0, 0, canvasSize, canvasSize, function (_x, _y, offset) {
    this.bitmap.data.set([0x11, 0x36, 0x4d], offset);
  });
  const tiles = [
    standard.clone().resize(192, 192, resizeMode),
    createPreviewTile(foreground, background, circle),
    createPreviewTile(foreground, background, squircle),
    createPreviewTile(foreground, background, roundedSquare),
    createPreviewTile(themed, 0xb9e7ffff, circle),
  ];
  const preview = new Jimp(1080, 232, 0x252d3bff);
  tiles.forEach((tile, index) => preview.composite(tile, 20 + index * 212, 20));
  fs.mkdirSync(previewDirectory, { recursive: true });
  await preview.writeAsync(path.join(previewDirectory, 'icon-preview.png'));
}

generateIcons().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
