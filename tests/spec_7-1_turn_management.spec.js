// @ts-check
const { test, expect } = require('@playwright/test');

const PAGE_URL = '/src/index.html';

// ヘルパー: gameState を取得
async function getGameState(page) {
  return page.evaluate(() => window.gameState);
}

// ヘルパー: タイルの画面座標を計算してクリック
async function clickTile(page, col, row) {
  const pos = await page.evaluate(({ col, row }) => {
    const gs = window.gameState;
    const canvas = document.querySelector('[data-testid="map-canvas"]');
    const rect = canvas.getBoundingClientRect();
    const t = gs.TILE_SIZE * gs.scale;
    const ox = gs.mapOffsetX || 0;
    const oy = gs.mapOffsetY || 0;
    const cx = (col + 0.5) * t - gs.scrollX + ox;
    const cy = (row + 0.5) * t - gs.scrollY + oy;
    return {
      x: rect.left + cx * (rect.width / canvas.width),
      y: rect.top + cy * (rect.height / canvas.height),
    };
  }, { col, row });
  await page.mouse.click(pos.x, pos.y);
}

// -------------------------------------------------------
// 初期表示
// -------------------------------------------------------
test.describe('初期表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('ターン番号が1で表示される', async ({ page }) => {
    const turnText = await page.getByTestId('turn-number').textContent();
    expect(turnText).toBe('1');
  });

  test('フェーズ表示がP1で表示される', async ({ page }) => {
    const phaseText = await page.getByTestId('turn-phase').textContent();
    expect(phaseText).toBe('P1');
  });

  test('フェーズテキストの色がP1カラーである', async ({ page }) => {
    const color = await page.getByTestId('turn-phase').evaluate(
      el => getComputedStyle(el).color
    );
    // ui_theme.json > colors.player1.primary = #4488ff → rgb(68, 136, 255)
    expect(color).toBe('rgb(68, 136, 255)');
  });

  test('ターン終了ボタンが表示される', async ({ page }) => {
    await expect(page.getByTestId('end-turn-button')).toBeVisible();
  });

  test('ターン終了ボタンのテキストがui_theme.jsonのlabels.endTurnButtonと一致する', async ({ page }) => {
    const text = await page.getByTestId('end-turn-button').textContent();
    // ui_theme.json > labels.endTurnButton の値と一致すること
    const label = await page.evaluate(() =>
      fetch('./config/ui_theme.json').then(r => r.json()).then(d => d.labels.endTurnButton)
    );
    expect(text).toBe(label);
  });

  test('P1のIG値がプレイヤーデータの初期値で表示される', async ({ page }) => {
    const text = await page.getByTestId('p1-ig').textContent();
    const gs = await getGameState(page);
    expect(text).toContain(String(gs.players[1].ig));
  });

  test('P1のCT値がプレイヤーデータの初期値で表示される', async ({ page }) => {
    const text = await page.getByTestId('p1-ct').textContent();
    const gs = await getGameState(page);
    expect(text).toContain(String(gs.players[1].ct));
  });

  test('P1のユニット数が実際のP1ユニット数と一致する', async ({ page }) => {
    const text = await page.getByTestId('p1-unit-count').textContent();
    const gs = await getGameState(page);
    const p1Count = gs.units.filter(u => u.player === 1).length;
    expect(text).toBe(String(p1Count).padStart(2, '0'));
  });

  test('P2のIG値がプレイヤーデータの初期値で表示される', async ({ page }) => {
    const text = await page.getByTestId('p2-ig').textContent();
    const gs = await getGameState(page);
    expect(text).toContain(String(gs.players[2].ig));
  });

  test('P2のCT値がプレイヤーデータの初期値で表示される', async ({ page }) => {
    const text = await page.getByTestId('p2-ct').textContent();
    const gs = await getGameState(page);
    expect(text).toContain(String(gs.players[2].ct));
  });

  test('P2のユニット数が実際のP2ユニット数と一致する', async ({ page }) => {
    const text = await page.getByTestId('p2-unit-count').textContent();
    const gs = await getGameState(page);
    const p2Count = gs.units.filter(u => u.player === 2).length;
    expect(text).toBe(String(p2Count).padStart(2, '0'));
  });
});

// -------------------------------------------------------
// ターン終了ボタン操作
// -------------------------------------------------------
test.describe('ターン終了ボタン操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('ターン終了ボタンをクリックするとフェーズが切り替わる', async ({ page }) => {
    await page.getByTestId('end-turn-button').click();
    const gs = await getGameState(page);
    expect(gs.currentPlayer).toBe(2);
  });

  test('ターン終了ボタンをタッチ操作で押すとフェーズが切り替わる', async ({ page }) => {
    const btn = page.getByTestId('end-turn-button');
    const box = await btn.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    const gs = await getGameState(page);
    expect(gs.currentPlayer).toBe(2);
  });
});

