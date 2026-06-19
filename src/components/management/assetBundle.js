const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_FILE_SIGNATURE = 0x02014b50;
const ZIP_END_SIGNATURE = 0x06054b50;

const DATA_EXTENSIONS = new Set(["csv", "tsv", "txt", "json"]);
const DESCRIPTION_EXTENSIONS = new Set(["csv", "json"]);

const getUint16 = (view, offset) => view.getUint16(offset, true);
const getUint32 = (view, offset) => view.getUint32(offset, true);

const getExtension = (path) => {
  const basename = path.split("/").pop() || "";
  const dotIndex = basename.lastIndexOf(".");
  return dotIndex === -1 ? "" : basename.slice(dotIndex + 1).toLowerCase();
};

const getAssetKey = (path) => {
  const basename = path.split("/").pop() || "";
  const dotIndex = basename.lastIndexOf(".");
  return (dotIndex === -1 ? basename : basename.slice(0, dotIndex))
    .trim()
    .toLowerCase();
};

export const findAssetBundleEntries = (entries) => {
  const files = entries.filter((entry) => {
    const name = entry?.name || "";
    return name && !name.endsWith("/") && !name.startsWith("__MACOSX/");
  });

  const findByKey = (keys, allowedExtensions) =>
    files.find((entry) => {
      const key = getAssetKey(entry.name);
      return keys.includes(key) && allowedExtensions.has(getExtension(entry.name));
    });

  const data = findByKey(["data"], DATA_EXTENSIONS);
  const hierarchy = findByKey(["hierarchy", "hierachy"], new Set(["json"]));
  const descriptions = findByKey(["descriptions"], DESCRIPTION_EXTENSIONS);

  if (!data || !hierarchy || !descriptions) {
    const missing = [
      !data ? "data" : null,
      !hierarchy ? "hierarchy" : null,
      !descriptions ? "descriptions" : null,
    ].filter(Boolean);

    throw new Error(`ZIP is missing: ${missing.join(", ")}.`);
  }

  return { data, hierarchy, descriptions };
};

const inflateRaw = async (bytes) => {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot decompress ZIP files.");
  }

  const stream = new Blob([bytes]).stream().pipeThrough(
    new DecompressionStream("deflate-raw"),
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

const readZipEntryBytes = async (arrayBuffer, entry) => {
  const view = new DataView(arrayBuffer);
  const offset = entry.localHeaderOffset;

  if (getUint32(view, offset) !== ZIP_LOCAL_FILE_SIGNATURE) {
    throw new Error(`Invalid ZIP local header for "${entry.name}".`);
  }

  const filenameLength = getUint16(view, offset + 26);
  const extraLength = getUint16(view, offset + 28);
  const dataStart = offset + 30 + filenameLength + extraLength;
  const compressed = new Uint8Array(
    arrayBuffer,
    dataStart,
    entry.compressedSize,
  );

  if (entry.method === 0) return compressed;
  if (entry.method === 8) return inflateRaw(compressed);

  throw new Error(`Unsupported ZIP compression method: ${entry.method}.`);
};

const parseZipEntries = (arrayBuffer) => {
  const view = new DataView(arrayBuffer);
  let endOffset = -1;

  for (let offset = arrayBuffer.byteLength - 22; offset >= 0; offset -= 1) {
    if (getUint32(view, offset) === ZIP_END_SIGNATURE) {
      endOffset = offset;
      break;
    }
  }

  if (endOffset === -1) throw new Error("Invalid ZIP file.");

  const entryCount = getUint16(view, endOffset + 10);
  let offset = getUint32(view, endOffset + 16);
  const entries = [];

  for (let i = 0; i < entryCount; i += 1) {
    if (getUint32(view, offset) !== ZIP_CENTRAL_FILE_SIGNATURE) {
      throw new Error("Invalid ZIP central directory.");
    }

    const flags = getUint16(view, offset + 8);
    const method = getUint16(view, offset + 10);
    const compressedSize = getUint32(view, offset + 20);
    const uncompressedSize = getUint32(view, offset + 24);
    const filenameLength = getUint16(view, offset + 28);
    const extraLength = getUint16(view, offset + 30);
    const commentLength = getUint16(view, offset + 32);
    const localHeaderOffset = getUint32(view, offset + 42);
    const nameBytes = new Uint8Array(arrayBuffer, offset + 46, filenameLength);
    const name = new TextDecoder(flags & 0x0800 ? "utf-8" : "utf-8").decode(
      nameBytes,
    );

    entries.push({
      name,
      method,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset += 46 + filenameLength + extraLength + commentLength;
  }

  return entries;
};

export const readAssetBundle = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const entries = parseZipEntries(arrayBuffer);
  const assets = findAssetBundleEntries(entries);

  const readText = async (entry) => ({
    name: entry.name.split("/").pop(),
    extension: getExtension(entry.name),
    text: textDecoder.decode(await readZipEntryBytes(arrayBuffer, entry)),
  });

  return {
    data: await readText(assets.data),
    hierarchy: await readText(assets.hierarchy),
    descriptions: await readText(assets.descriptions),
  };
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (bytes) => {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
};

const writeUint16 = (view, offset, value) => view.setUint16(offset, value, true);
const writeUint32 = (view, offset, value) => view.setUint32(offset, value, true);

export const createAssetBundleZip = (files) => {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach(({ name, content }) => {
    const nameBytes = textEncoder.encode(name);
    const contentBytes = textEncoder.encode(content);
    const checksum = crc32(contentBytes);
    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    const localOffset = offset;

    writeUint32(localView, 0, ZIP_LOCAL_FILE_SIGNATURE);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, contentBytes.length);
    writeUint32(localView, 22, contentBytes.length);
    writeUint16(localView, 26, nameBytes.length);

    localParts.push(localHeader, nameBytes, contentBytes);
    offset += localHeader.length + nameBytes.length + contentBytes.length;

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, ZIP_CENTRAL_FILE_SIGNATURE);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, contentBytes.length);
    writeUint32(centralView, 24, contentBytes.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint32(centralView, 42, localOffset);

    centralParts.push(centralHeader, nameBytes);
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endHeader = new Uint8Array(22);
  const endView = new DataView(endHeader.buffer);
  writeUint32(endView, 0, ZIP_END_SIGNATURE);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, offset);

  return new Blob([...localParts, ...centralParts, endHeader], {
    type: "application/zip",
  });
};
