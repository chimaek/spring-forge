import type { DependencyGroup, Dependency } from "../../../api/types";
import { isCompatible } from "../../../utils/versionRange";

const POPULAR_IDS = new Set([
  "web", "data-jpa", "security", "devtools", "lombok",
  "thymeleaf", "validation", "actuator", "data-rest",
  "h2", "mysql", "postgresql", "oauth2-client", "webflux",
]);

const RECOMMENDATIONS: Record<string, string[]> = {
  "web": ["validation", "devtools", "actuator", "thymeleaf"],
  "data-jpa": ["h2", "mysql", "postgresql", "validation", "lombok"],
  "security": ["oauth2-client", "web", "data-jpa"],
  "webflux": ["devtools", "actuator", "security"],
  "thymeleaf": ["web", "validation", "devtools"],
  "data-rest": ["data-jpa", "h2", "lombok"],
  "mysql": ["data-jpa", "lombok"],
  "postgresql": ["data-jpa", "lombok"],
  "h2": ["data-jpa"],
};

export class DependencySearch {
  private selectedIds = new Set<string>();
  private allGroups: DependencyGroup[] = [];
  private currentBootVersion = "";
  private onChangeCallback: (ids: string[]) => void = () => {};
  private onOpenLinkCallback: (url: string) => void = () => {};
  private focusedIndex = -1;
  private visibleItems: HTMLElement[] = [];
  private activeTooltip: HTMLElement | null = null;

  constructor(
    private listContainer: HTMLElement,
    private badgesContainer: HTMLElement,
    private searchInput: HTMLInputElement
  ) {
    this.searchInput.addEventListener("input", () => {
      this.focusedIndex = -1;
      this.filterAndRender(this.searchInput.value.toLowerCase().trim());
    });

    this.searchInput.addEventListener("keydown", (e) => {
      this.handleSearchKeydown(e);
    });

    this.listContainer.addEventListener("keydown", (e) => {
      this.handleListKeydown(e);
    });
  }

  focusSearch(): void {
    this.searchInput.focus();
    this.searchInput.select();
  }

