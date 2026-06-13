# Script Contract

Use `scripts/create-project.js` for all project creation work.

## Command

```bash
node .agents/skills/config-project-fullstack/scripts/create-project.js [--namespace @scope] [--frontend-port 3000] [--backend-port 4000] [--package-manager npm] [--force-clean] [--dry-run]
```

## Flags

- `--namespace @scope`: rename every workspace package to the provided npm scope.
- `--frontend-port <port>`: port for the Next.js frontend app (default `3000`).
- `--backend-port <port>`: port for the NestJS backend app, written into `.env`, `.env.example`, and the `main.ts` listen fallback (default `4000`).
- `--package-manager <pm>` (alias `--pm`): one of `npm` (default), `yarn`, `pnpm`, `bun`.
- `--force-clean`: replace only the generated project paths in the current directory.
- `--dry-run`: print the planned operations without executing them.

## Guarantees

- Create the workspace in the current directory as the final destination.
- Scaffold a Turbo workspace with the selected package manager using the exact sequence requested by the user.
- Produce `apps/frontend` on the frontend port (default `3000`).
- Scaffold `apps/backend` with `npx --yes @nestjs/cli new` (no global Nest CLI install) on the backend port (default `4000`) with `ConfigModule.forRoot({ isGlobal: true })` and `app.enableCors()`.
- Create both `.env.example` and `.env` in frontend and backend.
- Refresh dependencies at the root after the workspace is patched.

## Safety

- Refuse to use the filesystem root as the target directory.
- Refuse to rerun in a directory that already contains the managed fullstack workspace unless `--force-clean` is present.
- Preserve existing files and directories that do not conflict with the generated project paths.
- Refuse to overwrite conflicting paths in the current directory unless `--force-clean` is present.
- Reject invalid namespaces that are not valid npm scopes such as `@acme`.

## Namespace Rules

- Rename the root package and every workspace package to the provided scope.
- Preserve the package slug when an existing package already has a scoped name.
- Rename local dependency keys across `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies`.
