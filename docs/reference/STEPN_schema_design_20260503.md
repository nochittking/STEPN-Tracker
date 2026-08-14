# STEPN 収支管理ツール 画面種別定義 & JSONスキーマ設計書

> 作成：のっちさん × Claude / 2026-05-03

---

## 基本方針

- **記録の基本単位**：「結果が確定した画面のスクショ」のみ  
- **マーケット売却**：出品画面 \+ 売却完了（両方セットで収入確定）  
- **出品キャンセル/価格変更**：listing\_id で出品イベントと紐付け管理  
- **過去データ**：手入力フォームで補完可能（manual\_entry フラグで区別）  
- **チェーン判別**：ホーム画面の右上アイコンで判定（Polygon/BNB/Solana）

---

## 全画面種別一覧（16種 \+ 手入力）

| \# | screen\_type | 日本語名 | 収支区分 | 必須セット |
| :---- | :---- | :---- | :---- | :---- |
| 1 | `move_result` | ムーブ結果 | 収入 | 単体OK |
| 2 | `home_balance` | ホーム残高 | 参照 | 単体OK |
| 3 | `repair` | リペア（耐久度回復） | 支出 | 単体OK |
| 4 | `hp_restoration` | HP回復 | 支出 | 単体OK |
| 5 | `level_up` | レベルアップ | 支出 | 単体OK |
| 6 | `socket_unlock` | ソケットアンロック | 支出 | 単体OK |
| 7 | `attribute_assign` | 属性ポイント振り分け | 記録のみ | 単体OK |
| 8 | `mint` | ミント実行 | 支出 | 単体OK |
| 9 | `shoebox_open` | ショーボックス開封 | 記録のみ | 単体OK |
| 10 | `enhancement` | エンハンスメント | 支出 | 単体OK |
| 11 | `fusion` | フュージョン | 支出 | 単体OK |
| 12 | `gem_upgrade` | ジェムアップグレード | 支出 | 単体OK |
| 13 | `mystery_box_open` | MBオープン | 支出+収入 | 単体OK（コスト+中身） |
| 14 | `market_listing` | マーケット出品/変更/取下 | 管理のみ | sale\_completeとセット |
| 15 | `sale_complete` | 売却完了通知 or 残高増加 | 収入確定 | listing\_idで紐付け |
| 16 | `market_purchase` | マーケット購入 | 支出 | 単体OK |
| 17 | `wallet_transfer` | Spending↔Wallet入出金 | 資金移動 | 単体OK |
| 18 | `manual_entry` | 手入力（過去データ補完） | 全区分 | — |

---

## JSONスキーマ定義

### 共通フィールド（全レコード共通）

{

  "id": "uuid-v4",

  "screen\_type": "move\_result",

  "chain": "Polygon",

  "recorded\_at": "2026-05-03T09:20:00",

  "source": "screenshot",

  "manual\_entry": false,

  "notes": "任意メモ",

  "image\_path": "local/path/to/screenshot.jpg"

}

| フィールド | 型 | 説明 |
| :---- | :---- | :---- |
| id | string (UUID) | レコード一意ID |
| screen\_type | string (enum) | 上記16種のいずれか |
| chain | string | Polygon / BNB / Solana |
| recorded\_at | ISO8601 | スクショの日時（画面内の日時優先） |
| source | string | screenshot / manual |
| manual\_entry | boolean | 過去データ手入力はtrue |
| notes | string | 任意メモ |
| image\_path | string | 画像ファイルパス（nullも可） |

---

### 1\. move\_result（ムーブ結果）

{

  "screen\_type": "move\_result",

  "shoe\_id": "778894978",

  "shoe\_type": "Jogger",

  "shoe\_level": 22,

  "earn\_mode": "GST",

  "earn\_amount": 880.12,

  "earn\_rate\_per\_min": 8.7,

  "mystery\_box\_count": 1,

  "energy\_used": 20.0,

  "distance\_km": 14.85,

  "duration\_sec": 6049,

  "steps": 15907,

  "smac\_result": "Human"

}

> ⚠️ earn\_mode は "GST" or "GMT" で判定。GMT/Minと表示されてたらGMT

---

### 2\. home\_balance（ホーム残高）

{

  "screen\_type": "home\_balance",

  "chain": "Polygon",

  "gst\_balance": 6120.05,

  "gmt\_balance": 460.71,

  "energy\_current": 10.0,

  "energy\_max": 20.0,

  "active\_shoe\_id": "778894978",

  "active\_shoe\_type": "Jogger",

  "active\_shoe\_level": 22,

  "active\_shoe\_hp": 100.0,

  "earn\_mode\_toggle": "GMT"

}

