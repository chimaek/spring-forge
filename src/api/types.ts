export interface InitializrMetadata {
  bootVersion: SingleSelectCapability;
  language: SingleSelectCapability;
  packaging: SingleSelectCapability;
  javaVersion: SingleSelectCapability;
  type: SingleSelectCapability;
  dependencies: DependenciesCapability;
  groupId: TextCapability;
  artifactId: TextCapability;
  version: TextCapability;
  name: TextCapability;
  description: TextCapability;
  packageName: TextCapability;
}

export interface SingleSelectCapability {
  type: "single-select";
  default: string;
  values: SelectOption[];
}

export interface SelectOption {
  id: string;
  name: string;
}

export interface DependenciesCapability {
  type: "hierarchical-multi-select";
  values: DependencyGroup[];
}

export interface DependencyGroup {
  name: string;
  values: Dependency[];
}

export interface Dependency {
  id: string;
  name: string;
  description: string;
  versionRange?: string;
  links?: Record<string, { href: string; templated?: boolean }>;
}

export interface TextCapability {
  type: "text";
  default: string;
}

export interface GenerateOptions {
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
  dependencies: string[];
}
