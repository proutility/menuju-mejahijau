import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, deleteDoc, writeBatch, doc, getDoc, updateDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. KONFIGURASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyAC4Tskg8XC1N0a13xcsV3A1Mq_8mDnY-A",
    authDomain: "simulasi-cbt-cakim-2026.firebaseapp.com",
    projectId: "simulasi-cbt-cakim-2026",
    storageBucket: "simulasi-cbt-cakim-2026.firebasestorage.app",
    messagingSenderId: "209182753461",
    appId: "1:209182753461:web:1aa2201fa7c73e581234fc",
    measurementId: "G-NDNKMSMWV2"
};

const ADMIN_EMAILS = ["ilhamnp22@gmail.com", "inurprtma22@gmail.com"]; 
// === MASUKIN EMAIL TEMEN LO DI SINI BIAR JADI EDITOR ===
const EDITOR_EMAILS = ["editor1@gmail.com", "editor2@gmail.com"]; 

let db, auth, provider, currentUser;

window.PROTAMA = {
    alert: (title, text, icon = 'success') => {
        const colors = { success: '#004d00', error: '#c0392b', warning: '#f39c12', info: '#3498db' };
        Swal.fire({ title: title.toUpperCase(), text: text, icon: icon, confirmButtonColor: colors[icon] || '#004d00', confirmButtonText: 'Selesai', background: document.body.classList.contains('dark-mode') ? '#242424' : '#fff', color: document.body.classList.contains('dark-mode') ? '#fff' : '#333' });
    },
    confirm: async (title, text) => {
        const result = await Swal.fire({ title: title.toUpperCase(), text: text, icon: 'warning', showCancelButton: true, confirmButtonColor: '#004d00', cancelButtonColor: '#7f8c8d', confirmButtonText: 'Ya, Lanjutkan', cancelButtonText: 'Batal', background: document.body.classList.contains('dark-mode') ? '#242424' : '#fff', color: document.body.classList.contains('dark-mode') ? '#fff' : '#333' });
        return result.isConfirmed;
    },
    loading: (msg = "Sedang memproses...") => { Swal.fire({ title: 'MOHON TUNGGU', html: `<strong>${msg}</strong>`, allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } }); },
    close: () => { Swal.close(); }
};

if (firebaseConfig.apiKey) { const app = initializeApp(firebaseConfig); auth = getAuth(app); db = getFirestore(app); window.db = db; provider = new GoogleAuthProvider(); }

const legalTerms = ["PACTA-SUNT-SERVANDA", "IUS-CURIA-NOVIT", "LEX-SPECIALIS", "AUDI-ALTERAM-PARTEM", "ULTIMUM-REMEDIUM", "FIKSI-HUKUM", "LEGAL-STANDING", "DUE-PROCESS", "EQUITY-BEFORE-LAW", "RESTORATIVE-JUSTICE", "CONTEMPT-OF-COURT", "EX-AEQUO-ET-BONO", "PRO-BONO", "HAK-IMUNITAS", "PRADUGA-TAK-BERSALAH", "EQUALITY-BEFORE-THE-LAW", "DUE-PROCESS-OF-LAW", "RESTITUTIO-IN-INTEGRUM", "SALUS-POPULI-SUPREMA-LEX", "LEX-POSTERIORI", "LEX-SUPERIOR", "UBI-SOCIETAS-IBI-IUS", "NULLUM-DELICTUM", "IN-DUBIO-PRO-REO", "NE-BIS-IN-IDEM", "ACTUS-REUS", "MENS-REA", "AD-MALA-RES-PULSA", "BONA-FIDES", "UNJUST-ENRICHMENT", "NON-DEROGABLE-RIGHTS", "VERBA-VOLANT", "AL-ADALAH", "AL-MUSAWWAH", "AL-AMANAH", "AL-HURIYYAH", "AS-SHULHU-SAYYIDUL-AHKAM", "AL-YAQINU-LA-YUZALU", "AL-UMURU-BIMAQASHIDIHA", "AL-ADATU-MUHAKKAMAH", "SUMMUM-IUS", "COGITATIONIS-POENAM", "EI-INCUMBIT-PROBATIO", "FACTA-SUNT-POTENTIORA", "IGNORANTIA-EXCUSAT", "INDEX-ANIMI-SERMO", "IUSTITIA-EST-CONSTANS", "LEX-DIVINA", "NEMO-JUDEX", "SIMILIA-SIMILIBUS", "TESTIMONIUM-DE-AUDITU"];

if(auth) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user; const gateOverlay = document.getElementById('gatekeeperOverlay'); watchMaintenance(); 
            const isSuperAdmin = ADMIN_EMAILS.includes(user.email);
            const isEditor = EDITOR_EMAILS.includes(user.email);

            if (isSuperAdmin || isEditor) {
                document.body.classList.add('is-admin'); 
                const btnAdmin = document.getElementById('btnAdminPanel'); if(btnAdmin) btnAdmin.style.display = 'flex'; 
                const btnAdminLobby = document.getElementById('btnAdminLobby'); if(btnAdminLobby) btnAdminLobby.style.display = 'block';

                if (isEditor && !isSuperAdmin) {
                    setTimeout(() => {
                        ['btnToggleMaintenance', 'jsonUploadArea', 'adminModulTarget'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
                        ['button[onclick="window.switchAdminTab(\'status\')"]', 'button[onclick="window.eksekusiUpload()"]', 'button[onclick="window.downloadSoalExcel()"]', 'button[onclick="window.downloadSoalJSON()"]'].forEach(sel => { const el = document.querySelector(sel); if (el) el.style.display = 'none'; });
                    }, 500);
                }
            } else { document.body.classList.remove('is-admin'); }

            document.getElementById('loginOverlay').style.setProperty('display', 'none', 'important');
            if(gateOverlay) gateOverlay.style.display = 'flex';
            document.getElementById('gateLoading').style.display = 'block'; document.getElementById('gateInputArea').style.display = 'none';

            try {
                const accessRef = doc(db, "vip_access", user.email); const accessSnap = await getDoc(accessRef);
                if (accessSnap.exists()) {
                    if (accessSnap.data().isVerified === true) { lanjutKeAplikasi(); } else { showGateInput(user.displayName, user.email); window.updateUserStatus(true, "VIP Gatekeeper"); }
                } else {
                    const finalCode = `${legalTerms[Math.floor(Math.random() * legalTerms.length)]}-${Math.floor(100 + Math.random() * 899)}`;
                    await setDoc(accessRef, { name: user.displayName, email: user.email, code: finalCode, isVerified: false, createdAt: new Date() });
                    fetch("https://script.google.com/macros/s/AKfycbwZcPxD1ZX8CgW8yhGZA9AM3S39jmpxFlti9sU_RlYP/dev", { method: "POST", mode: "no-cors", body: JSON.stringify({ user_name: user.displayName, user_email: user.email, vip_code: finalCode }) })
                    .then(() => { showGateInput(user.displayName, user.email); window.updateUserStatus(true, "VIP Gatekeeper"); })
                    .catch(err => { console.error("Gagal fetch GAS:", err); showGateInput(user.displayName, user.email); window.updateUserStatus(true, "VIP Gatekeeper"); });
                }
            } catch (e) { alert("Gagal memuat data akses: " + e.message); }
        } else {
            document.body.classList.remove('is-admin'); document.getElementById('loginOverlay').style.setProperty('display', 'block', 'important'); document.getElementById('appSection').style.display = 'none'; if(document.getElementById('gatekeeperOverlay')) document.getElementById('gatekeeperOverlay').style.display = 'none';
        }
    });
}

function lanjutKeAplikasi() {
    document.getElementById('loginOverlay').style.setProperty('display', 'none', 'important'); const gate = document.getElementById('gatekeeperOverlay'); if(gate) gate.style.display = 'none';
    document.getElementById('appSection').style.display = 'flex'; if(typeof window.tampilkanLobby === 'function') window.tampilkanLobby();
    if(currentUser) {
        document.getElementById('roleDisplay').innerText = currentUser.displayName; document.getElementById('userAvatar').src = currentUser.photoURL;
        const roleLabel = document.querySelector('.user-role-label');
        if (ADMIN_EMAILS.includes(currentUser.email)) { if(roleLabel) roleLabel.innerHTML = '<i class="fas fa-user-shield" style="color:#ffd700;"></i> Administrator'; } else { if(roleLabel) roleLabel.innerHTML = '<i class="fas fa-user-tie"></i> Peserta Ujian'; }
    }
    document.getElementById('floatingTimer').style.display = 'none'; document.getElementById('mobileFooter').style.display = 'none'; 
    setTimeout(() => { if(typeof window.loadLobbyData === 'function') window.loadLobbyData(); }, 1000); window.updateUserStatus(true, "Lobby Utama");
}

function showGateInput(name, email) { document.getElementById('gateLoading').style.display = 'none'; document.getElementById('gateInputArea').style.display = 'block'; document.getElementById('gateUserName').innerText = name.split(" ")[0]; document.getElementById('gateEmailUser').innerText = email; }

window.verifyVipCode = async () => {
    const input = document.getElementById('inputVipCode').value.trim().toUpperCase(), btn = document.getElementById('btnVerifyVip');
    if(!input) return alert("Silahkan masukan kode unik!"); btn.innerText = "Memverifikasi..."; btn.disabled = true;
    try {
        const accessRef = doc(db, "vip_access", currentUser.email), accessSnap = await getDoc(accessRef);
        if (accessSnap.exists() && accessSnap.data().code === input) { await updateDoc(accessRef, { isVerified: true, verifiedAt: new Date() }); alert("✅ Akses VIP Terbuka! Selamat Belajar."); lanjutKeAplikasi(); } else { document.getElementById('vipError').style.display = 'block'; btn.innerText = "BUKA AKSES SEKARANG"; btn.disabled = false; }
    } catch (e) { alert("Error verifikasi: " + e.message); btn.disabled = false; }
};

window.handleLogin = async () => { if(!auth) { alert("Firebase Error!"); return; } try { await signInWithPopup(auth, provider); } catch (error) { document.getElementById('loginError').innerText = error.message; } };
window.handleLogout = async () => { if(auth) { if(currentUser) await window.updateUserStatus(false, "Offline"); signOut(auth).then(() => location.reload()); } };

function watchMaintenance() {
    if (!db) return; const statusRef = doc(db, "settings", "app_status");
    onSnapshot(statusRef, (docSnap) => {
        if (docSnap.exists()) {
            const isMaintenance = docSnap.data().maintenance, btn = document.getElementById('btnToggleMaintenance'), overlay = document.getElementById('maintenanceOverlay');
            if (btn) { if (isMaintenance) { btn.innerHTML = '<i class="fas fa-lock"></i> Maintenance: ON'; btn.style.background = "#c0392b"; } else { btn.innerHTML = '<i class="fas fa-lock-open"></i> Maintenance: OFF'; btn.style.background = "#2e7d32"; } }
            if (isMaintenance && !ADMIN_EMAILS.includes(currentUser?.email)) { if (overlay) overlay.style.display = 'block'; } else { if (overlay) overlay.style.display = 'none'; }
        }
    });
}
window.toggleMaintenanceStatus = async () => {
    const statusRef = doc(db, "settings", "app_status");
    try { const docSnap = await getDoc(statusRef); if (docSnap.exists()) { const currentStatus = docSnap.data().maintenance; await updateDoc(statusRef, { maintenance: !currentStatus, lastUpdated: new Date(), updatedBy: currentUser.displayName }); } else { await setDoc(statusRef, { maintenance: true }); alert("Status Maintenance dibuat: AKTIF"); } } catch (e) { alert("Gagal mengubah status: " + e.message); }
};

window.saveScoreToCloud = async (modulId, skor) => { if (!currentUser || !db) return; try { await addDoc(collection(db, "leaderboard"), { uid: currentUser.uid, nama: currentUser.displayName, modul: modulId, skor: skor, tanggal: new Date() }); } catch (e) {} };
window.savePapiToCloud = async (status, totalFail, detail) => { if(!auth.currentUser) return; try { await addDoc(collection(db, "riwayat_psikotes"), { uid: auth.currentUser.uid, nama: auth.currentUser.displayName, modul: window.currentDatabaseId || "PAPI Kostick", status: status, fail_count: totalFail, detail_skor: detail, createdAt: new Date() }); } catch (e) {} };

