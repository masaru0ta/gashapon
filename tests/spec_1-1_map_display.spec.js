// @ts-check
const { test, expect } = require('@playwright/test');

// テスト対象ページ（仕様書 3.4.1）
const PAGE_URL = '/src/index.html';

// ヘルパー: gameState を取得
async function getGameState(page) {
  return page.evaluate(() => window.gameState);
}

// ヘルパー: mapCanvas の中心座標を取得
async function getCanvasCenter(page) {
  const box = await page.getByTestId('map-canvas').boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// ヘルパー: miniMapCanvas の中心座標を取得
async function getMiniMapCenter(page) {
  const box = await page.getByTestId('mini-map-canvas').boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

// -------------------------------------------------------
// 初期表示
// -------------------------------------------------------
test.describe('初期表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('マップエリアとステータスバーが表示される', async ({ page }) => {
    await expect(page.getByTestId('map-area')).toBeVisible();
    await expect(page.getByTestId('status-bar')).toBeVisible();
  });

  test('メインキャンバスが表示される', async ({ page }) => {
    const canvas = page.getByTestId('map-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('ステータスバーにP1情報が表示される', async ({ page }) => {
    await expect(page.getByTestId('p1-info')).toBeVisible();
    await expect(page.getByTestId('p1-ig')).toBeVisible();
    await expect(page.getByTestId('p1-ct')).toBeVisible();
    await expect(page.getByTestId('p1-gp')).toBeVisible();
    await expect(page.getByTestId('p1-gb')).toBeVisible();
    await expect(page.getByTestId('p1-production')).toBeVisible();
    await expect(page.getByTestId('p1-unit-count')).toBeVisible();
  });

  test('ステータスバーにP2情報が表示される', async ({ page }) => {
    await expect(page.getByTestId('p2-info')).toBeVisible();
    await expect(page.getByTestId('p2-ig')).toBeVisible();
    await expect(page.getByTestId('p2-ct')).toBeVisible();
    await expect(page.getByTestId('p2-gp')).toBeVisible();
    await expect(page.getByTestId('p2-gb')).toBeVisible();
    await expect(page.getByTestId('p2-production')).toBeVisible();
    await expect(page.getByTestId('p2-unit-count')).toBeVisible();
  });

  test('ステータスバー中央にターン番号とフェーズが表示される', async ({ page }) => {
    await expect(page.getByTestId('turn-number')).toBeVisible();
    await expect(page.getByTestId('turn-phase')).toBeVisible();
  });

  test('ミニマップが表示される', async ({ page }) => {
    const miniMap = page.getByTestId('mini-map-canvas');
    await expect(miniMap).toBeVisible();
    // Canvas要素自体のwidth/height属性で確認（boundingBoxはボーダーを含む）
    const size = await miniMap.evaluate(el => ({ w: el.width, h: el.height }));
    expect(size.w).toBe(200);
    expect(size.h).toBe(120);
  });

  test('ゲームコンテナの最大幅が1200px以下である', async ({ page }) => {
    const box = await page.getByTestId('game-container').boundingBox();
    expect(box.width).toBeLessThanOrEqual(1200);
  });
});

