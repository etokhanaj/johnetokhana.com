import { configDefaults, defineConfig } from 'vitest/config';

// Agent worktrees live under .claude/worktrees; their tests aren't this checkout's.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
});
