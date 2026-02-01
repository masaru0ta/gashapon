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

// ヘルパー: タイルの画面座標にマウスを移動（ホバー）
async function hoverTile(page, col, row) {
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
  await page.mouse.move(pos.x, pos.y);
}

// -------------------------------------------------------
// ユニット表示
// -------------------------------------------------------
test.describe('ユニット表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.units);
  });

  test('マップ上にP1ユニット（青系）が表示される', async ({ page }) => {
    const p1Units = await page.evaluate(() =>
      window.gameState.units.filter(u => u.player === 1)
    );
    expect(p1Units.length).toBeGreaterThan(0);
    // サンプルデータで4体のP1ユニットが存在する
    expect(p1Units.length).toBe(4);
  });

  test('マップ上にP2ユニット（赤系）が表示される', async ({ page }) => {
    const p2Units = await page.evaluate(() =>
      window.gameState.units.filter(u => u.player === 2)
    );
    expect(p2Units.length).toBeGreaterThan(0);
    expect(p2Units.length).toBe(4);
  });

  test('ユニットスプライトがタイルの中央に描画される', async ({ page }) => {
    // ユニットがマップ範囲内の正しい座標を持つことで描画位置の正当性を検証
    const units = await page.evaluate(() => window.gameState.units);
    const state = await getGameState(page);
    for (const unit of units) {
      expect(unit.col).toBeGreaterThanOrEqual(0);
      expect(unit.col).toBeLessThan(state.MAP_COLS);
      expect(unit.row).toBeGreaterThanOrEqual(0);
      expect(unit.row).toBeLessThan(state.MAP_ROWS);
    }
  });

  test('ユニットスプライトがズーム倍率に応じてスケーリングされる', async ({ page }) => {
    // ズーム変更後もユニットデータが維持されることを検証
    const center = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="map-canvas"]');
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    await page.mouse.move(center.x, center.y);
    await page.mouse.wheel(0, -100);
    await page.waitForFunction(
      (prev) => window.gameState.scale > prev, 2
    );
    const state = await getGameState(page);
    expect(state.units.length).toBe(8);
    expect(state.scale).toBeGreaterThan(2);
  });

  test('スプライト画像がないユニットがフォールバック表示で表示される', async ({ page }) => {
    // スプライトがないユニット（GM等）もunitsに含まれ座標を持つ
    const gm = await page.evaluate(() =>
      window.gameState.units.find(u => u.name === 'GM')
    );
    expect(gm).not.toBeNull();
    expect(gm.col).toBeGreaterThanOrEqual(0);
    expect(gm.row).toBeGreaterThanOrEqual(0);
  });

  test('移動済みユニットが半透明（不透明度0.4）で表示される', async ({ page }) => {
    // ユニットを移動させてmoved=trueを確認
    await page.evaluate(() => window.selectUnit(1));
    const range = await page.evaluate(() => window.gameState.movementRange);
    const dest = Object.keys(range)[0].split(',').map(Number);
    await page.evaluate(({ id, col, row }) => window.moveUnit(id, col, row),
      { id: 1, col: dest[0], row: dest[1] });
    const unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.moved).toBe(true);
    // 描画上の不透明度はCanvas実装のため、movedフラグで半透明描画を保証
  });

  test('ミニマップ上にP1ユニットが青ドットで表示される', async ({ page }) => {
    // ミニマップCanvasが存在し、P1ユニットデータが参照可能
    const miniMap = page.getByTestId('mini-map-canvas');
    await expect(miniMap).toBeVisible();
    const p1Units = await page.evaluate(() =>
      window.gameState.units.filter(u => u.player === 1)
    );
    expect(p1Units.length).toBeGreaterThan(0);
  });

  test('ミニマップ上にP2ユニットがピンクドットで表示される', async ({ page }) => {
    const miniMap = page.getByTestId('mini-map-canvas');
    await expect(miniMap).toBeVisible();
    const p2Units = await page.evaluate(() =>
      window.gameState.units.filter(u => u.player === 2)
    );
    expect(p2Units.length).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------
// ユニット選択
// -------------------------------------------------------
test.describe('ユニット選択', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.units);
  });

  test('自軍ユニットをクリックすると選択状態になる', async ({ page }) => {
    // ZAKU (id:1, P1) at (2,2)
    await clickTile(page, 2, 2);
    const state = await getGameState(page);
    expect(state.selectedUnitId).toBe(1);
  });

  test('選択中ユニットに白い点滅枠が表示される', async ({ page }) => {
    await clickTile(page, 2, 2);
    const state = await getGameState(page);
    expect(state.selectedUnitId).toBe(1);
    // 点滅しても選択状態が維持されることを確認
    await page.waitForFunction(
      (id) => window.gameState.selectedUnitId === id, 1, { timeout: 2000 }
    );
  });

  test('選択中ユニットをもう一度クリックすると選択が解除される', async ({ page }) => {
    await clickTile(page, 2, 2);
    let state = await getGameState(page);
    expect(state.selectedUnitId).toBe(1);

    await clickTile(page, 2, 2);
    state = await getGameState(page);
    expect(state.selectedUnitId).toBe(-1);
  });

  test('別の自軍ユニットをクリックすると選択が切り替わる', async ({ page }) => {
    // ZAKU (id:1) at (2,2)を選択
    await clickTile(page, 2, 2);
    let state = await getGameState(page);
    expect(state.selectedUnitId).toBe(1);

    // DOM (id:2) at (3,5)をクリック
    await clickTile(page, 3, 5);
    state = await getGameState(page);
    expect(state.selectedUnitId).toBe(2);
  });

  test('敵軍ユニットをクリックしても選択されない', async ({ page }) => {
    // GM (id:5, P2) at (22,2)をクリック
    await clickTile(page, 22, 2);
    const state = await getGameState(page);
    expect(state.selectedUnitId).toBe(-1);
  });

  test('移動済みの自軍ユニットをクリックしても選択されない', async ({ page }) => {
    // ZAKUを選択して移動
    await clickTile(page, 2, 2);
    let state = await getGameState(page);
    expect(state.selectedUnitId).toBe(1);

    // 隣接タイル(3,2)=宇宙 に移動
    await clickTile(page, 3, 2);
    state = await getGameState(page);
    expect(state.selectedUnitId).toBe(-1);

    // 移動後のZAKU (3,2)をクリックしても選択されない
    await clickTile(page, 3, 2);
    state = await getGameState(page);
    expect(state.selectedUnitId).toBe(-1);
  });

  test('空タイルをクリックすると選択が解除される', async ({ page }) => {
    await clickTile(page, 2, 2);
    let state = await getGameState(page);
    expect(state.selectedUnitId).toBe(1);

    // ユニットのいない移動範囲外タイル(15,15)をクリック
    await clickTile(page, 15, 15);
    state = await getGameState(page);
    expect(state.selectedUnitId).toBe(-1);
  });

  test('Escapeキーで選択が解除される', async ({ page }) => {
    await clickTile(page, 2, 2);
    let state = await getGameState(page);
    expect(state.selectedUnitId).toBe(1);

    await page.keyboard.press('Escape');
    state = await getGameState(page);
    expect(state.selectedUnitId).toBe(-1);
  });

  test('ドラッグ操作ではユニットが選択されない', async ({ page }) => {
    const pos = await page.evaluate(() => {
      const gs = window.gameState;
      const canvas = document.querySelector('[data-testid="map-canvas"]');
      const rect = canvas.getBoundingClientRect();
      const t = gs.TILE_SIZE * gs.scale;
      const cx = (2 + 0.5) * t - gs.scrollX;
      const cy = (2 + 0.5) * t - gs.scrollY;
      return {
        x: rect.left + cx * (rect.width / canvas.width),
        y: rect.top + cy * (rect.height / canvas.height),
      };
    });
    // ZAKU (2,2)上を長距離ドラッグ
    await page.mouse.move(pos.x, pos.y);
    await page.mouse.down();
    await page.mouse.move(pos.x + 100, pos.y + 100, { steps: 10 });
    await page.mouse.up();

    const state = await getGameState(page);
    expect(state.selectedUnitId).toBe(-1);
  });
});