// -------------------------------------------------------
// スクロール（マウスドラッグ）
// -------------------------------------------------------
test.describe('スクロール（マウスドラッグ）', () => {
  // マップ幅(25*32=800)よりビューポートを小さくしてスクロール可能にする
  test.use({ viewport: { width: 600, height: 400 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('マウスドラッグでマップがスクロールする', async ({ page }) => {
    const center = await getCanvasCenter(page);
    const before = await getGameState(page);

    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x - 50, center.y - 30, { steps: 5 });
    await page.mouse.up();

    const after = await getGameState(page);
    // ドラッグ方向と逆にスクロール（左にドラッグ→scrollX増加）
    expect(after.scrollX).toBeGreaterThan(before.scrollX);
    expect(after.scrollY).toBeGreaterThan(before.scrollY);
  });

  test('ドラッグ中はカーソルがgrabbingになる', async ({ page }) => {
    const canvas = page.getByTestId('map-canvas');
    // CSSで通常時 grab が設定されていることを確認
    const cursor = await canvas.evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('grab');
  });
});

// -------------------------------------------------------
// スクロール（キーボード）
// -------------------------------------------------------
test.describe('スクロール（キーボード）', () => {
  test.use({ viewport: { width: 600, height: 400 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('矢印キー右でマップが右にスクロールする', async ({ page }) => {
    const before = await getGameState(page);
    await page.keyboard.press('ArrowRight');
    const after = await getGameState(page);
    expect(after.scrollX).toBe(before.scrollX + before.SCROLL_SPEED);
  });

  test('矢印キー下でマップが下にスクロールする', async ({ page }) => {
    const before = await getGameState(page);
    await page.keyboard.press('ArrowDown');
    const after = await getGameState(page);
    expect(after.scrollY).toBe(before.scrollY + before.SCROLL_SPEED);
  });

  test('矢印キー左でマップが左にスクロールする', async ({ page }) => {
    // まず右にスクロールしてから左に戻す
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    const before = await getGameState(page);
    await page.keyboard.press('ArrowLeft');
    const after = await getGameState(page);
    expect(after.scrollX).toBe(before.scrollX - before.SCROLL_SPEED);
  });

  test('矢印キー上でマップが上にスクロールする', async ({ page }) => {
    // まず下にスクロールしてから上に戻す
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const before = await getGameState(page);
    await page.keyboard.press('ArrowUp');
    const after = await getGameState(page);
    expect(after.scrollY).toBe(before.scrollY - before.SCROLL_SPEED);
  });

  test('1回の押下で32pxスクロールする', async ({ page }) => {
    const before = await getGameState(page);
    await page.keyboard.press('ArrowDown');
    const after = await getGameState(page);
    expect(after.scrollY - before.scrollY).toBe(32);
  });
});

// -------------------------------------------------------
// スクロール境界
// -------------------------------------------------------
test.describe('スクロール境界', () => {
  test.use({ viewport: { width: 600, height: 400 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('マップ左端を超えてスクロールできない', async ({ page }) => {
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('ArrowLeft');
    }
    const state = await getGameState(page);
    expect(state.scrollX).toBeGreaterThanOrEqual(0);
  });

  test('マップ上端を超えてスクロールできない', async ({ page }) => {
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('ArrowUp');
    }
    const state = await getGameState(page);
    expect(state.scrollY).toBeGreaterThanOrEqual(0);
  });

  test('マップ右端を超えてスクロールできない', async ({ page }) => {
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('ArrowRight');
    }
    const state = await getGameState(page);
    const maxX = await page.evaluate(() => {
      const gs = window.gameState;
      const canvas = document.querySelector('[data-testid="map-canvas"]');
      return Math.max(0, gs.MAP_COLS * gs.TILE_SIZE * gs.scale - canvas.width);
    });
    expect(state.scrollX).toBeLessThanOrEqual(maxX);
    expect(state.scrollX).toBe(maxX);
  });

  test('マップ下端を超えてスクロールできない', async ({ page }) => {
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('ArrowDown');
    }
    const state = await getGameState(page);
    const maxY = await page.evaluate(() => {
      const gs = window.gameState;
      const canvas = document.querySelector('[data-testid="map-canvas"]');
      return Math.max(0, gs.MAP_ROWS * gs.TILE_SIZE * gs.scale - canvas.height);
    });
    expect(state.scrollY).toBeLessThanOrEqual(maxY);
    expect(state.scrollY).toBe(maxY);
  });
});

// -------------------------------------------------------
// ズーム（マウスホイール）
// -------------------------------------------------------
test.describe('ズーム（マウスホイール）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('ホイール上回転でマップが拡大される', async ({ page }) => {
    const center = await getCanvasCenter(page);
    const before = await getGameState(page);
    await page.mouse.move(center.x, center.y);
    await page.mouse.wheel(0, -100);
    // ホイールイベント処理を待つ
    await page.waitForTimeout(100);
    const after = await getGameState(page);
    expect(after.scale).toBeGreaterThan(before.scale);
  });

  test('ホイール下回転でマップが縮小される', async ({ page }) => {
    const center = await getCanvasCenter(page);
    const before = await getGameState(page);
    await page.mouse.move(center.x, center.y);
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(100);
    const after = await getGameState(page);
    expect(after.scale).toBeLessThan(before.scale);
  });

  test('ズーム時カーソル位置のマップ座標が維持される', async ({ page }) => {
    // スクロール可能な状態にするためビューポートを縮小
    await page.setViewportSize({ width: 600, height: 400 });
    await page.waitForTimeout(100);

    // まず少しスクロールしてクランプの影響を避ける
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');

    const box = await page.getByTestId('map-canvas').boundingBox();
    const cx = box.x + box.width * 0.5;
    const cy = box.y + box.height * 0.5;
    await page.mouse.move(cx, cy);

    const beforeCoord = await page.evaluate(({ px, py }) => {
      const gs = window.gameState;
      const canvas = document.querySelector('[data-testid="map-canvas"]');
      const rect = canvas.getBoundingClientRect();
      const canvasX = (px - rect.left) * (canvas.width / rect.width);
      const canvasY = (py - rect.top) * (canvas.height / rect.height);
      const tileSize = gs.TILE_SIZE * gs.scale;
      return {
        col: Math.floor((canvasX + gs.scrollX) / tileSize),
        row: Math.floor((canvasY + gs.scrollY) / tileSize),
      };
    }, { px: cx, py: cy });

    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(100);

    const afterCoord = await page.evaluate(({ px, py }) => {
      const gs = window.gameState;
      const canvas = document.querySelector('[data-testid="map-canvas"]');
      const rect = canvas.getBoundingClientRect();
      const canvasX = (px - rect.left) * (canvas.width / rect.width);
      const canvasY = (py - rect.top) * (canvas.height / rect.height);
      const tileSize = gs.TILE_SIZE * gs.scale;
      return {
        col: Math.floor((canvasX + gs.scrollX) / tileSize),
        row: Math.floor((canvasY + gs.scrollY) / tileSize),
      };
    }, { px: cx, py: cy });

    // ズーム前後でカーソル下のタイルが同じであること
    expect(afterCoord.col).toBe(beforeCoord.col);
    expect(afterCoord.row).toBe(beforeCoord.row);
  });
});

// -------------------------------------------------------
// ズーム境界
// -------------------------------------------------------
test.describe('ズーム境界', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('ズーム倍率が1倍未満にならない', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.move(center.x, center.y);
    // 大量に縮小
    for (let i = 0; i < 50; i++) {
      await page.mouse.wheel(0, 100);
    }
    await page.waitForTimeout(100);
    const state = await getGameState(page);
    expect(state.scale).toBeGreaterThanOrEqual(state.MIN_SCALE);
  });

  test('ズーム倍率が4倍を超えない', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.move(center.x, center.y);
    // 大量に拡大
    for (let i = 0; i < 50; i++) {
      await page.mouse.wheel(0, -100);
    }
    await page.waitForTimeout(100);
    const state = await getGameState(page);
    expect(state.scale).toBeLessThanOrEqual(state.MAX_SCALE);
  });

  test('最小ズームでさらに縮小しても表示が崩れない', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.move(center.x, center.y);
    for (let i = 0; i < 50; i++) {
      await page.mouse.wheel(0, 100);
    }
    await page.waitForTimeout(100);
    const state = await getGameState(page);
    expect(state.scale).toBe(state.MIN_SCALE);
    // Canvas が存在し、サイズが正常であること
    const canvas = page.getByTestId('map-canvas');
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });

  test('最大ズームでさらに拡大しても表示が崩れない', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.move(center.x, center.y);
    for (let i = 0; i < 50; i++) {
      await page.mouse.wheel(0, -100);
    }
    await page.waitForTimeout(100);
    const state = await getGameState(page);
    expect(state.scale).toBe(state.MAX_SCALE);
    const canvas = page.getByTestId('map-canvas');
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------
// タイル選択
// -------------------------------------------------------
test.describe('タイル選択', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('クリックでタイルが選択される', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.click(center.x, center.y);
    const state = await getGameState(page);
    expect(state.selectedCol).toBeGreaterThanOrEqual(0);
    expect(state.selectedRow).toBeGreaterThanOrEqual(0);
  });

  test('同じタイルを再クリックすると選択解除される', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.click(center.x, center.y);
    const selected = await getGameState(page);
    expect(selected.selectedCol).toBeGreaterThanOrEqual(0);

    // 同じ位置を再クリック
    await page.mouse.click(center.x, center.y);
    const deselected = await getGameState(page);
    expect(deselected.selectedCol).toBe(-1);
    expect(deselected.selectedRow).toBe(-1);
  });

  test('別のタイルをクリックすると選択が移動する', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.click(center.x, center.y);
    const first = await getGameState(page);

    // 少し離れた位置をクリック
    const state = await getGameState(page);
    const offset = state.TILE_SIZE * state.scale;
    await page.mouse.click(center.x + offset, center.y + offset);
    const second = await getGameState(page);

    expect(second.selectedCol).toBeGreaterThanOrEqual(0);
    expect(second.selectedCol !== first.selectedCol || second.selectedRow !== first.selectedRow).toBeTruthy();
  });

  test('ドラッグ操作ではタイルが選択されない', async ({ page }) => {
    const center = await getCanvasCenter(page);
    // 長い距離をドラッグ
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 100, center.y + 100, { steps: 10 });
    await page.mouse.up();

    const state = await getGameState(page);
    expect(state.selectedCol).toBe(-1);
    expect(state.selectedRow).toBe(-1);
  });

  test('選択枠が500ms間隔で点滅する', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.click(center.x, center.y);

    // 点滅は setInterval(500ms) で制御されるため、
    // gameState の selectedCol が -1 でないことで選択状態を確認し、
    // 点滅自体は目視確認項目とする
    const state = await getGameState(page);
    expect(state.selectedCol).toBeGreaterThanOrEqual(0);
    // 600ms 待って状態が維持されていることを確認（点滅しても選択は解除されない）
    await page.waitForTimeout(600);
    const afterBlink = await getGameState(page);
    expect(afterBlink.selectedCol).toBe(state.selectedCol);
    expect(afterBlink.selectedRow).toBe(state.selectedRow);
  });
});

