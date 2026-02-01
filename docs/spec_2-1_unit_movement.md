# 仕様書: 2-1 ユニット移動

## 1. 概要

プレイヤーが戦略マップ上でユニットを選択し、地形コストに基づいた移動範囲の確認と移動操作を行うための機能。ユニットタイプ（一般・水陸両用・艦船）ごとに異なる移動コストを計算し、到達可能なタイルをハイライト表示する。プレイヤーはハイライトされたタイルをクリックすることでユニットを移動させる。

**この仕様の範囲**: マップ上へのユニット描画、ユニット選択、移動範囲計算・表示、移動実行、移動コストデータ、ターン内移動済み管理、ミニマップ上のユニット表示

**範囲外**: ユニットの全パラメータ管理（4-1）、敵ユニットとの遭遇時の戦闘処理（3-1）、艦船への搭載・発進（2-2）、マップ射撃（2-3）、ユニット生産（5-1）、ターン進行処理（7-1）、占領処理（1-2）

**対応デバイス**: PC（マウス・キーボード）、モバイル（タッチ操作）

**使用技術**: HTML5 Canvas、JavaScript（バニラ）、Google Fonts（DotGothic16）

**設定ファイル**: 定数値はすべて `src/config/` 配下のJSONファイルに外出し。本仕様書では具体値を記載せず、JSONキー名で参照する。

| JSONファイル | 本仕様での主な参照内容 |
|---|---|
| `src/config/ui_theme.json` | ユニット色・ハイライト色・フォールバック表示色 |
| `src/config/map_settings.json` | スプライト描画比率・移動アニメーション速度・フォールバック半径 |
| `src/config/terrains.json` | 移動コストテーブル・特殊コスト定数 |
| `src/config/map_sample.json` | サンプルユニット配置データ |

## 2. 画面レイアウト等の補足資料等の関連資料

### 2.1 モックアップ

- [マップ表示モックアップHTML（1-1ベース）](mockups/spec_1-1_map_display.html)

### 2.2 参照ドキュメント

- [機能一覧](spec_list.md)
- [1-1 マップ表示仕様書](spec_1-1_map_display.md)
- [旧仕様書（移動コスト表）](capsule_senki_spec_old.md)
- [旧ユニット仕様書](capsule_senki_units_old.md)

### 2.3 アセット

- **ユニットスプライト画像**: `map_settings.json > unitSprite.assetBasePath` 配下のGIFファイル（各24x32px）
  - 命名規則: `{ユニット名}{軍色}btlf.gif`（正面画像をマップ表示に使用）
  - 軍色: `b` = P1（青軍）、`r` = P2（赤軍）
- **地形タイル画像**: `assets/terrain/` 配下（1-1で定義済み）

## 3. 機能詳細

### 3.1 画面要素

1-1 マップ表示の画面要素に加え、以下の要素を追加する。

#### 3.1.1 ユニットスプライト（マップ上）

| 項目 | 参照 |
|------|-----|
| 元画像サイズ | 24x32px |
| 描画方法 | タイルの中央に配置し、タイルサイズに収まるよう縮小描画 |
| 描画サイズ（幅） | tileScaledSize × `map_settings.json > unitSprite.drawRatio.width` |
| 描画サイズ（高さ） | tileScaledSize × `map_settings.json > unitSprite.drawRatio.height` |
| 描画位置 | タイル中央に水平・垂直ともにセンタリング |
| レンダリング | `image-rendering: pixelated` でドット絵のシャープさを保持 |
| 画像未取得時 | フォールバック表示（後述） |

**フォールバック表示**（スプライト画像がないユニット）:

| 項目 | 参照 |
|------|-----|
| 形状 | 円形（直径 = tileScaledSize × `map_settings.json > unitSprite.fallbackRadius` × 2） |
| 背景色（P1） | `ui_theme.json > colors.player1.primary` |
| 背景色（P2） | `ui_theme.json > colors.player2.primary` |
| 枠線色 | `ui_theme.json > colors.unitFallback.stroke` |
| 枠線幅 | `ui_theme.json > colors.unitFallback.strokeWidth` |
| テキスト | ユニット名の先頭1文字、`ui_theme.json > colors.unitFallback.text` 色、太字 |