window.openLeaderboard = async (mode = 'local') => {
    if (!window.db) return alert("Database belum siap!");
    const overlay = document.getElementById('leaderboardOverlay'), tbody = document.getElementById('leaderboardBody'), titleEl = document.getElementById('lbModulName'), tableHeader = document.querySelector('#leaderboardOverlay .stats-table thead tr');
    if(overlay) overlay.style.display = 'flex'; if(tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Memuat Data...</td></tr>';
    try {
        if (mode === 'global') {
            if(titleEl) titleEl.innerText = "Ranking Global (Hukum & TPA)"; if(tableHeader) tableHeader.innerHTML = '<th style="width:10%">No</th><th>Nama</th><th style="width:20%">Nilai</th><th style="width:25%">Total Tes</th>';
            const qLb = query(collection(window.db, "leaderboard"), orderBy("skor", "desc"), limit(1000)); const snapLb = await getDocs(qLb); let userTotals = {}; 
            snapLb.forEach(doc => { const d = doc.data(), namaModul = d.modul ? d.modul.toString().toLowerCase() : ""; if (namaModul.includes('papi') || namaModul === 'modul18') return; const nilai = parseInt(d.skor) || 0; if (!userTotals[d.nama]) userTotals[d.nama] = {}; if (!userTotals[d.nama][d.modul] || nilai > userTotals[d.nama][d.modul]) userTotals[d.nama][d.modul] = nilai; });
            let rankingList = []; for (let [nama, modules] of Object.entries(userTotals)) { const totalPoints = Object.values(modules).reduce((a, b) => a + b, 0), moduleCount = Object.keys(modules).length; rankingList.push({ nama: nama, total: totalPoints, count: moduleCount }); }
            rankingList.sort((a, b) => b.total - a.total);
            if(tbody) { tbody.innerHTML = ''; if (rankingList.length === 0) { tbody.innerHTML = '<tr><td colspan="4">Belum ada data Hukum/TPA.</td></tr>'; } else { rankingList.slice(0, 50).forEach((val, index) => { let rankDisplay = index + 1, rowStyle = '', icon = ''; if (index === 0) { rowStyle = 'background:#fff9c4; font-weight:bold;'; icon = '🥇 '; } else if (index === 1) { rowStyle = 'background:#f5f5f5; font-weight:bold;'; icon = '🥈 '; } else if (index === 2) { rowStyle = 'background:#fff; border:1px solid #d7ccc8; font-weight:bold;'; icon = '🥉 '; } const tr = document.createElement('tr'); tr.innerHTML = `<td style="text-align:center; ${rowStyle}">${icon}${rankDisplay}</td><td style="${rowStyle}">${val.nama}</td><td style="text-align:center; ${rowStyle}">${val.total} Pts</td><td style="text-align:center; font-size:0.85rem; ${rowStyle}">${val.count} Modul</td>`; tbody.appendChild(tr); }); } }
        } else {
            const currentModul = window.currentDatabaseId || "modul1"; if(titleEl) { const elJudul = document.getElementById('modulTitle'); titleEl.innerText = elJudul ? elJudul.innerText : currentModul; }
            if(tableHeader) tableHeader.innerHTML = '<th style="width:10%">#</th><th>Nama</th><th style="width:20%">Skor</th><th style="width:25%">Waktu</th>';
            const q = query(collection(window.db, "leaderboard"), where("modul", "==", currentModul), orderBy("skor", "desc"), limit(50)); const snapshot = await getDocs(q); const bestScores = {}; snapshot.forEach((doc) => { const data = doc.data(); if (!bestScores[data.nama] || parseInt(data.skor) > parseInt(bestScores[data.nama].skor)) bestScores[data.nama] = data; });
            let sortedData = Object.values(bestScores).sort((a, b) => b.skor - a.skor);
            if(tbody) { tbody.innerHTML = ''; if (sortedData.length === 0) { tbody.innerHTML = '<tr><td colspan="4">Belum ada data modul ini.</td></tr>'; } else { sortedData.forEach((val, index) => { let tgl = val.tanggal && val.tanggal.seconds ? new Date(val.tanggal.seconds * 1000).toLocaleDateString('id-ID') : '-'; const tr = document.createElement('tr'); tr.innerHTML = `<td>${index + 1}</td><td>${val.nama}</td><td>${val.skor}</td><td>${tgl}</td>`; tbody.appendChild(tr); }); } }
        }
    } catch (error) { if(tbody) tbody.innerHTML = `<tr><td colspan="4" style="color:red;">Gagal memuat: ${error.message}</td></tr>`; }
};
window.closeLeaderboard = () => { document.getElementById('leaderboardOverlay').style.display = 'none'; };

function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }
let currentModulKey = 'modul1', currentQuestions = [], currentIdx = 0, userAnswers = [], raguStatus = [], isSubmitted = false, timerInterval, timeRemaining, totalExamTime = 0, isReviewMode = false, wrongIndices = [];
window.currentDatabaseId = 'modul1';

window.toggleMobileSidebar = function() {
    const sidebar = document.querySelector('.sidebar-right'), floatingTimer = document.getElementById('floatingTimer'), mobileFooter = document.getElementById('mobileFooter');
    sidebar.classList.toggle('show-mobile');
    if (sidebar.classList.contains('show-mobile')) { if(floatingTimer) floatingTimer.style.setProperty('display', 'none', 'important'); if(mobileFooter) mobileFooter.style.display = 'none'; } else { if (document.body.classList.contains('ujian-berjalan')) { if(floatingTimer) floatingTimer.style.display = 'block'; if(mobileFooter) mobileFooter.style.display = 'flex'; } }
    if (!document.getElementById('btnCloseMobile')) { const btnClose = document.createElement('button'); btnClose.id = 'btnCloseMobile'; btnClose.className = 'close-sidebar-btn'; btnClose.innerHTML = 'Tutup Daftar Soal ✖️'; btnClose.onclick = window.toggleMobileSidebar; sidebar.insertBefore(btnClose, sidebar.firstChild); }
}

window.toggleMobileModul = function() {
    const sidebar = document.querySelector('.sidebar-left'), timer = document.getElementById('floatingTimer'), mobileFooter = document.getElementById('mobileFooter');
    if (sidebar.style.display === 'flex') { sidebar.style.display = ''; if(timer && document.body.classList.contains('ujian-berjalan')) timer.style.display = 'block'; if(mobileFooter) mobileFooter.style.display = 'flex'; } else { sidebar.style.display = 'flex'; if(timer) timer.style.display = 'none'; if(mobileFooter) mobileFooter.style.display = 'none'; }
}

// === PENGGABUNGAN ANTI-CHEAT & KEYBOARD SHORTCUT ===
const isUserAdminOrEditor = () => document.body.classList.contains('is-admin');
['contextmenu', 'selectstart', 'dragstart'].forEach(evt => document.addEventListener(evt, e => { if (!isUserAdminOrEditor()) e.preventDefault(); }));

document.addEventListener('keydown', function(event) {
    if (!isUserAdminOrEditor() && (event.key === 'F12' || (event.ctrlKey && event.shiftKey && ['I', 'J'].includes(event.key)) || (event.ctrlKey && ['u', 'U', 's', 'p', 'a', 'c'].includes(event.key)))) {
        event.preventDefault(); event.stopPropagation(); alert("⚠️ Eits! Fitur ini dikunci demi keamanan ujian."); return false;
    }
    if(document.getElementById('appSection').style.display === 'none') return;
    switch(event.key) {
        case "ArrowRight": window.changeQuestion(1); break;
        case "ArrowLeft": window.changeQuestion(-1); break;
        case "a": case "A": selectKey(0); break;
        case "b": case "B": selectKey(1); break;
        case "c": case "C": selectKey(2); break;
        case "d": case "D": selectKey(3); break;
        case "e": case "E": if(!isSubmitted) { const chk = document.getElementById('checkRagu'); if(chk) { chk.checked = !chk.checked; window.toggleRagu(); } } break;
    }
});

function selectKey(idx) { if(!isSubmitted && !isReviewMode) { let labels = document.getElementsByClassName('option-label'); if(labels[idx]) labels[idx].click(); } }

window.switchDatabase = async function(key) {
    if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval); window.speechSynthesis.cancel();
    document.getElementById('lobbySidebarContent').style.display = 'none'; const examSide = document.getElementById('examSidebarContent'); if(examSide) examSide.style.display = 'flex';
    currentModulKey = key; window.currentDatabaseId = key; window.updateUserStatus(true, "Mengerjakan " + key.toUpperCase());
    
    const qText = document.getElementById('questionText'), optCont = document.getElementById('optionsContainer'), footer = document.querySelector('.footer-nav');
    if(qText) qText.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px;"><i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 20px;"></i><p style="font-weight: 600; color: #555;">Sedang menyiapkan soal...</p></div>`;
    if(optCont) optCont.innerHTML = ''; if(footer) footer.style.visibility = 'hidden';

    try {
        const docRef = doc(db, "bank_soal", key); const docSnap = await getDoc(docRef); let judulModul = "Modul Latihan"; if (docSnap.exists()) judulModul = docSnap.data().title;
        const qRef = collection(db, "bank_soal", key, "daftar_soal"); const qSnap = await getDocs(qRef);

        if (qSnap.empty) { alert("⚠️ Soal untuk modul ini belum di-upload ke server!"); if(qText) qText.innerText = "Belum ada soal."; return; }

        const dataLama = loadProgresLokal(key);
        if (dataLama && dataLama.soalAcak && dataLama.soalAcak.length > 0) {
            currentQuestions = dataLama.soalAcak; userAnswers = dataLama.jawaban; raguStatus = dataLama.ragu;
            totalExamTime = currentQuestions.length * 30; timeRemaining = dataLama.waktuSisa !== undefined ? dataLama.waktuSisa : totalExamTime;
        } else {
            let rawQuestions = []; qSnap.forEach((doc) => { rawQuestions.push(doc.data()); });
            shuffleArray(rawQuestions); 
            rawQuestions.forEach(q => { if(q.options && q.answer < q.options.length) { let correctText = q.options[q.answer]; shuffleArray(q.options); q.answer = q.options.indexOf(correctText); } });
            currentQuestions = rawQuestions; userAnswers = new Array(currentQuestions.length).fill(null); raguStatus = new Array(currentQuestions.length).fill(false);
            totalExamTime = currentQuestions.length * 30; timeRemaining = totalExamTime; simpanProgresTotal(); 
        }

        isSubmitted = false; isReviewMode = false; currentIdx = 0;
        document.querySelectorAll('.modul-btn').forEach(btn => btn.classList.remove('active-modul')); const activeBtn = document.getElementById('btn-'+key); if(activeBtn) activeBtn.classList.add('active-modul');

        const titleEl = document.getElementById('modulTitle'); if(titleEl) titleEl.innerText = judulModul;
        const modeInd = document.getElementById('modeIndicator'); if(modeInd) { modeInd.innerText = "Mode: Ujian"; modeInd.style = "color: var(--warning); font-weight: bold; background:#fff3e0; padding:5px 15px; border-radius:20px; border:1px solid #ffe0b2; display:block;"; }
        
        const finishCont = document.querySelector('.finish-container'); if(finishCont) finishCont.style.display = 'block';
        document.getElementById('resultOverlay').style.display = 'none'; document.getElementById('statsOverlay').style.display = 'none'; document.getElementById('leaderboardOverlay').style.display = 'none';
        const btnScore = document.getElementById('btnShowScore'); if(btnScore) btnScore.style.display = 'none';
        if(footer) { footer.style.visibility = 'visible'; footer.style.display = 'flex'; }
        if(qText) qText.style.display = 'block';
        
        updateTimerDisplay(); renderSidebarGrid();
        
        if (key === 'modul19.3') { if (timerInterval) clearInterval(timerInterval); showMemorizationPhase(); } else { startTimer(); loadQuestion(0); }
        if(window.innerWidth <= 768) {
            document.body.classList.add('ujian-berjalan'); 
            const mobileFooter = document.getElementById('mobileFooter'); if(mobileFooter) mobileFooter.style.display = 'flex';
            const timer = document.getElementById('floatingTimer'); if(timer) timer.style.display = 'block';
            const sbLeft = document.querySelector('.sidebar-left'); if(sbLeft) sbLeft.style.display = ''; 
        }
    } catch (e) { alert("Gagal memuat soal: " + e.message); }
};

window.downloadSoal = async function(modulKey) {
    const qRef = collection(db, "bank_soal", modulKey, "daftar_soal"); const snapshot = await getDocs(qRef); let dataSoal = [];
    snapshot.forEach(doc => { const d = doc.data(); dataSoal.push({ q: d.q, options: d.options, answer: d.answer, explanation: d.explanation, cite: d.cite }); });
    console.log("✅ COPY TEKS DI BAWAH INI KE NOTEPAD:\n" + JSON.stringify(dataSoal, null, 2)); return dataSoal;
};

window.timpaModul = async function(modulKey, dataBaruJson) {
    if(!confirm(`⚠️ BAHAYA: Ini akan MENGHAPUS semua soal lama di ${modulKey} dan menggantinya dengan data baru. Yakin?`)) return;
    const qRef = collection(db, "bank_soal", modulKey, "daftar_soal"); const snapshot = await getDocs(qRef); const batchDelete = writeBatch(db); snapshot.forEach(doc => { batchDelete.delete(doc.ref); }); await batchDelete.commit();
    const chunks = []; let currentBatch = writeBatch(db), count = 0;
    for (const soal of dataBaruJson) { const newDocRef = doc(collection(db, "bank_soal", modulKey, "daftar_soal")); currentBatch.set(newDocRef, soal); count++; if (count >= 490) { chunks.push(currentBatch); currentBatch = writeBatch(db); count = 0; } }
    if (count > 0) chunks.push(currentBatch); for (let batch of chunks) await batch.commit();
    alert("✅ SUKSES! Modul berhasil direvisi total."); location.reload(); 
};

function startTimer() {
    timerInterval = setInterval(() => {
        if(timeRemaining > 0) { timeRemaining--; updateTimerDisplay(); simpanProgresTotal(); } else { clearInterval(timerInterval); finishTime(); }
    }, 1000);
}

function updateTimerDisplay() {
    const m = Math.floor(timeRemaining / 60), s = timeRemaining % 60;
    const textWaktu = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const t1 = document.getElementById('timerDisplay'), t2 = document.getElementById('floatingTimer');
    if(t1) t1.innerText = textWaktu; if(t2) t2.innerText = textWaktu;
    let persentase = (timeRemaining / totalExamTime) * 100, colorClass = 'timer-green';
    if (persentase <= 10) colorClass = 'timer-panic'; else if (persentase <= 30) colorClass = 'timer-yellow';
    if(t1) t1.className = 'timer-container ' + colorClass; if(t2) t2.className = colorClass;
}

function finishTime() { alert("Waktu Habis!"); window.submitQuiz(); }

function renderSidebarGrid() {
    const grid = document.getElementById('navGrid'); grid.innerHTML = '';
    currentQuestions.forEach((_, idx) => {
        const btn = document.createElement('div'); btn.className = 'nav-btn'; btn.id = `nav-${idx}`; btn.innerText = idx + 1;
        btn.onclick = () => { loadQuestion(idx); if (window.innerWidth <= 768) { const sb = document.querySelector('.sidebar-right'); if (sb && sb.classList.contains('show-mobile')) { window.toggleMobileSidebar(); } } };
        grid.appendChild(btn);
    });
    updateSidebarStatus();
}

function updateSidebarStatus() {
    currentQuestions.forEach((q, idx) => {
        const btn = document.getElementById(`nav-${idx}`); if(!btn) return;
        btn.classList.remove('active', 'filled', 'correct', 'wrong', 'ragu');
        if (idx === currentIdx) btn.classList.add('active');
        if (isSubmitted) { if (userAnswers[idx] === q.answer) btn.classList.add('correct'); else btn.classList.add('wrong'); } 
        else { if (raguStatus[idx]) btn.classList.add('ragu'); else if (userAnswers[idx] !== null) btn.classList.add('filled'); }
    });
}

function loadQuestion(idx) {
    window.speechSynthesis.cancel(); const btnSpeakIcon = document.querySelector('#btnSpeak i'); if(btnSpeakIcon) btnSpeakIcon.className = 'fas fa-volume-up';
    document.querySelector('.question-header').style.visibility = 'visible'; document.querySelector('.footer-nav').style.visibility = 'visible';
    currentIdx = idx; const q = currentQuestions[idx]; if (!q) return;

    const mainContent = document.querySelector('.main-content'); if(mainContent) mainContent.scrollTop = 0;
    const qNumEl = document.getElementById('qNum'), qTextEl = document.getElementById('questionText');
    if(qNumEl) qNumEl.innerText = idx + 1; if(qTextEl) qTextEl.innerText = q.q;
    
    updateSidebarStatus(); updateProgress();
    document.getElementById('prevBtn').disabled = (isReviewMode ? false : idx === 0);
    
    const btnNext = document.getElementById('nextBtn'); btnNext.style.display = 'block'; 
    if (idx === currentQuestions.length - 1) {
        if (isSubmitted) { btnNext.style.display = 'none'; } else {
            if (window.innerWidth <= 768) { btnNext.innerHTML = "Selesai"; btnNext.className = "btn btn-finish"; btnNext.onclick = window.confirmFinish; } else { btnNext.style.display = 'none'; }
        }
    } else {
        btnNext.innerHTML = isReviewMode ? "Lanjut (Salah) ❯" : "Selanjutnya ❯"; if(isSubmitted) btnNext.innerHTML = "Selanjutnya ❯"; 
        btnNext.className = "btn btn-next"; btnNext.onclick = () => window.changeQuestion(1);
    }
    
    if (isReviewMode) { btnNext.style.display = 'block'; btnNext.innerHTML = "Lanjut (Salah) ❯"; btnNext.className = "btn btn-next"; btnNext.onclick = () => window.changeQuestion(1); }

    const fb = document.getElementById('feedbackBox');
    if (isSubmitted) {
        if(fb) { fb.style.display = 'block'; fb.classList.add('show'); }
        const teksPembahasan = q.explanation || ""; const jawabanBenar = q.options && q.answer !== undefined ? q.options[q.answer] : ""; 
        const highlightTeks = (teks, keyword) => { if (!keyword) return teks; const regex = new RegExp(`(${keyword})`, 'gi'); return teks.replace(regex, `<span style="background-color: #fff9c4; color: #004d00; font-weight: bold; padding: 0 2px; border-bottom: 2px solid #d4af37;">$1</span>`); };
        const fText = document.getElementById('feedbackText'); if(fText) fText.innerHTML = highlightTeks(teksPembahasan, jawabanBenar);
        
        const teksSumber = q.cite || "-"; const fCite = document.getElementById('feedbackCite');
        if(fCite) {
            if (teksSumber !== "-") { const linkPencarian = `https://www.google.com/search?q=${encodeURIComponent("Isi " + teksSumber)}`; fCite.innerHTML = `Sumber: <a href="${linkPencarian}" target="_blank" style="color: #2980b9; text-decoration: underline; font-weight: bold;">${teksSumber} <i class="fas fa-external-link-alt"></i></a>`; } 
            else { fCite.innerHTML = "Sumber: -"; }
        }
    } else { if(fb) { fb.style.display = 'none'; fb.classList.remove('show'); } }

    const cont = document.getElementById('optionsContainer'); cont.innerHTML = '';
    if(q.options) {
        q.options.forEach((opt, i) => {
            const div = document.createElement('div'); div.className = 'option-label';
            if(isSubmitted) {
                div.style.cursor = 'default';
                if(userAnswers[idx] === i) { div.innerHTML = i === q.answer ? opt + ' ✅' : opt + ' ❌'; div.classList.add(i === q.answer ? 'review-correct' : 'review-wrong'); }
                else if(i === q.answer) { div.innerHTML = opt + ' ⬅️ (Jawaban Benar)'; div.classList.add('review-correct'); } 
                else { div.innerHTML = opt; }
            } else {
                div.innerHTML = opt;
                div.onclick = () => { if(!isSubmitted) { userAnswers[idx] = i; raguStatus[idx] = false; loadQuestion(idx); simpanProgresTotal(); } };
                if(userAnswers[idx] === i) div.classList.add('selected');
            }
            cont.appendChild(div);
        });
    }

    const chk = document.getElementById('checkRagu'); if(chk) { chk.checked = raguStatus[idx] || false; chk.disabled = isSubmitted; }
}

