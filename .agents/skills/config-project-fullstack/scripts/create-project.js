#!/usr/bin/env node

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const DEFAULT_FRONTEND_PORT = 3000;
const DEFAULT_BACKEND_PORT = 4000;
const DEFAULT_PACKAGE_MANAGER = "npm";
const SUPPORTED_PACKAGE_MANAGERS = ["npm", "yarn", "pnpm", "bun"];

function buildFrontendEnv(backendPort) {
  return `NEXT_PUBLIC_API_URL=http://localhost:${backendPort}\n`;
}

function buildBackendEnv(backendPort) {
  return `PORT=${backendPort}\n`;
}
const DEFAULT_GENERATED_TOP_LEVEL_ENTRIES = [
  ".gitignore",
  "README.md",
  "apps",
  "package-lock.json",
  "package.json",
  "packages",
  "turbo.json",
  "tsconfig.json",
];
const WORKSPACE_MARKERS = [
  "package.json",
  "turbo.json",
  path.join("apps", "frontend", "package.json"),
  path.join("apps", "backend", "package.json"),
];
const APP_MODULE_CONTENT = `import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';

@Module({
\timports: [
\t\tConfigModule.forRoot({
\t\t\tisGlobal: true,
\t\t}),
\t],
\tcontrollers: [AppController],
\tproviders: [AppService],
})
export class AppModule {}
`;
function buildMainTsContent(backendPort) {
  return `import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
\tconst app = await NestFactory.create(AppModule);
\tapp.enableCors();
\tawait app.listen(process.env.PORT ?? ${backendPort});
}

bootstrap();
`;
}