**移動済みユニット**:

| 項目 | 参照 |
|------|-----|
| 表示 | スプライト全体の不透明度を `map_settings.json > unitSprite.movedOpacity` に変更 |
| 効果 | 未移動ユニットと視覚的に区別可能にする |

#### 3.1.2 ユニット選択表示

| 項目 | 参照 |
|------|-----|
| 枠線色 | `ui_theme.json > colors.highlight.unitSelection.stroke` |
| 枠線幅 | `ui_theme.json > colors.highlight.unitSelection.lineWidth` |
| 点滅 | `map_settings.json > animation.blinkInterval` ごとに表示/非表示を切り替え（1-1タイル選択と同じ間隔） |
| 塗り | `ui_theme.json > colors.highlight.unitSelection.fill` |

#### 3.1.3 移動範囲ハイライト

| 項目 | 参照 |
|------|-----|
| 移動可能タイル（空きタイル） | 塗り・枠・線幅は `ui_theme.json > colors.highlight.moveRange` を参照 |
| 移動可能タイル（敵ユニットあり） | 塗り・枠・線幅は `ui_theme.json > colors.highlight.attackRange` を参照 |

#### 3.1.4 ミニマップ上のユニット表示

| 項目 | 参照 |
|------|-----|
| P1ユニット | `ui_theme.json > colors.player1.primary` のドット |
| P2ユニット | `ui_theme.json > colors.player2.primary` のドット |
| ドットサイズ | ミニマップのタイルサイズ（= miniMapWidth / MAP_COLS）を基準に最低2px |

### 3.2 処理ロジック

#### 3.2.1 描画順序

マップ描画処理（1-1の3.2.1）を拡張し、以下の順序で描画する。

1. Canvas全体をクリア
2. 地形タイルを描画（既存）
3. グリッド線を描画（既存）
4. **移動範囲ハイライトを描画**（新規: ユニット選択時のみ）
5. **ユニットスプライトを描画**（新規）
6. ホバーハイライトを描画（既存）
7. **ユニット選択ハイライトを描画**（新規: ユニット選択時のみ）

#### 3.2.2 ユニット選択処理

**状態遷移**:

```
idle → (自軍未移動ユニットをクリック) → unitSelected
unitSelected → (移動可能タイルをクリック) → 移動実行 → idle
unitSelected → (選択中ユニットをクリック) → idle（選択解除）
unitSelected → (別の自軍未移動ユニットをクリック) → unitSelected（選択切替）
unitSelected → (移動範囲外をクリック) → idle（選択解除）
unitSelected → (Escapeキー押下) → idle（選択解除）
```

**クリック判定の優先順位**:

1. クリックしたタイルに自軍の未移動ユニットがいる → ユニットを選択
2. ユニットが選択済みで、クリックしたタイルが移動可能範囲内 → 移動実行
3. それ以外 → 選択解除

**ドラッグ操作との区別**:
- 1-1と同様、マウスは `map_settings.json > scroll.dragThreshold.mouse` px以下、タッチは `scroll.dragThreshold.touch` px以下の場合のみクリック判定
- ドラッグ操作中はユニット選択・移動を行わない

#### 3.2.3 移動範囲計算

ダイクストラ法により、選択ユニットの位置から到達可能なすべてのタイルを計算する。

**アルゴリズム**:

```
function calculateMovementRange(unit, mapData, units):
  reachable = {}  // {`${col},${row}`: remainingMV}
  queue = PriorityQueue()  // (cost, col, row) の最小ヒープ
  queue.push(0, unit.col, unit.row)

  while queue is not empty:
    (cost, col, row) = queue.pop()
    key = `${col},${row}`

    if key in reachable:
      continue

    reachable[key] = unit.mv - cost

    for each (ncol, nrow) in 上下左右の隣接タイル:
      if (ncol, nrow) がマップ範囲外:
        continue
      terrain = mapData[nrow][ncol]
      moveCost = getMovementCost(terrain, unit.type)

      if moveCost == COST_BLOCKED:
        continue  // 進入不可
      if moveCost == COST_ALL:
        // 全消費: 残り移動力が1以上なら到達可能（ただし先には進めない）
        if cost < unit.mv:
          nkey = `${ncol},${nrow}`
          if nkey not in reachable:
            reachable[nkey] = 0
        continue

      newCost = cost + moveCost
      if newCost <= unit.mv:
        queue.push(newCost, ncol, nrow)

  // ユニット起点を除外
  delete reachable[`${unit.col},${unit.row}`]

  // 自軍ユニットが占有するタイルを移動先から除外（通過は可能）
  for each friendlyUnit in 自軍ユニット:
    delete reachable[`${friendlyUnit.col},${friendlyUnit.row}`]

  return reachable
```

