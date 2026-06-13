#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT_DIR = process.cwd();
const SKILL_DIR = path.join(ROOT_DIR, '.agents', 'skills', 'config-package-shared');
const TEMPLATE_DIR = path.join(SKILL_DIR, 'assets', 'shared-template');
const TEMP_SCOPE = '@temp';
const TEMP_PACKAGE_NAME = `${TEMP_SCOPE}/shared`;
const DEFAULT_PACKAGE_NAME = 'shared';
const DEFAULT_PACKAGE_MANAGER = 'npm';
const DEFAULT_BUILD_CMD = 'npx turbo run build';

const PACKAGE_MANAGER_INSTALL = {
  npm: ['install'],
  pnpm: ['install'],
  yarn: ['install'],
  bun: ['install'],
};

// Detecta o package manager a partir do lockfile presente na raiz.
// Mantem determinismo: ordem fixa, sem interacao humana.
const LOCKFILE_PACKAGE_MANAGER = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
  ['package-lock.json', 'npm'],
];

function detectPackageManagerFromLockfile() {
  for (const [lockfile, manager] of LOCKFILE_PACKAGE_MANAGER) {
    if (exists(path.join(ROOT_DIR, lockfile))) {
      return manager;
    }
  }

  return null;
}

function parseArgs(argv) {
  const options = {
    packageName: DEFAULT_PACKAGE_NAME,
    force: false,
    packageManager: null,
    buildCmd: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--package-name') {
      const value = argv[index + 1];
      if (!value) {
        fail('Informe um valor para --package-name.');
      }

      options.packageName = value;
      index += 1;
      continue;
    }

    if (arg === '--package-manager') {
      const value = argv[index + 1];
      if (!value) {
        fail('Informe um valor para --package-manager.');
      }

      options.packageManager = value;
      index += 1;
      continue;
    }

    if (arg === '--build-cmd') {
      const value = argv[index + 1];
      if (!value) {
        fail('Informe um valor para --build-cmd.');
      }

      options.buildCmd = value;
      index += 1;
      continue;
    }

    if (arg === '--force') {
      options.force = true;
      continue;
    }

    fail(`Argumento nao suportado: ${arg}`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.packageName)) {
    fail(
      'O nome do pacote deve usar apenas letras minusculas, numeros e hifens, por exemplo: shared ou shared-v2.',
    );
  }

  // Default: flag explicita > deteccao por lockfile > npm.
  options.packageManager =
    options.packageManager ?? detectPackageManagerFromLockfile() ?? DEFAULT_PACKAGE_MANAGER;

  if (!Object.prototype.hasOwnProperty.call(PACKAGE_MANAGER_INSTALL, options.packageManager)) {
    fail(
      `Package manager nao suportado: ${options.packageManager}. Use npm, pnpm, yarn ou bun.`,
    );
  }

  options.buildCmd = options.buildCmd ?? DEFAULT_BUILD_CMD;

  if (typeof options.buildCmd !== 'string' || options.buildCmd.trim() === '') {
    fail('O valor de --build-cmd nao pode ser vazio.');
  }

  return options;
}

function fail(message) {
  throw new Error(message);
}

