// スクリプトプロパティからGemini APIキーを取得することを推奨
// Script Properties: File > Project properties > Script properties tab
const API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

/**
 * スプレッドシートのD列にある橋の名前から緯度経度を取得し、B列とC列に記入します。
 */
function getCoordinatesFromBridgeNames() {
  // APIキーの存在確認
  if (!API_KEY) {
    Logger.log("ERROR: GEMINI_API_KEY not found in Script Properties");
    SpreadsheetApp.getUi().alert("エラー: GEMINI_API_KEYがスクリプトプロパティに設定されていません");
    return;
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();

  // データの存在確認
  // ヘッダー行のみの場合 (getLastRow()が1の場合など) も考慮
  if (sheet.getLastRow() < 2) {
    Logger.log("ERROR: No data found in sheet (or only header row)");
    SpreadsheetApp.getUi().alert("エラー: データが見つかりません (ヘッダー行のみの可能性があります)");
    return;
  }

  // D列の橋の名前を取得 (2行目から)
  // getLastRow() が1の場合、getRange("D2:D1") となり、空の配列が返される
  const range = sheet.getRange("D2:D" + sheet.getLastRow());
  const bridgeNames = range.getValues();

  Logger.log("Total bridges to process: " + bridgeNames.length);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < bridgeNames.length; i++) {
    const rowNumber = i + 2; // スプレッドシートの行番号

    const bridgeNameRaw = bridgeNames[i][0];
    let bridgeName = ''; // bridgeNameを初期化

    // bridgeNameRaw の型をチェックし、有効な文字列として整形
    if (typeof bridgeNameRaw === 'string' && bridgeNameRaw.trim() !== '') {
        bridgeName = bridgeNameRaw.trim();
    } else if (typeof bridgeNameRaw === 'number') { // 数値が入力されている可能性も考慮
        bridgeName = bridgeNameRaw.toString().trim();
    } else {
        // 文字列でも数値でもない、またはtrim後に空になる場合はスキップ
        Logger.log(`SKIPPED: Invalid type or empty bridge name at row ${rowNumber}. Raw value: '${bridgeNameRaw}' (Type: ${typeof bridgeNameRaw})`);
        continue; // 次のループへ進む
    }

    Logger.log(`--- Processing Row ${rowNumber} ---`);
    Logger.log(`Raw bridge name from sheet: '${bridgeNameRaw}' (Type: ${typeof bridgeNameRaw})`);
    Logger.log(`Prepared bridge name for API: '${bridgeName}'`);
    // Logger.log(`Calling getCoordinatesWithFallback with: '${bridgeName}'`); // このログはgetCoordinatesWithFallback内で出力されるため削除

    try {
      const coordinates = getCoordinatesWithFallback(bridgeName);

      if (coordinates && coordinates.latitude !== undefined && coordinates.longitude !== undefined) {
        // 既に値が入っている場合はスキップするオプション
        const currentLat = sheet.getRange(rowNumber, 2).getValue();
        const currentLon = sheet.getRange(rowNumber, 3).getValue();

        if (currentLat === '' || currentLon === '') {
          // B列とC列に緯度と経度を記入
          sheet.getRange(rowNumber, 2).setValue(coordinates.latitude);  // B列
          sheet.getRange(rowNumber, 3).setValue(coordinates.longitude); // C列
          Logger.log(`SUCCESS: ${bridgeName} - Lat: ${coordinates.latitude}, Lon: ${coordinates.longitude}`);
          successCount++;
        } else {
          Logger.log(`SKIPPED: ${bridgeName} - Already has coordinates at B${rowNumber}, C${rowNumber}`);
        }
      } else {
        Logger.log(`FAILED: Could not find coordinates for: ${bridgeName}`);
        // エラーを記録するためにE列にメモを追加
        sheet.getRange(rowNumber, 5).setValue("座標取得失敗");
        errorCount++;
      }
    } catch (e) {
      Logger.log(`ERROR: Processing ${bridgeName} at row ${rowNumber}: ${e.message}`);
      Logger.log(`ERROR Stack: ${e.stack}`);
      // エラーを記録するためにE列にメモを追加
      sheet.getRange(rowNumber, 5).setValue("API エラー");
      errorCount++;
    }

    // APIレート制限に配慮し、処理間に短い遅延を入れる
    Utilities.sleep(1000); // 1秒待機 (APIの安定性を考慮)
  }

  Logger.log(`Processing complete. Success: ${successCount}, Errors: ${errorCount}`);
  SpreadsheetApp.getUi().alert(`処理完了\n成功: ${successCount}件\nエラー: ${errorCount}件`);
}