**移動方向**: 上下左右の4方向のみ（斜め移動は不可）

**自軍ユニットの扱い**:
- 自軍ユニットが占有するタイルは移動先として選択不可
- ただし、経路計算上は通過可能（通り抜けできる）

**敵ユニットの扱い**:
- 敵ユニットが占有するタイルは移動先として選択可能
- 移動先に敵がいる場合、戦闘が発生する（戦闘処理自体は3-1で実装。本仕様ではスタブとしてコンソールログ出力のみ）

#### 3.2.4 移動コスト取得

```
function getMovementCost(terrainId, unitType):
  return MOVEMENT_COST_TABLE[terrainId][unitType]
```

移動コストテーブルは `terrains.json > movementCost.table` を参照。特殊コスト定数は `terrains.json > movementCost.specialCosts` を参照。

#### 3.2.5 移動実行処理

1. ダイクストラ法で起点から目標タイルまでの最短コスト経路を算出する（3.2.10参照）
2. 選択ユニットの位置（col, row）を移動先のタイル座標に更新（データは即時反映）
3. 選択ユニットの `moved` フラグを `true` に設定
4. 経路に沿った移動アニメーションを開始する（3.2.10参照）
5. 選択状態を解除（`selectedUnitId = -1`、移動範囲をクリア）
6. マップを再描画（アニメーション中は経路上の補間位置にユニットを描画）

**移動先に敵ユニットがいる場合**（3-1実装前のスタブ動作）:
- コンソールに `"Battle: {自軍ユニット名} vs {敵ユニット名}"` を出力
- 移動は実行する（同じタイルに移動）
- 将来的に3-1で戦闘画面への遷移に置き換える

#### 3.2.6 ユニット描画処理

**メインマップ上の描画**:

```
for each unit in units:
  // 画面外のユニットは描画スキップ
  if unit が視野外:
    continue

  pixelX = unit.col × tileScaledSize - scrollX
  pixelY = unit.row × tileScaledSize - scrollY

  if unit.spriteImage が読み込み済み:
    spriteW = tileScaledSize × unitSprite.drawRatio.width  // map_settings.json参照
    spriteH = tileScaledSize × unitSprite.drawRatio.height // map_settings.json参照
    drawX = pixelX + (tileScaledSize - spriteW) / 2
    drawY = pixelY + (tileScaledSize - spriteH) / 2

    if unit.moved:
      ctx.globalAlpha = unitSprite.movedOpacity  // map_settings.json参照
    ctx.drawImage(unit.spriteImage, drawX, drawY, spriteW, spriteH)
    ctx.globalAlpha = 1.0
  else:
    // フォールバック: 色付き円 + 頭文字
    drawUnitFallback(ctx, pixelX, pixelY, tileScaledSize, unit)
```

**ミニマップ上の描画**:

```
for each unit in units:
  dotX = unit.col × (miniMapWidth / MAP_COLS)
  dotY = unit.row × (miniMapHeight / MAP_ROWS)
  dotSize = max(miniMapWidth / MAP_COLS, 2)
  color = unit.player === 1 ? colors.player1.primary : colors.player2.primary  // ui_theme.json参照
  fillRect(dotX, dotY, dotSize, dotSize, color)
```

#### 3.2.7 ホバー時ユニット情報表示

マウスホバー中のタイルにユニットがいる場合、地形情報オーバーレイ（1-1の3.2.6）にユニット情報を追加表示する。

表示書式: `(col, row) | 地形名 | ユニット名 [HP] MV:移動力`

例: `(5, 3) | 平野 | ZAKU [100%] MV:4`

ユニットがいない場合は従来通り地形情報のみ表示。

