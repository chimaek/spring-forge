import * as assert from "assert";
import { JSDOM } from "jsdom";
import type { DependencyGroup } from "../../api/types";

// JSDOM 환경 설정 후 DependencySearch를 동적으로 로드
// (DependencySearch는 브라우저 전역 document를 사용하므로 JSDOM 필요)

const SAMPLE_GROUPS: DependencyGroup[] = [
  {
    name: "Web",
    values: [
      { id: "web", name: "Spring Web", description: "Build web applications" },
      {
        id: "webflux",
        name: "Spring WebFlux",
        description: "Reactive web framework",
      },
    ],
  },
  {
    name: "Security",
    values: [
      {
        id: "security",
        name: "Spring Security",
        description: "Authentication and authorization",
      },
    ],
  },
  {
    name: "Data",
    values: [
      {
        id: "data-jpa",
        name: "Spring Data JPA",
        description: "Java Persistence API",
        versionRange: "[3.0.0,3.4.0)",
      },
    ],
  },
];

suite("DependencySearch (JSDOM)", () => {
  let dom: JSDOM;
  let document: Document;
  let listContainer: HTMLElement;
  let badgesContainer: HTMLElement;
  let searchInput: HTMLInputElement;

  // DependencySearch 클래스를 JSDOM 환경에서 로드
  let DependencySearch: typeof import("../../panel/webview/components/DependencySearch").DependencySearch;

  suiteSetup(async () => {
    // DependencySearch 모듈 로드
    const mod = await import(
      "../../panel/webview/components/DependencySearch"
    );
    DependencySearch = mod.DependencySearch;
  });

  setup(() => {
    dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
    document = dom.window.document;

    // 글로벌 document 설정 (DependencySearch가 document.createElement 사용)
    (global as any).document = document;

    listContainer = document.createElement("div");
    badgesContainer = document.createElement("div");
    searchInput = document.createElement("input") as HTMLInputElement;

    document.body.appendChild(listContainer);
    document.body.appendChild(badgesContainer);
    document.body.appendChild(searchInput);
  });

  teardown(() => {
    delete (global as any).document;
    dom.window.close();
  });

  test("initialize 후 모든 그룹이 렌더링되어야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    const details = listContainer.querySelectorAll("details");
    assert.strictEqual(details.length, 3, "3개의 카테고리 그룹이 있어야 한다");

    const summaries = listContainer.querySelectorAll(".dep-group-summary");
    assert.strictEqual(summaries[0].textContent, "Web");
    assert.strictEqual(summaries[1].textContent, "Security");
    assert.strictEqual(summaries[2].textContent, "Data");
  });

  test("체크박스 클릭 시 selectedIds가 업데이트되어야 한다", () => {
    let callbackIds: string[] = [];
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", (ids) => {
      callbackIds = ids;
    });

    const checkbox = listContainer.querySelector(
      'input[value="web"]'
    ) as HTMLInputElement;
    assert.ok(checkbox, "web 체크박스가 존재해야 한다");

    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event("change"));

    assert.deepStrictEqual(callbackIds, ["web"]);
    assert.deepStrictEqual(search.getSelectedIds(), ["web"]);
  });

  test("체크박스 해제 시 selectedIds에서 제거되어야 한다", () => {
    let callbackIds: string[] = [];
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", (ids) => {
      callbackIds = ids;
    });

    // 선택
    const checkbox = listContainer.querySelector(
      'input[value="web"]'
    ) as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event("change"));
    assert.deepStrictEqual(callbackIds, ["web"]);

    // 해제
    checkbox.checked = false;
    checkbox.dispatchEvent(new dom.window.Event("change"));
    assert.deepStrictEqual(callbackIds, []);
    assert.deepStrictEqual(search.getSelectedIds(), []);
  });

  test("선택 시 뱃지가 표시되어야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    const checkbox = listContainer.querySelector(
      'input[value="security"]'
    ) as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event("change"));

    const badges = badgesContainer.querySelectorAll(".dep-badge");
    assert.strictEqual(badges.length, 1);
    assert.ok(badges[0].textContent?.includes("Spring Security"));
  });

  test("미선택 시 안내 텍스트가 표시되어야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    const noDeps = badgesContainer.querySelector(".no-deps");
    assert.ok(noDeps, "안내 텍스트가 표시되어야 한다");
    assert.ok(noDeps?.textContent?.includes("의존성을 선택하세요"));
  });

  test("검색 시 이름으로 필터링되어야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    searchInput.value = "security";
    searchInput.dispatchEvent(new dom.window.Event("input"));

    const items = listContainer.querySelectorAll(".dep-item");
    assert.strictEqual(items.length, 1, "Security만 표시되어야 한다");
  });

  test("검색 시 description으로도 필터링되어야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    searchInput.value = "reactive";
    searchInput.dispatchEvent(new dom.window.Event("input"));

    const items = listContainer.querySelectorAll(".dep-item");
    assert.strictEqual(items.length, 1);

    const name = items[0].querySelector(".dep-name");
    assert.strictEqual(name?.textContent, "Spring WebFlux");
  });

  test("검색 시 ID로도 필터링되어야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    searchInput.value = "data-jpa";
    searchInput.dispatchEvent(new dom.window.Event("input"));

    const items = listContainer.querySelectorAll(".dep-item");
    assert.strictEqual(items.length, 1);
  });

  test("검색 결과가 없으면 안내 메시지가 표시되어야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    searchInput.value = "nonexistent-dep-xyz";
    searchInput.dispatchEvent(new dom.window.Event("input"));

    const noResult = listContainer.querySelector(".no-result");
    assert.ok(noResult, "검색 결과 없음 메시지가 표시되어야 한다");
  });

  test("검색어를 지우면 전체 목록이 다시 표시되어야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    searchInput.value = "security";
    searchInput.dispatchEvent(new dom.window.Event("input"));
    assert.strictEqual(listContainer.querySelectorAll(".dep-item").length, 1);

    searchInput.value = "";
    searchInput.dispatchEvent(new dom.window.Event("input"));
    assert.strictEqual(listContainer.querySelectorAll(".dep-item").length, 4);
  });

  test("Boot 버전 변경 시 비호환 의존성이 자동 해제되어야 한다", () => {
    let callbackIds: string[] = [];
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", (ids) => {
      callbackIds = ids;
    });

    // data-jpa 선택 (versionRange: [3.0.0,3.4.0) → 3.3.0은 호환)
    const jpaCheckbox = listContainer.querySelector(
      'input[value="data-jpa"]'
    ) as HTMLInputElement;
    jpaCheckbox.checked = true;
    jpaCheckbox.dispatchEvent(new dom.window.Event("change"));
    assert.deepStrictEqual(callbackIds, ["data-jpa"]);

    // Boot 버전을 3.5.0으로 변경 → data-jpa는 [3.0.0,3.4.0)에서 비호환
    search.updateBootVersion("3.5.0");

    assert.deepStrictEqual(callbackIds, []);
    assert.deepStrictEqual(search.getSelectedIds(), []);
  });

  test("비호환 의존성은 disabled 상태여야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    // Boot 4.0.0 → data-jpa [3.0.0,3.4.0) 범위 밖
    search.initialize(SAMPLE_GROUPS, "4.0.0", () => {});

    const jpaCheckbox = listContainer.querySelector(
      'input[value="data-jpa"]'
    ) as HTMLInputElement;
    assert.ok(jpaCheckbox.disabled, "비호환 의존성은 disabled여야 한다");

    const jpaLabel = jpaCheckbox.closest(".dep-item");
    assert.ok(
      jpaLabel?.classList.contains("dep-item--incompatible"),
      "비호환 스타일 클래스가 적용되어야 한다"
    );
  });

  test("호환되는 의존성은 enabled 상태여야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    // web은 versionRange가 없으므로 항상 호환
    const webCheckbox = listContainer.querySelector(
      'input[value="web"]'
    ) as HTMLInputElement;
    assert.ok(!webCheckbox.disabled, "호환 의존성은 enabled여야 한다");
  });

  // --- 키보드 네비게이션 테스트 ---

  test("focusSearch 호출 시 searchInput에 포커스되어야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    search.focusSearch();
    assert.strictEqual(
      document.activeElement,
      searchInput,
      "searchInput에 포커스가 잡혀야 한다"
    );
  });

  test("검색창에서 ArrowDown 시 첫 번째 항목이 focused 되어야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    searchInput.focus();
    const event = new dom.window.KeyboardEvent("keydown", { key: "ArrowDown" });
    searchInput.dispatchEvent(event);

    const focusedItem = listContainer.querySelector(".dep-item--focused");
    assert.ok(focusedItem, "첫 번째 항목이 focused 되어야 한다");

    const name = focusedItem?.querySelector(".dep-name");
    assert.strictEqual(name?.textContent, "Spring Web");
  });

  test("검색창에서 Enter 시 첫 번째 항목이 토글되어야 한다", () => {
    let callbackIds: string[] = [];
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", (ids) => {
      callbackIds = ids;
    });

    searchInput.focus();
    const event = new dom.window.KeyboardEvent("keydown", { key: "Enter" });
    searchInput.dispatchEvent(event);

    assert.deepStrictEqual(callbackIds, ["web"], "첫 번째 항목이 선택되어야 한다");
  });

  test("의존성 항목에 tabIndex가 설정되어야 한다", () => {
    const search = new DependencySearch(
      listContainer,
      badgesContainer,
      searchInput
    );
    search.initialize(SAMPLE_GROUPS, "3.3.0", () => {});

    const items = listContainer.querySelectorAll(".dep-item");
    for (const item of items) {
      assert.strictEqual(
        (item as HTMLElement).tabIndex,
        0,
        "dep-item에 tabIndex=0이 설정되어야 한다"
      );
    }
  });
});
