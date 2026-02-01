# 仕様書: 7-1 ターン管理

## 1. 概要

ゲームのターン進行を管理する機能。ターン終了ボタンの押下によりプレイヤーのフェーズを切り替え、両プレイヤーのフェーズ完了後にターン番号をインクリメントする。ステータスバーのターン番号・フェーズ表示を動的に更新し、各プレイヤーのユニット操作権を切り替える。

**この仕様の範囲**: ターン終了UI、フェーズ進行ロジック、プレイヤー切替、ステータスバーの動的更新（ターン番号・フェーズ・IG・CT・GP・GB・T・ユニット数）、ターン開始時の自動処理フック

**範囲外**: CP収入計算（1-2で実装）、生産完了判定（5-1で実装）、回復処理（6-1で実装）、勝利条件判定（7-2で実装）

**対応デバイス**: PC（マウス・キーボード）、モバイル（タッチ操作）

**使用技術**: HTML5、JavaScript（バニラ）

**設定ファイル**: 定数値はすべて `src/config/` 配下のJSONファイルに外出し。本仕様書では具体値を記載せず、JSONキー名で参照する。

| JSONファイル | 本仕様での主な参照内容 |
|---|---|
| `src/config/ui_theme.json` | ターン終了ボタンの色・レイアウト |
| `src/config/map_settings.json` | アニメーション速度 |
| `src/config/map_sample.json` | 初期プレイヤーデータ（IG・CT等） |

## 2. 画面レイアウト等の補足資料等の関連資料

### 2.1 モックアップ

- [7-1 ターン管理 モックアップ](mockups/spec_7-1_turn_management.html)

### 2.2 参照ドキュメント

- [機能一覧](spec_list.md)
- [1-1 マップ表示仕様書](spec_1-1_map_display.md)
- [2-1 ユニット移動仕様書](spec_2-1_unit_movement.md)

### 2.3 アセット

なし（テキストベースのUI要素のみ）

## 3. 機能詳細

### 3.1 画面要素

#### 3.1.1 ターン終了バー（end-turn-bar）

ステータスバーの直下に配置するコンテナ要素。`game-container` の最下部に位置し、ターン終了ボタンを内包する。

| 項目 | 参照 |
|------|-----|
| 背景色 | `ui_theme.json > colors.statusBar.background`（ステータスバーと同色） |
| パディング | `ui_theme.json > layout.endTurnBar.padding` |

#### 3.1.2 ターン終了ボタン（end-turn-button）

ターン終了バー内に全幅で配置する。

| 項目 | 参照 |
|------|-----|
| テキスト | `ui_theme.json > labels.endTurnButton` |
| 背景色 | `ui_theme.json > colors.turnEnd.background` |
| テキスト色 | `ui_theme.json > colors.turnEnd.text` |
| ボーダー | `ui_theme.json > colors.turnEnd.border` |
| フォントサイズ | `ui_theme.json > fonts.turnEnd` |
| ホバー時背景色 | `ui_theme.json > colors.turnEnd.hoverBackground` |
| 無効時不透明度 | `ui_theme.json > colors.turnEnd.disabledOpacity` |
| パディング | `ui_theme.json > layout.turnEndButton.padding` |
| 角丸 | `ui_theme.json > layout.turnEndButton.borderRadius` |
| 幅 | `ui_theme.json > layout.turnEndButton.width` |

**状態:**
- **通常**: クリック可能。ホバーで背景色が変化する
- **無効**: アニメーション中に半透明でクリック不可

#### 3.1.3 フェーズ表示

操作中のプレイヤーに応じたフェーズテキストを表示する。

| フェーズ | 表示テキスト |
|----------|------------|
| P1のフェーズ | `P1` |
| P2のフェーズ | `P2` |

フェーズテキストの色は操作プレイヤーに応じて切り替える:
- P1フェーズ時: `ui_theme.json > colors.player1.primary`
- P2フェーズ時: `ui_theme.json > colors.player2.primary`

#### 3.1.4 ステータスバーの値表示

ステータスバーの各要素は、ゲーム状態から動的に計算・表示する。