#### 3.2.8 スプライト画像読み込み処理

- ユニットデータ初期化時に、各ユニットの正面スプライト画像を非同期で読み込む
- ファイルパス: `{map_settings.json > unitSprite.assetBasePath}{ユニット名小文字}{軍色}btlf.gif`
- 読み込み失敗時は `null` をセットし、フォールバック描画を使用
- 1-1の地形画像と同様、`onload`/`onerror` でカウントし全画像完了後に初期描画

#### 3.2.10 移動アニメーション

ユニットの移動実行時、起点から目標タイルまでの最短コスト経路に沿って1マスずつ離散的に移動するアニメーションを表示する。

**アニメーション仕様:**

| 項目 | 参照 |
|------|-----|
| 移動速度 | `map_settings.json > animation.moveSpeed`（1タイルあたりのms。テスト用に変更可能） |
| 移動方式 | マス単位の離散移動（タイル間の補間なし、1マスずつジャンプ） |
| アニメーション中の操作 | ユニット選択・移動操作・Escape解除を無効化 |

**経路計算:**

ダイクストラ法で最短コスト経路を算出し、親ポインタを逆順にたどって起点から目標までの経路配列を構築する。経路配列は `[{col, row}, ...]` の形式で、最初の要素が起点、最後の要素が目標タイル。

**描画:**

アニメーション中は、ユニットのデータ上の位置（col, row）ではなく、経路上の現在ステップのタイル座標にユニットスプライトを描画する。ユニットは常にタイルの整数座標に描画され、タイル間の中間位置には描画されない。

**状態:**

| 変数 | 型 | 初期値 | 説明 |
|------|-----|--------|------|
| isAnimating | boolean | false | アニメーション中かどうか |
| animatingUnitId | number | -1 | アニメーション中のユニットID |
| animationPath | Array | [] | アニメーション経路 `[{col, row}, ...]` |

**注意:** `window.moveUnit()` テスト関数はアニメーションなしの即時移動を維持する。

#### 3.2.9 ターンリセット処理

ターン開始時にすべてのユニットの `moved` フラグを `false` にリセットする。

**注意**: 本仕様ではターン進行UIは実装しない（7-1の範囲）。テスト用に `window.resetTurn()` 関数を公開し、テストコードからターンリセットを呼び出せるようにする。

### 3.3 データ設計

#### 3.3.1 ユニットデータ構造

**データ取得元**: `src/config/map_sample.json > units` 配列（将来的にはGASからの読み込みに変更予定）

```javascript
// ユニット定義（マップ移動に必要な最小データ）
const unit = {
  id: number,          // ユニット固有ID（1始まり）
  player: number,      // 所属プレイヤー (1 or 2)
  type: string,        // ユニットタイプ ('general' | 'amphibious' | 'ship')
  name: string,        // ユニット名（例: 'ZAKU', 'ZGOK', 'MOUSAI'）
  col: number,         // マップ上の列位置（0始まり）
  row: number,         // マップ上の行位置（0始まり）
  mv: number,          // 移動力
  moved: boolean,      // このターン移動済みかどうか
  hp: number,          // 現在HP（0〜100、パーセンテージ）
  spriteImage: Image|null  // 読み込み済みスプライト画像（またはnull）
};
```

| フィールド | 型 | 制約 |
|------------|-----|------|
| id | number | 正の整数、全ユニットで一意 |
| player | number | 1 または 2 |
| type | string | `'general'`, `'amphibious'`, `'ship'` のいずれか |
| name | string | 英大文字のユニット名 |
| col | number | 0 〜 MAP_COLS-1 |
| row | number | 0 〜 MAP_ROWS-1 |
| mv | number | 1 以上の正の整数 |
| moved | boolean | 初期値 `false`、移動後 `true` |
| hp | number | 0 〜 100 |
| spriteImage | Image\|null | 画像読み込み成功時はImageオブジェクト、失敗時はnull |

#### 3.3.2 サンプルユニットデータ

テスト・開発用のサンプルユニットは `src/config/map_sample.json > units` 配列を参照。

#### 3.3.3 移動コスト表

**データ取得元**: `src/config/terrains.json > movementCost`

**特殊コスト定数**: `terrains.json > movementCost.specialCosts` を参照。

