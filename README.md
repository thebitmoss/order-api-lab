# order-api-lab

在庫付き注文 API を段階的に作るための学習用リポジトリです。

## 現在の範囲

- Express の API サーバー
- Prisma + SQLite の接続
- `Product` モデル
- `Order` モデル
- `GET /health`
- `GET /products`
- `POST /products`
- `GET /orders`
- `POST /orders`
- `DELETE /orders/:id`
- API テスト
- GitHub Actions の最小 CI

## セットアップ

```bash
npm install
cp .env.example .env
npm run prisma:migrate -- --name init
npm run dev
```

サーバーはデフォルトで `http://localhost:3000` で起動します。

## テスト

```bash
npm test
```

テストでは `prisma/test.db` を使います。通常の開発用 DB `prisma/dev.db` とは分けています。

## Postman での確認

### 1. ヘルスチェック

- Method: `GET`
- URL: `http://localhost:3000/health`

期待するレスポンス:

```json
{
  "status": "ok"
}
```

### 2. 商品一覧を取得

- Method: `GET`
- URL: `http://localhost:3000/products`

最初は空配列が返ります。

```json
[]
```

### 3. 商品を作成

- Method: `POST`
- URL: `http://localhost:3000/products`
- Headers: `Content-Type: application/json`
- Body: `raw` / `JSON`

```json
{
  "name": "Sample Product",
  "price": 1200,
  "stock": 10
}
```

作成後にもう一度 `GET http://localhost:3000/products` を実行すると、登録した商品が返ります。

レスポンス例:

```json
{
  "id": 1,
  "name": "Sample Product",
  "price": 1200,
  "stock": 10,
  "createdAt": "2026-04-08T00:00:00.000Z",
  "updatedAt": "2026-04-08T00:00:00.000Z"
}
```

### 4. 注文一覧を取得

- Method: `GET`
- URL: `http://localhost:3000/orders`

最初は空配列が返ります。

```json
[]
```

### 5. 注文を作成

- Method: `POST`
- URL: `http://localhost:3000/orders`
- Headers: `Content-Type: application/json`
- Body: `raw` / `JSON`

先に `POST /products` で商品を作成し、その商品の `id` を `productId` に入れます。

```json
{
  "productId": 1,
  "quantity": 3
}
```

注文が作成されると、対象商品の `stock` が `quantity` 分だけ減ります。

主なエラー:

- 商品が存在しない場合: `404`
- `quantity` が `0` や文字列など不正な場合: `400`
- 在庫が足りない場合: `409`

### 6. 注文をキャンセル

- Method: `DELETE`
- URL: `http://localhost:3000/orders/1`

`1` の部分にはキャンセルしたい注文の `id` を入れます。

注文が存在する場合、その注文を削除し、対象商品の `stock` を注文数分だけ戻します。

注文が存在しない場合は `404` が返ります。

## ディレクトリ構成

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml
├── .env.example
├── package.json
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── app.js
│   ├── index.js
│   ├── lib/
│   │   └── prisma.js
│   └── modules/
│       ├── orders/
│       │   └── orders.routes.js
│       └── products/
│           └── products.routes.js
├── test/
│   ├── orders-api.test.js
│   └── products-api.test.js
└── README.md
```