main();

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
      return;
    }
    if (options.selfTest) {
      runSelfTest();
      return;
    }

    const targetDir = path.resolve(process.cwd());
    const projectSlug = validateProjectSlug(slugify(path.basename(targetDir)) || "app");

    validateTargetDirectory(targetDir);
    validateNamespace(options.namespace);

    const log = createLogger(options.dryRun);
    log.step(`Current directory: ${targetDir}`);
    log.step(`Workspace slug: ${projectSlug}`);
    log.step(`Package manager: ${options.packageManager}`);
    log.step(`Frontend port: ${options.frontendPort}`);
    log.step(`Backend port: ${options.backendPort}`);
    if (options.namespace) {
      log.step(`Namespace: ${options.namespace}`);
    }

    const existingWorkspace = detectManagedWorkspace(targetDir);
    if (existingWorkspace && !options.forceClean) {
      throw new Error(
        `Current directory already contains a fullstack workspace created by this skill: ${targetDir}`
      );
    }

    ensureCommand("node", ["--version"], targetDir, options.dryRun);
    ensureCommand("npm", ["--version"], targetDir, options.dryRun);
    ensureCommand("npx", ["--version"], targetDir, options.dryRun);
    if (options.packageManager !== "npm") {
      ensureCommand(options.packageManager, ["--version"], targetDir, options.dryRun);
    }

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "config-project-fullstack-"));
    const scaffoldDir = path.join(tempRoot, projectSlug);

    try {
      runCommand("npx", ["create-turbo@latest", projectSlug, "-m", options.packageManager], {
        cwd: tempRoot,
        dryRun: options.dryRun,
        label: "Creating Turbo workspace in a temporary directory",
      });

      const appsDir = path.join(scaffoldDir, "apps");
      ensureDirectoryExists(appsDir, "Turbo apps directory", options.dryRun);
      cleanDirectoryChildren(appsDir, options.dryRun);

      runCommand(
        "npx",
        ["create-next-app@latest", "frontend", "--yes", "--src-dir", nextPackageManagerFlag(options.packageManager)],
        {
          cwd: appsDir,
          dryRun: options.dryRun,
          label: "Creating Next.js frontend",
        }
      );

      runCommand("npx", ["--yes", "@nestjs/cli", "new", "backend", "-g", "-p", nestPackageManager(options.packageManager)], {
        cwd: appsDir,
        dryRun: options.dryRun,
        label: "Creating NestJS backend",
      });

      const backendDir = path.join(scaffoldDir, "apps", "backend");
      const backendInstall = packageManagerAddCommand(options.packageManager, "@nestjs/config");
      runCommand(backendInstall.command, backendInstall.args, {
        cwd: backendDir,
        dryRun: options.dryRun,
        label: "Installing backend config module",
      });

      writeFile(path.join(backendDir, "src", "app.module.ts"), APP_MODULE_CONTENT, options.dryRun);
      writeFile(path.join(backendDir, "src", "main.ts"), buildMainTsContent(options.backendPort), options.dryRun);
      ensureBackendDevScript(path.join(backendDir, "package.json"), options.dryRun);

      const frontendDir = path.join(scaffoldDir, "apps", "frontend");
      ensureEnvFiles(frontendDir, buildFrontendEnv(options.backendPort), options.dryRun);
      ensureEnvFiles(backendDir, buildBackendEnv(options.backendPort), options.dryRun);

      const generatedEntries = listCopyableTopLevelEntries(scaffoldDir, options.dryRun);
      if (options.forceClean) {
        if (!existingWorkspace) {
          throw new Error(
            "Refusing --force-clean because the current directory does not look like a workspace created by this skill"
          );
        }
        removeGeneratedEntries(targetDir, generatedEntries, options.dryRun);
      } else {
        ensureNoConflictingEntries(targetDir, generatedEntries);
      }

      copyGeneratedWorkspace(scaffoldDir, targetDir, options.dryRun);

      if (options.namespace) {
        rewriteWorkspaceNamespace(targetDir, options.namespace, options.dryRun);
      }

      runCommand(options.packageManager, ["install"], {
        cwd: targetDir,
        dryRun: options.dryRun,
        label: "Refreshing root workspace dependencies",
      });

      log.step(`Created workspace entries in current directory: ${generatedEntries.join(", ")}`);
      log.step("Project configured successfully");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  } catch (error) {
    console.error(`\n[error] ${error.message}`);
    process.exit(1);
  }
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    forceClean: false,
    help: false,
    namespace: null,
    selfTest: false,
    frontendPort: DEFAULT_FRONTEND_PORT,
    backendPort: DEFAULT_BACKEND_PORT,
    packageManager: DEFAULT_PACKAGE_MANAGER,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--force-clean") {
      options.forceClean = true;
      continue;
    }
    if (arg === "--self-test") {
      options.selfTest = true;
      continue;
    }
    if (arg === "--namespace") {
      index += 1;
      options.namespace = requireValue(arg, argv[index]);
      continue;
    }
    if (arg === "--frontend-port") {
      index += 1;
      options.frontendPort = parsePort(arg, requireValue(arg, argv[index]));
      continue;
    }
    if (arg === "--backend-port") {
      index += 1;
      options.backendPort = parsePort(arg, requireValue(arg, argv[index]));
      continue;
    }
    if (arg === "--package-manager" || arg === "--pm") {
      index += 1;
      options.packageManager = parsePackageManager(arg, requireValue(arg, argv[index]));
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }

  return options;
}

