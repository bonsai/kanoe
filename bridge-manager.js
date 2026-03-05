// ============================================
// Bridge Management
// ============================================

// 橋を作成
function createBridge(bridgeInfo, zPosition) {
    const bridgeGroup = new THREE.Group();
    
    // 橋の種類に応じて異なる形状を作成
    let bridgeColor = 0x696969;
    let bridgeHeight = bridgeInfo.height;
    let bridgeWidth = bridgeInfo.width;
    
    // 橋の種類による色分け
    if (bridgeInfo.type.includes('鉄道')) {
        bridgeColor = 0x4A4A4A;
    } else if (bridgeInfo.type.includes('吊橋')) {
        bridgeColor = 0x8B0000;
    } else if (bridgeInfo.type.includes('トラス')) {
        bridgeColor = 0x2F4F4F;
    }

    // メインの橋桁
    const bridgeDeckGeometry = new THREE.BoxGeometry(bridgeWidth, 1.5, 3);
    const bridgeDeckMaterial = new THREE.MeshLambertMaterial({ color: bridgeColor });
    const bridgeDeck = new THREE.Mesh(bridgeDeckGeometry, bridgeDeckMaterial);
    bridgeDeck.position.set(0, bridgeHeight, 0);
    bridgeDeck.castShadow = true;
    bridgeDeck.receiveShadow = true;
    bridgeGroup.add(bridgeDeck);

    // 橋脚
    const pillarGeometry = new THREE.CylinderGeometry(1, 1.5, bridgeHeight, 8);
    const pillarMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
    
    // 左橋脚
    const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    leftPillar.position.set(-bridgeWidth/3, bridgeHeight/2, 0);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    bridgeGroup.add(leftPillar);
    
    // 右橋脚
    const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    rightPillar.position.set(bridgeWidth/3, bridgeHeight/2, 0);
    rightPillar.castShadow = true;
    rightPillar.receiveShadow = true;
    bridgeGroup.add(rightPillar);

    // トラス構造（トラス橋の場合）
    if (bridgeInfo.type.includes('トラス')) {
        for (let i = 0; i < 5; i++) {
            const trussGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2, 6);
            const trussMaterial = new THREE.MeshLambertMaterial({ color: bridgeColor });
            const truss = new THREE.Mesh(trussGeometry, trussMaterial);
            truss.position.set(-bridgeWidth/2 + (bridgeWidth/4) * i, bridgeHeight + 1, 0);
            truss.rotation.z = (i % 2 === 0) ? Math.PI/6 : -Math.PI/6;
            bridgeGroup.add(truss);
        }
    }

    // 吊橋のケーブル（吊橋の場合）
    if (bridgeInfo.type.includes('吊橋')) {
        const cableGeometry = new THREE.CylinderGeometry(0.05, 0.05, bridgeWidth, 8);
        const cableMaterial = new THREE.MeshLambertMaterial({ color: 0x2F2F2F });
        const cable = new THREE.Mesh(cableGeometry, cableMaterial);
        cable.position.set(0, bridgeHeight + 3, 0);
        cable.rotation.z = Math.PI / 2;
        bridgeGroup.add(cable);
    }

    bridgeGroup.position.set(0, 0, zPosition);
    scene.add(bridgeGroup);

    return {
        group: bridgeGroup,
        info: bridgeInfo,
        passed: false,
        boundingBox: new THREE.Box3().setFromObject(bridgeGroup)
    };
}

// 初期橋を作成
function createInitialBridges() {
    for (let i = 0; i < Math.min(3, bridgeData.length); i++) {
        const bridge = createBridge(
            bridgeData[i], 
            -gameState.bridgeSpacing * (i + 1)
        );
        bridges.push(bridge);
    }
}

// JSONを読み込んでからゲーム初期化
async function loadBridgeDataAndStart() {
    try {
        const res = await fetch('bridges.json');
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        let data = await res.json();
        // 高さ・幅を付与
        data = data.map(b => ({
            ...b,
            height: bridgeDimensions[b.id]?.height || 6.0,
            width: bridgeDimensions[b.id]?.width || 25.0
        }));
        // 順番を反転
        bridgeData = data.slice().reverse();
        // 初期化
        initThreeJS();
        updateBridgeInfo();
        animate();
    } catch (e) {
        console.error('Failed to load bridges:', e);
        console.warn('Using fallback bridge data...');
        // フォールバック：埋め込みデータを使用
        useFallbackBridgeData();
    }
}

