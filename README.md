# Verify-bot

Discord OAuth2認証ジョブをVerify-webからHTTPSで取得して処理するBot Workerです。受信APIサーバーを起動しないため、Bot側のAPIをインターネットに公開する必要はありません。

## セットアップ

1. 環境変数に `DISCORD_TOKEN`、`GUILD_ID`、`VERIFIED_ROLE_ID`、`WEB_API_URL`、`WEB_API_SECRET` を設定します。
2. `WEB_API_URL` はVerify-webのHTTPS URLにします。
3. `WEB_API_SECRET` はVerify-webの `BOT_API_SECRET` と完全一致させます（32文字以上）。
4. 必要に応じて `POLL_INTERVAL_MS` を設定します（既定5000ms）。
5. Botに対象サーバーのManage Roles権限を付与し、Botのロールを認証ロールより上に配置します。
6. `npm install` 後、`npm start` で起動します。

## 動作

- BotはVerify-webの `GET /internal/jobs/next` を定期的にHTTPSで確認します。
- ジョブを取得したらDiscord OAuth2 `guilds.join` でサーバーに参加させ、認証ロールを付与します。
- 成功時は `POST /internal/jobs/:jobId/complete`、失敗時は `POST /internal/jobs/:jobId/fail` を呼び出します。
- Web側のジョブリースにより、Bot停止時も期限切れジョブを再取得できます。
- アクセストークンやBotトークンをログ出力しません。

Bot側はHTTPサーバーを起動しません。MWSで受信ポートを公開する必要はありません。

## 認証パネルの設置

Bot起動時に対象サーバーへスラッシュコマンド `/認証パネル` を登録します。サーバー管理権限（Manage Server）を持つメンバーがテキストチャンネルで実行すると、そのチャンネルに認証用Embedと「Discordで認証する」リンクボタンを投稿します。

ボタンはVerify-webの `/auth/discord` に接続します。

Botには、設置先チャンネルで「メッセージを送信」「埋め込みリンク」の権限が必要です。

## ライセンス

このプロジェクトは [Apache License 2.0](LICENSE) の下で公開されています。

著作権表示およびライセンス文を保持することを条件に、商用利用・改変・再配布が許可されています。改変したファイルには変更した旨を明記してください。詳細はLICENSEファイルを確認してください。

Copyright 2026 walnut1210
