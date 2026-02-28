import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Downloader } from "../../utils/downloader";

/**
 * 간단한 ZIP 파일을 프로그래밍 방식으로 생성한다.
 * ZIP 형식: Local File Header + File Data + Central Directory + End of Central Directory
 */
function createMinimalZip(fileName: string, content: string): Buffer {
  const fileNameBuf = Buffer.from(fileName, "utf8");
  const contentBuf = Buffer.from(content, "utf8");
  const crc = crc32(contentBuf);

  // Local file header
  const localHeader = Buffer.alloc(30 + fileNameBuf.length);
  localHeader.writeUInt32LE(0x04034b50, 0); // signature
  localHeader.writeUInt16LE(20, 4); // version needed
  localHeader.writeUInt16LE(0, 6); // flags
  localHeader.writeUInt16LE(0, 8); // compression: stored
  localHeader.writeUInt16LE(0, 10); // mod time
  localHeader.writeUInt16LE(0, 12); // mod date
  localHeader.writeUInt32LE(crc, 14); // crc32
  localHeader.writeUInt32LE(contentBuf.length, 18); // compressed size
  localHeader.writeUInt32LE(contentBuf.length, 22); // uncompressed size
  localHeader.writeUInt16LE(fileNameBuf.length, 26); // filename length
  localHeader.writeUInt16LE(0, 28); // extra field length
  fileNameBuf.copy(localHeader, 30);

  // Central directory entry
  const centralDir = Buffer.alloc(46 + fileNameBuf.length);
  centralDir.writeUInt32LE(0x02014b50, 0); // signature
  centralDir.writeUInt16LE(20, 4); // version made by
  centralDir.writeUInt16LE(20, 6); // version needed
  centralDir.writeUInt16LE(0, 8); // flags
  centralDir.writeUInt16LE(0, 10); // compression
  centralDir.writeUInt16LE(0, 12); // mod time
  centralDir.writeUInt16LE(0, 14); // mod date
  centralDir.writeUInt32LE(crc, 16); // crc32
  centralDir.writeUInt32LE(contentBuf.length, 20); // compressed size
  centralDir.writeUInt32LE(contentBuf.length, 24); // uncompressed size
  centralDir.writeUInt16LE(fileNameBuf.length, 28); // filename length
  centralDir.writeUInt16LE(0, 30); // extra field length
  centralDir.writeUInt16LE(0, 32); // comment length
  centralDir.writeUInt16LE(0, 34); // disk number start
  centralDir.writeUInt16LE(0, 36); // internal attr
  centralDir.writeUInt32LE(0, 38); // external attr
  centralDir.writeUInt32LE(0, 42); // offset of local header
  fileNameBuf.copy(centralDir, 46);

  // End of central directory
  const endOfCentral = Buffer.alloc(22);
  const centralOffset = localHeader.length + contentBuf.length;
  endOfCentral.writeUInt32LE(0x06054b50, 0); // signature
  endOfCentral.writeUInt16LE(0, 4); // disk number
  endOfCentral.writeUInt16LE(0, 6); // disk with central dir
  endOfCentral.writeUInt16LE(1, 8); // entries on this disk
  endOfCentral.writeUInt16LE(1, 10); // total entries
  endOfCentral.writeUInt32LE(centralDir.length, 12); // central dir size
  endOfCentral.writeUInt32LE(centralOffset, 16); // central dir offset
  endOfCentral.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([localHeader, contentBuf, centralDir, endOfCentral]);
}

/** 간단한 CRC32 구현 */
function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

suite("Downloader", () => {
  let tempDir: string;

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spring-forge-test-"));
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test("유효한 ZIP을 압축 해제해야 한다", async () => {
    const zipBuffer = createMinimalZip("hello.txt", "Hello, Spring!");

    await Downloader.extractZip(zipBuffer, tempDir);

    const extracted = path.join(tempDir, "hello.txt");
    assert.ok(fs.existsSync(extracted), "hello.txt가 존재해야 한다");

    const content = fs.readFileSync(extracted, "utf8");
    assert.strictEqual(content, "Hello, Spring!");
  });

  test("빈 내용의 파일도 압축 해제해야 한다", async () => {
    const zipBuffer = createMinimalZip("empty.txt", "");

    await Downloader.extractZip(zipBuffer, tempDir);

    const extracted = path.join(tempDir, "empty.txt");
    assert.ok(fs.existsSync(extracted));

    const content = fs.readFileSync(extracted, "utf8");
    assert.strictEqual(content, "");
  });

  test("손상된 ZIP은 에러를 발생시켜야 한다", async () => {
    const corruptBuffer = Buffer.from("this is not a zip file");

    await assert.rejects(() =>
      Downloader.extractZip(corruptBuffer, tempDir)
    );
  });
});