/**
 * Gemini API を利用して橋の緯度経度を取得します。
 * 複数のアプローチを試行して精度を向上させます。
 * @param {string} bridgeName 検索する橋の名前
 * @returns {object} {latitude: number, longitude: number} または null
 */
function getCoordinatesFromGemini(bridgeName) {
  // 1番目のアプローチ：具体的な座標要求
  let prompt1 = `日本にある「${bridgeName}」という橋の正確な緯度経度を教えてください。
必須条件：
- 実在する橋の正確な座標のみを回答してください
- 推測や概算ではなく、正確な位置情報を提供してください
- 回答は必ず以下の形式で返してください：
Latitude: [数値]
Longitude: [数値]
例：
Latitude: 35.6762
Longitude: 139.6503
橋が見つからない場合や正確な座標がわからない場合は「座標不明」と回答してください。`;
  let coordinates = tryGeminiRequest(bridgeName, prompt1, "Prompt 1");
  if (coordinates) return coordinates;

  // 2番目のアプローチ：より詳細な情報を含む検索
  let prompt2 = `「${bridgeName}」について教えてください。この橋の所在地と正確な緯度経度を調べてください。
以下の情報を含めて回答してください：
1. 橋の正式名称
2. 所在地（都道府県、市区町村）
3. 正確な緯度経度
座標の形式：Latitude: [数値]Longitude: [数値]
正確な座標がわからない場合は「座標不明」と記載してください。`;
  coordinates = tryGeminiRequest(bridgeName, prompt2, "Prompt 2");
  if (coordinates) return coordinates;

  // 3番目のアプローチ：地域情報を含む検索
  let prompt3 = `日本で「${bridgeName}」という名前の橋を探しています。この橋の位置情報（緯度経度）を教えてください。
有名な橋、高速道路の橋、一般道の橋、歩道橋など、どのような種類の橋でも構いません。
回答形式：Latitude: [緯度]Longitude: [経度]
見つからない場合は「該当する橋が見つかりません」と回答してください。`;
  return tryGeminiRequest(bridgeName, prompt3, "Prompt 3");
}

/**
 * Gemini APIリクエストを実行し、座標を抽出する
 * @param {string} bridgeName 橋の名前
 * @param {string} prompt プロンプト
 * @param {string} attemptLabel 試行のラベル (ログ用)
 * @returns {object} 座標オブジェクトまたはnull
 */