| 定数 | JSONキー | 意味 |
|------|-----|------|
| `COST_ALL` | `specialCosts.COST_ALL` | 全消費: 残移動力をすべて消費して進入可能 |
| `COST_BLOCKED` | `specialCosts.COST_BLOCKED` | 進入不可 |

**移動コストテーブル**: `terrains.json > movementCost.table` を参照。地形IDをキー、ユニットタイプ（general/amphibious/ship）をサブキーとするコスト値の辞書。

#### 3.3.4 操作モード状態

| 変数 | 型 | 初期値 | 説明 |
|------|-----|--------|------|
| selectedUnitId | number | -1 | 選択中のユニットID（-1で未選択） |
| movementRange | object | {} | 移動可能タイルの辞書。キー: `"col,row"`、値: 残り移動力 |
| currentPlayer | number | 1 | 現在の操作プレイヤー（1 or 2） |
| isAnimating | boolean | false | 移動アニメーション中かどうか |
| animatingUnitId | number | -1 | アニメーション中のユニットID |
| animationPath | Array | [] | アニメーション経路 `[{col, row}, ...]` |

### 3.4 テスト用インターフェース

#### 3.4.1 実装ファイルパス

- `src/index.html` — マップ表示のメインページ（1-1から拡張）

#### 3.4.2 data-testid 属性

1-1で定義済みの `data-testid` に加え、以下を追加する。

| data-testid | 対象要素 |
|---|---|
| `unit-info` | ホバー時のユニット情報テキスト（地形オーバーレイ内） |

#### 3.4.3 グローバル状態オブジェクト（window.gameState 拡張）

1-1の `window.gameState` に以下のプロパティを追加する。

```javascript
window.gameState = {
  // --- 1-1 既存プロパティ ---
  scale, scrollX, scrollY, selectedCol, selectedRow,
  hoverCol, hoverRow, MAP_COLS, MAP_ROWS, TILE_SIZE,
  MIN_SCALE, MAX_SCALE, SCROLL_SPEED,

  // --- 2-1 追加プロパティ ---
  units: Array,             // 全ユニット配列
  selectedUnitId: number,   // 選択中のユニットID（-1で未選択）
  movementRange: Object,    // 移動可能タイル辞書 {"col,row": remainingMV}
  currentPlayer: number,    // 現在の操作プレイヤー
  MOVEMENT_COST_TABLE: Object,  // 移動コストテーブル
  COST_ALL: number,         // 全消費定数
  COST_BLOCKED: number,     // 進入不可定数
  isAnimating: boolean,     // 移動アニメーション中かどうか
  animatingUnitId: number,  // アニメーション中のユニットID
  animationPath: Array,     // アニメーション経路 [{col, row}, ...]
};
```

#### 3.4.4 グローバル関数

テストコードから操作するため、以下の関数を `window` に公開する。

| 関数名 | 引数 | 戻り値 | 説明 |
|--------|------|--------|------|
| `window.resetTurn()` | なし | void | 全ユニットの `moved` を `false` にリセット |
| `window.selectUnit(unitId)` | number | void | 指定IDのユニットを選択し移動範囲を計算 |
| `window.moveUnit(unitId, col, row)` | number, number, number | boolean | 指定ユニットを指定座標に移動。成功時true |
| `window.getUnitAt(col, row)` | number, number | object\|null | 指定座標のユニットを取得 |
| `window.calculateMovementRange(unitId)` | number | object | 指定ユニットの移動可能タイル辞書を返す |
| `window.setAnimationSpeed(ms)` | number | void | 移動アニメーション速度を設定（0で即時移動） |
| `window.waitForAnimation()` | なし | Promise | アニメーション完了を待つ。アニメーション中でなければ即resolve |
| `window.getAnimatingUnitDrawPos()` | なし | object\|null | アニメーション中のユニットの現在描画位置 `{col, row}` を返す。アニメーション中でなければnull |

## 4. 非機能要件

- **描画性能**: ユニット描画を追加しても60fpsを維持すること。視野外のユニットは描画スキップする
- **移動範囲計算**: ユニット選択時の移動範囲計算は16ms以内に完了すること（25x25マップ想定）
- **スプライト描画**: `image-rendering: pixelated` を適用し、ドット絵のシャープさを保持すること
- **既存機能との互換**: 1-1のマップ操作（スクロール、ズーム、ミニマップ）が引き続き正常動作すること

