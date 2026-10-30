# Verify-bot

Discord OAuth2認証Webサイトから呼び出される、Discord Bot APIです。

## 必要環境
- Node.js 18以上
- Discordサーバーに追加済みのBot
- HTTPSで公開されたAPIエンドポイント

## セットアップ
1. ホスティングの環境変数に `DISCORD_TOKEN`、`GUILD_ID`、`VERIFIED_ROLE_ID`、`API_SECRET` を設定します。
2. `API_SECRET` は32文字以上のランダム値にし、Verify-web側の `BOT_API_SECRET` と一致させます。
3. Botに対象サーバーのManage Roles権限を付与します。
4. Botのロールを認証ロールより上に配置します。
5. `npm install` 後、`npm start` で起動します。

## API
- `GET /health`: ヘルスチェック
- `POST /api/verify`: Bearer API_SECRETで保護。Web側からDiscordユーザーIDとOAuth2アクセストークンを受け取り、OAuth2 guilds.joinと認証ロール付与を実行します。

OAuth2アクセストークンは処理中のみ使用し、保存・ログ出力しません。APIはHTTPSの背後で公開し、API_SECRETを第三者に共有しないでください。