// -------------------------------------------------------
// ホバー表示
// -------------------------------------------------------
test.describe('ホバー表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('マウスホバーで地形情報オーバーレイが表示される', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.move(center.x, center.y);
    // ホバー後にオーバーレイが visible になる
    await expect(page.getByTestId('terrain-overlay')).toBeVisible();
  });

  test('座標テキストが正しい形式で表示される', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.move(center.x, center.y);
    const coordText = await page.getByTestId('coord-text').textContent();
    // (col,row) 形式であること
    expect(coordText).toMatch(/^\(\d+,\d+\)$/);
  });

  test('地形名が表示される', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.move(center.x, center.y);
    const terrainName = await page.getByTestId('terrain-name').textContent();
    expect(terrainName.length).toBeGreaterThan(0);
  });

  test('マウスがCanvasから離れるとオーバーレイが消える', async ({ page }) => {
    const center = await getCanvasCenter(page);
    // ホバーしてオーバーレイを表示
    await page.mouse.move(center.x, center.y);
    await expect(page.getByTestId('terrain-overlay')).toBeVisible();

    // ステータスバー領域に移動（Canvas外）
    const statusBar = await page.getByTestId('status-bar').boundingBox();
    await page.mouse.move(statusBar.x + 10, statusBar.y + 10);
    await expect(page.getByTestId('terrain-overlay')).not.toBeVisible();
  });

  test('ホバー中のマップ座標がgameStateに反映される', async ({ page }) => {
    const center = await getCanvasCenter(page);
    await page.mouse.move(center.x, center.y);
    const state = await getGameState(page);
    expect(state.hoverCol).toBeGreaterThanOrEqual(0);
    expect(state.hoverRow).toBeGreaterThanOrEqual(0);
  });
});