## 5. 考慮事項・制限事項

- **戦闘処理はスタブ**: 敵ユニットへの移動時、戦闘画面への遷移は行わない。コンソールログ出力のみ。戦闘処理は3-1で実装する
- **搭載システムは範囲外**: 艦船へのユニット搭載・発進は2-2で実装する。本仕様では艦船も通常ユニットと同じ移動処理のみ
- **ターン進行UIは範囲外**: ターン開始/終了ボタンやターン切替処理は7-1で実装する。本仕様ではテスト用の `resetTurn()` 関数で代替する
- **操作プレイヤーは固定**: 本仕様では `currentPlayer = 1` 固定で実装する。プレイヤー切替は7-1で対応する
- **ユニットデータは設定JSON**: `src/config/map_sample.json` にサンプルユニットを定義する。GASからの動的読み込みは将来対応
- **スプライト未収集ユニット**: スプライト画像がないユニットはフォールバック表示（色付き円＋頭文字）で代替する
- **移動アニメーション**: `map_settings.json > animation.moveSpeed` のマス単位離散移動アニメーションで移動を表示する。データ（col, row）は即時更新し、描画のみアニメーション。タイル間の補間は行わず、1マスずつジャンプする
- **1タイル1ユニット**: 同一タイルに複数のユニットは配置できない（艦船搭載は2-2で扱う）

## 6. テスト方針

### テスト観点

- **正常系**: ユニット選択、移動範囲表示、移動実行が仕様通りに動作すること
- **移動コスト**: 3種のユニットタイプごとに各地形の移動コストが正しく計算されること
- **境界値**: 移動力ちょうどで到達可能なタイル、マップ端のユニット、移動力0
- **異常系**: 進入不可地形、自軍ユニット上への移動、移動済みユニットの再移動、マップ範囲外
- **描画**: ユニットスプライトが正しく表示されること、移動済みユニットが半透明表示されること
- **既存機能との共存**: スクロール、ズーム、ホバーなどの1-1機能が引き続き動作すること

### テスト手法

- **Playwright UIテスト**: ページ表示、ユニット描画確認、クリック操作による選択・移動、gameState検証
- **gameState検証**: `window.gameState` を通じて内部状態（ユニット位置、選択状態、移動範囲）をプログラム的に検証
- **グローバル関数テスト**: `window.calculateMovementRange()` 等のテスト用関数を直接呼び出してロジック検証

### テストデータ

- `src/config/map_sample.json` のサンプルユニットデータを使用
- 25x25マップ（1-1と同じサンプルマップ）上に配置
- 地形バリエーション（宇宙、平野、森林、水中、大気圏、火山、ブラックホール等）が移動範囲に影響する配置

## 7. テスト項目

### ユニット表示

- マップ上にP1ユニット（青系）が表示される
- マップ上にP2ユニット（赤系）が表示される
- ユニットスプライトがタイルの中央に描画される
- ユニットスプライトがズーム倍率に応じてスケーリングされる
- スプライト画像がないユニットがフォールバック表示（色付き円＋頭文字）で表示される
- 移動済みユニットが半透明（`map_settings.json > unitSprite.movedOpacity`）で表示される
- ミニマップ上にP1ユニットが `ui_theme.json > colors.player1.primary` のドットで表示される
- ミニマップ上にP2ユニットが `ui_theme.json > colors.player2.primary` のドットで表示される

### ユニット選択

- 自軍ユニットをクリックすると選択状態になる（selectedUnitIdが更新される）
- 選択中ユニットに点滅枠が表示される
- 選択中ユニットをもう一度クリックすると選択が解除される
- 別の自軍ユニットをクリックすると選択が切り替わる
- 敵軍ユニットをクリックしても選択されない
- 移動済みの自軍ユニットをクリックしても選択されない
- 空タイルをクリックすると選択が解除される
- Escapeキーで選択が解除される
- ドラッグ操作ではユニットが選択されない

### 移動範囲表示