window.submitQuiz = function() {
    if(typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval); window.speechSynthesis.cancel();
    const currentDB = window.currentDatabaseId || ""; hapusProgresModul(currentDB);
    const sbRight = document.querySelector('.sidebar-right'); if (sbRight) { sbRight.classList.remove('show-mobile'); sbRight.style.display = ''; }
    const floatTimer = document.getElementById('floatingTimer'); if(floatTimer) floatTimer.style.setProperty('display', 'none', 'important');

    if (currentDB === 'modul18' || currentDB.includes('papi') || currentDB === 'modul_papi') {
        document.body.classList.remove('mode-focus'); isSubmitted = true;
        let papiScores = {}; const traits = ['G','L','I','T','V','S','R','D','C','E','N','A','P','X','B','O','Z','K','F','W']; traits.forEach(t => papiScores[t] = 0);
        userAnswers.forEach((choiceIndex, qIndex) => { if (choiceIndex !== null && currentQuestions[qIndex] && currentQuestions[qIndex].papi_keys && currentQuestions[qIndex].papi_keys.length === 2) { const aspect = currentQuestions[qIndex].papi_keys[choiceIndex]; if(papiScores[aspect] !== undefined) papiScores[aspect]++; } });

        const pdfTargets = [
            { id: 'R', mapTo: 'R', min: 6, max: 9, label: "Role Consistency", cat: "WAJIB" }, { id: 'D', mapTo: 'I', min: 5, max: 7, label: "Decision Making", cat: "WAJIB" }, 
            { id: 'E', mapTo: 'E', min: 6, max: 9, label: "Emotional Restraint", cat: "WAJIB" }, { id: 'M', mapTo: 'F', min: 6, max: 9, label: "Discipline", cat: "WAJIB" }, 
            { id: 'B', mapTo: 'B', min: 6, max: 9, label: "Perseverance", cat: "WAJIB" }, { id: 'N', mapTo: 'N', min: 6, max: 9, label: "Need to Finish", cat: "WAJIB" }, 
            { id: 'C', mapTo: 'C', min: 6, max: 9, label: "Conformity", cat: "WAJIB" }, { id: 'A', mapTo: 'D', min: 6, max: 9, label: "Attention to Detail", cat: "WAJIB" }, 
            { id: 'Z', mapTo: 'Z', min: 5, max: 7, label: "Self Control", cat: "WAJIB" }, { id: 'W', mapTo: 'W', min: 7, max: 9, label: "Need for Rules", cat: "WAJIB" }, 
            { id: 'L', mapTo: 'L', min: 4, max: 6, label: "Leadership", cat: "NORMAL" }, { id: 'T', mapTo: 'T', min: 4, max: 6, label: "Work Tempo", cat: "NORMAL" }, 
            { id: 'V', mapTo: 'V', min: 4, max: 6, label: "Vigor", cat: "NORMAL" }, { id: 'P', mapTo: 'P', min: 5, max: 7, label: "Independence", cat: "NORMAL" }, 
            { id: 'X', mapTo: 'X', min: 0, max: 4, label: "Need to be Noticed", cat: "RISK" }, { id: 'S', mapTo: 'S', min: 0, max: 4, label: "Social Extension", cat: "RISK" }, 
            { id: 'G', mapTo: 'G', min: 0, max: 4, label: "Influence / Dominance", cat: "RISK" }, { id: 'K', mapTo: 'K', min: 0, max: 3, label: "Aggression", cat: "RISK" }, 
            { id: 'O', mapTo: 'O', min: 0, max: 3, label: "Need for Closeness", cat: "RISK" }
        ];

        let analysisTableRows = "", riskCount = 0, wajibFailCount = 0, detailNotes = [];
        pdfTargets.forEach(t => {
            const score = papiScores[t.mapTo] !== undefined ? papiScores[t.mapTo] : 0; let status = "✅ OK", color = "green", rowBg = "";
            if (score < t.min || score > t.max) {
                if (t.cat === "RISK" && score > t.max) { status = "⛔ BAHAYA"; color = "red"; rowBg = "#ffebee"; riskCount++; detailNotes.push(`⚠️ <b>${t.label}</b> Tinggi (${score}). Risiko pelanggaran etik.`); } 
                else if (t.cat === "WAJIB") { status = score < t.min ? "KURANG" : "BERLEBIH"; color = "#d35400"; rowBg = "#fff3e0"; wajibFailCount++; if (score < t.min) detailNotes.push(`🔸 <b>${t.label}</b> Rendah (${score}). Perlu ditingkatkan.`); } 
                else { status = "⚠️ Cek"; color = "#f39c12"; }
            }
            analysisTableRows += `<tr style="border-bottom:1px solid #eee; background-color:${rowBg};"><td style="padding:6px;"><b>${t.id}</b> - ${t.label}</td><td style="padding:6px; text-align:center;">${t.min}-${t.max}</td><td style="padding:6px; text-align:center; font-weight:bold;">${score}</td><td style="padding:6px; font-weight:bold; color:${color}; text-align:right;">${status}</td></tr>`;
        });

        const analysisTable = `<table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-top:10px;"><tr style="background:#f5f5f5; text-align:left; border-bottom:2px solid #ddd;"><th>Aspek (PDF)</th><th style="text-align:center;">Target</th><th style="text-align:center;">Skor</th><th style="text-align:right;">Status</th></tr>${analysisTableRows}</table>`;
        let statusAkhir = "DISARANKAN", statusColor = "#2ecc71", icon = "⚖️", headerMsg = "Profil Sesuai Standar Kompetensi Hakim.";
        if (riskCount > 0) { statusAkhir = "PERLU PERBAIKAN"; statusColor = "#c0392b"; icon = "⛔"; headerMsg = `Ditemukan ${riskCount} Indikator Risiko Tinggi!`; } else if (wajibFailCount > 2) { statusAkhir = "PERLU PERBAIKAN"; statusColor = "#e67e22"; icon = "⚠️"; headerMsg = `Profil belum konsisten (Gagal di ${wajibFailCount} aspek inti).`; }

        const scoreCircle = document.getElementById('finalScore'), passStatus = document.getElementById('passStatus'), msg = document.getElementById('resultMsg'), btnReview = document.getElementById('btnReviewWrong');
        if(scoreCircle) { scoreCircle.innerText = icon; scoreCircle.style.background = statusColor; }
        if(passStatus) { passStatus.innerText = statusAkhir; passStatus.style.color = statusColor; }
        if(msg) {
            msg.innerHTML = `<div style="text-align:left; margin-bottom:10px; font-weight:bold; color:${statusColor}">${headerMsg}</div>`;
            if (detailNotes.length > 0) { msg.innerHTML += `<div style="text-align:left; font-size:0.85rem; background:#fff8e1; padding:10px; border-radius:6px; border:1px solid #ffe0b2; margin-bottom:15px;"><strong>Catatan Penting:</strong><ul style="margin:5px 0 0 0; padding-left:20px;">${detailNotes.map(n => `<li>${n}</li>`).join('')}</ul></div>`; }
            msg.innerHTML += `<div style="max-height:250px; overflow-y:auto; border:1px solid #eee; border-radius:6px;">${analysisTable}</div>`;
        }

        if(btnReview) btnReview.style.display = 'none';
        const modeIndicator = document.getElementById('modeIndicator'); if(modeIndicator) modeIndicator.innerText = "PSIKOGRAM";
        
        const overlay = document.getElementById('resultOverlay');
        if(overlay) { overlay.style.display = 'flex'; overlay.style.visibility = 'visible'; overlay.style.zIndex = '2147483647'; }
        window.scrollTo(0, 0);

        const btnShowScore = document.getElementById('btnShowScore');
        if(btnShowScore) { btnShowScore.style.display = 'flex'; btnShowScore.innerHTML = "📝 Nilai"; btnShowScore.onclick = function() { document.getElementById('resultOverlay').style.display = 'flex'; }; }
        
        let elementMapping = {}; userAnswers.forEach((choiceIndex, qIndex) => { if (choiceIndex !== null && currentQuestions[qIndex] && currentQuestions[qIndex].papi_keys) { const aspect = currentQuestions[qIndex].papi_keys[choiceIndex]; if (!elementMapping[aspect]) elementMapping[aspect] = []; elementMapping[aspect].push(qIndex + 1); } });
        if (typeof window.savePapiToCloud === 'function') { const totalFail = riskCount + wajibFailCount; window.savePapiToCloud(statusAkhir, totalFail, JSON.stringify({ scores: papiScores, mapping: elementMapping })); }
        PROTAMA.close();
        return;
    }
    
    // --- MODE NORMAL (HUKUM) ---
    isSubmitted = true; document.body.classList.remove('mode-focus');
    let score = 0, correctCount = 0, wrongCount = 0; wrongIndices = []; 

    userAnswers.forEach((a, i) => { if (currentQuestions[i]) { if(a === currentQuestions[i].answer) { score++; correctCount++; } else { wrongCount++; wrongIndices.push(i); } } });
    const final = Math.round((score/currentQuestions.length)*100);
    const overlay = document.getElementById('resultOverlay');
    if (overlay) { overlay.style.cssText = `display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 2147483647 !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; background: rgba(0,0,0,0.85) !important;`; window.scrollTo({ top: 0, behavior: 'smooth' }); }

    const scoreCircle = document.getElementById('finalScore'), passStatus = document.getElementById('passStatus'), msg = document.getElementById('resultMsg');
    if(scoreCircle) { scoreCircle.innerText = final; scoreCircle.style.background = final >= 70 ? "var(--pass)" : "var(--fail)"; }
    if(passStatus) { passStatus.innerText = final >= 70 ? "LULUS" : "TIDAK LULUS"; passStatus.style.color = final >= 70 ? "var(--pass)" : "var(--fail)"; }
    if(msg) msg.innerText = final >= 70 ? "Selamat! Memenuhi Standar." : "Belajar lagi ya.";

    const btnReview = document.getElementById('btnReviewWrong');
    if(btnReview) { if (wrongCount > 0) { btnReview.style.display = 'flex'; btnReview.innerText = `🔍 Review ${wrongCount} Jawaban Salah`; } else { btnReview.style.display = 'none'; } }
    const btnShowScore = document.getElementById('btnShowScore');
    if(btnShowScore) { btnShowScore.style.display = 'flex'; btnShowScore.innerHTML = "📝 Nilai"; }

    const modeInd = document.getElementById('modeIndicator'); if(modeInd) { modeInd.innerText = "PEMBAHASAN"; modeInd.style.color = "var(--success)"; }
    const finishCont = document.querySelector('.finish-container'); if(finishCont) finishCont.style.display = 'none';

    if (typeof window.saveScoreToCloud === 'function') window.saveScoreToCloud(currentDB, final);
    if (typeof window.saveAndShowChart === 'function') window.saveAndShowChart(final, correctCount, wrongCount);
    
    loadQuestion(currentIdx); console.log("✅ Ujian Selesai. Nilai:", final); PROTAMA.close();
};