// フォールバックデータ（bridges.jsonが読み込めない場合）
function useFallbackBridgeData() {
    const fallbackData = [
        {
            "id": 1,
            "name": "湾岸揖斐川橋（トゥインクル）",
            "distance_from_mouth": 0.0,
            "location": "三重県桑名市",
            "type": "複合エクストラドーズド橋",
            "year_opened": "2002年3月",
            "elevation": 2.0,
            "notes": "伊勢湾岸自動車道の一部"
        },
        {
            "id": 2,
            "name": "揖斐長良大橋",
            "distance_from_mouth": 8.4,
            "location": "三重県桑名市",
            "type": "14連単純平行弦下路鋼ワーレントラス橋",
            "year_opened": "1963年2月",
            "elevation": 3.5,
            "notes": "国道23号の一部"
        },
        {
            "id": 3,
            "name": "長良川河口堰",
            "distance_from_mouth": 5.4,
            "location": "三重県桑名市",
            "type": "水門施設（道路併用）",
            "year_opened": "1994年",
            "elevation": 2.8,
            "notes": "治水・利水目的の重要施設"
        },
        {
            "id": 4,
            "name": "伊勢大橋",
            "distance_from_mouth": 6.2,
            "location": "三重県桑名市",
            "type": "道路橋",
            "year_opened": "不明",
            "elevation": 3.0,
            "notes": "国道1号の一部"
        },
        {
            "id": 5,
            "name": "揖斐・長良川橋梁（近鉄名古屋線）",
            "distance_from_mouth": 7.1,
            "location": "三重県桑名市",
            "type": "鉄道橋",
            "year_opened": "1959年9月（2代目）",
            "elevation": 3.2,
            "notes": "近鉄名古屋線の鉄道橋"
        },
        {
            "id": 6,
            "name": "揖斐・長良川橋梁（関西本線）",
            "distance_from_mouth": 7.5,
            "location": "三重県桑名市",
            "type": "鉄道橋",
            "year_opened": "不明",
            "elevation": 3.3,
            "notes": "JR関西本線の鉄道橋"
        },
        {
            "id": 7,
            "name": "揖斐長良川橋（東名阪自動車道）",
            "distance_from_mouth": 8.0,
            "location": "三重県桑名市",
            "type": "下路式ワーレントラス橋",
            "year_opened": "1975年10月",
            "elevation": 3.4,
            "notes": "東名阪自動車道の橋"
        },
        {
            "id": 8,
            "name": "揖斐長良川水管橋",
            "distance_from_mouth": 8.1,
            "location": "三重県桑名市",
            "type": "ランガートラス",
            "year_opened": "1974年",
            "elevation": 3.4,
            "notes": "木曽川用水の水管橋"
        },
        {
            "id": 9,
            "name": "長良川大橋",
            "distance_from_mouth": 22.7,
            "location": "岐阜県海津市 - 愛知県愛西市",
            "type": "鋼ローゼ橋",
            "year_opened": "1997年",
            "elevation": 8.5,
            "notes": "国道258号の一部"
        },
        {
            "id": 10,
            "name": "美濃橋",
            "distance_from_mouth": 80.0,
            "location": "岐阜県美濃市",
            "type": "単径間補剛吊橋",
            "year_opened": "1916年8月",
            "elevation": 35.0,
            "notes": "現存する日本最古の近代吊橋"
        }
    ];
    
    let data = fallbackData.map(b => ({
        ...b,
        height: bridgeDimensions[b.id]?.height || 6.0,
        width: bridgeDimensions[b.id]?.width || 25.0
    }));
    
    bridgeData = data.slice().reverse();
    nextBridgeElement.innerHTML = '橋データ読み込み完了（フォールバック）';
    
    // 初期化
    initThreeJS();
    updateBridgeInfo();
    animate();
}
