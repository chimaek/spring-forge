import * as fs from "fs";
import { Readable } from "stream";
import { Extract } from "unzipper";

export class Downloader {
  static async extractZip(buffer: Buffer, destDir: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const extractor = Extract({ path: destDir });
      extractor.on("close", resolve);
      extractor.on("error", reject);
      Readable.from(buffer).pipe(extractor);
    });
  }

  /** 압축 해제 후 실제 생성된 프로젝트 디렉터리를 찾는다 */
  static findProjectDir(targetDir: string, artifactId: string): string | null {
    const p = require("path");

    // 1) 기대 경로가 존재하면 그대로 반환
    const joined = p.join(targetDir, artifactId);
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
          path: p.join(targetDir, e.name),
          mtime: fs.statSync(p.join(targetDir, e.name)).mtimeMs,
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