window.confirmFinish = async function() { 
    const emptyCount = userAnswers.filter(a => a === null).length, raguCount = raguStatus.filter(r => r === true).length;
    let msg = "Yakin mau menyelesaikan ujian?";
    if(emptyCount > 0 || raguCount > 0) { msg = ""; if (raguCount > 0) msg += `- Ada ${raguCount} soal RAGU-RAGU\n`; if (emptyCount > 0) msg += `- Ada ${emptyCount} soal BELUM DIJAWAB\n`; msg += `\nYakin mau dikumpulkan sekarang?`; }
    const yakin = await PROTAMA.confirm("PERHATIAN!", msg);
    if(yakin) { PROTAMA.loading("Sedang menyimpan hasil ujian..."); window.submitQuiz(); }
}

window.closeResult = function() {
    if (window.innerWidth <= 768) { const sb = document.querySelector('.sidebar-right'); if (sb && sb.classList.contains('show-mobile')) { window.toggleMobileSidebar(); } }
    document.getElementById('resultOverlay').style.display = 'none'; isReviewMode = false; 
    const ind = document.getElementById('modeIndicator'); if (ind) { ind.innerText = "PEMBAHASAN"; ind.style.background = "#e8f5e9"; ind.style.color = "#2e7d32"; ind.style.border = "1px solid #c8e6c9"; }
    document.getElementById('prevBtn').disabled = false; document.getElementById('nextBtn').style.display = 'block';
    const mainContent = document.querySelector('.main-content'); if(mainContent) mainContent.scrollTop = 0;
    loadQuestion(currentIdx);
};

window.startReviewWrong = function() {
    if (!wrongIndices || wrongIndices.length === 0) { alert("Tidak ada jawaban salah untuk direview."); return; }
    if (window.innerWidth <= 768) { const sb = document.querySelector('.sidebar-right'); if (sb && sb.classList.contains('show-mobile')) { window.toggleMobileSidebar(); } }
    isReviewMode = true; const overlay = document.getElementById('resultOverlay'); if(overlay) overlay.style.setProperty('display', 'none', 'important');
    const ind = document.getElementById('modeIndicator'); if(ind) { ind.innerText = "MODE: REVIEW SALAH"; ind.style.background = "#ffebee"; ind.style.color = "#c62828"; ind.style.border = "1px solid #ffcdd2"; }
    loadQuestion(wrongIndices[0]);
};

window.changeQuestion = function(step) {
    if (isReviewMode) {
        let currentWrongPos = wrongIndices.indexOf(currentIdx);
        if (currentWrongPos !== -1) { let nextWrongPos = currentWrongPos + step; if (nextWrongPos >= wrongIndices.length) nextWrongPos = 0; if (nextWrongPos < 0) nextWrongPos = wrongIndices.length - 1; loadQuestion(wrongIndices[nextWrongPos]); } 
        else { if (step > 0) { let nextVal = wrongIndices.find(idx => idx > currentIdx); loadQuestion(nextVal !== undefined ? nextVal : wrongIndices[0]); } else { let prevVal = [...wrongIndices].reverse().find(idx => idx < currentIdx); loadQuestion(prevVal !== undefined ? prevVal : wrongIndices[wrongIndices.length - 1]); } }
    } else { const next = currentIdx + step; if (next >= 0 && next < currentQuestions.length) loadQuestion(next); }
};

window.backToMenu = async function() { 
    const yakin = await PROTAMA.confirm("KEMBALI KE LOBBY", "Yakin mau kembali ke menu utama? Progres saat ini akan di-reset.");
    if (yakin) {
        if(window.timerInterval) clearInterval(window.timerInterval); window.speechSynthesis.cancel(); document.body.classList.remove('mode-focus');
        const btnMobile = document.getElementById('btnMobileNav'), btnModul = document.getElementById('btnMobileModul');
        if(btnMobile) btnMobile.style.display = 'none'; if(btnModul) btnModul.style.display = 'none'; 
        document.getElementById('resultOverlay').style.display = 'none'; document.getElementById('statsOverlay').style.display = 'none'; document.getElementById('leaderboardOverlay').style.display = 'none';
        const sbLeft = document.querySelector('.sidebar-left'); if(sbLeft) sbLeft.style.display = ''; 
        const sbRight = document.querySelector('.sidebar-right'); if(sbRight) { sbRight.classList.remove('show-mobile'); sbRight.style.display = ''; }
        document.body.classList.remove('ujian-berjalan');
        const timer = document.getElementById('floatingTimer'); if(timer) timer.style.display = 'none';
        const modulTitle = document.getElementById('modulTitle'); if(modulTitle) modulTitle.innerText = "Menu Utama";
        const qNum = document.getElementById('qNum'); if(qNum) qNum.innerText = "-";
        window.tampilkanLobby(); window.updateUserStatus(true, "Lobby Utama");
        if (window.innerWidth <= 768) { const ftr = document.getElementById('mobileFooter'); if(ftr) ftr.style.display = 'none'; }
    }
};

window.showResult = function() { if(isSubmitted) { document.getElementById('resultOverlay').style.display = 'flex'; } else { alert("Belum ada nilai! Silahkan kerjakan dulu soalnya"); } };
window.toggleFocusMode = function() { document.body.classList.toggle('mode-focus'); };

function updateProgress() {
    let answered = userAnswers.filter(a => a !== null).length; let total = currentQuestions.length;
    let txt = document.getElementById('progressText'); if(txt) txt.innerText = `Menjawab: ${answered} / ${total}`;
}

window.saveAndShowChart = async function(finalScore, correct, wrong) {
    const usedSeconds = totalExamTime - timeRemaining; let arrayDetailPembahasan = [];
    if (typeof currentQuestions !== 'undefined' && currentQuestions.length > 0) { currentQuestions.forEach((q, index) => { let userAns = userAnswers[index]; arrayDetailPembahasan.push({ soal: q.q, opsi: q.options, jawabanUser: userAns !== undefined ? userAns : null, kunciJawaban: q.answer, pembahasan: q.explanation || "Tidak ada pembahasan spesifik." }); }); }
    const resultData = { uid: currentUser.uid, nama: currentUser.displayName, modul: currentModulKey, score: finalScore, correct: correct, wrong: wrong, date: new Date().toLocaleString('id-ID'), timestamp: new Date(), duration: usedSeconds, detailData: arrayDetailPembahasan };
    try { await addDoc(collection(db, "riwayat_belajar"), resultData); } catch (e) { console.error("Gagal simpan history:", e); }
};

window.resetStats = async function() {
    const yakin = await PROTAMA.confirm("HAPUS RIWAYAT?", "Yakin mau menghapus SEMUA riwayat nilai untuk modul ini? Data di Cloud akan hilang permanen.");
    if (!yakin) return; PROTAMA.loading("Menghapus data dari Cloud...");
    try {
        const q = query(collection(db, "riwayat_belajar"), where("uid", "==", currentUser.uid), where("modul", "==", window.currentDatabaseId)); const querySnapshot = await getDocs(q); const batch = writeBatch(db);
        querySnapshot.forEach((doc) => { batch.delete(doc.ref); }); await batch.commit();
        PROTAMA.alert("TERHAPUS!", "Data berhasil direset!", "success"); window.openStats();
    } catch (e) { PROTAMA.alert("GAGAL", "Gagal menghapus data dari server.", "error"); }
};

