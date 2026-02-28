import * as assert from "assert";
import nock from "nock";
import { InitializrClient } from "../../api/InitializrClient";

const FAKE_METADATA = {
  bootVersion: {
    type: "single-select" as const,
    default: "3.3.0",
    values: [
      { id: "3.3.0", name: "3.3.0" },
      { id: "3.2.0", name: "3.2.0" },
    ],
  },
  language: {
    type: "single-select" as const,
    default: "java",
    values: [{ id: "java", name: "Java" }],
  },
  packaging: {
    type: "single-select" as const,
    default: "jar",
    values: [{ id: "jar", name: "Jar" }],
  },
  javaVersion: {
    type: "single-select" as const,
    default: "21",
    values: [{ id: "21", name: "21" }],
  },
  type: {
    type: "single-select" as const,
    default: "maven-project",
    values: [{ id: "maven-project", name: "Maven Project" }],
  },
  dependencies: {
    type: "hierarchical-multi-select" as const,
    values: [
      {
        name: "Web",
        values: [
          { id: "web", name: "Spring Web", description: "Build web apps" },
        ],
      },
    ],
  },
  groupId: { type: "text" as const, default: "com.example" },
  artifactId: { type: "text" as const, default: "demo" },
  version: { type: "text" as const, default: "0.0.1-SNAPSHOT" },
  name: { type: "text" as const, default: "demo" },
  description: { type: "text" as const, default: "Demo project" },
  packageName: { type: "text" as const, default: "com.example.demo" },
};