function parsePort(flag, value) {
  if (!/^[0-9]+$/.test(value)) {
    throw new Error(`Invalid value for ${flag}: '${value}'. Expected a port number`);
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid value for ${flag}: '${value}'. Expected a port between 1 and 65535`);
  }
  return port;
}

function parsePackageManager(flag, value) {
  const normalized = value.trim().toLowerCase();
  if (!SUPPORTED_PACKAGE_MANAGERS.includes(normalized)) {
    throw new Error(
      `Invalid value for ${flag}: '${value}'. Expected one of ${SUPPORTED_PACKAGE_MANAGERS.join(", ")}`
    );
  }
  return normalized;
}

function nextPackageManagerFlag(packageManager) {
  switch (packageManager) {
    case "yarn":
      return "--use-yarn";
    case "pnpm":
      return "--use-pnpm";
    case "bun":
      return "--use-bun";
    case "npm":
    default:
      return "--use-npm";
  }
}

function nestPackageManager(packageManager) {
  // Nest CLI accepts npm, yarn, or pnpm; fall back to npm for anything else (e.g. bun).
  if (packageManager === "yarn" || packageManager === "pnpm") {
    return packageManager;
  }
  return "npm";
}

function packageManagerAddCommand(packageManager, dependency) {
  switch (packageManager) {
    case "yarn":
      return { command: "yarn", args: ["add", dependency] };
    case "pnpm":
      return { command: "pnpm", args: ["add", dependency] };
    case "bun":
      return { command: "bun", args: ["add", dependency] };
    case "npm":
    default:
      return { command: "npm", args: ["install", dependency] };
  }
}

function printHelp() {
  console.log(`Usage:
  node .agents/skills/config-project-fullstack/scripts/create-project.js [--namespace @scope] [--frontend-port 3000] [--backend-port 4000] [--package-manager npm] [--force-clean] [--dry-run]

Options:
  --namespace        Rename workspace packages to an npm scope such as @acme
  --frontend-port    Port for the Next.js frontend app (default ${DEFAULT_FRONTEND_PORT})
  --backend-port     Port for the NestJS backend app (default ${DEFAULT_BACKEND_PORT})
  --package-manager  Package manager to scaffold with: ${SUPPORTED_PACKAGE_MANAGERS.join(", ")} (default ${DEFAULT_PACKAGE_MANAGER}); alias --pm
  --force-clean      Remove only the generated project paths in the current directory before scaffolding again
  --dry-run          Print the planned operations without executing them
  --self-test        Run internal tests for namespace rewriting and argument parsing
  --help             Show this help message
`);
}

function createLogger(dryRun) {
  return {
    step(message) {
      const prefix = dryRun ? "[dry-run]" : "[step]";
      console.log(`${prefix} ${message}`);
    },
  };
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function validateProjectSlug(projectSlug) {
  if (!projectSlug) {
    throw new Error("Project slug could not be derived from the current directory name");
  }
  return projectSlug;
}

function validateNamespace(namespace) {
  if (!namespace) {
    return;
  }
  if (!/^@[a-z0-9][a-z0-9._-]*$/i.test(namespace)) {
    throw new Error(`Invalid namespace '${namespace}'. Expected npm scope format like @acme`);
  }
}

function validateTargetDirectory(targetDir) {
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Current directory does not exist: ${targetDir}`);
  }
  if (!fs.statSync(targetDir).isDirectory()) {
    throw new Error(`Current path is not a directory: ${targetDir}`);
  }

  const normalizedTarget = path.resolve(targetDir);
  if (normalizedTarget === path.parse(normalizedTarget).root) {
    throw new Error("Refusing to use the filesystem root as the target directory");
  }
}

function ensureCommand(command, args, cwd, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Checking command: ${command} ${args.join(" ")}`);
    return;
  }
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.error) {
    throw new Error(`Command not available: ${command}`);
  }
  if (result.status !== 0) {
    throw new Error(`Command check failed: ${command} ${args.join(" ")}`);
  }
}

function runCommand(command, args, options) {
  const { cwd, dryRun, label } = options;
  const pretty = `${command} ${args.join(" ")}`;

  if (dryRun) {
    console.log(`[dry-run] ${label}: ${pretty}`);
    return;
  }

  console.log(`[run] ${label}: ${pretty}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.error) {
    throw new Error(`Failed to run '${pretty}': ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Command exited with status ${result.status}: ${pretty}`);
  }
}

function removeDirectory(targetDir, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Removing existing target: ${targetDir}`);
    return;
  }
  fs.rmSync(targetDir, { recursive: true, force: true });
}

function ensureDirectoryExists(dirPath, label, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Validating directory: ${dirPath}`);
    return;
  }
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(`${label} not found: ${dirPath}`);
  }
}