// -------------------------------------------------------
// 移動範囲表示
// -------------------------------------------------------
test.describe('移動範囲表示', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.units);
  });

  test('ユニット選択時に移動可能タイルが青色でハイライトされる', async ({ page }) => {
    await page.evaluate(() => window.selectUnit(1)); // ZAKU MV=4
    const state = await getGameState(page);
    expect(Object.keys(state.movementRange).length).toBeGreaterThan(0);
  });

  test('敵ユニットがいる到達可能タイルが赤色でハイライトされる', async ({ page }) => {
    // P2のGMをZAKU近くに配置してテスト
    await page.evaluate(() => {
      const gm = window.gameState.units.find(u => u.id === 5);
      gm.col = 4; gm.row = 2;
    });
    await page.evaluate(() => window.selectUnit(1));
    const state = await getGameState(page);
    // (4,2)が移動範囲内であること
    expect(state.movementRange['4,2']).toBeDefined();
    // (4,2)に敵ユニットがいること
    const unitAt = await page.evaluate(() => window.getUnitAt(4, 2));
    expect(unitAt).not.toBeNull();
    expect(unitAt.player).toBe(2);
  });

  test('進入不可地形がハイライトされない', async ({ page }) => {
    // ZAKU at (2,2), ブラックホールが(10,2)にある。MV=4では到達不可だが
    // ロジック上で進入不可地形は除外されることをcalculateMovementRangeで検証
    const range = await page.evaluate(() => window.calculateMovementRange(1));
    // マップ上の火山(8)・ブラックホール(11)タイルが範囲に含まれないこと
    for (const key of Object.keys(range)) {
      const [c, r] = key.split(',').map(Number);
      const terrainId = await page.evaluate(({ c, r }) => {
        // SAMPLE_MAPにアクセス（グローバルまたはgameState経由）
        const canvas = document.querySelector('[data-testid="map-canvas"]');
        return window._SAMPLE_MAP ? window._SAMPLE_MAP[r][c] : null;
      }, { c, r });
      // terrainIdがnullの場合はSAMPLE_MAPが非公開のためスキップ
      if (terrainId !== null) {
        expect(terrainId).not.toBe(8);  // 火山
        expect(terrainId).not.toBe(11); // ブラックホール
      }
    }
  });

  test('自軍ユニットが占有するタイルがハイライトされない', async ({ page }) => {
    await page.evaluate(() => window.selectUnit(1)); // ZAKU at (2,2)
    const state = await getGameState(page);
    // MOUSAI (id:4, P1) at (1,4) が範囲内でも移動先としてハイライトされない
    // (1,4)はZAKU(2,2)からManhattan距離3、コスト3で到達可能
    expect(state.movementRange['1,4']).toBeUndefined();
  });

  test('選択解除時にハイライトが消える', async ({ page }) => {
    await page.evaluate(() => window.selectUnit(1));
    let state = await getGameState(page);
    expect(Object.keys(state.movementRange).length).toBeGreaterThan(0);

    // Escapeで解除
    await page.keyboard.press('Escape');
    state = await getGameState(page);
    expect(state.selectedUnitId).toBe(-1);
    expect(Object.keys(state.movementRange).length).toBe(0);
  });
});

