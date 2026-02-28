import * as assert from "assert";
import { toDisplayName, derivePackageName } from "../../utils/nameDeriver";

suite("nameDeriver", () => {
  suite("toDisplayName", () => {
    test("하이픈으로 구분된 artifactId를 Title Case로 변환", () => {
      assert.strictEqual(toDisplayName("my-spring-app"), "My Spring App");
    });

    test("언더스코어로 구분된 artifactId를 Title Case로 변환", () => {
      assert.strictEqual(toDisplayName("my_spring_app"), "My Spring App");
    });

    test("단일 단어 artifactId 처리", () => {
      assert.strictEqual(toDisplayName("demo"), "Demo");
    });

    test("빈 문자열 처리", () => {
      assert.strictEqual(toDisplayName(""), "");
    });
  });

  suite("derivePackageName", () => {
    test("기본 packageName 생성", () => {
      assert.strictEqual(
        derivePackageName("com.example", "demo"),
        "com.example.demo"
      );
    });

    test("하이픈이 포함된 artifactId에서 하이픈 제거", () => {
      assert.strictEqual(
        derivePackageName("com.example", "my-app"),
        "com.example.myapp"
      );
    });

    test("대문자를 소문자로 변환", () => {
      assert.strictEqual(
        derivePackageName("com.Example", "MyApp"),
        "com.example.myapp"
      );
    });

    test("특수문자 제거", () => {
      assert.strictEqual(
        derivePackageName("com.exam!ple", "de@mo"),
        "com.example.demo"
      );
    });
  });
});