// -------------------------------------------------------
// P1→P2フェーズ切替
// -------------------------------------------------------
test.describe('P1→P2フェーズ切替', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
    // P1ターン終了
    await page.getByTestId('end-turn-button').click();
  });

  test('P1フェーズでターン終了するとcurrentPlayerが2になる', async ({ page }) => {
    const gs = await getGameState(page);
    expect(gs.currentPlayer).toBe(2);
  });

  test('フェーズ表示がP2に変わる', async ({ page }) => {
    const phaseText = await page.getByTestId('turn-phase').textContent();
    expect(phaseText).toBe('P2');
  });

  test('フェーズテキストの色がP2カラーに変わる', async ({ page }) => {
    const color = await page.getByTestId('turn-phase').evaluate(
      el => getComputedStyle(el).color
    );
    // ui_theme.json > colors.player2.primary = #ff4488 → rgb(255, 68, 136)
    expect(color).toBe('rgb(255, 68, 136)');
  });

  test('ターン番号が変化しない', async ({ page }) => {
    const gs = await getGameState(page);
    expect(gs.turnNumber).toBe(1);
    const turnText = await page.getByTestId('turn-number').textContent();
    expect(turnText).toBe('1');
  });

  test('P2の全ユニットのmovedがfalseにリセットされる', async ({ page }) => {
    const gs = await getGameState(page);
    const p2Units = gs.units.filter(u => u.player === 2);
    expect(p2Units.length).toBeGreaterThan(0);
    for (const unit of p2Units) {
      expect(unit.moved).toBe(false);
    }
  });

  test('P1のユニットが選択できなくなる', async ({ page }) => {
    // P1ユニット(id:1, col:2, row:2)をクリック
    await clickTile(page, 2, 2);
    const gs = await getGameState(page);
    expect(gs.selectedUnitId).toBe(-1);
  });

  test('P2のユニットが選択できるようになる', async ({ page }) => {
    // P2ユニット(id:5, col:22, row:2)をクリック
    await clickTile(page, 22, 2);
    const gs = await getGameState(page);
    expect(gs.selectedUnitId).toBe(5);
  });
});

// -------------------------------------------------------
// P2→P1フェーズ切替（ターン進行）
// -------------------------------------------------------
test.describe('P2→P1フェーズ切替（ターン進行）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
    // P1ターン終了 → P2ターン終了
    await page.evaluate(() => { window.endTurn(); window.endTurn(); });
  });

  test('P2フェーズでターン終了するとcurrentPlayerが1になる', async ({ page }) => {
    const gs = await getGameState(page);
    expect(gs.currentPlayer).toBe(1);
  });

  test('ターン番号が1インクリメントされる', async ({ page }) => {
    const gs = await getGameState(page);
    expect(gs.turnNumber).toBe(2);
    const turnText = await page.getByTestId('turn-number').textContent();
    expect(turnText).toBe('2');
  });

  test('フェーズ表示がP1に変わる', async ({ page }) => {
    const phaseText = await page.getByTestId('turn-phase').textContent();
    expect(phaseText).toBe('P1');
  });

  test('フェーズテキストの色がP1カラーに変わる', async ({ page }) => {
    const color = await page.getByTestId('turn-phase').evaluate(
      el => getComputedStyle(el).color
    );
    expect(color).toBe('rgb(68, 136, 255)');
  });

  test('P1の全ユニットのmovedがfalseにリセットされる', async ({ page }) => {
    const gs = await getGameState(page);
    const p1Units = gs.units.filter(u => u.player === 1);
    expect(p1Units.length).toBeGreaterThan(0);
    for (const unit of p1Units) {
      expect(unit.moved).toBe(false);
    }
  });

  test('P1のユニットが選択できるようになる', async ({ page }) => {
    await clickTile(page, 2, 2);
    const gs = await getGameState(page);
    expect(gs.selectedUnitId).toBe(1);
  });

  test('P2のユニットが選択できなくなる', async ({ page }) => {
    await clickTile(page, 22, 2);
    const gs = await getGameState(page);
    expect(gs.selectedUnitId).toBe(-1);
  });
});

