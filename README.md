# 陳家蜂蜜養蜂智庫

這是一套響應式 PWA 養蜂知識庫，訪客不需登入即可查詢知識、使用問答與查看枋山即時天氣。

## 管理後台

開啟 `/admin.html`，輸入管理密碼後，可以上傳任何格式的檔案。PDF、DOCX、TXT、CSV、Markdown、HTML、JSON、XML 會自動擷取文字；圖片、影音或其他格式請在後台填入摘要及關鍵字。新增內容會立即出現在公開知識庫，並納入「問智庫」的回答來源。

管理密碼只在伺服器端的 `ADMIN_PASSWORD` 環境變數驗證，不會寫在公開前端程式。預設值依需求為 `7771`，正式部署時仍建議改成更長的密碼。

## 本機執行

1. 安裝 Node.js 20 或更新版本。
2. 安裝相依套件並啟動：

```powershell
npm install
$env:ADMIN_PASSWORD="7771"
$env:SESSION_SECRET="請換成至少32字元的隨機文字"
npm start
```

瀏覽器開啟 `http://localhost:3000`；管理後台為 `http://localhost:3000/admin.html`。

## 公開部署

新版需要能執行 Node.js 並提供「持久磁碟」的主機，不能只使用 GitHub Pages。部署時執行 `npm install` 與 `npm start`，並設定 `ADMIN_PASSWORD`、`SESSION_SECRET`、`MAX_UPLOAD_MB`。必須把持久磁碟掛載到專案的 `data/` 與 `uploads/`，否則主機重啟或重新部署時，上傳資料可能消失。

「問智庫」仍是公開、免費、無登入的本地知識檢索版，現在會同時載入後台新增的資料。若未來要讓長尾問題生成更自然的綜合回答，可再由現有後端串接大型語言模型；API 金鑰只能放在後端環境變數。

## 資料維護

原始問答與知識卡在 `script.js` 的 `knowledge` 陣列；後台資料則保存在 `data/knowledge.json`，原始檔案保存在 `uploads/`。請定期備份這兩個位置。資料來源不包含苗栗區農業改良場。
