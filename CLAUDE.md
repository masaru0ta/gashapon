# gashapon



## YOU MUST: 
- 回答は日本語で行うこと
- ドキュメント、ソースコード内コメントなど日本語で記述すること
- 実装するときは必ず仕様書を元に Github の Issue にすること
- Issue にするとき、テスト項目をすべてチェックシートにして記載すること
- 実装するときはテスト項目をすべてクリアするまで修正を繰り返すこと
- WEBのテストには playwright MCP を使うこと
- テスト実行は `npx playwright test` を使うこと（playwright.config.js の設定に従いレポーターが適用される。`--reporter` オプションで上書きしないこと）

## ディレクトリ構造

- **docs/**: 仕様書
    - `spec_list.md`: 機能一覧。プロジェクト全体で必要な機能一覧
    - `spec_1-1_specname.md` 各機能ごとの仕様書
- **src/**: ソースコード。
- **src/gas/**: GAS用ソースコード。
- **assets/**: リソースファイル。

## 開発手順
1. 機能一覧を確認する。無ければユーザーと確認しながら作成する。
2. 各機能に対応する仕様書を作る
3. 機能を１つずつ github の Issue として登録する。
4. 機能実装とテストを行う
5. １つの機能の実装とテストが完了すればプルリクエストを投げる
6. 人間が成果物を確認し修正依頼を返すかマージをする
7. 2 に戻る


## プロジェクト情報

### GitHub

- **リポジトリURL**: https://github.com/masaru0ta/gashapon


### GAS (Google App Script)

- **プロジェクト名**: gashapon
- **スクリプトURL**: https://script.google.com/d/1QZZCqI_kOaD-oeOKxwgGvS9Xpjngaw99RG8imn4hFzsUMUd_WbnQj9W3/edit
- **デプロイURL**:

GASコードは `src/gas/script.js` で管理。
claspを使用してデプロイする。
デプロイURLが発行された際は上記に必ず記載すること。
既存のデプロイがあるときはそれを更新し、デプロイURLが変わらないようにすること。