function exists(targetPath) {
  return fs.existsSync(targetPath);
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function removeDir(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function copyDir(sourceDir, targetDir) {
  ensureDir(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
      continue;
    }

    fs.copyFileSync(sourcePath, targetPath);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function listWorkspacePackageJsonFiles() {
  const workspaceDirs = ['apps', 'modules', 'packages'];
  const files = [];

  const rootPackageJson = path.join(ROOT_DIR, 'package.json');
  if (exists(rootPackageJson)) {
    files.push(rootPackageJson);
  }

  for (const workspaceDir of workspaceDirs) {
    const absoluteWorkspaceDir = path.join(ROOT_DIR, workspaceDir);
    if (!exists(absoluteWorkspaceDir)) {
      continue;
    }

    for (const child of fs.readdirSync(absoluteWorkspaceDir, { withFileTypes: true })) {
      if (!child.isDirectory()) {
        continue;
      }

      const packageJsonPath = path.join(absoluteWorkspaceDir, child.name, 'package.json');
      if (exists(packageJsonPath)) {
        files.push(packageJsonPath);
      }
    }
  }

  return files;
}

function extractScope(packageName) {
  if (typeof packageName !== 'string') {
    return null;
  }

  const match = packageName.match(/^(@[^/]+)\/[^/]+$/);
  if (!match) {
    return null;
  }

  if (match[1] === TEMP_SCOPE) {
    return null;
  }

  return match[1];
}

function scorePackageJson(packageJsonPath) {
  const normalizedPath = packageJsonPath.replace(`${ROOT_DIR}${path.sep}`, '');

  if (normalizedPath === 'package.json') {
    return 1000;
  }

  if (normalizedPath.startsWith(`apps${path.sep}`)) {
    return 100;
  }

  if (normalizedPath.startsWith(`modules${path.sep}`)) {
    return 50;
  }

  if (normalizedPath.startsWith(`packages${path.sep}`)) {
    return 10;
  }

  return 1;
}

function detectWorkspaceScope() {
  const scores = new Map();

  for (const packageJsonPath of listWorkspacePackageJsonFiles()) {
    const packageJson = readJson(packageJsonPath);
    const scope = extractScope(packageJson.name);
    if (!scope) {
      continue;
    }

    const current = scores.get(scope) ?? { score: 0, occurrences: 0 };
    current.score += scorePackageJson(packageJsonPath);
    current.occurrences += 1;
    scores.set(scope, current);
  }

  const sortedScopes = [...scores.entries()].sort((left, right) => {
    if (right[1].score !== left[1].score) {
      return right[1].score - left[1].score;
    }

    if (right[1].occurrences !== left[1].occurrences) {
      return right[1].occurrences - left[1].occurrences;
    }

    return left[0].localeCompare(right[0]);
  });

  if (sortedScopes.length === 0) {
    fail(
      'Nao foi possivel detectar o scope do workspace a partir dos package.json da raiz, apps, modules e packages.',
    );
  }

  return sortedScopes[0][0];
}

function listFilesRecursively(dirPath) {
  const files = [];

  if (!exists(dirPath)) {
    return files;
  }

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (['node_modules', 'dist', 'coverage', '.turbo', '.next'].includes(entry.name)) {
        continue;
      }

      files.push(...listFilesRecursively(absolutePath));
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

function packageJsonHasSharedDependency(packageJson) {
  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

  return sections.some((section) => {
    const deps = packageJson[section];
    if (!deps || typeof deps !== 'object') {
      return false;
    }

    return Object.keys(deps).some((dependencyName) => /^@[^/]+\/shared$/.test(dependencyName));
  });
}

function workspaceImportsShared(workspaceDir) {
  const files = listFilesRecursively(workspaceDir);
  const sharedImportPattern =
    /(?:from\s+['"](@[^/'"]+\/shared)['"])|(?:require\(\s*['"](@[^/'"]+\/shared)['"]\s*\))/;

  for (const filePath of files) {
    if (!/\.(cjs|cts|js|jsx|mjs|mts|ts|tsx)$/.test(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (sharedImportPattern.test(content)) {
      return true;
    }
  }

  return false;
}

function normalizeSharedDependency(packageJsonPath, sharedPackageName) {
  const packageJson = readJson(packageJsonPath);
  const workspaceDir = path.dirname(packageJsonPath);
  const usesShared =
    packageJsonHasSharedDependency(packageJson) || workspaceImportsShared(workspaceDir);

  if (!usesShared) {
    return false;
  }

  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const deps = packageJson[section];
    if (!deps || typeof deps !== 'object') {
      continue;
    }

    for (const dependencyName of Object.keys(deps)) {
      if (/^@[^/]+\/shared$/.test(dependencyName)) {
        delete deps[dependencyName];
      }
    }

    if (Object.keys(deps).length === 0) {
      delete packageJson[section];
    }
  }

  packageJson.dependencies = packageJson.dependencies ?? {};
  packageJson.dependencies[sharedPackageName] = '*';
  packageJson.dependencies = Object.fromEntries(
    Object.entries(packageJson.dependencies).sort(([left], [right]) => left.localeCompare(right)),
  );

  writeJson(packageJsonPath, packageJson);
  return true;
}

function sortDependencies(packageJson) {
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    if (!packageJson[section] || typeof packageJson[section] !== 'object') {
      continue;
    }

    packageJson[section] = Object.fromEntries(
      Object.entries(packageJson[section]).sort(([left], [right]) => left.localeCompare(right)),
    );
  }
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
    // Cross-platform: no Windows os binarios npm/npx/pnpm/yarn/turbo sao .cmd e sem
    // shell o spawnSync da ENOENT; no Linux/Mac roda direto (shell:false). Args fixos,
    // sem input do usuario, entao o shell condicional e seguro.
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    fail(`Falha ao executar: ${command} ${args.join(' ')}`);
  }
}

function splitCommand(commandLine) {
  const parts = commandLine.trim().split(/\s+/);
  return { command: parts[0], args: parts.slice(1) };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const targetDir = path.join(ROOT_DIR, 'packages', options.packageName);

  if (!exists(TEMPLATE_DIR)) {
    fail(`Template nao encontrado em ${TEMPLATE_DIR}`);
  }

  ensureDir(path.join(ROOT_DIR, 'packages'));
  if (options.packageName === DEFAULT_PACKAGE_NAME) {
    removeDir(targetDir);
  } else if (exists(targetDir) && !options.force) {
    fail(
      `O diretorio ${path.relative(ROOT_DIR, targetDir)} ja existe. Use outro nome ou rode novamente com --force se quiser recria-lo.`,
    );
  } else if (exists(targetDir) && options.force) {
    removeDir(targetDir);
  }

  copyDir(TEMPLATE_DIR, targetDir);

  const scope = detectWorkspaceScope();
  const sharedPackageName = `${scope}/${options.packageName}`;
  const targetPackageJsonPath = path.join(targetDir, 'package.json');
  const targetPackageJson = readJson(targetPackageJsonPath);

  if (targetPackageJson.name !== TEMP_PACKAGE_NAME) {
    fail(
      `O template esperado deve usar ${TEMP_PACKAGE_NAME}, mas encontrou ${targetPackageJson.name ?? '<sem nome>'}.`,
    );
  }

  targetPackageJson.name = sharedPackageName;
  sortDependencies(targetPackageJson);
  writeJson(targetPackageJsonPath, targetPackageJson);

  const updatedWorkspaces = [];
  if (options.packageName === DEFAULT_PACKAGE_NAME) {
    for (const workspaceRoot of ['apps', 'modules']) {
      const absoluteWorkspaceRoot = path.join(ROOT_DIR, workspaceRoot);
      if (!exists(absoluteWorkspaceRoot)) {
        continue;
      }

      for (const child of fs.readdirSync(absoluteWorkspaceRoot, { withFileTypes: true })) {
        if (!child.isDirectory()) {
          continue;
        }

        const packageJsonPath = path.join(absoluteWorkspaceRoot, child.name, 'package.json');
        if (!exists(packageJsonPath)) {
          continue;
        }

        if (normalizeSharedDependency(packageJsonPath, sharedPackageName)) {
          updatedWorkspaces.push(path.relative(ROOT_DIR, packageJsonPath));
        }
      }
    }
  }

  runCommand(options.packageManager, PACKAGE_MANAGER_INSTALL[options.packageManager]);

  const build = splitCommand(options.buildCmd);
  runCommand(build.command, [...build.args, '--filter', sharedPackageName]);

  console.log('');
  console.log(`Package manager: ${options.packageManager}`);
  console.log(`Build: ${options.buildCmd} --filter ${sharedPackageName}`);
  console.log(`Scope detectado: ${scope}`);
  console.log(`Pacote recriado: ${path.relative(ROOT_DIR, targetDir)}`);
  console.log(`Nome final do pacote: ${sharedPackageName}`);
  console.log('Workspaces com dependencia normalizada:');

  if (updatedWorkspaces.length === 0) {
    console.log('- nenhum workspace precisou de atualizacao');
  } else {
    for (const workspace of updatedWorkspaces) {
      console.log(`- ${workspace}`);
    }
  }
}

main();