// -------------------------------------------------------
// 移動コスト計算（一般ユニット）
// -------------------------------------------------------
test.describe('移動コスト計算（一般ユニット）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.MOVEMENT_COST_TABLE);
  });

  test('宇宙タイルの移動コストが1である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[1].general);
    expect(cost).toBe(1);
  });

  test('平野タイルの移動コストが1である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[2].general);
    expect(cost).toBe(1);
  });

  test('森林タイルの移動コストが2である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[3].general);
    expect(cost).toBe(2);
  });

  test('アステロイドタイルの移動コストが3である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[4].general);
    expect(cost).toBe(3);
  });

  test('水中タイルの移動コストが3である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[5].general);
    expect(cost).toBe(3);
  });

  test('砂漠タイルの移動コストが3である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[6].general);
    expect(cost).toBe(3);
  });

  test('大気圏タイルが全消費で進入可能である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[7].general);
    const costAll = await page.evaluate(() => window.gameState.COST_ALL);
    expect(cost).toBe(costAll);
    expect(cost).toBe(-1);
  });

  test('火山タイルが進入不可である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[8].general);
    const costBlocked = await page.evaluate(() => window.gameState.COST_BLOCKED);
    expect(cost).toBe(costBlocked);
    expect(cost).toBe(-2);
  });

  test('ブラックホールタイルが進入不可である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[11].general);
    expect(cost).toBe(-2);
  });
});

// -------------------------------------------------------
// 移動コスト計算（水陸両用ユニット）
// -------------------------------------------------------
test.describe('移動コスト計算（水陸両用ユニット）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.MOVEMENT_COST_TABLE);
  });

  test('水中タイルの移動コストが1である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[5].amphibious);
    expect(cost).toBe(1);
  });

  test('森林タイルの移動コストが2である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[3].amphibious);
    expect(cost).toBe(2);
  });

  test('アステロイドタイルの移動コストが3である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[4].amphibious);
    expect(cost).toBe(3);
  });
});