// -------------------------------------------------------
// 連続ターン進行
// -------------------------------------------------------
test.describe('連続ターン進行', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('ターン1→2→3と連続で進行できる', async ({ page }) => {
    // ターン1: P1→P2
    await page.evaluate(() => window.endTurn());
    let gs = await getGameState(page);
    expect(gs.turnNumber).toBe(1);
    expect(gs.currentPlayer).toBe(2);

    // ターン1: P2→ターン2 P1
    await page.evaluate(() => window.endTurn());
    gs = await getGameState(page);
    expect(gs.turnNumber).toBe(2);
    expect(gs.currentPlayer).toBe(1);

    // ターン2: P1→P2
    await page.evaluate(() => window.endTurn());
    gs = await getGameState(page);
    expect(gs.turnNumber).toBe(2);
    expect(gs.currentPlayer).toBe(2);

    // ターン2: P2→ターン3 P1
    await page.evaluate(() => window.endTurn());
    gs = await getGameState(page);
    expect(gs.turnNumber).toBe(3);
    expect(gs.currentPlayer).toBe(1);
  });

  test('各ターンでP1→P2→P1の順が維持される', async ({ page }) => {
    for (let turn = 1; turn <= 3; turn++) {
      let gs = await getGameState(page);
      expect(gs.currentPlayer).toBe(1);
      expect(gs.turnNumber).toBe(turn);

      await page.evaluate(() => window.endTurn());
      gs = await getGameState(page);
      expect(gs.currentPlayer).toBe(2);
      expect(gs.turnNumber).toBe(turn);

      await page.evaluate(() => window.endTurn());
      // ターン進行
    }
    const gs = await getGameState(page);
    expect(gs.turnNumber).toBe(4);
    expect(gs.currentPlayer).toBe(1);
  });
});

// -------------------------------------------------------
// ステータスバー動的更新
// -------------------------------------------------------
test.describe('ステータスバー動的更新', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('P1のユニット数がP1の実際のユニット数と一致する', async ({ page }) => {
    const gs = await getGameState(page);
    const p1Count = gs.units.filter(u => u.player === 1).length;
    const text = await page.getByTestId('p1-unit-count').textContent();
    expect(text).toBe(String(p1Count).padStart(2, '0'));
  });

  test('P2のユニット数がP2の実際のユニット数と一致する', async ({ page }) => {
    const gs = await getGameState(page);
    const p2Count = gs.units.filter(u => u.player === 2).length;
    const text = await page.getByTestId('p2-unit-count').textContent();
    expect(text).toBe(String(p2Count).padStart(2, '0'));
  });

  test('ターン番号表示がgameState.turnNumberと一致する', async ({ page }) => {
    // ターン進行して確認
    await page.evaluate(() => { window.endTurn(); window.endTurn(); });
    const gs = await getGameState(page);
    const turnText = await page.getByTestId('turn-number').textContent();
    expect(turnText).toBe(String(gs.turnNumber));
  });

  test('フェーズ表示がgameState.currentPlayerに対応している', async ({ page }) => {
    // P1フェーズ
    let phaseText = await page.getByTestId('turn-phase').textContent();
    expect(phaseText).toBe('P1');

    // P2フェーズ
    await page.evaluate(() => window.endTurn());
    phaseText = await page.getByTestId('turn-phase').textContent();
    expect(phaseText).toBe('P2');
  });
});

// -------------------------------------------------------
// 操作制御
// -------------------------------------------------------
test.describe('操作制御', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('アニメーション中にターン終了ボタンを押しても何も起きない', async ({ page }) => {
    // ユニット選択して移動（アニメーション付き）
    await page.evaluate(() => window.setAnimationSpeed(500));
    await page.evaluate(() => window.selectUnit(1));
    // ユニット1(col:2,row:2)を移動先へクリック
    await clickTile(page, 2, 3);
    // アニメーション中にターン終了ボタンクリック
    const gsBefore = await getGameState(page);
    if (gsBefore.isAnimating) {
      await page.getByTestId('end-turn-button').click();
      const gsAfter = await getGameState(page);
      expect(gsAfter.currentPlayer).toBe(1); // 切り替わっていない
    }
    // アニメーション完了を待つ
    await page.evaluate(() => window.waitForAnimation());
  });

  test('ユニット選択中にターン終了ボタンを押すと選択が解除されてからフェーズが切り替わる', async ({ page }) => {
    // ユニット選択
    await page.evaluate(() => window.selectUnit(1));
    let gs = await getGameState(page);
    expect(gs.selectedUnitId).toBe(1);

    // ターン終了
    await page.getByTestId('end-turn-button').click();
    gs = await getGameState(page);
    expect(gs.selectedUnitId).toBe(-1);
    expect(gs.currentPlayer).toBe(2);
  });
});

