---
description: モックアップHTML作成時に自動適用されるスマホ対応・レイアウトルール
globs:
  - "docs/mockups/*.html"
  - "src/*.html"
---

# モックアップ・画面HTML作成スキル

モックアップHTML（`docs/mockups/*.html`）および実装HTML（`src/*.html`）の作成・編集時に適用されるルール。

## ビューポート高さ: `100dvh` を使う

`100vh` はスマホブラウザでアドレスバー・ナビゲーションバーを含む画面全体の高さを返す。実際の表示領域はそれより50〜120px小さいため、要素がはみ出す。

```css
/* 必ずフォールバック付きで記述 */
height: 100vh;     /* dvh非対応ブラウザ向けフォールバック */
height: 100dvh;    /* 実際の表示領域に追従 */
```

- `svh`（Small Viewport Height）や `lvh`（Large Viewport Height）ではなく `dvh`（Dynamic）を使う
- `dvh` は動的にアドレスバーの表示/非表示に追従する

## 固定高さの禁止: `max-height` + `flex-shrink` を使う

固定高さ + 縮小不可はスマホではみ出しの直接原因になる。

```css
/* NG: はみ出す */
height: 180px;
flex-shrink: 0;

/* OK: 画面に収まる */
max-height: 180px;
flex-shrink: 1;
```

- 可変領域（マップエリア等）には `flex: 1; min-height: 0` を設定する
- `min-height: 0` がないとflexboxの縮小が正しく機能しない場合がある

## フォントサイズ: `clamp()` で連続スケーリング

メディアクエリ（`@media (max-height: 700px)`）はブレークポイント前後で急に変わり、実機のビューポートが予測しにくい。`clamp()` で連続的にスケーリングする。

```css
/* NG: 特定のブレークポイントでしか効かない */
font-size: 42px;
@media (max-height: 700px) { font-size: 28px; }

/* OK: あらゆる画面サイズに連続対応 */
font-size: clamp(20px, 5.5vh, 42px);
```

参考値（フォントサイズ）:
| 用途 | clamp |
|------|-------|
| 大見出し | `clamp(20px, 5.5vh, 42px)` |
| 中見出し | `clamp(16px, 3.5vh, 28px)` |
| 本文 | `clamp(12px, 2.3vh, 18px)` |
| 補足 | `clamp(10px, 2vh, 16px)` |

padding, gap なども同様に `clamp()` を使う:
```css
padding: clamp(2px, 1vh, 8px) clamp(8px, 2vw, 16px);
gap: clamp(1px, 0.5vh, 4px);
```

## テキストはみ出し防止

`white-space: nowrap` + 右寄せ（`text-align: right`）のテキストは、実機のフォントレンダリング差でPlaywrightより数px大きくなり見切れる。

- padding最小値を `8px` 以上に設定する
- 固定幅の中央カラム等の最小幅を小さめにし、左右カラムに余裕を持たせる
- 必要に応じて `overflow: hidden; text-overflow: ellipsis` を設定する

## タッチイベントはマウスイベントと別に実装する

PC向けの `mousedown`/`mousemove`/`mouseup` はスマホでは発火しない。

```javascript
/* NG: マウスイベントのみ */
function scrollTo(e) { use(e.clientX, e.clientY); }
el.addEventListener('mousedown', scrollTo);

/* OK: 座標を引数で受け取り、マウス/タッチ両対応 */
function scrollToXY(clientX, clientY) { /* ... */ }
el.addEventListener('mousedown', (e) => scrollToXY(e.clientX, e.clientY));
el.addEventListener('touchstart', (e) => {
  e.preventDefault();
  scrollToXY(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
```

タッチ操作を受ける要素には必ずCSSで設定:
```css
touch-action: none;  /* ブラウザデフォルトのジェスチャーを無効化 */
```

## Playwrightテストの注意点

Playwrightのビューポートにはブラウザのアドレスバーがないため、実機の問題を再現できないことがある。

- ビューポートサイズを実機より小さめに設定してテストする（667px -> 500px 等）
- 余白の検証では実機レンダリング差を見越して厳しめの閾値を使う（4px -> 8px）
- px固定値テスト（`toBe(180)`）より範囲テスト（`toBeLessThanOrEqual`）の方が実機差に強い
- タッチテストには `test.use({ hasTouch: true })` を忘れず設定する

## チェックリスト

HTML作成・編集時に以下を検証する。

- [ ] `100dvh` を使用し、`100vh` をフォールバックとして併記しているか
- [ ] 固定高さの要素に `flex-shrink: 0` を使っていないか（`max-height` + `flex-shrink: 1` にする）
- [ ] フォントサイズに `clamp()` を使い、あらゆる画面サイズに対応しているか
- [ ] `white-space: nowrap` のテキストに十分なpadding（最小8px）があるか
- [ ] タッチ操作が必要な要素に `touchstart`/`touchmove`/`touchend` を実装しているか
- [ ] タッチ対象要素に `touch-action: none` を設定しているか