| 要素 | data-testid | 計算方法 |
|------|-------------|----------|
| P1 IG | `p1-ig` | `players[1].ig` の値を `IG......{値}` で表示 |
| P1 CT | `p1-ct` | `players[1].ct` の値を `CT....{値}` で表示 |
| P1 GP数 | `p1-gp` | P1が所有するGPタイルの数（本仕様ではスタブ値） |
| P1 GB数 | `p1-gb` | P1が所有するGBタイルの数（本仕様ではスタブ値） |
| P1 生産中 | `p1-production` | P1の生産キュー数（本仕様ではスタブ値 `0`） |
| P1 ユニット数 | `p1-unit-count` | P1のユニット総数（`units.filter(u => u.player === 1).length`）を2桁ゼロ埋めで表示 |
| P2 IG | `p2-ig` | `players[2].ig` の値を `IG......{値}` で表示 |
| P2 CT | `p2-ct` | `players[2].ct` の値を `CT....{値}` で表示 |
| P2 GP数 | `p2-gp` | P2が所有するGPタイルの数（本仕様ではスタブ値） |
| P2 GB数 | `p2-gb` | P2が所有するGBタイルの数（本仕様ではスタブ値） |
| P2 生産中 | `p2-production` | P2の生産キュー数（本仕様ではスタブ値 `0`） |
| P2 ユニット数 | `p2-unit-count` | P2のユニット総数（`units.filter(u => u.player === 2).length`）を2桁ゼロ埋めで表示 |
| ターン番号 | `turn-number` | `turnNumber` の値 |
| フェーズ | `turn-phase` | 現在のプレイヤーに応じた `P1` / `P2` |

### 3.2 処理ロジック

#### 3.2.1 ターン構造

1ターンは2つのフェーズ（P1フェーズ → P2フェーズ）で構成される。

```
ターン1: P1フェーズ → P2フェーズ
ターン2: P1フェーズ → P2フェーズ
...
```

#### 3.2.2 フェーズ進行フロー

```
[ゲーム開始]
  ↓
[ターン1開始処理] → onTurnStart(1) コールバック
  ↓
[P1フェーズ開始] → onPhaseStart(1) コールバック
  ↓
  P1がユニットを操作
  ↓
[P1が「ターンおわり」ボタンを押す]
  ↓
[P1フェーズ終了処理] → 全ユニットのmoved解除は行わない
  ↓
[P2フェーズ開始] → onPhaseStart(2) コールバック
  ↓
  P2がユニットを操作
  ↓
[P2が「ターンおわり」ボタンを押す]
  ↓
[P2フェーズ終了処理]
  ↓
[ターン1終了] → onTurnEnd(1) コールバック
  ↓
[ターン2開始処理] → ターン番号インクリメント → 全ユニットのmovedリセット → onTurnStart(2) コールバック
  ↓
[P1フェーズ開始] → ...（繰り返し）
```

#### 3.2.3 ターン終了ボタン処理

1. アニメーション中（`isAnimating === true`）の場合は何もしない
2. ユニット選択中の場合は選択を解除
3. 現在のプレイヤーのフェーズを終了する
4. `currentPlayer` が P1 の場合:
   - `currentPlayer` を `2` に変更
   - P2の全ユニットの `moved` を `false` にリセット
   - フェーズ表示を `P2` に更新
   - `onPhaseStart(2)` コールバックを実行
5. `currentPlayer` が P2 の場合:
   - ターン終了処理を実行（`onTurnEnd` コールバック）
   - ターン番号をインクリメント
   - `currentPlayer` を `1` に変更
   - P1の全ユニットの `moved` を `false` にリセット
   - ターン開始処理を実行（`onTurnStart` コールバック）
   - フェーズ表示を `P1` に更新
   - `onPhaseStart(1)` コールバックを実行
6. ステータスバーを更新

#### 3.2.4 ステータスバー更新処理

ステータスバーの全要素を現在のゲーム状態から再計算して表示を更新する関数 `updateStatusBar()` を実装する。