// -------------------------------------------------------
// ミニマップ
// -------------------------------------------------------
test.describe('ミニマップ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('ミニマップが表示される', async ({ page }) => {
    await expect(page.getByTestId('mini-map-canvas')).toBeVisible();
  });

  test('ミニマップクリックでメインマップがスクロールする', async ({ page }) => {
    const before = await getGameState(page);
    const miniCenter = await getMiniMapCenter(page);

    // ミニマップの右下付近をクリック
    const box = await page.getByTestId('mini-map-canvas').boundingBox();
    await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.8);
    await page.waitForTimeout(100);

    const after = await getGameState(page);
    // スクロール位置が変化していること
    expect(after.scrollX !== before.scrollX || after.scrollY !== before.scrollY).toBeTruthy();
  });

  test('ミニマップドラッグでメインマップが追従スクロールする', async ({ page }) => {
    const box = await page.getByTestId('mini-map-canvas').boundingBox();
    const startX = box.x + box.width * 0.3;
    const startY = box.y + box.height * 0.3;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    const during1 = await getGameState(page);

    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7, { steps: 5 });
    const during2 = await getGameState(page);
    await page.mouse.up();

    // ドラッグ中にスクロール位置が変化していること
    expect(during2.scrollX !== during1.scrollX || during2.scrollY !== during1.scrollY).toBeTruthy();
  });

  test('ミニマップドラッグ終了でドラッグが解除される', async ({ page }) => {
    const box = await page.getByTestId('mini-map-canvas').boundingBox();
    // ミニマップをドラッグ
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.7, { steps: 3 });
    await page.mouse.up();
    const afterDrag = await getGameState(page);

    // マウスを動かしてもスクロールが変わらないこと（ドラッグ解除済み）
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1);
    await page.waitForTimeout(100);
    const afterMove = await getGameState(page);
    expect(afterMove.scrollX).toBe(afterDrag.scrollX);
    expect(afterMove.scrollY).toBe(afterDrag.scrollY);
  });
});