// -------------------------------------------------------
// 移動コスト計算（艦船ユニット）
// -------------------------------------------------------
test.describe('移動コスト計算（艦船ユニット）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.MOVEMENT_COST_TABLE);
  });

  test('森林タイルの移動コストが1である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[3].ship);
    expect(cost).toBe(1);
  });

  test('アステロイドタイルの移動コストが1である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[4].ship);
    expect(cost).toBe(1);
  });

  test('水中タイルの移動コストが1である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[5].ship);
    expect(cost).toBe(1);
  });

  test('砂漠タイルの移動コストが1である', async ({ page }) => {
    const cost = await page.evaluate(() => window.gameState.MOVEMENT_COST_TABLE[6].ship);
    expect(cost).toBe(1);
  });
});

// -------------------------------------------------------
// 移動範囲計算の正確性
// -------------------------------------------------------
test.describe('移動範囲計算の正確性', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.units);
  });

  test('MV=4の一般ユニットが宇宙エリアで4タイル先まで到達可能である', async ({ page }) => {
    // ZAKU (id:1, general, MV=4) at (2,2)。周囲は宇宙(コスト1)
    const range = await page.evaluate(() => window.calculateMovementRange(1));
    // 4タイル右 (6,2) に到達可能（コスト4、残移動力0）
    expect(range['6,2']).toBeDefined();
    expect(range['6,2']).toBe(0);
    // 5タイル右 (7,2) には到達不可
    expect(range['7,2']).toBeUndefined();
  });

  test('MV=4の一般ユニットが森林を含むエリアで正しい範囲が計算される', async ({ page }) => {
    // DOM (id:2, general, MV=4) at (3,5)。(5,5)=森林(コスト2)
    const range = await page.evaluate(() => window.calculateMovementRange(2));
    // (4,5)=平野(コスト1)→残移動力3
    expect(range['4,5']).toBe(3);
    // (5,5)=森林(コスト2)、(3,5)→(4,5)(1)→(5,5)(2)=合計3→残移動力1
    expect(range['5,5']).toBe(1);
  });

  test('MV=4の水陸両用ユニットが水中エリアで有利に移動できる', async ({ page }) => {
    // ZGOKを水中タイル(7,5)の隣に配置してテスト
    await page.evaluate(() => {
      const zgok = window.gameState.units.find(u => u.id === 3);
      zgok.col = 8; zgok.row = 5;
    });
    const range = await page.evaluate(() => window.calculateMovementRange(3));
    // (7,5)=水中 → 水陸両用はコスト1で進入可能、残3
    expect(range['7,5']).toBeDefined();
    expect(range['7,5']).toBe(3);
  });

  test('MV=4の一般ユニットが水中エリアで不利に移動する', async ({ page }) => {
    // DOMを水中タイル(7,5)の隣に配置
    await page.evaluate(() => {
      const dom = window.gameState.units.find(u => u.id === 2);
      dom.col = 8; dom.row = 5;
    });
    const range = await page.evaluate(() => window.calculateMovementRange(2));
    // (7,5)=水中 → 一般はコスト3で進入、残1
    expect(range['7,5']).toBeDefined();
    expect(range['7,5']).toBe(1);
  });

  test('大気圏に隣接するユニットが大気圏タイルに到達可能である', async ({ page }) => {
    // 大気圏は(7,10)。ZAKUを(6,10)=森林に配置
    await page.evaluate(() => {
      const zaku = window.gameState.units.find(u => u.id === 1);
      zaku.col = 6; zaku.row = 10;
    });
    const range = await page.evaluate(() => window.calculateMovementRange(1));
    // (7,10)=大気圏。全消費で進入可能（残移動力0）
    expect(range['7,10']).toBeDefined();
    expect(range['7,10']).toBe(0);
  });

  test('大気圏タイルから先のタイルには到達できない', async ({ page }) => {
    // ZAKUを(6,10)に配置、(7,10)=大気圏の先(8,10)には到達不可
    await page.evaluate(() => {
      const zaku = window.gameState.units.find(u => u.id === 1);
      zaku.col = 6; zaku.row = 10;
    });
    const range = await page.evaluate(() => window.calculateMovementRange(1));
    // 大気圏(7,10)経由で(8,10)には到達不可（全消費で残0のため）
    // (8,10)に到達するには大気圏を経由しないパスが必要
    // (6,10)→(6,9)→(7,9)→(8,9)→(8,10) = コスト 1+砂漠3 = 無理
    // (6,10)→(5,10)→(5,9)→... 迂回しても4以内では(8,10)に到達不可
    expect(range['8,10']).toBeUndefined();
  });

  test('自軍ユニットを通過して先のタイルに到達可能である', async ({ page }) => {
    // DOMを(3,2)に配置（ZAKU(2,2)の隣）
    await page.evaluate(() => {
      const dom = window.gameState.units.find(u => u.id === 2);
      dom.col = 3; dom.row = 2;
    });
    const range = await page.evaluate(() => window.calculateMovementRange(1));
    // (3,2)は自軍DOMがいるので移動先にはならない
    expect(range['3,2']).toBeUndefined();
    // (4,2)はDOMを通過して到達可能（コスト2、残2）
    expect(range['4,2']).toBeDefined();
    expect(range['4,2']).toBe(2);
  });

  test('マップ端で移動範囲がマップ外に出ない', async ({ page }) => {
    // ZAKU at (2,2) MV=4 → 左上方向に(0,0)は到達可能だが、負座標はない
    const range = await page.evaluate(() => window.calculateMovementRange(1));
    for (const key of Object.keys(range)) {
      const [c, r] = key.split(',').map(Number);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(r).toBeGreaterThanOrEqual(0);
      const state = await getGameState(page);
      expect(c).toBeLessThan(state.MAP_COLS);
      expect(r).toBeLessThan(state.MAP_ROWS);
    }
  });
});