window.openStats = async function(mode = 'hukum') {
    if(!currentUser) { PROTAMA.alert("Akses Ditolak", "Login dulu bro!", "error"); return; }
    document.getElementById('statsOverlay').style.display = 'flex'; const wm = document.getElementById('watermark'); if(wm) wm.style.display = 'none';
    const tableBody = document.getElementById('statsTableBody'), statsTitle = document.getElementById('statsTitle'), thead = document.querySelector('#statsOverlay .stats-table thead tr');
    const chartCanvas = document.getElementById('statsChart'), chartContainer = chartCanvas.parentElement; 
    const chartCanvas2 = document.getElementById('allModulesChart'); let chartContainer2 = null; if(chartCanvas2) chartContainer2 = chartCanvas2.parentElement;
    const lobbySidebar = document.getElementById('lobbySidebarContent'); const isLobbyMode = (lobbySidebar && getComputedStyle(lobbySidebar).display !== 'none');
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Sedang mengambil data...</td></tr>';

    let switchContainer = document.getElementById('switchContainer');
    if (!switchContainer) {
        switchContainer = document.createElement('div'); switchContainer.id = 'switchContainer'; switchContainer.style = "margin-bottom: 15px; display: flex; gap: 10px; justify-content: center;";
        switchContainer.innerHTML = `<button id="btnModeHukum" onclick="openStats('hukum')" style="padding: 8px 15px; border:none; border-radius:20px; cursor:pointer; font-weight:bold;">📊 Skor Akademik</button> <button id="btnModePsikotes" onclick="openStats('psikotes')" style="padding: 8px 15px; border:none; border-radius:20px; cursor:pointer; font-weight:bold;">🧠 Kepribadian</button>`;
        const headerDiv = document.querySelector('#statsOverlay .result-box > div:first-child'); if(headerDiv) headerDiv.parentNode.insertBefore(switchContainer, headerDiv.nextSibling);
    }
    const btnHukum = document.getElementById('btnModeHukum'), btnPsi = document.getElementById('btnModePsikotes');
    if(btnHukum) { btnHukum.style.background = mode === 'hukum' ? 'var(--primary)' : '#ddd'; btnHukum.style.color = mode === 'hukum' ? 'white' : '#333'; }
    if(btnPsi) { btnPsi.style.background = mode === 'psikotes' ? '#8e44ad' : '#ddd'; btnPsi.style.color = mode === 'psikotes' ? 'white' : '#333'; }

    if (mode === 'psikotes') {
        if(chartContainer) chartContainer.style.display = 'none'; if(chartContainer2) chartContainer2.style.display = 'none';
        const title2 = document.querySelectorAll('.stats-section-title')[1]; if(title2) title2.style.display = 'none';
        if (isLobbyMode) {
            if(statsTitle) statsTitle.innerText = "Ranking Profil Kepribadian (Global)";
            if(thead) thead.innerHTML = '<th style="width:5%">No</th><th style="width:40%">Nama Peserta</th><th style="width:25%">Nilai</th><th style="width:30%">Indikator</th>';
            try {
                const q = query(collection(db, "riwayat_psikotes"), orderBy("createdAt", "desc")); const querySnapshot = await getDocs(q); tableBody.innerHTML = '';
                if (querySnapshot.empty) { tableBody.innerHTML = '<tr><td colspan="4">Belum ada data psikotes masuk.</td></tr>'; } else {
                    let userBestMap = {};
                    querySnapshot.forEach(doc => { let d = doc.data(); if (!d.createdAt || !d.nama) return; let skorPrioritas = (d.status.includes('DISARANKAN') ? 1000 : 500) - (d.fail_count || 0); d.sortingScore = skorPrioritas; if (!userBestMap[d.uid] || d.sortingScore > userBestMap[d.uid].sortingScore) { userBestMap[d.uid] = d; } });
                    let finalRanking = Object.values(userBestMap).sort((a, b) => b.sortingScore - a.sortingScore);
                    finalRanking.forEach((d, idx) => {
                        const statusTeks = d.status || "Selesai", redFlagCount = d.fail_count !== undefined ? d.fail_count : 0, colorStatus = statusTeks.includes('PERLU') ? '#c0392b' : 'green', bgRow = (currentUser && d.uid === currentUser.uid) ? '#e3f2fd' : 'white', nameDisplay = (currentUser && d.uid === currentUser.uid) ? `<b>${d.nama} (Anda)</b>` : d.nama;
                        const tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #eee"; tr.style.backgroundColor = bgRow;
                        tr.innerHTML = `<td style="padding:10px; text-align:center;">${idx + 1}</td><td style="padding:10px; text-align:left;">${nameDisplay}</td><td style="padding:10px; font-weight:bold; color:${colorStatus}; text-align:center;">${statusTeks}</td><td style="padding:10px; text-align:center;">${redFlagCount} Red Flags</td>`;
                        tableBody.appendChild(tr);
                    });
                }
            } catch (e) { console.error("ERROR LOAD PSIKOTES GLOBAL:", e); }
        } else {
            if(statsTitle) statsTitle.innerText = "Riwayat Tes Kepribadian Anda";
            if(thead) thead.innerHTML = '<th>No</th><th>Tanggal</th><th>Nilai</th><th>Indikator</th><th>Ket</th>';
            try {
                const q = query(collection(db, "riwayat_psikotes"), where("uid", "==", currentUser.uid), orderBy("createdAt", "desc")); const querySnapshot = await getDocs(q); tableBody.innerHTML = '';
                if (querySnapshot.empty) { tableBody.innerHTML = '<tr><td colspan="5">Belum ada riwayat tes PAPI.</td></tr>'; } else {
                    querySnapshot.forEach((doc, idx) => {
                        let d = doc.data(); d.id = doc.id; 
                        let dDate = d.createdAt ? d.createdAt.toDate().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-";
                        let statusTeks = d.status || "Selesai", redFlagCount = d.fail_count !== undefined ? d.fail_count : 0, redFlagInfo = `${redFlagCount} Flags`, colorStatus = statusTeks.includes('PERLU') ? '#c0392b' : 'green';
                        const tr = document.createElement('tr'); tr.style.borderBottom = "1px solid #eee";
                        tr.innerHTML = `<td style="padding:8px; text-align:center;">${idx + 1}</td><td style="padding:8px; font-size:0.75rem;">${dDate}</td><td style="padding:8px; font-weight:bold; color:${colorStatus}">${statusTeks}</td><td style="padding:8px; text-align:center;">${redFlagInfo}</td><td style="padding:8px; text-align:center;"><button class="btn-cek" onclick="window.bukaDetailPapi('${d.id}')" style="font-size:0.7rem; cursor:pointer; background:#3498db; color:white; border:none; padding:3px 8px; border-radius:4px;">Cek</button></td>`;
                        tableBody.appendChild(tr);
                    });
                }
            } catch (e) { console.error("ERROR LOAD PSIKOTES PERSONAL:", e); }
        }
    } else {
        if(chartContainer) chartContainer.style.display = 'block'; if(chartContainer2) chartContainer2.style.display = 'block';
        const title2 = document.querySelectorAll('.stats-section-title')[1]; if(title2) title2.style.display = 'block';
        try {
            const q = query(collection(db, "riwayat_belajar"), where("uid", "==", currentUser.uid), orderBy("timestamp", "asc")); const querySnapshot = await getDocs(q);
            let allHistory = []; querySnapshot.forEach((doc) => { allHistory.push(doc.data()); });
            if (isLobbyMode) {
                if(statsTitle) statsTitle.innerText = "Rata-Rata Statistik Akademik"; thead.innerHTML = '<th>No</th><th>Modul</th><th>Nilai</th><th>Percobaan</th><th>Ket</th>';
                let summaryStats = {}; allHistory.forEach(h => { if(!summaryStats[h.modul]) summaryStats[h.modul] = { total: 0, count: 0 }; summaryStats[h.modul].total += parseInt(h.score); summaryStats[h.modul].count++; });
                tableBody.innerHTML = ''; const sortedKeys = Object.keys(summaryStats).sort();
                if (sortedKeys.length === 0) { tableBody.innerHTML = '<tr><td colspan="5">Belum ada data latihan.</td></tr>'; } else {
                    sortedKeys.forEach((key, idx) => {
                        const data = summaryStats[key], avg = Math.round(data.total / data.count), modulName = key.replace('modul', 'MODUL ').toUpperCase();
                        tableBody.innerHTML += `<tr><td>${idx+1}</td><td style="text-align:left;">${modulName}</td><td style="font-weight:bold; color:${avg>=70?'green':'#d35400'}">${avg}</td><td>${data.count}x</td><td>${avg>=70 ? '✅ Aman' : '⚠️ Tingkatkan'}</td></tr>`;
                    });
                }
                setTimeout(() => {
                    const ctx = document.getElementById('statsChart').getContext('2d'); if (window.statsChartInstance) window.statsChartInstance.destroy();
                    const labels = sortedKeys.map(k => k.replace('modul', 'M-').toUpperCase()), dataPoints = sortedKeys.map(k => Math.round(summaryStats[k].total / summaryStats[k].count));
                    window.statsChartInstance = new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [{ label: 'Rata-Rata Nilai', data: dataPoints, borderColor: '#004d00', backgroundColor: 'rgba(0, 77, 0, 0.2)', borderWidth: 3, tension: 0.3, fill: true, pointBackgroundColor: '#d4af37', pointBorderColor: '#004d00', pointRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { x: { type: 'number', easing: 'linear', duration: 2000, from: NaN, delay(ctx) { if (ctx.type !== 'data' || ctx.xStarted) return 0; ctx.xStarted = true; return ctx.index * 300; } }, y: { type: 'number', easing: 'linear', duration: 1500, from: NaN, delay(ctx) { if (ctx.type !== 'data' || ctx.yStarted) return 0; ctx.yStarted = true; return ctx.index * 300; } } }, scales: { y: { beginAtZero: true, max: 100 } } } });
                }, 100);
            } else {
                let targetModul = window.currentDatabaseId || 'modul1'; if(statsTitle) statsTitle.innerText = "Data Modul: " + targetModul;
                thead.innerHTML = '<th style="padding: 10px; border-radius: 8px 0 0 0;">No</th><th style="padding: 10px; text-align: left;">Tanggal</th><th style="padding: 10px;">Benar</th><th style="padding: 10px;">Salah</th><th style="padding: 10px;">Nilai</th><th style="padding: 10px; border-radius: 0 8px 0 0;">Ket</th>';
                const currentModulHistory = allHistory.filter(h => h.modul === targetModul); tableBody.innerHTML = '';
                if (currentModulHistory.length === 0) { tableBody.innerHTML = '<tr><td colspan="6" style="padding:15px;">Belum ada data untuk modul ini.</td></tr>'; } else {
                    let sortedHistory = [...currentModulHistory].reverse(); window.tempDataRiwayatStats = sortedHistory;
                    sortedHistory.forEach((d, idx) => { tableBody.innerHTML += `<tr style="border-bottom: 1px solid #eee;"><td style="padding: 10px;">${idx+1}</td><td style="padding: 10px; text-align: left;">${d.date || '-'}</td><td style="padding: 10px; font-weight: bold; color: green;">${d.correct || d.benar || 0} ✅</td><td style="padding: 10px; font-weight: bold; color: red;">${d.wrong || d.salah || 0} ❌</td><td style="padding: 10px; font-weight: 900; font-size: 1.1rem; color: ${d.score >= 70 ? 'var(--success)' : 'var(--danger)'};">${d.score}</td><td style="padding: 10px;"><button onclick="window.bukaReviewRiwayat(${idx})" style="background: var(--gold); color: #333; border: none; padding: 5px 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">🔍 Detail</button></td></tr>`; });
                }
                setTimeout(() => {
                    const ctx = document.getElementById('statsChart').getContext('2d'); if (window.statsChartInstance) window.statsChartInstance.destroy();
                    window.statsChartInstance = new Chart(ctx, { type: 'line', data: { labels: currentModulHistory.map((_, i) => "Tes " + (i+1)), datasets: [{ label: 'Nilai Kamu', data: currentModulHistory.map(d => d.score), borderColor: '#2980b9', backgroundColor: 'rgba(41, 128, 185, 0.2)', borderWidth: 2, tension: 0.3, fill: true }, { label: 'Batas Lulus (70)', data: currentModulHistory.map(() => 70), borderColor: '#c0392b', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } } });
                }, 100);
            }

            let modulStats = {}; allHistory.forEach(h => { if(!modulStats[h.modul]) modulStats[h.modul] = { total: 0, count: 0 }; modulStats[h.modul].total += parseInt(h.score); modulStats[h.modul].count++; });
            const sortedKeys = Object.keys(modulStats).sort((a, b) => { const numA = parseFloat(a.replace(/[^\d.]/g, '')) || 0, numB = parseFloat(b.replace(/[^\d.]/g, '')) || 0; return numA - numB; });
            const labels = [], dataScores = [], backgroundColors = [], colors = ['#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#2ecc71', '#e67e22', '#1abc9c'];
            sortedKeys.forEach((key, index) => { labels.push(key.replace('modul', 'M-').replace('btn-', '')); dataScores.push(Math.round(modulStats[key].total / modulStats[key].count)); backgroundColors.push(colors[index % colors.length]); });

            setTimeout(() => {
                const ctxAll = document.getElementById('allModulesChart').getContext('2d'); if (window.allModulesChartInstance) window.allModulesChartInstance.destroy();
                window.allModulesChartInstance = new Chart(ctxAll, { type: 'bar', data: { labels: labels, datasets: [{ label: 'Rata-rata Nilai', data: dataScores, backgroundColor: backgroundColors, borderWidth: 1 }] }, options: { animation: { duration: 2500, easing: 'easeOutBounce', y: { from: 0 } }, responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } } });
            }, 100);

        } catch (e) { console.error("Error load data hukum:", e); }
    }
};
window.closeStats = function() { document.getElementById('statsOverlay').style.display = 'none'; const wm = document.getElementById('watermark'); if(wm) wm.style.display = 'block'; };

window.tampilkanLobby = function() {
    document.querySelector('.question-header').style.visibility = 'hidden'; document.querySelector('.footer-nav').style.visibility = 'hidden';
    const examSide = document.getElementById('examSidebarContent'); if(examSide) examSide.style.display = 'none';
    const lobbySide = document.getElementById('lobbySidebarContent'); if(lobbySide) lobbySide.style.display = 'flex'; 
    const qText = document.getElementById('questionText'), namaPanggilan = currentUser ? currentUser.displayName.split(" ")[0] : "Peserta";
    if(qText) {
        qText.innerHTML = `<div style="padding: 20px; max-width: 800px; margin: 0 auto; animation: fadeIn 0.5s;"><div style="text-align: center; margin-bottom: 35px;"><div style="font-size: 3.5rem; margin-bottom: 10px;">👋</div><h2 style="color: var(--primary); margin-bottom: 5px; font-weight: 800;">Halo, ${namaPanggilan}! Siap Latihan?</h2><p style="font-size: 1.05rem; color: #666;">Silahkan klik salah satu modul di menu samping kiri untuk memulai simulasi ujian.</p></div><div style="background: white; border: 1px solid #eaeaea; border-radius: 12px; padding: 20px; box-shadow: 0 5px 20px rgba(0,0,0,0.04);"><div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f4f7f6; padding-bottom: 12px; margin-bottom: 15px;"><h4 style="margin: 0; color: #2c3e50; font-size: 1.1rem;"><i class="fas fa-history" style="color: var(--gold); margin-right: 8px;"></i> Riwayat 5 Tes Terakhir</h4><button onclick="window.openStats('hukum')" style="background: none; border: none; color: var(--primary); cursor: pointer; font-weight: bold; font-size: 0.85rem; padding: 5px;">Lihat Semua ></button></div><div id="tableLobbyContainer" style="overflow-x: auto;"><div style="text-align: center; padding: 30px;"><i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: #ddd;"></i><p style="color: #999; margin-top: 10px; font-size: 0.9rem;">Memuat riwayat belajar...</p></div></div></div></div><style>@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }</style>`;
    }
    const oCont = document.getElementById('optionsContainer'); if(oCont) oCont.innerHTML = '';
    const fbBox = document.getElementById('feedbackBox'); if(fbBox) fbBox.style.display = 'none';
    document.querySelectorAll('.modul-btn').forEach(el => el.classList.remove('active-modul')); 
    const tDisp = document.getElementById('timerDisplay'); if(tDisp) tDisp.innerText = "00:00:00";
    if(typeof window.loadRiwayatLobby === 'function') setTimeout(window.loadRiwayatLobby, 500);
}