---

### 3\. repair（リペア）

{

  "screen\_type": "repair",

  "shoe\_id": "778894978",

  "durability\_before": 95,

  "durability\_target": 100,

  "cost\_gst": 6.7,

  "confirmed": true

}

---

### 4\. hp\_restoration（HP回復）

{

  "screen\_type": "hp\_restoration",

  "shoe\_id": "108400406",

  "hp\_before\_pct": 23.22,

  "hp\_after\_pct": 90.22,

  "cost\_gst": 100,

  "cost\_gmt": 0,

  "gems\_consumed": \[

    {"gem\_type": "Comfort", "gem\_level": 1, "count": 1}

  \]

}

---

### 5\. level\_up（レベルアップ）

{

  "screen\_type": "level\_up",

  "shoe\_id": "778894978",

  "level\_from": 4,

  "level\_to": 5,

  "cost\_gst": 10,

  "cost\_gmt": 10,

  "duration\_min": 300,

  "confirmed": true

}

> ⚠️ Lv5/10/20/29/30でGMT追加コスト発生。JSONで gst/gmt を分けて保持

---

### 6\. socket\_unlock（ソケットアンロック）

{

  "screen\_type": "socket\_unlock",

  "shoe\_id": "778894978",

  "unlocked\_at\_level": 5,

  "socket\_number": 1,

  "cost\_gst": 10

}

---

### 7\. attribute\_assign（属性ポイント振り分け）

{

  "screen\_type": "attribute\_assign",

  "shoe\_id": "778894978",

  "level": 22,

  "points\_assigned": {

    "efficiency": 2,

    "luck": 1,

    "comfort": 0,

    "resilience": 1

  },

  "total\_after": {

    "efficiency": 2552.4,

    "luck": 3843.4,

    "comfort": 120.6,

    "resilience": null

  }

}

---

### 8\. mint（ミント実行）

{

  "screen\_type": "mint",

  "parent\_shoe\_id\_1": "778894978",

  "parent\_shoe\_id\_2": "105533739",

  "parent\_mint\_count\_1": 3,

  "parent\_mint\_count\_2": 2,

  "scroll\_quality": "Common",

  "cost\_gst": 200,

  "cost\_gmt": 50,

  "shoebox\_received\_count": 1,

  "shoebox\_id": "new-shoebox-uuid"

}

---

### 9\. shoebox\_open（ショーボックス開封）

{

  "screen\_type": "shoebox\_open",

  "shoebox\_id": "new-shoebox-uuid",

  "shoebox\_quality": "Common",

  "result\_shoe\_id": "999999999",

  "result\_quality": "Uncommon",

  "result\_type": "Jogger"

}

---

### 10\. enhancement（エンハンスメント）

{

  "screen\_type": "enhancement",

  "input\_shoe\_ids": \["aaa", "bbb", "ccc", "ddd", "eee"\],

  "input\_quality": "Common",

  "cost\_gst": 500,

  "cost\_gmt": 100,

  "result\_shoe\_id": "fff",

  "result\_quality": "Uncommon",

  "result\_type": "Jogger",

  "is\_rainbow": false

}

---

### 11\. fusion（フュージョン）

{

  "screen\_type": "fusion",

  "shoe\_a\_id": "778894978",

  "shoe\_b\_id": "105533739",

  "attributes\_before": {

    "efficiency": 16,

    "luck": 20,

    "comfort": 18,

    "resilience": 14

  },

  "attributes\_after": {

    "efficiency": 22,

    "luck": 20,

    "comfort": 25,

    "resilience": 14

  }

}

> ✅ フュージョンにGST/GMTコストなし。靴Bをバーンするだけ。収支上は「靴Bを消滅させた」という記録のみ

---

### 12\. gem\_upgrade（ジェムアップグレード）

{

  "screen\_type": "gem\_upgrade",

  "gem\_type": "Efficiency",

  "level\_from": 2,

  "level\_to": 3,

  "gems\_consumed\_count": 3,

  "cost\_gst": 30,

  "cost\_gmt": 0,

  "success": true,

  "result\_gem\_count": 1

}

> ⚠️ Lv1-5は失敗あり（success: false の場合、gems/gst/gmtは消滅） ⚠️ Lv4以上でGMT追加コスト発生

---

### 13\. mystery\_box\_open（MB開封）