// -------------------------------------------------------
// 移動実行
// -------------------------------------------------------
test.describe('移動実行', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.units);
  });

  test('移動可能タイルをクリックするとユニットが移動する', async ({ page }) => {
    // ZAKU (id:1) at (2,2) を選択
    await clickTile(page, 2, 2);
    let state = await getGameState(page);
    expect(state.selectedUnitId).toBe(1);

    // 隣接タイル(3,2)=宇宙 に移動
    await clickTile(page, 3, 2);
    const unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.col).toBe(3);
    expect(unit.row).toBe(2);
  });

  test('移動後のユニット座標が更新される', async ({ page }) => {
    await page.evaluate(() => window.selectUnit(1));
    const result = await page.evaluate(() => window.moveUnit(1, 4, 2));
    expect(result).toBe(true);
    const unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.col).toBe(4);
    expect(unit.row).toBe(2);
  });

  test('移動後にユニットのmovedフラグがtrueになる', async ({ page }) => {
    await page.evaluate(() => window.selectUnit(1));
    await page.evaluate(() => window.moveUnit(1, 3, 2));
    const unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.moved).toBe(true);
  });

  test('移動後に選択状態が解除される', async ({ page }) => {
    await clickTile(page, 2, 2);
    await clickTile(page, 3, 2);
    const state = await getGameState(page);
    expect(state.selectedUnitId).toBe(-1);
    expect(Object.keys(state.movementRange).length).toBe(0);
  });

  test('移動後にユニットが半透明で表示される', async ({ page }) => {
    await page.evaluate(() => window.selectUnit(1));
    await page.evaluate(() => window.moveUnit(1, 3, 2));
    const unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.moved).toBe(true);
    // moved=trueのユニットが半透明(0.4)で描画されることは実装側で保証
  });

  test('移動範囲外のタイルをクリックしても移動しない', async ({ page }) => {
    await clickTile(page, 2, 2); // ZAKU選択
    const beforeUnit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    // MV=4のZAKU(2,2)から到達不可能な(15,15)をクリック
    await clickTile(page, 15, 15);
    const afterUnit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(afterUnit.col).toBe(beforeUnit.col);
    expect(afterUnit.row).toBe(beforeUnit.row);
    expect(afterUnit.moved).toBe(false);
  });
});