- ユニット選択時に移動可能タイルが `ui_theme.json > colors.highlight.moveRange` でハイライトされる
- 敵ユニットがいる到達可能タイルが `ui_theme.json > colors.highlight.attackRange` でハイライトされる
- 進入不可地形（火山・ブラックホール）がハイライトされない
- 自軍ユニットが占有するタイルがハイライトされない
- 選択解除時にハイライトが消える

### 移動コスト計算（一般ユニット）

- 宇宙タイルの移動コストが `terrains.json > movementCost.table` の定義通りである
- 平野タイルの移動コストが定義通りである
- 森林タイルの移動コストが定義通りである
- アステロイドタイルの移動コストが定義通りである
- 水中タイルの移動コストが定義通りである
- 砂漠タイルの移動コストが定義通りである
- 大気圏タイルが全消費（残移動力をすべて消費）で進入可能である
- 火山タイルが進入不可である
- ブラックホールタイルが進入不可である

### 移動コスト計算（水陸両用ユニット）

- 水中タイルの移動コストが一般と異なり `terrains.json > movementCost.table` の定義通りである
- 森林タイルの移動コストが定義通りである
- アステロイドタイルの移動コストが定義通りである

### 移動コスト計算（艦船ユニット）

- 森林タイルの移動コストが一般と異なり `terrains.json > movementCost.table` の定義通りである
- アステロイドタイルの移動コストが定義通りである
- 水中タイルの移動コストが定義通りである
- 砂漠タイルの移動コストが定義通りである

### 移動範囲計算の正確性

- MV=4の一般ユニットが平野のみのエリアで4タイル先まで到達可能である
- MV=4の一般ユニットが森林を含むエリアで正しい範囲が計算される
- MV=4の水陸両用ユニットが水中エリアで有利に移動できる
- MV=4の一般ユニットが水中エリアで不利に移動する
- 大気圏に隣接するユニットが、大気圏タイルに到達可能（残移動力0）である
- 大気圏タイルから先のタイルには到達できない
- 自軍ユニットを通過して先のタイルに到達可能である
- マップ端で移動範囲がマップ外に出ない

### 移動実行

- 移動可能タイルをクリックするとユニットが移動する
- 移動後のユニット座標が更新される（gameState.units）
- 移動後にユニットのmovedフラグがtrueになる
- 移動後に選択状態が解除される
- 移動後にユニットが半透明で表示される
- 移動範囲外のタイルをクリックしても移動しない

### 敵ユニットへの移動

- 敵ユニットのいるタイルが移動範囲内にある場合ハイライトされる
- 敵ユニットのいるタイルをクリックするとユニットが移動する
- 敵ユニットへの移動時にコンソールに戦闘ログが出力される（スタブ動作）

### ホバー情報

- ユニットのいるタイルにホバーすると地形情報に加えてユニット情報が表示される
- ユニット情報にユニット名、HP、移動力が含まれる
- ユニットのいないタイルでは従来通り地形情報のみ表示される

### ターンリセット

- resetTurn()を呼び出すと全ユニットのmovedがfalseになる
- リセット後、移動済みユニットが通常の不透明度に戻る
- リセット後、再びユニットを選択・移動できる

### 移動アニメーション

- 移動実行時にisAnimatingがtrueになる
- アニメーション完了後にisAnimatingがfalseに戻る
- アニメーション完了後にユニットが目標位置に到着している
- アニメーション中のanimatingUnitIdが移動中のユニットを示す
- アニメーション経路の最初が元の位置である
- アニメーション経路の最後が目標位置である
- 経路の各ステップが前のステップと隣接している（上下左右のいずれか）
- アニメーション中にタイルクリックしてもユニットが選択されない
- アニメーション中のユニット描画位置が常にタイルの整数座標である（補間なし）
- window.moveUnit()テスト関数は即時移動（アニメーションなし）のまま動作する
- setAnimationSpeed(0)でアニメーションが即時完了する

### 既存機能との共存

- ユニット表示追加後もマウスドラッグでスクロールできる
- ユニット表示追加後もキーボードでスクロールできる
- ユニット表示追加後もホイールでズームできる
- ユニット表示追加後もミニマップが正常に動作する
- ユニット表示追加後もタイルホバーが正常に動作する