function tryGeminiRequest(bridgeName, prompt, attemptLabel) {
  Logger.log(`Trying Gemini API (${attemptLabel}) for: ${bridgeName}`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

  const options = {
    method: "POST",
    contentType: "application/json",
    payload: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1, // 創造性を低くし、より事実に基づいた回答を促す
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 1024,
      }
    })
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseText = response.getContentText();

    // HTTPステータスコードの確認
    if (response.getResponseCode() !== 200) {
      Logger.log(`Gemini HTTP Error (${attemptLabel}) for ${bridgeName}: ${response.getResponseCode()}`);
      Logger.log(`Gemini Response Text: ${responseText}`);
      return null;
    }

    const jsonResponse = JSON.parse(responseText);

    Logger.log(`Gemini API raw response for ${bridgeName} (${attemptLabel}): ${JSON.stringify(jsonResponse)}`);

    // Geminiの応答から緯度経度を解析するロジック
    if (jsonResponse && jsonResponse.candidates && jsonResponse.candidates.length > 0) {
      const text = jsonResponse.candidates[0].content.parts[0].text;

      Logger.log(`Gemini Parsed text (${attemptLabel}): ${text}`);

      // 座標が見つからない場合の判定キーワード
      const notFoundKeywords = ['座標不明', '見つかりません', 'わかりません', '不明', '存在しません', '該当する橋'];
      if (notFoundKeywords.some(keyword => text.includes(keyword))) {
        Logger.log(`Gemini indicates coordinates not available for: ${bridgeName} (${attemptLabel})`);
        return null;
      }

      // 緯度経度の抽出 (より多くのパターンに対応)
      const latMatch = text.match(/(?:Latitude|緯度|北緯)[:\s]*([-]?\d+\.?\d*)/i);
      const lonMatch = text.match(/(?:Longitude|経度|東経)[:\s]*([-]?\d+\.?\d*)/i);

      if (latMatch && lonMatch) {
        const latitude = parseFloat(latMatch[1]);
        const longitude = parseFloat(lonMatch[1]);

        // 日本の座標範囲の妥当性チェック（より厳密に）
        if (latitude >= 20 && latitude <= 50 && longitude >= 120 && longitude <= 150) { // 日本の広域範囲
          Logger.log(`Found valid coordinates via Gemini (${attemptLabel}) for ${bridgeName}: Lat ${latitude}, Lon ${longitude}`);
          return {
            latitude: latitude,
            longitude: longitude
          };
        } else {
          Logger.log(`Gemini returned coordinates out of typical Japan range (${attemptLabel}): Lat ${latitude}, Lon ${longitude}`);
          return null;
        }
      }

      // 小数点形式の座標を直接検索（例: 35.1234, 139.5678）
      const coordPattern = /([-]?\d{1,3}\.\d+)[,\s]+([-]?\d{1,3}\.\d+)/;
      const coordMatch = text.match(coordPattern);
      if (coordMatch) {
        let latCandidate = parseFloat(coordMatch[1]);
        let lonCandidate = parseFloat(coordMatch[2]);

        // 緯度経度の順序を判定（日本の場合、緯度は20-50、経度は120-150の範囲）
        let latitude, longitude;
        if (latCandidate >= 20 && latCandidate <= 50 && lonCandidate >= 120 && lonCandidate <= 150) {
          latitude = latCandidate;
          longitude = lonCandidate;
        } else if (lonCandidate >= 20 && lonCandidate <= 50 && latCandidate >= 120 && latCandidate <= 150) {
          // 順序が逆の場合
          latitude = lonCandidate;
          longitude = latCandidate;
        } else {
          Logger.log(`Gemini returned coordinates by pattern matching out of Japan range (${attemptLabel}): ${latCandidate}, ${lonCandidate}`);
          return null;
        }

        Logger.log(`Found coordinates by pattern matching via Gemini (${attemptLabel}) for ${bridgeName}: Lat ${latitude}, Lon ${longitude}`);
        return {
          latitude: latitude,
          longitude: longitude
        };
      }

      Logger.log(`Gemini response could not be parsed for coordinates (${attemptLabel}): ${text}`);
      return null;
    } else {
      Logger.log(`Invalid Gemini response structure (${attemptLabel}): ${JSON.stringify(jsonResponse)}`);
      return null;
    }
  } catch (e) {
    Logger.log(`Gemini API call failed for ${bridgeName} (${attemptLabel}): ${e.message}`);
    // API呼び出し自体が失敗した場合、エラーを再スローして上位でキャッチさせる
    throw e;
  }
}

/**
 * OpenStreetMap Nominatim API を利用して橋の緯度経度を取得します。（代替手段）
 * @param {string} bridgeName 検索する橋の名前
 * @returns {object} {latitude: number, longitude: number} または null
 */
function getCoordinatesAlternative(bridgeName) {
  Logger.log(`Trying OpenStreetMap Nominatim API for: ${bridgeName}`);
  // Google Maps検索用のURLを生成してログに出力 (手動確認用)
  const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(bridgeName + ' 橋 日本')}`;
  Logger.log(`Manual Google Maps search URL for ${bridgeName}: ${mapsUrl}`);

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(bridgeName + ' bridge japan')}&limit=1&addressdetails=0`;
    const response = UrlFetchApp.fetch(nominatimUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'GoogleAppsScript-BridgeCoordinates/1.0 (your_email@example.com)' // 自身のメールアドレスなどを設定推奨
      },
      muteHttpExceptions: true // エラー時でも例外を発生させずにレスポンスを取得
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        // 日本の座標範囲チェック
        if (lat >= 20 && lat <= 50 && lon >= 120 && lon <= 150) {
          Logger.log(`Found coordinates via Nominatim for ${bridgeName}: Lat ${lat}, Lon ${lon}`);
          return {
            latitude: lat,
            longitude: lon
          };
        } else {
          Logger.log(`Nominatim returned coordinates out of Japan range for ${bridgeName}: Lat ${lat}, Lon ${lon}`);
        }
      } else {
        Logger.log(`No results from Nominatim for ${bridgeName}`);
      }
    } else {
      Logger.log(`Nominatim HTTP Error for ${bridgeName}: ${response.getResponseCode()}`);
      Logger.log(`Nominatim Response Text: ${response.getContentText()}`);
    }
  } catch (e) {
    Logger.log(`Nominatim API call failed for ${bridgeName}: ${e.message}`);
  }
  return null;
}