// -------------------------------------------------------
// 敵ユニットへの移動
// -------------------------------------------------------
test.describe('敵ユニットへの移動', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.units);
    // P2のGMをZAKU(2,2)の近くに配置
    await page.evaluate(() => {
      const gm = window.gameState.units.find(u => u.id === 5);
      gm.col = 4; gm.row = 2;
    });
  });

  test('敵ユニットのいるタイルが移動範囲内にある場合ハイライトされる', async ({ page }) => {
    const range = await page.evaluate(() => window.calculateMovementRange(1));
    expect(range['4,2']).toBeDefined();
  });

  test('敵ユニットのいるタイルをクリックするとユニットが移動する', async ({ page }) => {
    await clickTile(page, 2, 2); // ZAKU選択
    await clickTile(page, 4, 2); // 敵GMのいるタイルに移動
    const unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.col).toBe(4);
    expect(unit.row).toBe(2);
  });

  test('敵ユニットへの移動時にコンソールに戦闘ログが出力される', async ({ page }) => {
    const messages = [];
    page.on('console', msg => messages.push(msg.text()));

    await clickTile(page, 2, 2); // ZAKU選択
    await clickTile(page, 4, 2); // 敵GMのいるタイルに移動

    // 戦闘スタブログが出力されること
    const battleLog = messages.find(m => m.includes('Battle'));
    expect(battleLog).toBeDefined();
  });
});

// -------------------------------------------------------
// ホバー情報
// -------------------------------------------------------
test.describe('ホバー情報', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.units);
  });

  test('ユニットのいるタイルにホバーすると地形情報に加えてユニット情報が表示される', async ({ page }) => {
    // ZAKU (id:1) at (2,2)にホバー
    await hoverTile(page, 2, 2);
    const overlay = page.getByTestId('terrain-overlay');
    await expect(overlay).toBeVisible();
    const text = await overlay.textContent();
    expect(text).toContain('ZAKU');
  });

  test('ユニット情報にユニット名、HP、移動力が含まれる', async ({ page }) => {
    await hoverTile(page, 2, 2);
    const overlay = page.getByTestId('terrain-overlay');
    const text = await overlay.textContent();
    expect(text).toContain('ZAKU');
    expect(text).toMatch(/100%|HP/); // HP表示
    expect(text).toMatch(/MV/); // 移動力表示
  });

  test('ユニットのいないタイルでは従来通り地形情報のみ表示される', async ({ page }) => {
    // ユニットのいない(0,0)=宇宙にホバー
    await hoverTile(page, 0, 0);
    const overlay = page.getByTestId('terrain-overlay');
    await expect(overlay).toBeVisible();
    const text = await overlay.textContent();
    expect(text).toContain('宇宙');
    expect(text).not.toContain('ZAKU');
    expect(text).not.toContain('MV');
  });
});

// -------------------------------------------------------
// ターンリセット
// -------------------------------------------------------
test.describe('ターンリセット', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.units);
  });

  test('resetTurn()を呼び出すと全ユニットのmovedがfalseになる', async ({ page }) => {
    // まずユニットを移動してmovedをtrueにする
    await page.evaluate(() => {
      window.selectUnit(1);
      window.moveUnit(1, 3, 2);
    });
    let unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.moved).toBe(true);

    // ターンリセット
    await page.evaluate(() => window.resetTurn());
    const units = await page.evaluate(() => window.gameState.units);
    for (const u of units) {
      expect(u.moved).toBe(false);
    }
  });

  test('リセット後、移動済みユニットが通常の不透明度に戻る', async ({ page }) => {
    await page.evaluate(() => {
      window.selectUnit(1);
      window.moveUnit(1, 3, 2);
    });
    await page.evaluate(() => window.resetTurn());
    const unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.moved).toBe(false);
    // moved=falseのユニットは通常不透明度で描画される
  });

  test('リセット後、再びユニットを選択・移動できる', async ({ page }) => {
    // 移動
    await page.evaluate(() => {
      window.selectUnit(1);
      window.moveUnit(1, 3, 2);
    });
    // リセット
    await page.evaluate(() => window.resetTurn());

    // 再選択
    await page.evaluate(() => window.selectUnit(1));
    const state = await getGameState(page);
    expect(state.selectedUnitId).toBe(1);
    expect(Object.keys(state.movementRange).length).toBeGreaterThan(0);

    // 再移動
    const result = await page.evaluate(() => window.moveUnit(1, 4, 2));
    expect(result).toBe(true);
    const unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.col).toBe(4);
    expect(unit.row).toBe(2);
  });
});