function cleanDirectoryChildren(dirPath, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Cleaning contents of ${dirPath}`);
    return;
  }
  const children = fs.readdirSync(dirPath);
  for (const child of children) {
    const childPath = path.join(dirPath, child);
    fs.rmSync(childPath, { recursive: true, force: true });
  }
}

function detectManagedWorkspace(targetDir) {
  if (!WORKSPACE_MARKERS.every((relativePath) => fs.existsSync(path.join(targetDir, relativePath)))) {
    return false;
  }

  try {
    const packageJson = readJson(path.join(targetDir, "package.json"));
    return workspaceConfigIncludes(packageJson.workspaces, "apps/*") &&
      workspaceConfigIncludes(packageJson.workspaces, "packages/*");
  } catch (error) {
    return false;
  }
}

function workspaceConfigIncludes(workspaces, entry) {
  if (Array.isArray(workspaces)) {
    return workspaces.includes(entry);
  }
  if (workspaces && Array.isArray(workspaces.packages)) {
    return workspaces.packages.includes(entry);
  }
  return false;
}

function listCopyableTopLevelEntries(scaffoldDir, dryRun) {
  if (dryRun || !fs.existsSync(scaffoldDir)) {
    return [...DEFAULT_GENERATED_TOP_LEVEL_ENTRIES];
  }

  return fs
    .readdirSync(scaffoldDir)
    .filter((entry) => !shouldSkipCopy(path.join(scaffoldDir, entry)))
    .sort();
}

function ensureNoConflictingEntries(targetDir, entries) {
  const conflicts = entries.filter((entry) => fs.existsSync(path.join(targetDir, entry)));
  if (conflicts.length > 0) {
    throw new Error(
      `Current directory already contains conflicting entries: ${conflicts.join(
        ", "
      )}. Move them away or use --force-clean to replace only the generated project paths`
    );
  }
}

function removeGeneratedEntries(targetDir, entries, dryRun) {
  for (const entry of entries) {
    const targetPath = path.join(targetDir, entry);
    if (!fs.existsSync(targetPath)) {
      continue;
    }
    removeDirectory(targetPath, dryRun);
  }
}

function copyGeneratedWorkspace(scaffoldDir, targetDir, dryRun) {
  const entries = listCopyableTopLevelEntries(scaffoldDir, dryRun);
  for (const entry of entries) {
    const sourcePath = path.join(scaffoldDir, entry);
    const targetPath = path.join(targetDir, entry);
    copyPath(sourcePath, targetPath, dryRun);
  }
}

function copyPath(sourcePath, targetPath, dryRun) {
  if (shouldSkipCopy(sourcePath)) {
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] Copying ${sourcePath} -> ${targetPath}`);
    return;
  }

  const stat = fs.lstatSync(sourcePath);
  if (stat.isDirectory()) {
    fs.mkdirSync(targetPath, { recursive: true });
    for (const child of fs.readdirSync(sourcePath)) {
      copyPath(path.join(sourcePath, child), path.join(targetPath, child), dryRun);
    }
    return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

function shouldSkipCopy(entryPath) {
  const name = path.basename(entryPath);
  return shouldSkipDirectory(name) || name === ".git";
}

function writeFile(filePath, content, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Writing ${filePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function ensureEnvFiles(dirPath, content, dryRun) {
  writeFile(path.join(dirPath, ".env.example"), content, dryRun);
  writeFile(path.join(dirPath, ".env"), content, dryRun);
}

function ensureBackendDevScript(packageJsonPath, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Patching ${packageJsonPath} with dev script`);
    return;
  }
  const packageJson = readJson(packageJsonPath);
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.dev = "nest start --watch";
  writeJson(packageJsonPath, packageJson);
}

function rewriteWorkspaceNamespace(rootDir, namespace, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Rewriting workspace package names under ${rootDir} to ${namespace}`);
    return;
  }

  const packageJsonFiles = findPackageJsonFiles(rootDir);
  const renameMap = new Map();

  for (const packageJsonPath of packageJsonFiles) {
    const packageJson = readJson(packageJsonPath);
    const nextName = computeScopedPackageName(packageJsonPath, packageJson.name, rootDir, namespace);
    if (packageJson.name && nextName && packageJson.name !== nextName) {
      renameMap.set(packageJson.name, nextName);
    }
  }

  for (const packageJsonPath of packageJsonFiles) {
    const packageJson = readJson(packageJsonPath);
    const nextName = computeScopedPackageName(packageJsonPath, packageJson.name, rootDir, namespace);
    if (nextName) {
      packageJson.name = nextName;
    }
    renameDependencyBlock(packageJson, "dependencies", renameMap);
    renameDependencyBlock(packageJson, "devDependencies", renameMap);
    renameDependencyBlock(packageJson, "peerDependencies", renameMap);
    renameDependencyBlock(packageJson, "optionalDependencies", renameMap);
    writeJson(packageJsonPath, packageJson);
  }
}

function findPackageJsonFiles(rootDir) {
  const results = [];
  walk(rootDir, (entryPath, dirent) => {
    if (dirent.isDirectory()) {
      if (shouldSkipDirectory(dirent.name)) {
        return "skip";
      }
      return;
    }
    if (dirent.isFile() && dirent.name === "package.json") {
      results.push(entryPath);
    }
  });
  return results.sort();
}

function walk(currentDir, visitor) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    const result = visitor(entryPath, entry);
    if (result === "skip") {
      continue;
    }
    if (entry.isDirectory()) {
      walk(entryPath, visitor);
    }
  }
}