```
function updateStatusBar():
  // ターン・フェーズ
  turnNumberEl.textContent = turnNumber
  turnPhaseEl.textContent = currentPlayer === 1 ? 'P1' : 'P2'
  turnPhaseEl.style.color = currentPlayer === 1
    ? colors.player1.primary
    : colors.player2.primary

  // P1情報
  p1IgEl.textContent = 'IG......' + players[1].ig
  p1CtEl.textContent = 'CT....' + players[1].ct
  p1GpEl.innerHTML = '<span class="icon-gp">GP</span>' + players[1].gp
  p1GbEl.innerHTML = '<span class="icon-gb">GB</span>' + players[1].gb
  p1ProductionEl.innerHTML = '<span class="icon-t">T</span>' + players[1].production
  p1UnitCountEl.textContent = String(p1UnitCount).padStart(2, '0')

  // P2情報（同様）
```

この関数は以下のタイミングで呼び出す:
- ゲーム初期化時
- フェーズ切替時
- ユニット移動後（ユニット数が変化する可能性があるため）
- `resetTurn()` 呼び出し時

#### 3.2.5 プレイヤー切替時のユニット操作制御

- `currentPlayer` の値に基づき、自軍ユニットの選択可否を制御する（2-1の既存ロジックが `currentPlayer` を参照しているため、値の変更だけで制御が切り替わる）
- フェーズ切替時にユニット選択状態を解除する

#### 3.2.6 コールバック関数（スタブ）

将来の他仕様との連携のため、ターン進行の各タイミングでコールバック関数を呼び出す。本仕様ではスタブ（空関数）として実装する。

| コールバック | タイミング | 将来の用途 |
|------------|----------|----------|
| `onTurnStart(turnNumber)` | ターン開始時 | 回復処理（6-1）、生産完了判定（5-1）、CP収入（1-2） |
| `onTurnEnd(turnNumber)` | ターン終了時 | 勝利条件判定（7-2） |
| `onPhaseStart(playerNumber)` | フェーズ開始時 | プレイヤー固有の開始処理 |

#### 3.2.7 ゲーム初期化

ゲーム開始時に以下の状態でターン管理を初期化する:

| 変数 | 初期値 | 説明 |
|------|--------|------|
| turnNumber | 1 | 最初のターン |
| currentPlayer | 1 | P1から開始 |

初期化時にステータスバーを更新し、`onTurnStart(1)` → `onPhaseStart(1)` の順でコールバックを実行する。

### 3.3 データ設計

#### 3.3.1 ターン管理状態

| 変数 | 型 | 初期値 | 説明 |
|------|-----|--------|------|
| turnNumber | number | 1 | 現在のターン番号 |
| currentPlayer | number | 1 | 現在の操作プレイヤー（1 or 2）※2-1で既存 |

#### 3.3.2 プレイヤーデータ

**データ取得元**: `src/config/map_sample.json > players`（新規追加）

```javascript
// プレイヤー情報
const players = {
  1: { ig: number, ct: number, gp: number, gb: number, production: number },
  2: { ig: number, ct: number, gp: number, gb: number, production: number }
};
```

| フィールド | 型 | 説明 |
|------------|-----|------|
| ig | number | 収入（Income Gain）。本仕様ではスタブ値、1-2で動的計算 |
| ct | number | 資金（Capital）。本仕様ではスタブ値、1-2で動的計算 |
| gp | number | 所有GP数。本仕様ではスタブ値、1-2で動的計算 |
| gb | number | 所有GB数。本仕様ではスタブ値、1-2で動的計算 |
| production | number | 生産キュー数。本仕様ではスタブ値 `0`、5-1で動的計算 |

#### 3.3.3 map_sample.json への追加データ

`src/config/map_sample.json` にプレイヤー初期データを追加する。

```json
{
  "map": [...],
  "units": [...],
  "players": {
    "1": { "ig": 550, "ct": 14300, "gp": 3, "gb": 2, "production": 0 },
    "2": { "ig": 1350, "ct": 2750, "gp": 3, "gb": 1, "production": 0 }
  }
}
```

#### 3.3.4 ui_theme.json への追加データ