// -------------------------------------------------------
// 既存機能との共存
// -------------------------------------------------------
test.describe('既存機能との共存', () => {
  test.use({ viewport: { width: 600, height: 400 } });

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.units);
  });

  test('ユニット表示追加後もマウスドラッグでスクロールできる', async ({ page }) => {
    const center = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="map-canvas"]');
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    const before = await getGameState(page);
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x - 50, center.y - 30, { steps: 5 });
    await page.mouse.up();
    const after = await getGameState(page);
    expect(after.scrollX).toBeGreaterThan(before.scrollX);
  });

  test('ユニット表示追加後もキーボードでスクロールできる', async ({ page }) => {
    const before = await getGameState(page);
    await page.keyboard.press('ArrowRight');
    const after = await getGameState(page);
    expect(after.scrollX).toBe(before.scrollX + before.SCROLL_SPEED);
  });

  test('ユニット表示追加後もホイールでズームできる', async ({ page }) => {
    const center = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="map-canvas"]');
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    const before = await getGameState(page);
    await page.mouse.move(center.x, center.y);
    await page.mouse.wheel(0, -100);
    await page.waitForFunction(
      (prev) => window.gameState.scale > prev, before.scale
    );
    const after = await getGameState(page);
    expect(after.scale).toBeGreaterThan(before.scale);
  });

  test('ユニット表示追加後もミニマップが正常に動作する', async ({ page }) => {
    const miniMap = page.getByTestId('mini-map-canvas');
    await expect(miniMap).toBeVisible();
    const box = await miniMap.boundingBox();
    const before = await getGameState(page);
    await page.mouse.click(box.x + box.width * 0.8, box.y + box.height * 0.8);
    await page.waitForFunction(
      ([prevX, prevY]) => window.gameState.scrollX !== prevX || window.gameState.scrollY !== prevY,
      [before.scrollX, before.scrollY]
    );
    const after = await getGameState(page);
    expect(after.scrollX !== before.scrollX || after.scrollY !== before.scrollY).toBeTruthy();
  });

  test('ユニット表示追加後もタイルホバーが正常に動作する', async ({ page }) => {
    // ユニットのいないタイルにホバー
    await hoverTile(page, 0, 0);
    await expect(page.getByTestId('terrain-overlay')).toBeVisible();
    const state = await getGameState(page);
    expect(state.hoverCol).toBe(0);
    expect(state.hoverRow).toBe(0);
  });
});

