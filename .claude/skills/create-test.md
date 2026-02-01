---
description: テストコード・テスト設定の作成・編集時に自動適用されるルールと高速化手法
globs:
  - "tests/**/*.spec.js"
  - "tests/**/*.spec.ts"
  - "playwright.config.*"
---

# テスト作成スキル

テストコード（`tests/**/*.spec.*`）およびテスト設定（`playwright.config.*`）の作成・編集時に適用されるルール。

## 適用条件

- テストファイルを新規作成するとき
- 既存テストを編集するとき
- `playwright.config.*` を編集するとき
- ユーザーがテスト作成を依頼したとき

## 前提作業

- 対象機能の仕様書（`docs/spec_*.md`）のテスト項目セクションを確認する
- テスト項目を漏れなくテストコードに反映する
- 既存テストファイルがあればパターンを踏襲する
- **`playwright.config.*` に `fullyParallel: true` が設定されていることを確認する。未設定の場合は追加すること**
- **`playwright.config.*` に `reporter: 'dot'` が設定されていることを確認する。未設定の場合は追加すること（CI環境では `process.env.CI ? 'list' : 'dot'` とする）**

## テスト高速化ルール（必須遵守）

テスト実行時間はCI/CD・開発体験に直結する。以下のルールを必ず守ること。

### R1: ブラウザ往復通信を最小化する

`page.mouse.wheel()`、`page.mouse.click()` などのPlaywright操作は1回ごとにブラウザとの往復通信が発生する。ループで大量に呼ぶと秒単位の遅延になる。

```js
// NG: 50回の往復通信（約2秒）
for (let i = 0; i < 50; i++) {
  await page.mouse.wheel(0, 100);
}

// OK: page.evaluate で一括処理（数ms）
await page.evaluate(() => {
  for (let i = 0; i < 50; i++) {
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
  }
});

// OK: テスト用APIを経由して状態を直接設定（数ms）
await page.evaluate(() => window.setScale(window.gameState.MIN_SCALE));
```

**判断基準**: ループ内で Playwright の `page.*` メソッドを3回以上呼ぶ場合は `page.evaluate` への置き換えを検討する。

### R2: `waitForTimeout` を使わない

固定時間待機はテストのアンチパターン。実際に必要な時間より長く待つため無駄が生じ、かつ環境によってはタイムアウトする。

```js
// NG: 固定100ms待機
await page.waitForTimeout(100);
const state = await getGameState(page);
expect(state.scale).toBe(1.0);

// OK: 状態変化を直接待つ（条件成立した瞬間に進む）
await page.waitForFunction(() => window.gameState.scale === 1.0);
```

**例外**: アニメーション完了待ちなど、専用の待機関数（`window.waitForAnimation()`等）がある場合はそちらを使う。

### R3: テスト用APIを実装に用意する

テスト対象の実装には `window` に公開するテスト用APIを用意し、テストから直接状態を設定・取得できるようにする。UIを経由した間接的な操作より高速で安定する。

```js
// 実装側で公開するAPI例
window.gameState        // 状態の読み取り
window.moveUnit(id, col, row)  // 状態の直接操作（アニメーション無し）
window.setAnimationSpeed(ms)   // テスト用パラメータ設定
window.waitForAnimation()      // 非同期処理の完了待ち
```

**ルール**: UI操作のテスト（クリック・ドラッグ等）以外は、テスト用APIで状態を設定・検証する。

### R4: テストの並列実行を前提に書く

```js
// playwright.config.js
fullyParallel: true,
```

並列実行を妨げないよう、以下を守る:

- テスト間でグローバル状態を共有しない（各テストは独立した `page` を使う）
- テストの実行順序に依存しない
- `beforeEach` でページを初期状態にリセットする
- ファイル間・テスト間で副作用（ファイル書き込み、DB変更等）を共有しない

**例外: 直列実行が必要な場合**