  private handleSearchKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.moveFocus(0);
        break;
      case "Enter":
        e.preventDefault();
        if (this.visibleItems.length > 0) {
          this.toggleItemAtIndex(0);
        }
        break;
      case "Escape":
        e.preventDefault();
        this.searchInput.blur();
        break;
    }
  }

  private handleListKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.moveFocus(this.focusedIndex + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (this.focusedIndex <= 0) {
          this.focusedIndex = -1;
          this.clearFocusHighlight();
          this.searchInput.focus();
        } else {
          this.moveFocus(this.focusedIndex - 1);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (this.focusedIndex >= 0) {
          this.toggleItemAtIndex(this.focusedIndex);
        }
        break;
      case "Escape":
        e.preventDefault();
        this.focusedIndex = -1;
        this.clearFocusHighlight();
        this.searchInput.focus();
        break;
    }
  }

  private moveFocus(index: number) {
    if (this.visibleItems.length === 0) return;
    this.clearFocusHighlight();
    this.focusedIndex = Math.max(0, Math.min(index, this.visibleItems.length - 1));
    const item = this.visibleItems[this.focusedIndex];
    item.classList.add("dep-item--focused");
    item.scrollIntoView({ block: "nearest" });
    item.focus();
  }

  private clearFocusHighlight() {
    for (const item of this.visibleItems) {
      item.classList.remove("dep-item--focused");
    }
  }

  private toggleItemAtIndex(index: number) {
    if (index < 0 || index >= this.visibleItems.length) return;
    const item = this.visibleItems[index];
    const checkbox = item.querySelector("input[type=\"checkbox\"]") as HTMLInputElement | null;
    if (checkbox && !checkbox.disabled) {
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
    }
  }

  initialize(
    groups: DependencyGroup[],
    bootVersion: string,
    onChange: (ids: string[]) => void,
    onOpenLink?: (url: string) => void
  ) {
    this.allGroups = groups;
    this.currentBootVersion = bootVersion;
    this.onChangeCallback = onChange;
    if (onOpenLink) this.onOpenLinkCallback = onOpenLink;
    this.renderGroups(groups);
    this.updateBadges();
  }

  updateBootVersion(bootVersion: string) {
    this.currentBootVersion = bootVersion;
    const removed: string[] = [];
    for (const id of this.selectedIds) {
      const dep = this.findDep(id);
      if (dep && !isCompatible(dep.versionRange, bootVersion)) {
        this.selectedIds.delete(id);
        removed.push(dep.name);
      }
    }
    if (removed.length > 0) {
      this.showCompatWarning(removed);
    }
    this.filterAndRender(this.searchInput.value.toLowerCase().trim());
    this.updateBadges();
    this.onChangeCallback(Array.from(this.selectedIds));
  }

  setSelectedIds(ids: string[]) {
    this.selectedIds = new Set(ids);
    this.filterAndRender(this.searchInput.value.toLowerCase().trim());
    this.updateBadges();
    this.onChangeCallback(Array.from(this.selectedIds));
  }

  private findDep(id: string): Dependency | undefined {
    return this.allGroups.flatMap((g) => g.values).find((d) => d.id === id);
  }

  private filterAndRender(query: string) {
    if (!query) {
      this.renderGroups(this.allGroups);
      return;
    }
    const filtered = this.allGroups
      .map((group) => ({
        ...group,
        values: group.values.filter(
          (dep) =>
            dep.name.toLowerCase().includes(query) ||
            dep.id.toLowerCase().includes(query) ||
            dep.description.toLowerCase().includes(query)
        ),
      }))
      .filter((g) => g.values.length > 0);
    this.renderGroups(filtered);
  }

  private getRecommendations(): Dependency[] {
    const recommended = new Set<string>();
    for (const id of this.selectedIds) {
      const recs = RECOMMENDATIONS[id];
      if (recs) {
        for (const r of recs) {
          if (!this.selectedIds.has(r)) {
            recommended.add(r);
          }
        }
      }
    }
    return Array.from(recommended)
      .map((id) => this.findDep(id))
      .filter((d): d is Dependency => d != null)
      .slice(0, 5);
  }

  private renderGroups(groups: DependencyGroup[]) {
    this.listContainer.innerHTML = "";
    this.visibleItems = [];

    // 추천 의존성 영역
    if (this.selectedIds.size > 0) {
      const recs = this.getRecommendations();
      if (recs.length > 0) {
        const recSection = document.createElement("div");
        recSection.className = "rec-section";

        const recTitle = document.createElement("div");
        recTitle.className = "rec-title";
        recTitle.textContent = "Recommended";
        recSection.appendChild(recTitle);

        for (const dep of recs) {
          const compatible = isCompatible(dep.versionRange, this.currentBootVersion);
          const label = this.createDepItem(dep, compatible);
          recSection.appendChild(label);
          this.visibleItems.push(label);
        }

        this.listContainer.appendChild(recSection);
      }
    }

    if (groups.length === 0 && this.visibleItems.length === 0) {
      this.listContainer.innerHTML =
        '<p class="no-result">검색 결과가 없습니다.</p>';
      return;
    }

    for (const group of groups) {
      const details = document.createElement("details");
      details.open = true;

      const summary = document.createElement("summary");
      summary.className = "dep-group-summary";
      summary.textContent = group.name;
      details.appendChild(summary);

      for (const dep of group.values) {
        const compatible = isCompatible(
          dep.versionRange,
          this.currentBootVersion
        );
        const label = this.createDepItem(dep, compatible);
        details.appendChild(label);
        this.visibleItems.push(label);
      }

      this.listContainer.appendChild(details);
    }
  }

  private createDepItem(dep: Dependency, compatible: boolean): HTMLElement {
    const label = document.createElement("label");
    label.className = `dep-item ${!compatible ? "dep-item--incompatible" : ""}`;
    label.tabIndex = 0;
    label.title = !compatible
      ? `현재 Boot 버전(${this.currentBootVersion})과 호환되지 않습니다`
      : dep.description;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = dep.id;
    checkbox.checked = this.selectedIds.has(dep.id);
    checkbox.disabled = !compatible;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        this.selectedIds.add(dep.id);
      } else {
        this.selectedIds.delete(dep.id);
      }
      this.updateBadges();
      this.onChangeCallback(Array.from(this.selectedIds));
      this.filterAndRender(this.searchInput.value.toLowerCase().trim());
    });

    const info = document.createElement("div");
    info.className = "dep-info";

    const nameRow = document.createElement("span");
    nameRow.className = "dep-name";
    nameRow.textContent = dep.name;

    if (POPULAR_IDS.has(dep.id)) {
      const tag = document.createElement("span");
      tag.className = "popular-tag";
      tag.textContent = "Popular";
      nameRow.appendChild(tag);
    }

    const descSpan = document.createElement("span");
    descSpan.className = "dep-desc";
    descSpan.textContent = dep.description;

    info.appendChild(nameRow);
    info.appendChild(descSpan);
    label.appendChild(checkbox);
    label.appendChild(info);

    const infoBtn = document.createElement("button");
    infoBtn.className = "dep-info-btn";
    infoBtn.textContent = "\u24d8";
    infoBtn.title = "상세 정보";
    infoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showDepTooltip(dep, infoBtn);
    });
    label.appendChild(infoBtn);

    return label;
  }

  private updateBadges() {
    this.badgesContainer.innerHTML = "";
    if (this.selectedIds.size === 0) {
      this.badgesContainer.innerHTML =
        '<span class="no-deps">의존성을 선택하세요</span>';
      return;
    }
    for (const id of this.selectedIds) {
      const dep = this.findDep(id);
      if (!dep) {
        continue;
      }
      const badge = document.createElement("span");
      badge.className = "dep-badge";

      const removeBtn = document.createElement("button");
      removeBtn.className = "badge-remove";
      removeBtn.textContent = "\u00d7";
      removeBtn.setAttribute("aria-label", `${dep.name} 제거`);
      removeBtn.addEventListener("click", () => {
        this.selectedIds.delete(id);
        const cb = this.listContainer.querySelector(
          `input[value="${id}"]`
        ) as HTMLInputElement | null;
        if (cb) {
          cb.checked = false;
        }
        this.updateBadges();
        this.onChangeCallback(Array.from(this.selectedIds));
        this.filterAndRender(this.searchInput.value.toLowerCase().trim());
      });

      badge.appendChild(document.createTextNode(dep.name + " "));
      badge.appendChild(removeBtn);
      this.badgesContainer.appendChild(badge);
    }
  }

  private showCompatWarning(names: string[]) {
    const warning = document.createElement("div");
    warning.className = "compat-warning";
    warning.textContent = `비호환 의존성 자동 해제: ${names.join(", ")}`;
    this.listContainer.prepend(warning);
    setTimeout(() => warning.remove(), 4000);
  }

  private showDepTooltip(dep: Dependency, anchor: HTMLElement) {
    this.dismissTooltip();

    const tooltip = document.createElement("div");
    tooltip.className = "dep-tooltip";

    // Header
    const header = document.createElement("div");
    header.className = "dep-tooltip-header";
    const title = document.createElement("span");
    title.className = "dep-tooltip-title";
    title.textContent = dep.name;
    const closeBtn = document.createElement("button");
    closeBtn.className = "dep-tooltip-close";
    closeBtn.textContent = "\u00d7";
    closeBtn.addEventListener("click", () => this.dismissTooltip());
    header.appendChild(title);
    header.appendChild(closeBtn);
    tooltip.appendChild(header);

    // Description
    const desc = document.createElement("div");
    desc.className = "dep-tooltip-desc";
    desc.textContent = dep.description;
    tooltip.appendChild(desc);

    // ID
    const idRow = document.createElement("div");
    idRow.className = "dep-tooltip-row";
    idRow.innerHTML = "";
    const idLabel = document.createElement("span");
    idLabel.className = "dep-tooltip-label";
    idLabel.textContent = "ID";
    const idCode = document.createElement("code");
    idCode.className = "dep-tooltip-code";
    idCode.textContent = dep.id;
    idRow.appendChild(idLabel);
    idRow.appendChild(idCode);
    tooltip.appendChild(idRow);

    // Version Range
    if (dep.versionRange) {
      const vrRow = document.createElement("div");
      vrRow.className = "dep-tooltip-row";
      const vrLabel = document.createElement("span");
      vrLabel.className = "dep-tooltip-label";
      vrLabel.textContent = "Version";
      const vrCode = document.createElement("code");
      vrCode.className = "dep-tooltip-code";
      vrCode.textContent = dep.versionRange;
      const compatible = isCompatible(dep.versionRange, this.currentBootVersion);
      vrCode.classList.add(compatible ? "dep-tooltip-compat" : "dep-tooltip-incompat");
      vrRow.appendChild(vrLabel);
      vrRow.appendChild(vrCode);
      tooltip.appendChild(vrRow);
    }

    // Links
    if (dep.links && Object.keys(dep.links).length > 0) {
      const linksDiv = document.createElement("div");
      linksDiv.className = "dep-tooltip-links";
      for (const [key, link] of Object.entries(dep.links)) {
        const btn = document.createElement("button");
        btn.className = "dep-tooltip-link";
        btn.textContent = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
        btn.addEventListener("click", () => {
          const href = link.href.replace(/\{[^}]+\}/g, "");
          this.onOpenLinkCallback(href);
        });
        linksDiv.appendChild(btn);
      }
      tooltip.appendChild(linksDiv);
    }

    // Position
    const rect = anchor.getBoundingClientRect();
    tooltip.style.position = "fixed";
    tooltip.style.left = `${rect.right + 8}px`;
    tooltip.style.top = `${rect.top}px`;

    document.body.appendChild(tooltip);

    // Viewport overflow check
    requestAnimationFrame(() => {
      const tr = tooltip.getBoundingClientRect();
      if (tr.right > window.innerWidth) {
        tooltip.style.left = `${rect.left - tr.width - 8}px`;
      }
      if (tr.bottom > window.innerHeight) {
        tooltip.style.top = `${window.innerHeight - tr.height - 8}px`;
      }
    });

    this.activeTooltip = tooltip;

    const outsideClick = (e: MouseEvent) => {
      if (!tooltip.contains(e.target as Node) && e.target !== anchor) {
        this.dismissTooltip();
        document.removeEventListener("mousedown", outsideClick);
      }
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this.dismissTooltip();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("mousedown", outsideClick);
    document.addEventListener("keydown", escHandler);
  }

  private dismissTooltip() {
    if (this.activeTooltip) {
      this.activeTooltip.remove();
      this.activeTooltip = null;
    }
  }

  getSelectedIds(): string[] {
    return Array.from(this.selectedIds);
  }
}
