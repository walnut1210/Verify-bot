# Verify-bot

Discord OAuth2認証ジョブをVerify-webからHTTPSで取得して処理するBot Workerです。受信APIサーバーを起動しないため、Bot側のAPIをインターネットに公開する必要はありません。

## セットアップ
1. 環境変数にDISCORD_TOKEN、GUILD_ID、VERIFIED_ROLE_ID、WEB_API_URL、WEB_API_SECRETを設定します。
2. WEB_API_URLはVerify-webのHTTPS URLにします。
3. WEB_API_SECRETはVerify-webのBOT_API_SECRETと完全一致させます（32文字以上）。
4. 必要に応じてPOLL_INTERVAL_MSを設定します（既定5000ms）。
5. Botに対象サーバーのManage Roles権限を付与し、Botのロールを認証ロールより上に配置します。
6. npm install後、npm startで起動します。

## 動作
- BotはVerify-webのGET /internal/jobs/nextを定期的にHTTPSで確認します。
- ジョブを取得したらDiscord OAuth2 guilds.joinでサーバーに参加させ、認証ロールを付与します。
- 成功時はPOST /internal/jobs/:jobId/complete、失敗時はPOST /internal/jobs/:jobId/failを呼び出します。
- Web側のジョブリースにより、Bot停止時も期限切れジョブを再取得できます。
- アクセストークンやBotトークンをログ出力しません。

Bot側はHTTPサーバーを起動しません。MWSで受信ポートを公開する必要はありません。
