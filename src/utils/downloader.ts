import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import { Extract, Parse } from "unzipper";

export class Downloader {
  static async extractZip(buffer: Buffer, destDir: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const extractor = Extract({ path: destDir });
      extractor.on("close", resolve);
      extractor.on("error", reject);
      Readable.from(buffer).pipe(extractor);
    });
  }

  /** ZIP 버퍼에서 특정 파일의 텍스트 내용을 추출한다 */
  static async extractFileContent(buffer: Buffer, fileName: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      let found = false;
      const stream = Readable.from(buffer).pipe(Parse());

      stream.on("entry", (entry: { path: string; autodrain: () => void; buffer: () => Promise<Buffer> }) => {
        if (entry.path === fileName) {
          found = true;
          entry.buffer()
            .then((buf: Buffer) => resolve(buf.toString("utf-8")))
            .catch(reject);
        } else {
          entry.autodrain();
        }
      });

      stream.on("close", () => {
        if (!found) resolve(null);
      });
      stream.on("error", reject);
    });
  }

  /** 압축 해제 후 실제 생성된 프로젝트 디렉터리를 찾는다 */
  static findProjectDir(targetDir: string, artifactId: string): string | null {
    // 1) 기대 경로가 존재하면 그대로 반환
    const joined = path.join(targetDir, artifactId);
    if (fs.existsSync(joined)) {
      return joined;
    }

    // 2) targetDir 하위 디렉터리 중 가장 최근 생성된 것을 반환
    try {
      const entries = fs.readdirSync(targetDir, { withFileTypes: true });
      const dirs = entries
        .filter((e) => e.isDirectory())
        .map((e) => ({
          name: e.name,
          path: path.join(targetDir, e.name),
          mtime: fs.statSync(path.join(targetDir, e.name)).mtimeMs,
        }))
        .sort((a, b) => b.mtime - a.mtime);

      if (dirs.length > 0) {
        return dirs[0].path;
      }
    } catch {
      // ignore
    }

    return null;
  }
}