{

  "screen\_type": "mystery\_box\_open",

  "mb\_level": 9,

  "cost\_gst": 1818,

  "contents": \[

    {"item\_type": "Gem", "gem\_type": "Efficiency", "gem\_level": 1, "count": 10},

    {"item\_type": "Gem", "gem\_type": "Efficiency", "gem\_level": 2, "count": 7},

    {"item\_type": "MintingScroll", "scroll\_quality": "Common", "count": 1}

  \]

}

---

### 14\. market\_listing（マーケット出品/変更/取下）

{

  "screen\_type": "market\_listing",

  "listing\_id": "listing-uuid",

  "action": "list",

  "item\_type": "Sneaker",

  "item\_id": "678742321",

  "price\_gmt": 14000,

  "listed\_at": "2026-04-25",

  "status": "active"

}

> action は "list" / "price\_change" / "revoke" の3種 status は "active" / "sold" / "revoked"

---

### 15\. sale\_complete（売却完了）

{

  "screen\_type": "sale\_complete",

  "listing\_id": "listing-uuid",

  "item\_type": "Sneaker",

  "item\_id": "678742321",

  "sold\_price\_gmt": 14000,

  "platform\_fee\_pct": 6,

  "net\_income\_gmt": 13160,

  "sold\_at": "2026-04-28",

  "confirmed\_via": "push\_notification"

}

> confirmed\_via は "push\_notification" / "balance\_increase" platform\_fee\_pct \= Platform2% \+ Royalty4% \= 6%固定（Minting手数料は別途6%）

---

### 16\. market\_purchase（マーケット購入）

{

  "screen\_type": "market\_purchase",

  "item\_type": "Sneaker",

  "item\_id": "137544259",

  "item\_quality": "Epic",

  "item\_class": "Jogger",

  "item\_level": 0,

  "item\_durability": "100/100",

  "item\_mint\_count": "0/7",

  "cost\_gmt": 18900,

  "purchased\_at": "2026-04-25",

  "source": "m.stepn.com"

}

> item\_type は "Sneaker" / "Gem" / "MintingScroll" / "Badge" / "Shoebox"

---

### 17\. wallet\_transfer（Spending↔Wallet入出金）

{

  "screen\_type": "wallet\_transfer",

  "direction": "wallet\_to\_spending",

  "token": "GMT",

  "amount": 5000,

  "gas\_token": "POL",

  "gas\_amount": 0.01,

  "transferred\_at": "2026-05-03T09:00:00"

}

> direction は "wallet\_to\_spending" / "spending\_to\_wallet"

---

### 18\. manual\_entry（手入力）

{

  "screen\_type": "manual\_entry",

  "manual\_entry": true,

  "source": "manual",

  "entry\_category": "move\_result",

  "data": {

    "earn\_mode": "GST",

    "earn\_amount": 500,

    "recorded\_at": "2022-08-15T08:30:00"

  },

  "confidence": "low"

}

> entry\_category に上記16種を指定。confidence は low/medium/high 確定申告用途では confidence: low のデータを区別して集計できるようにする

---

## 収支集計カテゴリ定義

| カテゴリ | 対象 screen\_type | 符号 |
| :---- | :---- | :---- |
| ムーブ収入 | move\_result | \+ |
| MB収入（中身） | mystery\_box\_open の contents | \+ |
| マーケット売却収入 | sale\_complete | \+ |
| リペア費用 | repair | − |
| HP回復費用 | hp\_restoration | − |
| レベルアップ費用 | level\_up | − |
| ソケット解放費用 | socket\_unlock | − |
| ミント費用 | mint | − |
| エンハンス費用 | enhancement | − |
| フュージョン（コストなし） | fusion | ± 0 |
| ジェムアップグレード費用 | gem\_upgrade | − |
| MB開封費用 | mystery\_box\_open の cost\_gst | − |
| マーケット購入費用 | market\_purchase | − |
| 資金移動（収支外） | wallet\_transfer | ± |

---

## 確定申告用 集計方針

- **円換算レート**：各レコードに `jpy_rate_gst` / `jpy_rate_gmt` フィールドを追加で保持  
- **手入力データ**：`confidence: low` で分離集計  
- **CSV出力項目**：日付 / 種別 / チェーン / GST収支 / GMT収支 / 円換算額 / 備考  
- **税務上の収入認識タイミング**：`sale_complete.sold_at` / `move_result.recorded_at`

---

## 次のステップ

1. このスキーマをベースに **Vision APIプロンプト設計**（画面種別判定 \+ 抽出ロジック）  
2. **React Native側のデータモデル（AsyncStorage構造）  
3. **手入力フォームUI**（過去データ補完）