テスト間で状態を引き継ぐ必要がある場合（例: ログイン→操作→確認の一連フロー）は、`test.describe.serial` で該当グループのみ直列にする。`fullyParallel: true` の設定はそのままで、他のテストの並列実行に影響しない。

```js
// このブロックだけ直列実行、他は並列のまま
test.describe.serial('状態を引き継ぐテスト群', () => {
  test('ステップ1', async ({ page }) => { ... });
  test('ステップ2', async ({ page }) => { ... });
});
```

### R5: `beforeEach` / `beforeAll` で共通処理をまとめる

各テストで繰り返す初期化処理は `beforeEach` にまとめ、テストコードの重複と実行コストを減らす。

```js
// OK: 共通の初期化を1箇所にまとめる
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.evaluate(() => window.setAnimationSpeed(0)); // アニメーション無効化
});
```

### R6: アニメーションはテスト時に無効化または高速化する

アニメーションの待機はテスト時間を大幅に増やす。テスト用APIで速度を制御する。

```js
// アニメーション自体のテスト: 短い時間に設定
await page.evaluate(() => window.setAnimationSpeed(50));

// アニメーション以外のテスト: 無効化（0ms）
await page.evaluate(() => window.setAnimationSpeed(0));
```

### R7: セレクタは安定かつ高速なものを使う

```js
// NG: テキスト内容に依存（変更に弱い・検索コスト高）
await page.locator('text=ゲーム開始').click();

// OK: data-testid（高速・安定）
await page.getByTestId('start-button').click();

// OK: ロールベース（アクセシビリティと両立）
await page.getByRole('button', { name: 'ゲーム開始' }).click();
```

### R8: 不要なページ遷移・リロードを避ける

```js
// NG: テストごとにページリロード（不要な場合）
test('テストA', async ({ page }) => {
  await page.goto('/');  // 毎回リロード
  // ...
});

// OK: beforeEach で状態リセットAPIを使う
test.beforeEach(async ({ page }) => {
  await page.evaluate(() => window.resetGame());
});
```

ただし、状態リセットAPIが無い場合や、DOM自体のテストの場合は `page.goto()` を使う。

## テストコードの構成ルール

### 構成

```
tests/
  spec_<機能番号>_<機能名>.spec.js   // 機能ごとに1ファイル
```

### テストの構造

```js
const { test, expect } = require('@playwright/test');

// ヘルパー関数（ファイル先頭にまとめる）
async function getGameState(page) { ... }
async function clickTile(page, col, row) { ... }

// テストグループ（仕様書のカテゴリに対応）
test.describe('カテゴリ名', () => {
  test.beforeEach(async ({ page }) => {
    // 共通初期化
  });

  test('テスト項目名', async ({ page }) => {
    // Arrange（準備）→ Act（操作）→ Assert（検証）
  });
});
```

### 命名規則

- テストグループ名: 仕様書のテスト項目カテゴリ名と一致させる
- テスト名: 仕様書のテスト項目名と一致させる（日本語）
- ヘルパー関数名: 英語のcamelCase

## 完成時の自己検証

テストを書き終えたら以下をすべて検証し、不合格があれば修正する。

- [ ] 仕様書のテスト項目がすべてテストコードに反映されている
- [ ] ループ内でPlaywright操作を3回以上呼んでいる箇所がない（R1）
- [ ] `waitForTimeout` を使っていない（R2）
- [ ] テスト用APIを活用し、不要なUI操作を避けている（R3）
- [ ] テスト間に順序依存・状態共有がない（R4）
- [ ] 共通初期化が `beforeEach` にまとまっている（R5）
- [ ] アニメーション関連以外のテストでアニメーションが無効化されている（R6）
- [ ] セレクタに `data-testid` またはロールベースを使っている（R7）
- [ ] 不要な `page.goto()` がない（R8）
- [ ] `playwright.config.*` に `fullyParallel: true` が設定されている（R4）
- [ ] `playwright.config.*` に `reporter: 'dot'`（またはCI分岐付き）が設定されている
- [ ] 全テストが通過する