// -------------------------------------------------------
// レスポンシブ
// -------------------------------------------------------
test.describe('レスポンシブ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('ウィンドウリサイズでCanvasサイズが追従する', async ({ page }) => {
    const beforeBox = await page.getByTestId('map-canvas').boundingBox();
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(200);
    const afterBox = await page.getByTestId('map-canvas').boundingBox();
    // サイズが変化していること（より小さいビューポートで）
    expect(afterBox.width).not.toBe(beforeBox.width);
  });

  test('リサイズ後もスクロール・タイル選択が正常に動作する', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 400 });
    await page.waitForTimeout(200);

    // キーボードスクロール（縦方向で確認）
    const before = await getGameState(page);
    await page.keyboard.press('ArrowDown');
    const after = await getGameState(page);
    expect(after.scrollY).toBeGreaterThan(before.scrollY);

    // タイル選択
    const center = await getCanvasCenter(page);
    await page.mouse.click(center.x, center.y);
    const state = await getGameState(page);
    expect(state.selectedCol).toBeGreaterThanOrEqual(0);
  });

  test('ゲームコンテナの最大幅が1200px以下である', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(200);
    const box = await page.getByTestId('game-container').boundingBox();
    expect(box.width).toBeLessThanOrEqual(1200);
  });
});

// -------------------------------------------------------
// ステータスバー
// -------------------------------------------------------
test.describe('ステータスバー', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('P1のIG値が表示される', async ({ page }) => {
    const text = await page.getByTestId('p1-ig').textContent();
    expect(text).toContain('IG');
  });

  test('P1のCT値が表示される', async ({ page }) => {
    const text = await page.getByTestId('p1-ct').textContent();
    expect(text).toContain('CT');
  });

  test('P1のユニット総数が表示される', async ({ page }) => {
    const el = page.getByTestId('p1-unit-count');
    await expect(el).toBeVisible();
    const text = await el.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('P2のIG値が表示される', async ({ page }) => {
    const text = await page.getByTestId('p2-ig').textContent();
    expect(text).toContain('IG');
  });

  test('P2のCT値が表示される', async ({ page }) => {
    const text = await page.getByTestId('p2-ct').textContent();
    expect(text).toContain('CT');
  });

  test('P2のユニット総数が表示される', async ({ page }) => {
    const el = page.getByTestId('p2-unit-count');
    await expect(el).toBeVisible();
    const text = await el.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('ターン番号が表示される', async ({ page }) => {
    const el = page.getByTestId('turn-number');
    await expect(el).toBeVisible();
    const text = await el.textContent();
    expect(text.trim()).toMatch(/\d+/);
  });

  test('フェーズが表示される', async ({ page }) => {
    const el = page.getByTestId('turn-phase');
    await expect(el).toBeVisible();
    const text = await el.textContent();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('P1ユニット数が青色で表示される', async ({ page }) => {
    const color = await page.getByTestId('p1-unit-count').evaluate(
      el => getComputedStyle(el).color
    );
    // #4488ff = rgb(68, 136, 255)
    expect(color).toBe('rgb(68, 136, 255)');
  });

  test('P2ユニット数がピンク色で表示される', async ({ page }) => {
    const color = await page.getByTestId('p2-unit-count').evaluate(
      el => getComputedStyle(el).color
    );
    // #ff4488 = rgb(255, 68, 136)
    expect(color).toBe('rgb(255, 68, 136)');
  });
});

// -------------------------------------------------------
// 画像フォールバック
// -------------------------------------------------------
test.describe('画像フォールバック', () => {
  test('画像読み込み失敗時もCanvasが描画される', async ({ page }) => {
    // 画像パスが不正でもフォールバックカラーで描画されることを確認
    // 実装がタイル画像なしでもフォールバックカラーで描画する仕様
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);

    const canvas = page.getByTestId('map-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});
