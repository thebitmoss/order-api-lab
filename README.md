# order-api-lab

在庫付き注文 API を段階的に作るための学習用リポジトリです。

## 今回の範囲

- Express の最小 API サーバー
- Prisma + SQLite の接続
- `Product` モデル
- `GET /health`
- `GET /products`
- `POST /products`

## セットアップ

```bash
npm install
cp .env.example .env
npm run prisma:migrate -- --name init
npm run dev
```

サーバーはデフォルトで `http://localhost:3000` で起動します。

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

## ディレクトリ構成

```text
.
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
│       └── products/
│           └── products.routes.js
└── README.md
```
