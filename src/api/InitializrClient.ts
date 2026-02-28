import * as https from "https";
import { InitializrMetadata, GenerateOptions } from "./types";

const METADATA_URL = "https://start.spring.io/metadata/client";
const GENERATOR_URL = "https://start.spring.io/starter.zip";
const ACCEPT_HEADER = "application/vnd.initializr.v2.2+json";

export class InitializrClient {
  private static metadataCache: {
    data: InitializrMetadata;
    fetchedAt: number;
  } | null = null;

  private static readonly CACHE_TTL_MS = 60 * 60 * 1000;

  static async fetchMetadata(): Promise<InitializrMetadata> {
    const now = Date.now();
    if (
      this.metadataCache &&
      now - this.metadataCache.fetchedAt < this.CACHE_TTL_MS
    ) {
      return this.metadataCache.data;
    }

    const raw = await this.get(METADATA_URL, { Accept: ACCEPT_HEADER });
    const data: InitializrMetadata = JSON.parse(raw);
    this.metadataCache = { data, fetchedAt: now };
    return data;
  }

  static buildGenerateUrl(options: GenerateOptions): string {
    const params = new URLSearchParams({
      type: options.type,
      language: options.language,
      bootVersion: options.bootVersion,
      groupId: options.groupId,
      artifactId: options.artifactId,
      name: options.name,
      description: options.description,
      packageName: options.packageName,
      packaging: options.packaging,
      javaVersion: options.javaVersion,
      dependencies: options.dependencies.join(","),
    });
    return `${GENERATOR_URL}?${params.toString()}`;
  }

  static downloadZip(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      https
        .get(url, (res) => {
          if (res.statusCode === 302 && res.headers.location) {
            this.downloadZip(res.headers.location)
              .then(resolve)
              .catch(reject);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: 프로젝트 생성 실패`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
          res.on("error", reject);
        })
        .on("error", reject);
    });
  }

  private static get(
    url: string,
    headers: Record<string, string>
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      https
        .get(url, { headers }, (res) => {
          let data = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
          res.on("error", reject);
        })
        .on("error", reject);
    });
  }

  static invalidateCache(): void {
    this.metadataCache = null;
  }
}