/**
 * バックアップ戦略を含む改良された座標取得関数
 * @param {string} bridgeName 橋の名前
 * @returns {object} 座標オブジェクトまたはnull
 */
function getCoordinatesWithFallback(bridgeName) {
  // ここでbridgeNameがundefinedでないことを確認するログを追加
  Logger.log(`--- getCoordinatesWithFallback called for: '${bridgeName}' (Type: ${typeof bridgeName}) ---`);

  // 念のため、ここでもbridgeNameが有効な文字列であることを確認
  if (typeof bridgeName !== 'string' || bridgeName.trim() === '') {
      Logger.log(`ERROR: getCoordinatesWithFallback received invalid bridgeName: '${bridgeName}'`);
      return null;
  }

  // 1. Gemini APIを試す
  let coordinates = getCoordinatesFromGemini(bridgeName);
  if (coordinates) {
    Logger.log(`Strategy SUCCESS: Gemini for ${bridgeName}`);
    return coordinates;
  }

  // 2. OpenStreetMap Nominatim APIを試す
  coordinates = getCoordinatesAlternative(bridgeName);
  if (coordinates) {
    Logger.log(`Strategy SUCCESS: Nominatim for ${bridgeName}`);
    return coordinates;
  }

  // 3. 橋の名前を変更してGemini APIを再試行
  const alternativeNames = generateAlternativeNames(bridgeName);
  for (const altName of alternativeNames) {
    Logger.log(`Strategy: Trying alternative name with Gemini: ${altName}`);
    coordinates = getCoordinatesFromGemini(altName);
    if (coordinates) {
      Logger.log(`Strategy SUCCESS: Gemini with alternative name '${altName}' for ${bridgeName}`);
      return coordinates;
    }
  }

  Logger.log(`Strategy FAILED: All methods failed for: ${bridgeName}`);
  return null;
}

/**
 * 橋の名前の代替パターンを生成します。
 * @param {string} bridgeName 元の橋の名前
 * @returns {string[]} 代替名の配列
 */
function generateAlternativeNames(bridgeName) {
  // ここでbridgeNameが文字列であることを確認する防御的なチェックを追加
  if (typeof bridgeName !== 'string') {
    Logger.log(`ERROR: generateAlternativeNames received non-string bridgeName: '${bridgeName}' (Type: ${typeof bridgeName})`);
    return []; // 文字列でない場合は空の配列を返す
  }

  const alternatives = [];

  // 「橋」を追加または削除
  if (bridgeName.endsWith('橋')) {
    alternatives.push(bridgeName.slice(0, -1)); // 「橋」を削除
  } else {
    alternatives.push(bridgeName + '橋'); // 「橋」を追加
  }

  // 「大橋」パターン（「橋」で終わり、「大」を含まない場合）
  if (bridgeName.endsWith('橋') && !bridgeName.includes('大')) {
    alternatives.push(bridgeName.slice(0, -1) + '大橋');
  } else if (!bridgeName.endsWith('橋') && bridgeName.includes('大')) {
     alternatives.push(bridgeName + '橋'); // 「大橋」自体に「橋」がない場合
  }

  // カタカナ→ひらがな変換（簡単なパターン、全てのカタカナに対応するわけではありません）
  // 複雑な変換はLLMに任せるか、より高度なライブラリが必要
  const katakanaToHiraganaMap = {
    'ァ': 'ぁ', 'ア': 'あ', 'ィ': 'ぃ', 'イ': 'い', 'ゥ': 'ぅ', 'ウ': 'う', 'ェ': 'ぇ', 'エ': 'え', 'ォ': 'ぉ', 'オ': 'お',
    'カ': 'か', 'ガ': 'が', 'キ': 'き', 'ギ': 'ぎ', 'ク': 'く', 'グ': 'ぐ', 'ケ': 'け', 'ゲ': 'げ', 'コ': 'こ', 'ゴ': 'ご',
    'サ': 'さ', 'ザ': 'ざ', 'シ': 'し', 'ジ': 'じ', 'ス': 'す', 'ズ': 'ず', 'セ': 'せ', 'ゼ': 'ぜ', 'ソ': 'そ', 'ゾ': 'ぞ',
    'タ': 'た', 'ダ': 'だ', 'チ': 'ち', 'ヂ': 'ぢ', 'ッ': 'っ', 'ツ': 'つ', 'ヅ': 'づ', 'テ': 'て', 'デ': 'で', 'ト': 'と', 'ド': 'ど',
    'ナ': 'な', 'ニ': 'に', 'ヌ': 'ぬ', 'ネ': 'ね', 'ノ': 'の',
    'ハ': 'は', 'バ': 'ば', 'パ': 'ぱ', 'ヒ': 'ひ', 'ビ': 'び', 'ピ': 'ぴ', 'フ': 'ふ', 'ブ': 'ぶ', 'プ': 'ぷ', 'ヘ': 'へ', 'ベ': 'べ', 'ペ': 'ぺ', 'ホ': 'ほ', 'ボ': 'ぼ', 'ポ': 'ぽ',
    'マ': 'ま', 'ミ': 'み', 'ム': 'む', 'メ': 'め', 'モ': 'も',
    'ャ': 'ゃ', 'ヤ': 'や', 'ュ': 'ゅ', 'ユ': 'ゆ', 'ョ': 'ょ', 'ヨ': 'よ',
    'ラ': 'ら', 'リ': 'り', 'ル': 'る', 'レ': 'れ', 'ロ': 'ろ',
    'ヮ': 'ゎ', 'ワ': 'わ', 'ヰ': 'ゐ', 'ヱ': 'ゑ', 'ヲ': 'を', 'ン': 'ん', 'ヴ': 'ゔ',
    'ヵ': 'ゕ', 'ヶ': 'ゖ'
  };
  let hiraganaName = '';
  for (let char of bridgeName) {
    hiraganaName += katakanaToHiraganaMap[char] || char;
  }
  if (hiraganaName !== bridgeName) {
    alternatives.push(hiraganaName);
  }

  // 重複を排除し、元の名前と異なるものだけを返す
  return [...new Set(alternatives)].filter(name => name !== bridgeName && name.length > 0);
}