window.loadRiwayatLobby = async () => {
    const container = document.getElementById('tableLobbyContainer'); if (!container || !currentUser || !db) return;
    try {
        const q = query(collection(db, "riwayat_belajar"), where("uid", "==", currentUser.uid), orderBy("timestamp", "desc"), limit(5)); const snap = await getDocs(q);
        if (snap.empty) { container.innerHTML = `<div style="text-align:center; padding: 30px 0; color: #999;"><i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 10px; color: #e0e0e0;"></i><br>Belum ada riwayat tes.<br>Yuk mulai simulasi pertamamu!</div>`; return; }
        let tableHTML = `<table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;"><thead><tr style="background-color: #f9fbf9; color: #555; text-align: left;"><th style="padding: 12px; border-bottom: 2px solid #eee; border-radius: 8px 0 0 0;">Tanggal</th><th style="padding: 12px; border-bottom: 2px solid #eee;">Modul</th><th style="padding: 12px; border-bottom: 2px solid #eee; text-align: center;">Skor</th><th style="padding: 12px; border-bottom: 2px solid #eee; text-align: center; border-radius: 0 8px 0 0;">Status</th></tr></thead><tbody>`;
        snap.forEach(doc => {
            const d = doc.data(), isLulus = d.score >= 70, colorScore = isLulus ? 'var(--success)' : 'var(--danger)';
            const statusBadge = isLulus ? '<span style="background:#e8f5e9; color:#2e7d32; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:bold; letter-spacing: 0.5px;">LULUS</span>' : '<span style="background:#ffebee; color:#c62828; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:bold; letter-spacing: 0.5px;">GAGAL</span>';
            const modulName = (d.modul || "").replace('modul', 'Modul ').toUpperCase(), tanggalPendek = d.date ? d.date.split(' ')[0] : '-';
            tableHTML += `<tr style="border-bottom: 1px solid #f4f4f4; transition: background 0.2s;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background='transparent'"><td style="padding: 12px; color: #666;">${tanggalPendek}</td><td style="padding: 12px; font-weight: 600; color: #333;">${modulName}</td><td style="padding: 12px; text-align: center; font-weight: 800; color: ${colorScore}; font-size: 1rem;">${d.score}</td><td style="padding: 12px; text-align: center;">${statusBadge}</td></tr>`;
        });
        tableHTML += `</tbody></table>`; container.innerHTML = tableHTML;
    } catch (e) { console.error("Error load riwayat lobby:", e); container.innerHTML = '<p style="color:red; text-align:center; padding: 20px;">Gagal memuat riwayat. Pastikan internet lancar.</p>'; }
};

window.openAdminPanel = () => { document.getElementById('adminOverlay').style.display = 'flex'; };
window.switchAdminTab = (tab) => {
    document.getElementById('tabTambah').style.display = (tab === 'tambah' ? 'block' : 'none'); document.getElementById('tabEdit').style.display = (tab === 'edit' ? 'block' : 'none'); document.getElementById('tabReview').style.display = (tab === 'review' ? 'block' : 'none');
    const tabLaporan = document.getElementById('tabLaporan'); if (tabLaporan) { tabLaporan.style.display = (tab === 'laporan' ? 'block' : 'none'); }
    const tabStatus = document.getElementById('tabStatus'); if (tabStatus) { tabStatus.style.display = (tab === 'status' ? 'block' : 'none'); }
    if (tab === 'laporan' && typeof window.loadLaporanAdmin === 'function') window.loadLaporanAdmin();
    if (tab === 'status' && typeof window.loadStatusAdmin === 'function') window.loadStatusAdmin();
};

window.loadReviewPembahasan = async () => {
    const modulId = document.getElementById('reviewModulTarget').value.trim(); if(!modulId) return alert("Isi ID Modul!");
    const container = document.getElementById('containerReview'); container.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Sabar, lagi narik data...</div>`;
    try {
        const qSnap = await getDocs(collection(db, "bank_soal", modulId, "daftar_soal")); container.innerHTML = "";
        if (qSnap.empty) { container.innerHTML = "<p style='color:red; text-align:center;'>Modul tidak ditemukan atau kosong!</p>"; return; }
        qSnap.docs.forEach((docSnap, index) => {
            const data = docSnap.data(), item = document.createElement('div'); item.style = "margin-bottom:20px; border-bottom:2px solid #eee; padding-bottom:10px;";
            const pembahasan = data.explanation ? data.explanation : "<em style='color:gray'>- Belum ada pembahasan -</em>", sumber = data.cite ? data.cite : "-";
            let opsiHtml = `<div style="margin: 10px 0; padding-left: 10px; font-size: 0.95rem;">`;
            if (data.options && Array.isArray(data.options)) { data.options.forEach((opt, idx) => { const abjad = String.fromCharCode(65 + idx), isBenar = (idx == data.answer), styleBenar = isBenar ? `color: #2e7d32; font-weight: bold; background: #e8f5e9; padding: 4px 8px; border-radius: 4px; display: inline-block;` : `color: #444; padding: 4px 8px; display: inline-block;`; opsiHtml += `<div style="margin-bottom: 5px;"><span style="${styleBenar}">${abjad}. ${opt} ${isBenar ? '✅' : ''}</span></div>`; }); } opsiHtml += `</div>`;
            const btnAI = `<button onclick="window.cekValiditasAI(this, '${docSnap.id}', '${encodeURIComponent(data.q)}', '${encodeURIComponent(JSON.stringify(data.options || []))}', ${data.answer}, '${encodeURIComponent(pembahasan)}', '${encodeURIComponent(sumber)}')" style="background: #8e44ad; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold; float: right;"><i class="fas fa-robot"></i> Cek AI</button>`;
            item.innerHTML = `<div style="font-weight:bold; color:var(--primary); margin-bottom:10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">Soal No. ${index + 1}${btnAI}</div><p style="margin-top:0;">${data.q}</p>${opsiHtml}<div style="background:#f1f8e9; padding:15px; border-radius:8px; border-left:5px solid var(--success); margin-top: 15px;"><strong>💡 Pembahasan:</strong><br><div style="margin-top:5px; line-height:1.5;">${pembahasan}</div><div style="margin-top:10px; font-size:0.85rem; color:#666;"><i class="fas fa-book"></i> Sumber: ${sumber}</div></div><div id="ai-result-${docSnap.id}" style="display: none; margin-top: 15px; padding: 12px; background: #f3e5f5; border-left: 4px solid #9b59b6; border-radius: 6px; font-size: 0.9rem; line-height: 1.5;"></div>`;
            container.appendChild(item);
        });
    } catch(e) { container.innerHTML = `<p style="color:red">Error: ${e.message}</p>`; }
};

window.eksekusiUpload = async () => {
    const modulId = document.getElementById('adminModulTarget').value.trim(), jsonRaw = document.getElementById('jsonUploadArea').value;
    if(!modulId || !jsonRaw) return alert("Modul ID dan JSON harus diisi!");
    try {
        const dataSoal = JSON.parse(jsonRaw); if(!Array.isArray(dataSoal)) return alert("Format JSON harus Array [ ... ]");
        if(!confirm(`Siap upload ${dataSoal.length} soal ke ${modulId}?`)) return;
        const batch = writeBatch(db); let count = 0, chunks = [], currentBatch = writeBatch(db);
        for (const item of dataSoal) {
            const docData = { q: item.q || item.pertanyaan, options: item.options || [item.opsiA, item.opsiB, item.opsiC, item.opsiD], answer: item.answer !== undefined ? item.answer : parseInt(item.kunci), explanation: item.explanation || item.pembahasan || "-", cite: item.cite || "Modul Hakim", papi_keys: item.papi_keys || [], createdAt: new Date() };
            currentBatch.set(doc(collection(db, "bank_soal", modulId, "daftar_soal")), docData); count++;
            if (count % 450 === 0) { chunks.push(currentBatch); currentBatch = writeBatch(db); }
        }
        if (count % 450 !== 0) chunks.push(currentBatch); for (let b of chunks) await b.commit();
        alert(`✅ Sukses Upload ${count} Soal!`); document.getElementById('jsonUploadArea').value = ""; 
    } catch (e) { alert("Error: " + e.message); console.error(e); }
};

let currentAdminModul = "";
window.loadSoalAdmin = async () => {
    const modulId = document.getElementById('editModulTarget').value.trim(); if(!modulId) return alert("Isi nama modul!");
    currentAdminModul = modulId; const searchInput = document.getElementById('searchSoalAdmin'); if(searchInput) searchInput.value = "";
    const listDiv = document.getElementById('listSoalAdmin'); listDiv.innerHTML = "Loading... (Sedang mengambil data)";
    try {
        const qRef = collection(db, "bank_soal", modulId, "daftar_soal"); const snapshot = await getDocs(qRef); listDiv.innerHTML = "";
        if (snapshot.empty) { listDiv.innerHTML = "<p style='padding:10px; color:red'>Zonk! Modul kosong atau ID salah.</p>"; return; }
        let counter = 0;
        snapshot.forEach(docSnap => {
            const data = docSnap.data(), div = document.createElement('div');
            div.style.cssText = "border-bottom:1px solid #ddd; padding:8px; cursor:pointer; font-size:0.85rem;";
            const teksSoal = data.q || data.pertanyaan || "(Soal Tanpa Teks)";
            div.innerText = `${++counter}. ${teksSoal.substring(0, 50)}...`;
            div.onclick = () => populateEditForm(docSnap.id, data); listDiv.appendChild(div);
        });
    } catch (e) { console.error(e); alert("Gagal load: " + e.message + "\n\nTips: Cek apakah ID Modul persis sama (huruf besar/kecil)?"); }
};

function populateEditForm(id, data) {
    document.getElementById('editDocId').value = id; document.getElementById('editQ').value = data.q;
    document.getElementById('editOpt').value = data.options.join(","); document.getElementById('editAns').value = data.answer;
    document.getElementById('editExp').value = data.explanation; document.getElementById('editCite').value = data.cite || "";
}

window.simpanPerubahan = async () => {
    const id = document.getElementById('editDocId').value; if(!id) return alert("Pilih soal dulu!");
    const optionsArray = document.getElementById('editOpt').value.split(",").map(s => s.trim()); 
    const newData = { q: document.getElementById('editQ').value, options: optionsArray, answer: parseInt(document.getElementById('editAns').value), explanation: document.getElementById('editExp').value, cite: document.getElementById('editCite').value };
    try { const docRef = doc(db, "bank_soal", currentAdminModul, "daftar_soal", id); await updateDoc(docRef, newData); alert("✅ Data terupdate!"); window.loadSoalAdmin(); } catch (e) { alert("Gagal update: " + e.message); }
};

window.hapusSoal = async () => {
    const id = document.getElementById('editDocId').value; if(!id) return alert("Pilih soal dulu!");
    if(!confirm("Yakin mau hapus soal ini permanen?")) return;
    try { const docRef = doc(db, "bank_soal", currentAdminModul, "daftar_soal", id); await deleteDoc(docRef); alert("🗑️ Soal dihapus."); window.loadSoalAdmin(); document.getElementById('editDocId').value = ""; document.getElementById('editQ').value = ""; } catch (e) { alert("Gagal hapus: " + e.message); }
};

window.filterSoalAdmin = () => {
    let input = document.getElementById("searchSoalAdmin").value.toLowerCase(), listContainer = document.getElementById("listSoalAdmin"), itemSoal = listContainer.getElementsByTagName("div"); 
    for (let i = 0; i < itemSoal.length; i++) { let teksSoal = itemSoal[i].textContent || itemSoal[i].innerText; if (teksSoal.toLowerCase().indexOf(input) > -1) { itemSoal[i].style.display = ""; } else { itemSoal[i].style.display = "none"; } }
};