ターン終了ボタンのスタイル定義・表示文言を追加する。

`colors.turnEnd`:
```json
{
  "background": "#335533",
  "text": "#44cc44",
  "border": "#44cc44",
  "hoverBackground": "#446644",
  "disabledOpacity": 0.4
}
```

`fonts.turnEnd`: `"clamp(10px, 2vh, 14px)"`

`layout.turnEndButton`:
```json
{
  "padding": "clamp(4px, 0.8vh, 8px) clamp(8px, 2vw, 12px)",
  "borderRadius": "3px",
  "width": "100%"
}
```

`layout.endTurnBar`:
```json
{
  "padding": "clamp(2px, 0.5vh, 4px) clamp(8px, 2vw, 16px)"
}
```

`labels.endTurnButton`: `"ターンおわり"`

### 3.4 テスト用インターフェース

#### 3.4.1 実装ファイルパス

- `src/index.html` — メインページ（既存ファイルを拡張）

#### 3.4.2 data-testid 属性

1-1、2-1で定義済みの `data-testid` に加え、以下を追加する。

| data-testid | 対象要素 |
|---|---|
| `end-turn-bar` | ターン終了バー（ボタンのコンテナ） |
| `end-turn-button` | ターン終了ボタン |

#### 3.4.3 グローバル状態オブジェクト（window.gameState 拡張）

2-1の `window.gameState` に以下のプロパティを追加する。

```javascript
window.gameState = {
  // --- 1-1, 2-1 既存プロパティ ---
  // ...

  // --- 7-1 追加プロパティ ---
  turnNumber: number,       // 現在のターン番号
  // currentPlayer は 2-1 で既存
  players: Object,          // プレイヤーデータ {1: {...}, 2: {...}}
};
```

#### 3.4.4 グローバル関数

2-1のグローバル関数に加え、以下を追加・変更する。

| 関数名 | 引数 | 戻り値 | 説明 |
|--------|------|--------|------|
| `window.endTurn()` | なし | void | 現在のプレイヤーのターンを終了する（ボタン押下と同等） |
| `window.getTurnInfo()` | なし | object | `{turnNumber, currentPlayer, phase: 'P1'\|'P2'}` を返す |
| `window.resetTurn()` | なし | void | 既存の全ユニットmovedリセットに加え、ターン番号を1・P1フェーズにリセット |

## 4. 非機能要件

- **操作応答**: ターン終了ボタン押下からフェーズ切替完了まで16ms以内
- **ステータスバー更新**: 動的更新によるちらつきがないこと
- **既存機能との互換**: 1-1のマップ操作、2-1のユニット操作が引き続き正常動作すること
- **レスポンシブ**: ターン終了バーが小画面でも画面内に収まり、ボタンが操作可能であること

## 5. 考慮事項・制限事項

- **CP収入はスタブ**: IG/CTの値は `map_sample.json > players` の初期値を表示するのみ。ターン進行によるCP加算は1-2で実装する
- **生産はスタブ**: 生産中数（T）は常に `0` を表示。生産キュー管理は5-1で実装する
- **回復はスタブ**: ターン開始時の回復処理は `onTurnStart` コールバック内で6-1が実装する
- **GP/GB数はスタブ**: `map_sample.json > players` の初期値を表示。占領による変動は1-2で実装する
- **勝利条件はスタブ**: ターン終了時の勝利条件判定は `onTurnEnd` コールバック内で7-2が実装する
- **ターン上限なし**: 本仕様ではターン上限は設けない。7-2で実装する
- **AIターンは範囲外**: CPU側の自動操作は9-1で実装する。本仕様ではP2も人間が操作する前提

## 6. テスト方針

### テスト観点

- **正常系**: ターン終了ボタンでフェーズが切り替わること、ターン番号がインクリメントされること
- **状態遷移**: P1→P2→P1の切替が正しく行われること
- **UI更新**: ステータスバーの全要素が動的に正しく表示されること
- **操作制御**: フェーズに応じた操作プレイヤーの切替が正しいこと
- **境界値**: ターン1の初期状態、連続ターン進行
- **異常系**: アニメーション中のボタン押下、ユニット選択中のターン終了
- **既存機能との共存**: マップ操作、ユニット移動が引き続き動作すること

