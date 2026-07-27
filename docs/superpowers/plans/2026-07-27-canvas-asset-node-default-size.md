# Canvas Asset Node Default Size Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make assets newly sent from the canvas asset library create `loadAsset` nodes at an explicit default size of `360 × 380`, without changing existing canvas data or other node creation paths.

**Architecture:** Keep the behavior at the existing asset-library-to-canvas boundary in `CanvasPage.tsx`. Add an explicit React Flow `style` only to the node object created by `AssetLibrary.onAddToCanvas`; lock the scope with the existing canvas migration source-contract test rather than changing `LoadAssetNode` globally.

**Tech Stack:** React 18, TypeScript, React Flow 11, Bun test, Vite

---

## File Map

- Modify `ui/web/src/pages/canvasPageMigration.test.ts`: add the focused regression contract for asset-library-created node dimensions and scope.
- Modify `ui/web/src/pages/CanvasPage.tsx`: attach the explicit `360 × 380` style to the `loadAsset` node created by the asset library callback.
- No persistence migration, component CSS change, or `LoadAssetNode` behavior change is required.

### Task 1: Fix the asset-library-created node size

**Files:**
- Modify: `ui/web/src/pages/canvasPageMigration.test.ts` near the canvas asset tests
- Modify: `ui/web/src/pages/CanvasPage.tsx` at the `AssetLibrary` `onAddToCanvas` callback

- [ ] **Step 1: Write the failing regression test**

Add this test inside the existing `describe('ComfyForge canvas feature migration', ...)` block in `ui/web/src/pages/canvasPageMigration.test.ts`:

```ts
test('assets sent from the library get the standard canvas node size', () => {
  const canvasPage = source('CanvasPage.tsx')

  expect(canvasPage).toContain(
    "type: 'loadAsset', position, data: { label: asset.name, asset }, style: { width: 360, height: 380 }"
  )
  expect(canvasPage).toContain(
    "style: node.type === 'generate' ? { width: 360, height: 380 } : undefined"
  )
})
```

The first assertion requires the asset-library callback to set the new size. The second preserves the current menu-created-node behavior, demonstrating that this change does not turn `360 × 380` into a global `loadAsset` default.

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```bash
cd ui/web && bun test src/pages/canvasPageMigration.test.ts
```

Expected: FAIL only in `assets sent from the library get the standard canvas node size`; the failure reports that the source does not contain the `loadAsset` node with `style: { width: 360, height: 380 }`.

- [ ] **Step 3: Implement the minimal creation-boundary change**

In `ui/web/src/pages/CanvasPage.tsx`, change only the node object inside the `AssetLibrary` `onAddToCanvas` callback from:

```tsx
addNode({
  id: getId(),
  type: 'loadAsset',
  position,
  data: { label: asset.name, asset },
} as any)
```

to:

```tsx
addNode({
  id: getId(),
  type: 'loadAsset',
  position,
  data: { label: asset.name, asset },
  style: { width: 360, height: 380 },
} as any)
```

Do not add a default style to the node registry, `LoadAssetNode`, saved-canvas loading, or the search-menu creation path.

- [ ] **Step 4: Run the focused tests and verify green**

Run:

```bash
cd ui/web && bun test src/pages/canvasPageMigration.test.ts src/components/nodes/loadAssetNode.test.ts
```

Expected: all tests PASS with no test errors.

- [ ] **Step 5: Run the web production build**

Run from the repository root:

```bash
bun run build:web
```

Expected: Vite completes successfully and emits the production bundle. Existing non-fatal chunk-size warnings are acceptable; TypeScript or bundling errors are not.

- [ ] **Step 6: Review the final diff for scope and formatting**

Run:

```bash
git diff --check
git diff -- ui/web/src/pages/CanvasPage.tsx ui/web/src/pages/canvasPageMigration.test.ts
```

Expected: no whitespace errors; the diff contains one regression test and one explicit style field in the asset library callback. It must not modify old canvas loading or add a global `loadAsset` default.

- [ ] **Step 7: Commit the implementation**

Run:

```bash
git add ui/web/src/pages/CanvasPage.tsx ui/web/src/pages/canvasPageMigration.test.ts
git commit -m "fix(canvas): constrain new asset node size"
```

Expected: one implementation commit containing only the two files above. Existing unrelated `workspace/` changes remain unstaged.