// ==========================================
// FUNGSI HAFALAN & PSIKOTES (YANG TADI HILANG)
// ==========================================
function showMemorizationPhase() {
    const overlay = document.createElement('div'); overlay.id = "hafalanOverlay";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:1000000; padding:20px; overflow-y:auto; text-align:center; font-family:'Poppins', sans-serif;";
    overlay.innerHTML = `<div style="max-width:800px; margin: 20px auto; background:#fff; padding:30px; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.1); border-top:8px solid var(--primary);"><h2 style="color:var(--primary); margin-bottom:10px;">🧠 TAHAP HAFALAN</h2><p style="color:#666;">Hafalkan data di bawah ini dalam waktu <b>3 menit</b>!</p><hr style="border:1px solid #eee; margin:15px 0;"><div style="background:#f9f9f9; padding:20px; border-radius:10px; display:grid; grid-template-columns: 1fr; text-align:left; font-family:monospace; border:2px solid #ddd; line-height:1.8; font-size:1rem; width:100%; box-sizing:border-box;"><b>BUNGA:</b> Dahlia, Flamboyan, Laret, Soka, Yasmin<br><b>PERKAKAS:</b> Cangkul, Jarum, Kikir, Palu, Wajan<br><b>BURUNG:</b> Elang, Itik, Tekukur, Nuri, Walet<br><b>KESENIAN:</b> Arca, Gamelan, Opera, Quintet, Ukiran<br><b>BINATANG:</b> Beruang, Harimau, Rusa, Zebra, Musang</div><div id="countdownHafalan" style="font-size:3rem; font-weight:800; color:var(--danger); margin:30px 0;">03:00</div><button id="btnSkipHafalan" style="background:var(--success); color:white; border:none; padding:15px 30px; border-radius:8px; cursor:pointer; font-weight:bold; width:100%; font-size:1rem;">SAYA SUDAH HAFAL (MULAI TES)</button></div>`;
    document.body.appendChild(overlay);

    let timeLeft = 180; const timerText = document.getElementById('countdownHafalan');
    window.hafalanCountdown = setInterval(() => {
        timeLeft--; const mins = Math.floor(timeLeft / 60), secs = timeLeft % 60;
        timerText.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (timeLeft <= 0) stopHafalanAndStartQuiz();
    }, 1000);
    document.getElementById('btnSkipHafalan').onclick = () => { if(confirm("Yakin sudah hafal? Data tidak bisa dilihat kembali saat ujian.")) { stopHafalanAndStartQuiz(); } };
}

function stopHafalanAndStartQuiz() { clearInterval(window.hafalanCountdown); const overlay = document.getElementById('hafalanOverlay'); if(overlay) overlay.remove(); loadQuestion(0); startTimer(); }