### テスト手法

- **Playwright UIテスト**: ボタンクリック、テキスト表示確認、gameState検証
- **gameState検証**: `window.gameState` を通じてターン状態をプログラム的に検証
- **グローバル関数テスト**: `window.endTurn()` 等のテスト用関数を直接呼び出してロジック検証

### テストデータ

- `src/config/map_sample.json` のサンプルデータを使用
- 既存のユニットデータ（P1: 4体、P2: 4体）でテスト

## 7. テスト項目

### 初期表示

- ターン番号が `1` で表示される
- フェーズ表示が `P1` で表示される
- フェーズテキストの色が `ui_theme.json > colors.player1.primary` である
- ターン終了バー（end-turn-bar）がステータスバーの下に表示される
- ターン終了ボタンがターン終了バー内に表示される
- ターン終了ボタンのテキストが `ui_theme.json > labels.endTurnButton` の値と一致する
- P1のIG値がプレイヤーデータの初期値で表示される
- P1のCT値がプレイヤーデータの初期値で表示される
- P1のユニット数が実際のP1ユニット数と一致する（2桁ゼロ埋め）
- P2のIG値がプレイヤーデータの初期値で表示される
- P2のCT値がプレイヤーデータの初期値で表示される
- P2のユニット数が実際のP2ユニット数と一致する（2桁ゼロ埋め）

### ターン終了ボタン操作

- ターン終了ボタンをクリックするとフェーズが切り替わる
- ターン終了ボタンをタッチ操作で押すとフェーズが切り替わる

### P1→P2フェーズ切替

- P1フェーズでターン終了すると currentPlayer が 2 になる
- フェーズ表示が `P2` に変わる
- フェーズテキストの色が `ui_theme.json > colors.player2.primary` に変わる
- ターン番号が変化しない（P2フェーズへの切替ではインクリメントしない）
- P2の全ユニットの moved が false にリセットされる
- P1のユニットが選択できなくなる
- P2のユニットが選択できるようになる

### P2→P1フェーズ切替（ターン進行）

- P2フェーズでターン終了すると currentPlayer が 1 になる
- ターン番号が 1 インクリメントされる
- フェーズ表示が `P1` に変わる
- フェーズテキストの色が `ui_theme.json > colors.player1.primary` に変わる
- P1の全ユニットの moved が false にリセットされる
- P1のユニットが選択できるようになる
- P2のユニットが選択できなくなる

### 連続ターン進行

- ターン1→2→3と連続で進行できる
- 各ターンでP1→P2→P1の順が維持される

### ステータスバー動的更新

- P1のユニット数がP1の実際のユニット数（units配列から算出）と一致する
- P2のユニット数がP2の実際のユニット数（units配列から算出）と一致する
- ターン番号表示がgameState.turnNumberと一致する
- フェーズ表示がgameState.currentPlayerに対応している

### 操作制御

- アニメーション中にターン終了ボタンを押しても何も起きない
- ユニット選択中にターン終了ボタンを押すと選択が解除されてからフェーズが切り替わる

### テスト用グローバル関数

- window.endTurn() でフェーズが切り替わる
- window.getTurnInfo() が正しいターン情報を返す
- window.getTurnInfo() の turnNumber が現在のターン番号を返す
- window.getTurnInfo() の currentPlayer が現在のプレイヤーを返す
- window.getTurnInfo() の phase が 'P1' または 'P2' を返す
- window.resetTurn() でターン番号が1にリセットされる
- window.resetTurn() でP1フェーズにリセットされる
- window.resetTurn() で全ユニットのmovedがfalseになる

### 既存機能との共存

- ターン管理追加後もマウスドラッグでスクロールできる
- ターン管理追加後もキーボードでスクロールできる
- ターン管理追加後もホイールでズームできる
- ターン管理追加後もユニット選択・移動ができる
- ターン管理追加後もミニマップが正常に動作する
