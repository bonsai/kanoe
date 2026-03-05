// ============================================
// Three.js Scene Setup
// ============================================

// Three.js設定
let scene, camera, renderer;
let canoe, canoePerson;
let bridges = [];
let river;
let ambientLight, directionalLight;

// 波アニメーション管理用
let wavesAnimationId = null;
let wavesMesh = null;

// Three.js初期化
function initThreeJS() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 10);
    
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ライティング
    ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    scene.add(directionalLight);

    // 川を作成
    createRiver();
    
    // カヌーを作成
    createCanoe();
    
    // 初期橋を作成
    createInitialBridges();
}

// 川を作成
function createRiver() {
    const riverGeometry = new THREE.PlaneGeometry(80, 1000);
    const riverMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x4682B4,
        transparent: true,
        opacity: 0.8
    });
    river = new THREE.Mesh(riverGeometry, riverMaterial);
    river.rotation.x = -Math.PI / 2;
    river.position.y = 0;
    scene.add(river);

    // 水の波紋エフェクト
    const waveGeometry = new THREE.PlaneGeometry(80, 1000, 50, 50);
    const waveMaterial = new THREE.MeshLambertMaterial({
        color: 0x5F9EA0,
        transparent: true,
        opacity: 0.3,
        wireframe: false
    });
    wavesMesh = new THREE.Mesh(waveGeometry, waveMaterial);
    wavesMesh.rotation.x = -Math.PI / 2;
    wavesMesh.position.y = 0.1;
    scene.add(wavesMesh);

    // 波のアニメーション
    function animateWaves() {
        if (!wavesMesh || !wavesMesh.geometry) return;
        
        const positions = wavesMesh.geometry.attributes.position;
        const time = Date.now() * 0.001;
        
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            const y = Math.sin((x + time) * 0.5) * 0.1 + Math.cos((z + time) * 0.3) * 0.05;
            positions.setY(i, y);
        }
        positions.needsUpdate = true;
        wavesAnimationId = requestAnimationFrame(animateWaves);
    }
    animateWaves();
}

// カヌーを作成
function createCanoe() {
    const canoeGroup = new THREE.Group();
    
    // カヌー本体
    const canoeGeometry = new THREE.CylinderGeometry(0.8, 0.5, 4, 8);
    const canoeMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    canoe = new THREE.Mesh(canoeGeometry, canoeMaterial);
    canoe.rotation.x = Math.PI / 2;
    canoe.position.y = 0.3;
    canoe.castShadow = true;
    canoeGroup.add(canoe);

    // 人物
    const personGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.5, 8);
    const personMaterial = new THREE.MeshLambertMaterial({ color: 0xFF6B6B });
    canoePerson = new THREE.Mesh(personGeometry, personMaterial);
    canoePerson.position.set(0, 1.2, 0);
    canoePerson.castShadow = true;
    canoeGroup.add(canoePerson);

    // 頭
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xFFDBB5 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 2.0, 0);
    head.castShadow = true;
    canoeGroup.add(head);

    // パドル
    const paddleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 6);
    const paddleMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const paddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
    paddle.position.set(1, 1.0, 0);
    paddle.rotation.z = Math.PI / 4;
    canoeGroup.add(paddle);

    canoeGroup.position.set(0, gameState.canoeHeight, 0);
    scene.add(canoeGroup);
    
    // グローバル参照用
    window.canoeGroup = canoeGroup;
}