window.loadLobbyData = async () => {
    const user = auth.currentUser; if (!user || !db) return;
    try {
        const qHistory = query(collection(db, "riwayat_belajar"), where("uid", "==", user.uid)); const snapHistory = await getDocs(qHistory); let bestScoresMap = {}; 
        snapHistory.forEach(doc => { const d = doc.data(), nilai = parseInt(d.score) || 0; if (!bestScoresMap[d.modul] || nilai > bestScoresMap[d.modul]) { bestScoresMap[d.modul] = nilai; } });
        const modulesTaken = Object.values(bestScoresMap); let avg = 0; if (modulesTaken.length > 0) { const totalBest = modulesTaken.reduce((a, b) => a + b, 0); avg = Math.round(totalBest / modulesTaken.length); }
        const txtAvg = document.getElementById('avgScoreText'); if(txtAvg) txtAvg.innerText = avg;
        const ctx = document.getElementById('lobbyMiniChart');
        if (ctx) {
            if (window.lobbyChartInstance) window.lobbyChartInstance.destroy();
            window.lobbyChartInstance = new Chart(ctx, { type: 'doughnut', data: { labels: ['Pencapaian', 'Gap'], datasets: [{ data: [avg, 100 - avg], backgroundColor: [avg >= 70 ? '#2e7d32' : '#f39c12', '#eeeeee'], borderWidth: 0, hoverOffset: 10 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { animateScale: true, animateRotate: true, duration: 2000, easing: 'easeOutBounce' } } });
        }
    } catch (e) { console.error("Err History:", e); }

    try {
        const qLb = query(collection(db, "leaderboard"), orderBy("skor", "desc"), limit(500)); const snapLb = await getDocs(qLb); let userTotals = {}; 
        snapLb.forEach(doc => { const d = doc.data(), nilai = parseInt(d.skor) || 0; if (!userTotals[d.nama]) userTotals[d.nama] = {}; if (!userTotals[d.nama][d.modul] || nilai > userTotals[d.nama][d.modul]) { userTotals[d.nama][d.modul] = nilai; } });
        let rankingList = []; for (let [nama, modules] of Object.entries(userTotals)) { const totalPoints = Object.values(modules).reduce((a, b) => a + b, 0); rankingList.push({ nama: nama, total: totalPoints }); }
        rankingList.sort((a, b) => b.total - a.total);
        const lbContainer = document.getElementById('miniLeaderboardList');
        if (lbContainer) {
            if (rankingList.length === 0) { lbContainer.innerHTML = '<small style="color:#999;">Belum ada data.</small>'; } else {
                let html = ''; rankingList.slice(0, 3).forEach((u, i) => { let medal = i===0 ? '🥇' : (i===1 ? '🥈' : '🥉'); html += `<div class="mini-rank-item"><span class="rank-num">${medal}</span><span class="rank-name">${u.nama}</span><span class="rank-score">${u.total} Pts</span></div>`; }); lbContainer.innerHTML = html;
            }
        }
    } catch (e) { console.error("Err Leaderboard:", e); }
};

window.downloadSoalExcel = async () => {
    const modulId = prompt("Masukkan ID Modul (contoh: modul1, modul8.4):"); if (!modulId) return;
    alert(`⏳ OTW narik data ${modulId} ke Excel... Tunggu bentar.`);
    try {
        const qRef = collection(window.db, "bank_soal", modulId, "daftar_soal"); const snapshot = await getDocs(qRef);
        if (snapshot.empty) { alert("❌ Zonk! Modul kosong atau salah ID."); return; }
        let tableHTML = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr style="background-color: #4CAF50; color: white;"><th>No</th><th>Soal</th><th>Opsi A</th><th>Opsi B</th><th>Opsi C</th><th>Opsi D</th><th>Kunci (Angka)</th><th>Kunci (Huruf)</th><th>Pembahasan</th><th>Sumber</th></tr></thead><tbody>`;
        let no = 1;
        snapshot.forEach(doc => {
            const d = doc.data(), q = d.q || d.pertanyaan || "", opt = d.options || ["", "", "", ""], ans = d.answer !== undefined ? parseInt(d.answer) : -1, keyChar = ans >= 0 ? String.fromCharCode(65 + ans) : "?";
            tableHTML += `<tr><td>${no++}</td><td>${q}</td><td>${opt[0]||""}</td><td>${opt[1]||""}</td><td>${opt[2]||""}</td><td>${opt[3]||""}</td><td>${ans}</td><td>${keyChar}</td><td>${d.explanation||""}</td><td>${d.cite||""}</td></tr>`;
        });
        tableHTML += `</tbody></table></body></html>`;
        const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" }), url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = `BankSoal_${modulId}.xls`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (e) { console.error(e); alert("Gagal download: " + e.message); }
};

window.downloadSoalJSON = async () => {
    const modulId = prompt("Masukkan ID Modul untuk Backup JSON (misal: modul1):"); if (!modulId) return;
    alert(`⏳ Mengambil data RAW JSON dari ${modulId}...`);
    try {
        const qRef = collection(window.db, "bank_soal", modulId, "daftar_soal"); const snapshot = await getDocs(qRef);
        if (snapshot.empty) { alert("❌ Modul kosong bro!"); return; }
        let dataBackup = []; snapshot.forEach(doc => { const d = doc.data(); delete d.createdAt; dataBackup.push(d); });
        const jsonString = JSON.stringify(dataBackup, null, 2), blob = new Blob([jsonString], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = `Backup_${modulId}_${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        alert("✅ File JSON siap! Bisa langsung di-upload ulang di menu 'Upload JSON' kalau mau revisi massal.");
    } catch (e) { console.error(e); alert("Gagal download JSON: " + e.message); }
};

window.bukaDetailPapi = async (docId) => {
    try {
        if (!window.db) return alert("Error: Database belum siap!"); const docRef = doc(window.db, "riwayat_psikotes", docId); const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const d = docSnap.data(); let dataObj = typeof d.detail_skor === 'string' ? JSON.parse(d.detail_skor) : d.detail_skor;
            const scores = dataObj.scores ? dataObj.scores : dataObj, mapping = dataObj.mapping || {};
            const strategi = {
                'R': { label: "Role Consistency (Rasional)", target: "6-9", saran: "Pertahankan cara berpikir berbasis fakta dan aturan." }, 'D': { label: "Decision Making (Tegas)", target: "6-9", saran: "Bagus, hakim harus berani mengambil keputusan hukum." }, 'E': { label: "Emotional Restraint (Tenang)", target: "6-9", saran: "Stabilitas emosi adalah kunci kematangan hakim." }, 'M': { label: "Mental Activity (Waspada)", target: "6-9", saran: "Tetap waspada dan teliti dalam membedah perkara." }, 'B': { label: "Belonging to Group (Perseverance)", target: "6-9", saran: "Ketekunan dalam bekerja secara sistematis." }, 'N': { label: "Need to Finish (Tuntas)", target: "6-9", saran: "Selesaikan perkara tepat waktu, jangan ditunda." }, 'C': { label: "Conformity (Teratur/Rapi)", target: "6-9", saran: "Kerapian berkas mencerminkan kerapian logika putusan." }, 'A': { label: "Attention to Detail (Teliti)", target: "6-9", saran: "Ketelitian mencegah putusan yang rawan cacat." }, 'Z': { label: "Need for Change (Adaptif)", target: "6-9", saran: "Adaptif pada aturan baru, tapi tidak eksperimental." }, 'W': { label: "Need for Rules (Patuh Etik)", target: "7-9", saran: "Wajib patuh pada Kode Etik dan Pedoman Perilaku Hakim." },
                'L': { label: "Leadership (Kepemimpinan)", target: "4-6", saran: "Pimpin persidangan secara fungsional, bukan dominan." }, 'T': { label: "Pace (Kecepatan)", target: "4-6", saran: "Bekerja dengan ritme stabil, utamakan ketelitian." }, 'V': { label: "Vigor (Energi Vitalitas)", target: "4-6", saran: "Jaga stamina kerja untuk menghadapi sidang yang panjang." }, 'P': { label: "Control Others (Mengatur)", target: "4-6", saran: "Atur jalannya sidang sesuai hukum acara." },
                'X': { label: "Need to be Noticed (Populer)", target: "0-4", saran: "Hakim bekerja untuk keadilan, bukan untuk panggung." }, 'S': { label: "Social Extension (Bergaul)", target: "0-4", saran: "Batasi pergaulan untuk menjaga independensi hakim." }, 'I': { label: "Theoretical Type (Inisiatif)", target: "0-4", saran: "Patuhi hukum positif, jangan membuat eksperimen hukum." }, 'G': { label: "Hard Intense Worker (Ambisi)", target: "0-4", saran: "Hindari ambisi berlebihan yang merusak objektivitas." }, 'K': { label: "Aggression (Emosional/Agresif)", target: "0-3", saran: "Hindari sikap defensif atau mudah marah di persidangan." }, 'O': { label: "Need for Closeness (Kedekatan)", target: "0-4", saran: "Jangan terlalu bergantung pada instruksi orang lain." }
            };

            let report = `⚖️ ANALISIS PROFIL\n${"=".repeat(35)}\n\n`; const keys = Object.keys(scores); if (keys.length === 0) report += "Data skor tidak ditemukan.";
            keys.forEach(el => {
                const info = strategi[el] || { label: "Elemen Pendukung", target: "-", saran: "Jaga keseimbangan profil." }, score = scores[el], soalList = mapping[el] ? mapping[el].join(", ") : "Tersedia di tes berikutnya";
                let evalMsg = "⚠️ CEK"; if (strategi[el]) { const range = info.target.match(/\d+/g), min = parseInt(range[0]), max = parseInt(range[1] || range[0]); evalMsg = (score >= min && score <= max) ? "✅ IDEAL" : "❌ EVALUASI"; }
                report += `● [${el}] ${info.label}: ${score}\n  Status: ${evalMsg} (Target: ${info.target})\n`; if(mapping[el]) report += `  Nomor Soal: ${soalList}\n`; report += `  Saran: ${info.saran}\n\n`;
            });
            alert(report);
        }
    } catch (e) { alert("Gagal membedah data: " + e.message); }
};

window.bukaReviewRiwayat = (index) => {
    const data = window.tempDataRiwayatStats[index];
    if (!data || !data.detailData || data.detailData.length === 0) { alert("⚠️ Detail pembahasan tidak tersedia. Ini karena tes ini dikerjakan sebelum fitur review diaktifkan."); return; }
    let listSoalHTML = "";
    data.detailData.forEach((item, i) => {
        let isBenar = item.jawabanUser === item.kunciJawaban, bgColor = isBenar ? "#f1f8e9" : "#ffebee", borderColor = isBenar ? "#c8e6c9" : "#ffcdd2", iconTitle = isBenar ? "✅ BENAR" : "❌ SALAH", ansUserText = (item.jawabanUser !== null && item.jawabanUser !== undefined && item.jawabanUser !== "") ? item.opsi[item.jawabanUser] : "<i>(Kosong / Tidak Menjawab)</i>", ansKunciText = item.opsi[item.kunciJawaban];
        listSoalHTML += `<div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 15px; margin-bottom: 20px;"><div style="display: flex; justify-content: space-between; margin-bottom: 10px;"><strong style="font-size: 1.1rem; color: #333;">Soal No. ${i + 1}</strong><strong style="color: ${isBenar ? 'green' : 'red'};">${iconTitle}</strong></div><p style="margin: 0 0 15px 0; font-size: 0.95rem; line-height: 1.5; color: #222;">${item.soal}</p><div style="font-size: 0.9rem; margin-bottom: 15px; background: rgba(255,255,255,0.6); padding: 10px; border-radius: 6px;"><div style="margin-bottom: 5px;">Jawaban Kamu: <b style="color: ${isBenar ? 'green' : 'red'};">${ansUserText}</b></div>${!isBenar ? `<div>Kunci Jawaban: <b style="color: green;">${ansKunciText}</b></div>` : ""}</div><hr style="border: 0; border-top: 1px dashed ${borderColor}; margin: 10px 0;"><div style="font-size: 0.9rem;"><strong><i class="fas fa-gavel" style="color: var(--primary);"></i> Pembahasan:</strong><br><span style="color: #444; line-height: 1.5;">${item.pembahasan}</span></div></div>`;
    });
    let modalHTML = `<div id="modalReviewOverlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 99999999; display: flex; justify-content: center; align-items: center; padding: 20px; box-sizing: border-box; backdrop-filter: blur(5px);"><div style="background: white; width: 100%; max-width: 800px; height: 90vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.5); animation: zoomIn 0.3s ease;"><div style="padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: var(--primary); color: white; border-radius: 12px 12px 0 0;"><div><h3 style="margin: 0; font-size: 1.2rem; color: white;">Detail Pembahasan</h3><small style="color: #ddd;">Skor Akhir: <b style="color: var(--gold);">${data.score}</b> | Tanggal: ${data.date}</small></div><button onclick="document.getElementById('modalReviewOverlay').remove()" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.2s;"><i class="fas fa-times"></i> Tutup</button></div><div style="padding: 20px; overflow-y: auto; flex: 1; background: #fafafa;">${listSoalHTML}</div></div></div><style>@keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }</style>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.openLaporModal = () => { if (!window.currentDatabaseId || currentIdx === undefined) { alert("Sistem belum memuat soal secara penuh."); return; } document.getElementById('laporOverlay').style.display = 'flex'; document.getElementById('laporAlasan').focus(); };
window.closeLaporModal = () => { document.getElementById('laporOverlay').style.display = 'none'; document.getElementById('laporAlasan').value = ""; document.getElementById('laporReferensi').value = ""; };

window.submitLaporan = async () => {
    const alasan = document.getElementById('laporAlasan').value.trim(), referensi = document.getElementById('laporReferensi').value.trim(), btnSubmit = document.getElementById('btnSubmitLaporan');
    if (!alasan) { alert("Alasan kesalahannya wajib diisi ya bro!"); return; }
    const qData = currentQuestions[currentIdx], teksSoal = qData ? qData.q : "Teks soal tidak ditemukan";
    btnSubmit.innerText = "Mengirim..."; btnSubmit.disabled = true; btnSubmit.style.background = "#999";
    try {
        await addDoc(collection(window.db, "laporan_soal"), { uid_pelapor: currentUser.uid, nama_pelapor: currentUser.displayName, modul_id: window.currentDatabaseId, nomor_soal_index: currentIdx + 1, teks_soal_penggalan: teksSoal.substring(0, 50) + "...", alasan: alasan, dasar_hukum: referensi || "Tidak melampirkan dasar hukum", status: "Belum Diperbaiki", tanggal_lapor: new Date() });
        alert("✅ Laporan berhasil dikirim! Makasih ya koreksinya."); window.closeLaporModal();
    } catch (error) { console.error("Gagal ngirim laporan:", error); alert("Gagal mengirim laporan: " + error.message); } finally { btnSubmit.innerText = "Kirim Laporan"; btnSubmit.disabled = false; btnSubmit.style.background = "#d32f2f"; }
};

window.loadLaporanAdmin = async () => {
    const container = document.getElementById('containerLaporan'); if(!container) return;
    container.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Sabar, lagi narik data laporan...</div>`;
    try {
        const qLaporan = query(collection(window.db, "laporan_soal"), orderBy("tanggal_lapor", "desc")); const snap = await getDocs(qLaporan); container.innerHTML = "";
        if (snap.empty) { container.innerHTML = `<div style="text-align:center; padding:20px; color:green; font-weight:bold;"><i class="fas fa-check-circle"></i> Mantap! Belum ada laporan masuk.</div>`; return; }
        snap.forEach(docSnap => {
            const d = docSnap.data(), idDoc = docSnap.id, tgl = d.tanggal_lapor ? d.tanggal_lapor.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : "-";
            const item = document.createElement('div'); item.style = "background:white; border:1px solid #ccc; border-radius:8px; padding:15px; margin-bottom:15px; box-shadow:0 2px 5px rgba(0,0,0,0.05);";
            item.innerHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:10px;"><div><span style="background:var(--primary); color:white; padding:3px 8px; border-radius:4px; font-weight:bold; font-size:0.8rem;">${(d.modul_id || "Modul").toUpperCase()} - SOAL NO. ${d.nomor_soal_index}</span><span style="font-size:0.8rem; color:#666; margin-left:10px;"><i class="far fa-clock"></i> ${tgl}</span></div><div style="font-size:0.8rem; font-weight:bold; color:#555;"><i class="fas fa-user"></i> ${d.nama_pelapor || "Anonim"}</div></div><div style="font-size:0.9rem; color:#444; margin-bottom:10px; background:#f5f5f5; padding:8px; border-radius:4px;"><em>" ${d.teks_soal_penggalan || "(Teks soal)"} "</em></div><div style="font-size:0.9rem; margin-bottom:5px;"><span style="font-weight:bold; color:#d32f2f;">Alasan:</span> ${d.alasan}</div><div style="font-size:0.9rem; margin-bottom:15px;"><span style="font-weight:bold; color:var(--success);">Dasar Hukum:</span> ${d.dasar_hukum}</div><div style="display:flex; gap:10px; justify-content:flex-end;"><button onclick="hapusLaporan('${idDoc}')" style="background:#e74c3c; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:bold;"><i class="fas fa-trash"></i> Hapus Laporan</button><button onclick="document.getElementById('editModulTarget').value = '${d.modul_id}'; window.switchAdminTab('edit'); window.loadSoalAdmin();" style="background:var(--gold); color:#333; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:bold;"><i class="fas fa-pencil-alt"></i> Menuju Form Edit</button></div>`;
            container.appendChild(item);
        });
    } catch (e) { container.innerHTML = `<p style="color:red">Error ngambil data: ${e.message}</p>`; console.error(e); }
};

window.hapusLaporan = async (idDoc) => {
    if(!confirm("Udah beres direvisi? Yakin mau hapus laporan ini dari daftar?")) return;
    try { await deleteDoc(doc(window.db, "laporan_soal", idDoc)); alert("Laporan berhasil dihapus!"); loadLaporanAdmin(); } catch (error) { alert("Gagal menghapus laporan: " + error.message); }
};

window.updateUserStatus = async (isOnline, modulName = "Lobby") => {
    if (!currentUser || !window.db) return;
    try {
        const statusRef = doc(window.db, "user_status", currentUser.uid);
        await setDoc(statusRef, { uid: currentUser.uid, nama: currentUser.displayName, email: currentUser.email, isOnline: isOnline, lastActive: new Date(), currentModul: modulName }, { merge: true });
    } catch (e) { console.error("Gagal update status:", e); }
};

window.addEventListener('beforeunload', () => { if (currentUser) window.updateUserStatus(false, "Offline"); });

window.loadStatusAdmin = async () => {
    const container = document.getElementById('containerStatus'); if(!container) return;
    container.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Mendeteksi sinyal peserta dan menarik data VIP...</div>`;
    try {
        const qVip = query(collection(window.db, "vip_access")); const snapVip = await getDocs(qVip); let vipMap = {}; snapVip.forEach(doc => { vipMap[doc.id] = doc.data().code; });
        const qStatus = query(collection(window.db, "user_status"), orderBy("lastActive", "desc")); const snap = await getDocs(qStatus); container.innerHTML = "";
        if (snap.empty) { container.innerHTML = `<p style="text-align:center; padding:20px; color:gray;">Belum ada data peserta terekam.</p>`; return; }
        let html = `<table style="width:100%; border-collapse:collapse; font-size:0.9rem;"><thead><tr style="background:#eee; text-align:left;"><th style="padding:10px;">Nama & Email</th><th style="padding:10px; color:var(--primary);">Kode VIP</th><th style="padding:10px;">Status</th><th style="padding:10px;">Aktivitas Terakhir</th></tr></thead><tbody>`;
        const sekarang = new Date();
        snap.forEach(docSnap => {
            const d = docSnap.data(), waktu = d.lastActive ? d.lastActive.toDate() : new Date(), selisihMs = sekarang - waktu, selisihMenit = Math.floor(selisihMs / 60000), selisihJam = Math.floor(selisihMenit / 60), selisihHari = Math.floor(selisihJam / 24);
            let ketWaktu = ""; if (selisihMenit < 1) ketWaktu = "Baru saja"; else if (selisihMenit < 60) ketWaktu = `${selisihMenit} menit lalu`; else if (selisihJam < 24) ketWaktu = `${selisihJam} jam lalu`; else ketWaktu = `${selisihHari} hari lalu`;
            let isBeneranOnline = d.isOnline; if (selisihMenit > 120) isBeneranOnline = false;
            let aktivitasTeks = d.currentModul || 'Lobby', warnaAktivitas = 'var(--primary)', customBadge = null;
            if (aktivitasTeks === "VIP Gatekeeper") { warnaAktivitas = '#d35400'; aktivitasTeks = '<i class="fas fa-user-clock"></i> Pending Access'; customBadge = `<span style="background:#fff3e0; color:#e67e22; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.8rem;">🟡 UNREGISTERED</span>`; }
            let badgeStatus = customBadge ? customBadge : (isBeneranOnline ? `<span style="background:#e8f5e9; color:#2e7d32; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.8rem;">🟢 ONLINE</span>` : `<span style="background:#ffebee; color:#c62828; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.8rem;">🔴 OFFLINE</span>`);
            let infoAktivitas = isBeneranOnline ? `<span style="color:${warnaAktivitas}; font-weight:bold;">${aktivitasTeks}</span>` : `<span style="color:#888;">${ketWaktu}</span>`;
            let kodeVipUser = "Belum Buat"; if (d.email && vipMap[d.email]) { kodeVipUser = vipMap[d.email]; }
            html += `<tr style="border-bottom:1px solid #eee;"><td style="padding:10px; color:#444;"><strong style="display:block;">${d.nama}</strong><span style="font-size:0.75rem; color:#888;">${d.email || '-'}</span></td><td style="padding:10px;"><span style="background:#fff3e0; color:#d35400; padding:5px 10px; border-radius:6px; font-family:monospace; font-weight:bold; border:1px solid #ffe0b2;">${kodeVipUser}</span></td><td style="padding:10px;">${badgeStatus}</td><td style="padding:10px;">${infoAktivitas}</td></tr>`;
        });
        html += `</tbody></table>`; container.innerHTML = html;
    } catch (e) { container.innerHTML = `<p style="color:red">Error radar: ${e.message}</p>`; console.error(e); }
};

window.cekValiditasAI = async (btn, idSoal, qTeksEsc, optStrEsc, ansIdx, expEsc, citeEsc) => {
    const teksSoal = decodeURIComponent(qTeksEsc), opsiArr = JSON.parse(decodeURIComponent(optStrEsc)), pembahasan = decodeURIComponent(expEsc), sumber = decodeURIComponent(citeEsc);
    const resultDiv = document.getElementById(`ai-result-${idSoal}`); btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Mikir...`; btn.disabled = true; resultDiv.style.display = 'block'; resultDiv.innerHTML = `<span style="color: #8e44ad;"><i class="fas fa-cog fa-spin"></i> Gemini sedang menganalisis akurasi hukum...</span>`;
    const API_KEY = "AIzaSy" + "A_cAiDYw" + "PZKlkQP6" + "91zDoSbS" + "_FoejjHjw";
    const prompt = `Anda adalah Hakim Agung di Indonesia. Tolong validasi soal ujian Calon Hakim (Cakim) berikut ini:\n\nSOAL: "${teksSoal}"\nPILIHAN JAWABAN: \n${opsiArr.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('\n')}\n\nKUNCI JAWABAN DARI ADMIN: Pilihan ${String.fromCharCode(65 + ansIdx)}\nPEMBAHASAN ADMIN: "${pembahasan}"\nDASAR HUKUM/SUMBER: "${sumber}"\n\nTUGAS: \n1. Apakah kunci jawaban tersebut sudah BENAR secara hukum positif Indonesia saat ini?\n2. Apakah pembahasan dan dasar hukumnya akurat?\n3. Jika ada yang salah atau kurang tepat, tolong koreksi!\n\nBerikan jawaban dengan format tebal pada kesimpulannya (contoh: **VALID** atau **TIDAK VALID**), lalu jelaskan alasannya dengan singkat dan profesional.`;
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const data = await response.json(); if (!response.ok) { throw new Error(data.error?.message || "Gagal terhubung ke Google API."); }
        let aiReply = data.candidates[0].content.parts[0].text; aiReply = aiReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
        resultDiv.innerHTML = `<strong style="color: #8e44ad;"><i class="fas fa-robot"></i> Analisis Gemini:</strong><br><br>${aiReply}`;
    } catch (e) { resultDiv.innerHTML = `<span style="color: red;"><strong>Error dari Google:</strong> ${e.message}</span>`; } finally { btn.innerHTML = `<i class="fas fa-check"></i> Selesai Dicek`; btn.disabled = false; }
};
