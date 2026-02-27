import type { InitializrMetadata } from "../../../api/types";
import { derivePackageName } from "../../../utils/nameDeriver";

export interface ProjectMetaState {
  type: string;
  language: string;
  bootVersion: string;
  groupId: string;
  artifactId: string;
  name: string;
  description: string;
  packageName: string;
  packaging: string;
  javaVersion: string;
}

export function createProjectMeta(
  container: HTMLElement,
  metadata: InitializrMetadata,
  state: ProjectMetaState,
  onBootVersionChange: () => void
): HTMLElement {
  // Build Type
  container.appendChild(
    createRadioGroup(
      "빌드 타입",
      "buildType",
      metadata.type.values,
      state.type,
      (val) => {
        state.type = val;
      }
    )
  );

  // Language
  container.appendChild(
    createRadioGroup(
      "언어",
      "language",
      metadata.language.values,
      state.language,
      (val) => {
        state.language = val;
      }
    )
  );

  // Spring Boot version
  container.appendChild(
    createDropdown(
      "Spring Boot",
      "bootVersion",
      metadata.bootVersion.values,
      state.bootVersion,
      (val) => {
        state.bootVersion = val;
        onBootVersionChange();
      }
    )
  );

  // Project Metadata section
  const metaSection = document.createElement("div");
  const metaTitle = document.createElement("div");
  metaTitle.className = "section-title";
  metaTitle.textContent = "Project Metadata";
  metaSection.appendChild(metaTitle);

  metaSection.appendChild(
    createTextInput("Group", state.groupId, (val) => {
      state.groupId = val;
      state.packageName = derivePackageName(state.groupId, state.artifactId);
      updatePackageNameInput();
    })
  );

  metaSection.appendChild(
    createTextInput("Artifact", state.artifactId, (val) => {
      state.artifactId = val;
      state.name = val;
      state.packageName = derivePackageName(state.groupId, state.artifactId);
      updatePackageNameInput();
    })
  );

  metaSection.appendChild(
    createTextInput("Name", state.name, (val) => {
      state.name = val;
    })
  );

  metaSection.appendChild(
    createTextInput("Description", state.description, (val) => {
      state.description = val;
    })
  );

  const packageInput = createTextInput(
    "Package Name",
    state.packageName,
    (val) => {
      state.packageName = val;
    }
  );
  packageInput.id = "packageNameField";
  metaSection.appendChild(packageInput);

  container.appendChild(metaSection);

  function updatePackageNameInput() {
    const input = document.querySelector(
      "#packageNameField input"
    ) as HTMLInputElement | null;
    if (input) {
      input.value = state.packageName;
    }
  }

  // Packaging
  container.appendChild(
    createRadioGroup(
      "패키징",
      "packaging",
      metadata.packaging.values,
      state.packaging,
      (val) => {
        state.packaging = val;
      }
    )
  );

  // Java version
  container.appendChild(
    createDropdown(
      "Java",
      "javaVersion",
      metadata.javaVersion.values,
      state.javaVersion,
      (val) => {
        state.javaVersion = val;
      }
    )
  );

  return container;
}

function createRadioGroup(
  label: string,
  name: string,
  options: Array<{ id: string; name: string }>,
  defaultVal: string,
  onChange: (val: string) => void
): HTMLElement {
  const wrapper = document.createElement("div");
  const title = document.createElement("div");
  title.className = "section-title";
  title.textContent = label;
  wrapper.appendChild(title);

  const group = document.createElement("div");
  group.className = "option-group";

  for (const opt of options) {
    const lbl = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = name;
    radio.value = opt.id;
    radio.checked = opt.id === defaultVal;
    radio.addEventListener("change", () => {
      if (radio.checked) {
        onChange(opt.id);
      }
    });

    const span = document.createElement("span");
    span.textContent = opt.name;
    lbl.appendChild(radio);
    lbl.appendChild(span);
    group.appendChild(lbl);
  }

  wrapper.appendChild(group);
  return wrapper;
}

function createDropdown(
  label: string,
  name: string,
  options: Array<{ id: string; name: string }>,
  defaultVal: string,
  onChange: (val: string) => void
): HTMLElement {
  const wrapper = document.createElement("div");
  const title = document.createElement("div");
  title.className = "section-title";
  title.textContent = label;
  wrapper.appendChild(title);

  const select = document.createElement("select");
  select.className = "meta-input";
  select.name = name;

  for (const opt of options) {
    const option = document.createElement("option");
    option.value = opt.id;
    option.textContent = opt.name;
    option.selected = opt.id === defaultVal;
    select.appendChild(option);
  }

  select.addEventListener("change", () => {
    onChange(select.value);
  });

  wrapper.appendChild(select);
  return wrapper;
}

function createTextInput(
  label: string,
  defaultVal: string,
  onChange: (val: string) => void
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.marginBottom = "8px";

  const lbl = document.createElement("label");
  lbl.className = "meta-label";
  lbl.textContent = label;
  wrapper.appendChild(lbl);

  const input = document.createElement("input");
  input.type = "text";
  input.className = "meta-input";
  input.value = defaultVal;
  input.addEventListener("input", () => {
    onChange(input.value);
  });

  wrapper.appendChild(input);
  return wrapper;
}
