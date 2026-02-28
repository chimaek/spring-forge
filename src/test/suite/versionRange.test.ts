import * as assert from "assert";
import { isCompatible } from "../../utils/versionRange";

suite("versionRange", () => {
  suite("isCompatible", () => {
    test("versionRange가 undefined이면 항상 호환", () => {
      assert.strictEqual(isCompatible(undefined, "3.2.0"), true);
    });

    test("파싱 불가능한 versionRange는 호환으로 처리", () => {
      assert.strictEqual(isCompatible("invalid", "3.2.0"), true);
    });

    test("[3.0.0,3.2.0) - 닫힌 시작, 열린 끝", () => {
      assert.strictEqual(isCompatible("[3.0.0,3.2.0)", "3.0.0"), true);
      assert.strictEqual(isCompatible("[3.0.0,3.2.0)", "3.1.0"), true);
      assert.strictEqual(isCompatible("[3.0.0,3.2.0)", "3.1.9"), true);
      assert.strictEqual(isCompatible("[3.0.0,3.2.0)", "3.2.0"), false);
      assert.strictEqual(isCompatible("[3.0.0,3.2.0)", "2.9.0"), false);
    });

    test("(3.0.0,3.2.0] - 열린 시작, 닫힌 끝", () => {
      assert.strictEqual(isCompatible("(3.0.0,3.2.0]", "3.0.0"), false);
      assert.strictEqual(isCompatible("(3.0.0,3.2.0]", "3.0.1"), true);
      assert.strictEqual(isCompatible("(3.0.0,3.2.0]", "3.2.0"), true);
      assert.strictEqual(isCompatible("(3.0.0,3.2.0]", "3.2.1"), false);
    });

    test("[3.1.0,3.3.0] - 양쪽 닫힌 범위", () => {
      assert.strictEqual(isCompatible("[3.1.0,3.3.0]", "3.1.0"), true);
      assert.strictEqual(isCompatible("[3.1.0,3.3.0]", "3.3.0"), true);
      assert.strictEqual(isCompatible("[3.1.0,3.3.0]", "3.0.9"), false);
      assert.strictEqual(isCompatible("[3.1.0,3.3.0]", "3.3.1"), false);
    });

    test("(3.0.0,3.2.0) - 양쪽 열린 범위", () => {
      assert.strictEqual(isCompatible("(3.0.0,3.2.0)", "3.0.0"), false);
      assert.strictEqual(isCompatible("(3.0.0,3.2.0)", "3.1.0"), true);
      assert.strictEqual(isCompatible("(3.0.0,3.2.0)", "3.2.0"), false);
    });

    test("[3.2.0,) - 하한만 있는 범위", () => {
      assert.strictEqual(isCompatible("[3.2.0,)", "3.2.0"), true);
      assert.strictEqual(isCompatible("[3.2.0,)", "3.5.0"), true);
      assert.strictEqual(isCompatible("[3.2.0,)", "3.1.9"), false);
    });

    test("(,3.3.0) - 상한만 있는 범위", () => {
      assert.strictEqual(isCompatible("(,3.3.0)", "3.2.0"), true);
      assert.strictEqual(isCompatible("(,3.3.0)", "3.3.0"), false);
      assert.strictEqual(isCompatible("(,3.3.0)", "1.0.0"), true);
    });
  });
});