function shouldSkipDirectory(name) {
  // Pula node_modules, dist e QUALQUER pasta-ponto (.agents, .spec, .claude, .git, .next, .turbo...).
  // Os pacotes reais do workspace vivem em apps/packages/modules — nunca em pasta-ponto —, então
  // isso evita reescrever o namespace dentro de templates de skills (ex.: @temp/shared) ou specs.
  return name === "node_modules" || name === "dist" || name.startsWith(".");
}

function computeScopedPackageName(packageJsonPath, currentName, rootDir, namespace) {
  const relativeDir = path.relative(rootDir, path.dirname(packageJsonPath));
  const defaultSlug = slugify(path.basename(path.dirname(packageJsonPath)));

  if (relativeDir === "") {
    return `${namespace}/${slugify(path.basename(rootDir))}`;
  }

  if (typeof currentName === "string" && currentName.startsWith("@") && currentName.includes("/")) {
    return `${namespace}/${currentName.split("/")[1]}`;
  }

  if (typeof currentName === "string" && currentName.trim()) {
    return `${namespace}/${slugify(currentName.replace(/^@/, "").split("/").pop())}`;
  }

  return `${namespace}/${defaultSlug}`;
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function renameDependencyBlock(packageJson, field, renameMap) {
  if (!packageJson[field]) {
    return;
  }
  const nextBlock = {};
  for (const [dependencyName, version] of Object.entries(packageJson[field])) {
    const nextName = renameMap.get(dependencyName) || dependencyName;
    nextBlock[nextName] = version;
  }
  packageJson[field] = nextBlock;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function runSelfTest() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "config-project-fullstack-"));
  // Use a fixed-name subdirectory so assertions that depend on the workspace
  // basename are deterministic, independent of the random mkdtemp suffix.
  const WORKSPACE_NAME = "demo-workspace";
  const workspaceRoot = path.join(tempRoot, WORKSPACE_NAME);
  try {
    const appDir = path.join(workspaceRoot, "apps", "frontend");
    const pkgDir = path.join(workspaceRoot, "packages", "shared");
    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(pkgDir, { recursive: true });

    writeJson(path.join(workspaceRoot, "package.json"), {
      name: "demo-root",
      private: true,
      workspaces: ["apps/*", "packages/*"],
    });
    writeJson(path.join(workspaceRoot, "turbo.json"), {
      $schema: "https://turbo.build/schema.json",
    });
    writeJson(path.join(appDir, "package.json"), {
      name: "frontend",
      dependencies: {
        "@repo/shared": "workspace:*",
      },
      devDependencies: {
        "@repo/typescript-config": "*",
      },
    });
    const backendDir = path.join(workspaceRoot, "apps", "backend");
    fs.mkdirSync(backendDir, { recursive: true });
    writeJson(path.join(backendDir, "package.json"), {
      name: "backend",
    });
    writeJson(path.join(pkgDir, "package.json"), {
      name: "@repo/shared",
    });
    const tsConfigDir = path.join(workspaceRoot, "packages", "typescript-config");
    fs.mkdirSync(tsConfigDir, { recursive: true });
    writeJson(path.join(tsConfigDir, "package.json"), {
      name: "@repo/typescript-config",
    });

    rewriteWorkspaceNamespace(workspaceRoot, "@acme", false);

    const rootPackage = readJson(path.join(workspaceRoot, "package.json"));
    const frontendPackage = readJson(path.join(appDir, "package.json"));
    const sharedPackage = readJson(path.join(pkgDir, "package.json"));

    assert(
      rootPackage.name === "@acme/" + slugify(WORKSPACE_NAME),
      "Root package should be scoped"
    );
    assert(frontendPackage.name === "@acme/frontend", "Frontend package should be scoped");
    assert(frontendPackage.dependencies["@acme/shared"] === "workspace:*", "Dependency key should be renamed");
    assert(frontendPackage.devDependencies["@acme/typescript-config"] === "*", "Dev dependency key should be renamed");
    assert(sharedPackage.name === "@acme/shared", "Scoped package should preserve slug");

    const args = parseArgs(["--namespace", "@acme", "--dry-run"]);
    assert(args.namespace === "@acme", "Namespace parsing failed");
    assert(args.dryRun === true, "Dry-run parsing failed");
    assertThrows(() => parseArgs(["demo"]), "Unexpected argument should be rejected");
    assert(detectManagedWorkspace(workspaceRoot) === true, "Managed workspace detection failed");

    const portArgs = parseArgs(["--frontend-port", "3100", "--backend-port", "4100", "--pm", "pnpm"]);
    assert(portArgs.frontendPort === 3100, "Frontend port parsing failed");
    assert(portArgs.backendPort === 4100, "Backend port parsing failed");
    assert(portArgs.packageManager === "pnpm", "Package manager parsing failed");

    const defaultArgs = parseArgs([]);
    assert(defaultArgs.frontendPort === DEFAULT_FRONTEND_PORT, "Default frontend port failed");
    assert(defaultArgs.backendPort === DEFAULT_BACKEND_PORT, "Default backend port failed");
    assert(defaultArgs.packageManager === DEFAULT_PACKAGE_MANAGER, "Default package manager failed");
    assertThrows(() => parseArgs(["--backend-port", "notaport"]), "Invalid port should be rejected");
    assertThrows(() => parseArgs(["--pm", "rush"]), "Invalid package manager should be rejected");

    assert(buildBackendEnv(4100) === "PORT=4100\n", "Backend env should reflect port");
    assert(
      buildFrontendEnv(4100) === "NEXT_PUBLIC_API_URL=http://localhost:4100\n",
      "Frontend env should reflect backend port"
    );
    assert(buildMainTsContent(4100).includes("process.env.PORT ?? 4100"), "main.ts should reflect backend port");

    console.log("[ok] Self-test passed");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn, message) {
  let threw = false;
  try {
    fn();
  } catch (error) {
    threw = true;
  }
  if (!threw) {
    throw new Error(message);
  }
}