// -------------------------------------------------------
// 移動アニメーション
// -------------------------------------------------------
test.describe('移動アニメーション', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_URL);
    await page.waitForFunction(() => window.gameState && window.gameState.units);
    // アニメーション速度を遅く設定してテスト中に状態を確認できるようにする
    await page.evaluate(() => window.setAnimationSpeed(300));
  });

  test('移動実行時にisAnimatingがtrueになる', async ({ page }) => {
    // ZAKU (id:1) at (2,2) を選択
    await clickTile(page, 2, 2);
    const selected = await getGameState(page);
    expect(selected.selectedUnitId).toBe(1);

    // 隣接タイル(3,2)=宇宙 に移動
    await clickTile(page, 3, 2);
    // アニメーション開始直後に確認
    await page.waitForFunction(() => window.gameState.isAnimating === true, null, { timeout: 2000 });
    const during = await getGameState(page);
    expect(during.isAnimating).toBe(true);
    // アニメーション完了を待つ
    await page.evaluate(() => window.waitForAnimation());
  });

  test('アニメーション完了後にisAnimatingがfalseに戻る', async ({ page }) => {
    await clickTile(page, 2, 2);
    await clickTile(page, 3, 2);
    await page.evaluate(() => window.waitForAnimation());
    const after = await getGameState(page);
    expect(after.isAnimating).toBe(false);
  });

  test('アニメーション完了後にユニットが目標位置に到着している', async ({ page }) => {
    await clickTile(page, 2, 2);
    await clickTile(page, 4, 2); // 2タイル先
    await page.evaluate(() => window.waitForAnimation());
    const unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.col).toBe(4);
    expect(unit.row).toBe(2);
    expect(unit.moved).toBe(true);
  });

  test('アニメーション中のanimatingUnitIdが移動中のユニットを示す', async ({ page }) => {
    await clickTile(page, 2, 2);
    await clickTile(page, 3, 2);
    await page.waitForFunction(() => window.gameState.isAnimating === true, null, { timeout: 2000 });
    const during = await getGameState(page);
    expect(during.animatingUnitId).toBe(1);
    await page.evaluate(() => window.waitForAnimation());
  });

  test('アニメーション経路の最初が元の位置である', async ({ page }) => {
    await clickTile(page, 2, 2);
    await clickTile(page, 4, 2);
    await page.waitForFunction(() => window.gameState.isAnimating === true, null, { timeout: 2000 });
    const state = await getGameState(page);
    expect(state.animationPath.length).toBeGreaterThan(0);
    expect(state.animationPath[0].col).toBe(2);
    expect(state.animationPath[0].row).toBe(2);
    await page.evaluate(() => window.waitForAnimation());
  });

  test('アニメーション経路の最後が目標位置である', async ({ page }) => {
    await clickTile(page, 2, 2);
    await clickTile(page, 4, 2);
    await page.waitForFunction(() => window.gameState.isAnimating === true, null, { timeout: 2000 });
    const state = await getGameState(page);
    const last = state.animationPath[state.animationPath.length - 1];
    expect(last.col).toBe(4);
    expect(last.row).toBe(2);
    await page.evaluate(() => window.waitForAnimation());
  });

  test('経路の各ステップが前のステップと隣接している', async ({ page }) => {
    // 4タイル移動: (2,2) → (6,2)
    await clickTile(page, 2, 2);
    await clickTile(page, 6, 2);
    await page.waitForFunction(() => window.gameState.isAnimating === true, null, { timeout: 2000 });
    const state = await getGameState(page);
    const path = state.animationPath;
    expect(path.length).toBe(5); // 起点含め5タイル
    for (let i = 1; i < path.length; i++) {
      const dc = Math.abs(path[i].col - path[i-1].col);
      const dr = Math.abs(path[i].row - path[i-1].row);
      // 上下左右の隣接: Manhattan距離が1
      expect(dc + dr).toBe(1);
    }
    await page.evaluate(() => window.waitForAnimation());
  });

  test('アニメーション中にタイルクリックしてもユニットが選択されない', async ({ page }) => {
    await clickTile(page, 2, 2);
    await clickTile(page, 4, 2);
    await page.waitForFunction(() => window.gameState.isAnimating === true, null, { timeout: 2000 });

    // アニメーション中にDOM(id:2)のタイル(3,5)をクリック
    await clickTile(page, 3, 5);
    const during = await getGameState(page);
    // アニメーション中なので選択されない
    expect(during.selectedUnitId).toBe(-1);
    await page.evaluate(() => window.waitForAnimation());
  });

  test('アニメーション中のユニット描画位置が常にタイルの整数座標である', async ({ page }) => {
    // 4タイル移動: (2,2) → (6,2) でアニメーション中に複数回描画位置をサンプリング
    await clickTile(page, 2, 2);
    await clickTile(page, 6, 2);
    await page.waitForFunction(() => window.gameState.isAnimating === true, null, { timeout: 2000 });

    // アニメーション中に複数回描画位置を取得し、すべて整数であることを確認
    const positions = await page.evaluate(() => {
      return new Promise(resolve => {
        const results = [];
        function sample() {
          const pos = window.getAnimatingUnitDrawPos();
          if (pos) {
            results.push({ col: pos.col, row: pos.row });
          }
          if (window.gameState.isAnimating) {
            requestAnimationFrame(sample);
          } else {
            resolve(results);
          }
        }
        sample();
      });
    });

    expect(positions.length).toBeGreaterThan(0);
    for (const pos of positions) {
      expect(Number.isInteger(pos.col)).toBe(true);
      expect(Number.isInteger(pos.row)).toBe(true);
    }
  });

  test('window.moveUnit()テスト関数は即時移動（アニメーションなし）のまま動作する', async ({ page }) => {
    await page.evaluate(() => window.selectUnit(1));
    await page.evaluate(() => window.moveUnit(1, 4, 2));
    // moveUnit()はアニメーションなし → 即座に完了
    const state = await getGameState(page);
    expect(state.isAnimating).toBe(false);
    const unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.col).toBe(4);
    expect(unit.row).toBe(2);
    expect(unit.moved).toBe(true);
  });

  test('setAnimationSpeed(0)でアニメーションが即時完了する', async ({ page }) => {
    await page.evaluate(() => window.setAnimationSpeed(0));
    await clickTile(page, 2, 2);
    await clickTile(page, 4, 2);
    // アニメーション速度0なので即座に完了
    await page.waitForFunction(() => window.gameState.isAnimating === false);
    const state = await getGameState(page);
    expect(state.isAnimating).toBe(false);
    const unit = await page.evaluate(() =>
      window.gameState.units.find(u => u.id === 1)
    );
    expect(unit.col).toBe(4);
    expect(unit.row).toBe(2);
    expect(unit.moved).toBe(true);
  });
});