/**
 * APIキーのテスト用関数
 * スクリプトプロパティにAPIキーが正しく設定されているかを確認します。
 */
function testApiKey() {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (apiKey) {
    Logger.log("API Key found (first 10 chars): " + apiKey.substring(0, 10) + "...");
    SpreadsheetApp.getUi().alert("APIキーが見つかりました。");
  } else {
    Logger.log("ERROR: API Key not found in Script Properties.");
    SpreadsheetApp.getUi().alert("エラー: APIキーが見つかりません。スクリプトプロパティを確認してください。");
  }
}

/**
 * 単一の橋の名前で座標取得をテストする関数
 * デバッグ時に特定の橋の名前で動作確認するのに便利です。
 */
function testSingleBridge() {
  const testBridgeName = SpreadsheetApp.getUi().prompt(
    '単体テスト',
    'テストしたい橋の名前を入力してください:',
    SpreadsheetApp.getUi().ButtonSet.OK_CANCEL
  ).getResponseText();

  if (!testBridgeName) {
    Logger.log("Test cancelled or no name entered.");
    return;
  }

  Logger.log(`--- Running single bridge test for: ${testBridgeName} ---`);
  try {
    const coordinates = getCoordinatesWithFallback(testBridgeName);
    if (coordinates && coordinates.latitude !== undefined && coordinates.longitude !== undefined) {
      Logger.log(`Test result: Lat ${coordinates.latitude}, Lon ${coordinates.longitude}`);
      SpreadsheetApp.getUi().alert(`テスト結果: \n緯度: ${coordinates.latitude}\n経度: ${coordinates.longitude}`);
    } else {
      Logger.log("Test failed - no coordinates returned");
      SpreadsheetApp.getUi().alert(`テスト失敗: 座標が見つかりませんでした。`);
    }
  } catch (e) {
    Logger.log(`Test encountered an error: ${e.message}`);
    SpreadsheetApp.getUi().alert(`テスト中にエラーが発生しました: ${e.message}`);
  }
  Logger.log("--- Single bridge test complete ---");
}

/**
 * スプレッドシートにカスタムメニューを追加する関数
 * スプレッドシートを開いたときに自動的に実行されます。
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('座標取得')
    .addItem('橋の座標を記入', 'getCoordinatesFromBridgeNames')
    .addSeparator()
    .addItem('APIキーテスト', 'testApiKey')
    .addItem('単体テスト', 'testSingleBridge')
    .addToUi();
}