suite("InitializrClient", () => {
  setup(() => {
    InitializrClient.invalidateCache();
    nock.cleanAll();
  });

  teardown(() => {
    nock.cleanAll();
  });

  suite("buildGenerateUrl", () => {
    const baseOptions = {
      type: "maven-project",
      language: "java",
      bootVersion: "3.3.0",
      groupId: "com.example",
      artifactId: "demo",
      name: "demo",
      description: "Demo project",
      packageName: "com.example.demo",
      packaging: "jar",
      javaVersion: "21",
      dependencies: ["web", "data-jpa"],
    };

    test("모든 파라미터가 URL에 포함되어야 한다", () => {
      const url = InitializrClient.buildGenerateUrl(baseOptions);

      assert.ok(url.startsWith("https://start.spring.io/starter.zip?"));
      assert.ok(url.includes("type=maven-project"));
      assert.ok(url.includes("language=java"));
      assert.ok(url.includes("bootVersion=3.3.0"));
      assert.ok(url.includes("groupId=com.example"));
      assert.ok(url.includes("artifactId=demo"));
      assert.ok(url.includes("name=demo"));
      assert.ok(url.includes("packageName=com.example.demo"));
      assert.ok(url.includes("packaging=jar"));
      assert.ok(url.includes("javaVersion=21"));
    });

    test("의존성이 쉼표로 구분되어야 한다", () => {
      const url = InitializrClient.buildGenerateUrl(baseOptions);
      assert.ok(
        url.includes("dependencies=web%2Cdata-jpa") ||
          url.includes("dependencies=web,data-jpa")
      );
    });

    test("빈 의존성 배열 처리", () => {
      const url = InitializrClient.buildGenerateUrl({
        ...baseOptions,
        dependencies: [],
      });
      assert.ok(url.includes("dependencies="));
    });

    test("description에 특수문자가 URL 인코딩되어야 한다", () => {
      const url = InitializrClient.buildGenerateUrl({
        ...baseOptions,
        description: "Hello World & Test",
      });
      assert.ok(
        url.includes("description=Hello+World+%26+Test") ||
          url.includes("description=Hello%20World%20%26%20Test")
      );
    });

    test("Gradle Kotlin 빌드 타입 처리", () => {
      const url = InitializrClient.buildGenerateUrl({
        ...baseOptions,
        type: "gradle-project-kotlin",
      });
      assert.ok(url.includes("type=gradle-project-kotlin"));
    });
  });

  suite("fetchMetadata", () => {
    test("API에서 메타데이터를 가져와야 한다", async () => {
      nock("https://start.spring.io")
        .get("/metadata/client")
        .reply(200, FAKE_METADATA);

      const metadata = await InitializrClient.fetchMetadata();
      assert.strictEqual(metadata.bootVersion.default, "3.3.0");
      assert.strictEqual(metadata.language.default, "java");
      assert.strictEqual(metadata.dependencies.values.length, 1);
      assert.strictEqual(metadata.dependencies.values[0].name, "Web");
    });

    test("캐시된 데이터를 재사용해야 한다 (두 번째 호출 시 HTTP 요청 없음)", async () => {
      const scope = nock("https://start.spring.io")
        .get("/metadata/client")
        .once()
        .reply(200, FAKE_METADATA);

      await InitializrClient.fetchMetadata();
      const metadata2 = await InitializrClient.fetchMetadata();

      assert.strictEqual(metadata2.bootVersion.default, "3.3.0");
      assert.ok(scope.isDone());
    });

    test("invalidateCache 후 다시 API를 호출해야 한다", async () => {
      nock("https://start.spring.io")
        .get("/metadata/client")
        .twice()
        .reply(200, FAKE_METADATA);

      await InitializrClient.fetchMetadata();
      InitializrClient.invalidateCache();
      const metadata = await InitializrClient.fetchMetadata();

      assert.strictEqual(metadata.bootVersion.default, "3.3.0");
    });

    test("네트워크 에러 시 reject되어야 한다", async () => {
      nock("https://start.spring.io")
        .get("/metadata/client")
        .replyWithError("Network error");

      await assert.rejects(
        () => InitializrClient.fetchMetadata(),
        /Network error/
      );
    });

    test("잘못된 JSON 응답 시 reject되어야 한다", async () => {
      nock("https://start.spring.io")
        .get("/metadata/client")
        .reply(200, "not-json");

      await assert.rejects(
        () => InitializrClient.fetchMetadata(),
        /Unexpected token/
      );
    });
  });

  suite("downloadZip", () => {
    test("200 응답 시 Buffer를 반환해야 한다", async () => {
      const fakeZip = Buffer.from("PK\x03\x04fakezipdata");
      nock("https://start.spring.io")
        .get("/starter.zip?test=1")
        .reply(200, fakeZip);

      const result = await InitializrClient.downloadZip(
        "https://start.spring.io/starter.zip?test=1"
      );
      assert.ok(Buffer.isBuffer(result));
      assert.ok(result.length > 0);
    });

    test("302 리다이렉트를 따라가야 한다", async () => {
      const fakeZip = Buffer.from("PK\x03\x04redirectedzip");
      nock("https://start.spring.io")
        .get("/starter.zip?redirect=1")
        .reply(302, "", {
          Location: "https://start.spring.io/actual.zip",
        });
      nock("https://start.spring.io")
        .get("/actual.zip")
        .reply(200, fakeZip);

      const result = await InitializrClient.downloadZip(
        "https://start.spring.io/starter.zip?redirect=1"
      );
      assert.ok(Buffer.isBuffer(result));
    });

    test("404 에러 시 reject되어야 한다", async () => {
      nock("https://start.spring.io")
        .get("/starter.zip?fail=1")
        .reply(404);

      await assert.rejects(
        () =>
          InitializrClient.downloadZip(
            "https://start.spring.io/starter.zip?fail=1"
          ),
        /HTTP 404/
      );
    });

    test("500 서버 에러 시 reject되어야 한다", async () => {
      nock("https://start.spring.io")
        .get("/starter.zip?error=1")
        .reply(500);

      await assert.rejects(
        () =>
          InitializrClient.downloadZip(
            "https://start.spring.io/starter.zip?error=1"
          ),
        /HTTP 500/
      );
    });

    test("네트워크 에러 시 reject되어야 한다", async () => {
      nock("https://start.spring.io")
        .get("/starter.zip?neterr=1")
        .replyWithError("Connection refused");

      await assert.rejects(
        () =>
          InitializrClient.downloadZip(
            "https://start.spring.io/starter.zip?neterr=1"
          ),
        /Connection refused/
      );
    });
  });

  suite("invalidateCache", () => {
    test("캐시 무효화 후 에러 없이 동작해야 한다", () => {
      assert.doesNotThrow(() => {
        InitializrClient.invalidateCache();
      });
    });

    test("연속 무효화도 안전해야 한다", () => {
      assert.doesNotThrow(() => {
        InitializrClient.invalidateCache();
        InitializrClient.invalidateCache();
      });
    });
  });
});