// -------------------------------------------------------
// テスト用グローバル関数
// -------------------------------------------------------
test.describe('テスト用グローバル関数', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('window.endTurn()でフェーズが切り替わる', async ({ page }) => {
    await page.evaluate(() => window.endTurn());
    const gs = await getGameState(page);
    expect(gs.currentPlayer).toBe(2);
  });

  test('window.getTurnInfo()が正しいターン情報を返す', async ({ page }) => {
    const info = await page.evaluate(() => window.getTurnInfo());
    expect(info).toBeDefined();
    expect(info.turnNumber).toBeDefined();
    expect(info.currentPlayer).toBeDefined();
    expect(info.phase).toBeDefined();
  });

  test('window.getTurnInfo()のturnNumberが現在のターン番号を返す', async ({ page }) => {
    let info = await page.evaluate(() => window.getTurnInfo());
    expect(info.turnNumber).toBe(1);

    await page.evaluate(() => { window.endTurn(); window.endTurn(); });
    info = await page.evaluate(() => window.getTurnInfo());
    expect(info.turnNumber).toBe(2);
  });

  test('window.getTurnInfo()のcurrentPlayerが現在のプレイヤーを返す', async ({ page }) => {
    let info = await page.evaluate(() => window.getTurnInfo());
    expect(info.currentPlayer).toBe(1);

    await page.evaluate(() => window.endTurn());
    info = await page.evaluate(() => window.getTurnInfo());
    expect(info.currentPlayer).toBe(2);
  });

  test('window.getTurnInfo()のphaseがP1またはP2を返す', async ({ page }) => {
    let info = await page.evaluate(() => window.getTurnInfo());
    expect(info.phase).toBe('P1');

    await page.evaluate(() => window.endTurn());
    info = await page.evaluate(() => window.getTurnInfo());
    expect(info.phase).toBe('P2');
  });

  test('window.resetTurn()でターン番号が1にリセットされる', async ({ page }) => {
    // ターン進行
    await page.evaluate(() => { window.endTurn(); window.endTurn(); });
    let gs = await getGameState(page);
    expect(gs.turnNumber).toBe(2);

    // リセット
    await page.evaluate(() => window.resetTurn());
    gs = await getGameState(page);
    expect(gs.turnNumber).toBe(1);
  });

  test('window.resetTurn()でP1フェーズにリセットされる', async ({ page }) => {
    // P2フェーズに進行
    await page.evaluate(() => window.endTurn());
    let gs = await getGameState(page);
    expect(gs.currentPlayer).toBe(2);

    // リセット
    await page.evaluate(() => window.resetTurn());
    gs = await getGameState(page);
    expect(gs.currentPlayer).toBe(1);
  });

  test('window.resetTurn()で全ユニットのmovedがfalseになる', async ({ page }) => {
    // ユニット1を移動
    await page.evaluate(() => {
      window.selectUnit(1);
      window.moveUnit(1, 2, 3);
    });
    let gs = await getGameState(page);
    const u1 = gs.units.find(u => u.id === 1);
    expect(u1.moved).toBe(true);

    // リセット
    await page.evaluate(() => window.resetTurn());
    gs = await getGameState(page);
    for (const unit of gs.units) {
      expect(unit.moved).toBe(false);
    }
  });
});

// -------------------------------------------------------
// 既存機能との共存
// -------------------------------------------------------
test.describe('既存機能との共存', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState !== undefined);
  });

  test('ターン管理追加後もマウスドラッグでスクロールできる', async ({ page }) => {
    const before = await getGameState(page);
    const canvas = page.getByTestId('map-canvas');
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 100, cy - 100);
    await page.mouse.up();
    const after = await getGameState(page);
    expect(after.scrollX !== before.scrollX || after.scrollY !== before.scrollY).toBeTruthy();
  });

  test('ターン管理追加後もキーボードでスクロールできる', async ({ page }) => {
    const before = await getGameState(page);
    await page.keyboard.press('ArrowRight');
    const after = await getGameState(page);
    expect(after.scrollX).toBeGreaterThan(before.scrollX);
  });

  test('ターン管理追加後もホイールでズームできる', async ({ page }) => {
    const before = await getGameState(page);
    const canvas = page.getByTestId('map-canvas');
    const box = await canvas.boundingBox();
    await page.mouse.wheel(0, -100);
    const after = await getGameState(page);
    expect(after.scale).not.toBe(before.scale);
  });

  test('ターン管理追加後もユニット選択・移動ができる', async ({ page }) => {
    // P1ユニット1を選択
    await page.evaluate(() => window.selectUnit(1));
    let gs = await getGameState(page);
    expect(gs.selectedUnitId).toBe(1);

    // 移動
    const moved = await page.evaluate(() => window.moveUnit(1, 2, 3));
    expect(moved).toBe(true);
    gs = await getGameState(page);
    const u1 = gs.units.find(u => u.id === 1);
    expect(u1.col).toBe(2);
    expect(u1.row).toBe(3);
  });

  test('ターン管理追加後もミニマップが正常に動作する', async ({ page }) => {
    const miniMap = page.getByTestId('mini-map-canvas');
    await expect(miniMap).toBeVisible();
    const box = await miniMap.boundingBox();
    // ミニマップクリックでスクロール変更
    const before = await getGameState(page);
    await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.8);
    const after = await getGameState(page);
    expect(after.scrollX !== before.scrollX || after.scrollY !== before.scrollY).toBeTruthy();
  });
});
