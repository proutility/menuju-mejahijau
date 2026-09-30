import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, deleteDoc, writeBatch, doc, getDoc, updateDoc, setDoc, onSnapshot, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const EDITOR_EMAILS = ["febrilliank@gmail.com", "glorifikalaw@gmail.com", "amifaveiro9@gmail.com"];
let db, auth, provider, currentUser;

// ==========================================
// SISTEM NOTIFIKASI PREMIUM PRO-TAMA (FIX OVERLAP)
// ==========================================
window.PROTAMA = {
    alert: (title, text, icon = 'success') => {
        const colors = { success: '#004d00', error: '#c0392b', warning: '#f39c12', info: '#3498db' };
        Swal.fire({
            title: title.toUpperCase(),
            text: text,
            icon: icon,
            confirmButtonColor: colors[icon] || '#004d00',
            confirmButtonText: 'Seles',
            background: document.body.classList.contns('dark-mode') ? '#242424' : '#fff',
            color: document.body.classList.contns('dark-mode') ? '#fff' : '#333',
            didOpen: () => {
                // 🛑 FIX: Paksa pop-up nongol di lapisan paling depan (nembus overlay apapun)
                const swalBox = document.querySelector('.swal2-contner');
                if (swalBox) swalBox.style.setProperty('z-index', '2147483647', 'important');
            }
        });
    },

    confirm: async (title, text) => {
        const result = await Swal.fire({
            title: title.toUpperCase(),
            text: text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#004d00',
            cancelButtonColor: '#7f8c8d',
            confirmButtonText: 'Ya, Lanjutkan',
            cancelButtonText: 'Batal',
            background: document.body.classList.contains('dark-mode') ? '#242424' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#333',
            didOpen: () => {
                // 🛑 FIX: Paksa pop-up nongol di lapisan paling depan
                const swalBox = document.querySelector('.swal2-container');
                if (swalBox) swalBox.style.setProperty('z-index', '2147483647', 'important');
            }
        });
        return result.isConfirmed;
    },

    loading: (msg = "Sedang memproses...") => {
        Swal.fire({
            title: 'MOHON TUNGGU',
            html: `<strong>${msg}</strong>`,
            allowOutsideClick: false,
            didOpen: () => { 
                Swal.showLoading(); 
                // 🛑 FIX: Paksa pop-up nongol di lapisan paling depan
                const swalBox = document.querySelector('.swal2-container');
                if (swalBox) swalBox.style.setProperty('z-index', '2147483647', 'important');
            }
        });
    },

    close: () => { Swal.close(); }
};

// Inisialisasi Firebase
if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    window.db = db; // Bikin global biar console aman
    provider = new GoogleAuthProvider();
}

// --- 2. DAFTAR KODE UNIK (ASAS HUKUM) ---
const legalTerms = [
    "PACTA-SUNT-SERVANDA", "IUS-CURIA-NOVIT", "LEX-SPECIALIS", "AUDI-ALTERAM-PARTEM", "ULTIMUM-REMEDIUM", "FIKSI-HUKUM", 
    "LEGAL-STANDING", "DUE-PROCESS", "EQUITY-BEFORE-LAW", "RESTORATIVE-JUSTICE", "CONTEMPT-OF-COURT", "EX-AEQUO-ET-BONO",
    "PRO-BONO", "HAK-IMUNITAS", "PRADUGA-TAK-BERSALAH", "EQUALITY-BEFORE-THE-LAW", "DUE-PROCESS-OF-LAW", "RESTITUTIO-IN-INTEGRUM", 
    "SALUS-POPULI-SUPREMA-LEX", "LEX-POSTERIORI", "LEX-SUPERIOR", "UBI-SOCIETAS-IBI-IUS", "NULLUM-DELICTUM", "IN-DUBIO-PRO-REO", 
    "NE-BIS-IN-IDEM", "ACTUS-REUS", "MENS-REA", "AD-MALA-RES-PULSA", "BONA-FIDES", "UNJUST-ENRICHMENT", "NON-DEROGABLE-RIGHTS", 
    "VERBA-VOLANT", "AL-ADALAH", "AL-MUSAWWAH", "AL-AMANAH", "AL-HURIYYAH", "AS-SHULHU-SAYYIDUL-AHKAM", "AL-YAQINU-LA-YUZALU", 
    "AL-UMURU-BIMAQASHIDIHA", "AL-ADATU-MUHAKKAMAH", "SUMMUM-IUS", "COGITATIONIS-POENAM", "EI-INCUMBIT-PROBATIO", 
    "FACTA-SUNT-POTENTIORA", "IGNORANTIA-EXCUSAT", "INDEX-ANIMI-SERMO", "IUSTITIA-EST-CONSTANS", "LEX-DIVINA", 
    "NEMO-JUDEX", "SIMILIA-SIMILIBUS", "TESTIMONIUM-DE-AUDITU"
];

// --- 3. LOGIKA UTAMA (GATEKEEPER + ADMIN + MAINTENANCE) ---
if(auth) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const gateOverlay = document.getElementById('gatekeeperOverlay');

            // A. PANGGIL MAINTENACE (Supaya User Terpantau)
            watchMaintenance(); 

        // B. CEK ADMIN & ASISTEN ADMIN (Fitur Copy Paste Nyala)
            const isSuperAdmin = ADMIN_EMAILS.includes(user.email);
            const isEditor = typeof EDITOR_EMAILS !== 'undefined' && EDITOR_EMAILS.includes(user.email);

            if (isSuperAdmin || isEditor) {
                document.body.classList.add('is-admin'); 
                const btnAdmin = document.getElementById('btnAdminPanel');
                if(btnAdmin) btnAdmin.style.display = 'flex'; 
                
                const btnAdminLobby = document.getElementById('btnAdminLobby');
                if(btnAdminLobby) btnAdminLobby.style.display = 'block';

               // --- SENSOR FITUR KHUSUS ASISTEN ADMIN ---
                if (isEditor && !isSuperAdmin) {
                    setTimeout(() => {  // <--- UBAH JADI setTimeout
                        // 1. Sembunyikan Tombol Maintenance
                        const btnMaintenance = document.getElementById('btnToggleMaintenance');
                        if (btnMaintenance) btnMaintenance.style.display = 'none';

                        // 2. Sembunyikan Tab Radar Peserta
                        const tabRadar = document.querySelector('button[onclick="window.switchAdminTab(\'status\')"]');
                        if (tabRadar) tabRadar.style.display = 'none';

                        // 3. Sembunyikan Export Excel & Backup JSON
                        const btnExcel = document.querySelector('button[onclick="window.downloadSoalExcel()"]');
                        if (btnExcel) btnExcel.style.display = 'none';
                        const btnJsonDb = document.querySelector('button[onclick="window.downloadSoalJSON()"]');
                        if (btnJsonDb) btnJsonDb.style.display = 'none';

                        // 4. Sembunyikan Fitur Upload JSON
                        const tabUpload = document.querySelector('button[onclick="window.switchAdminTab(\'tambah\')"]');
                        if (tabUpload) tabUpload.style.display = 'none';
                        const btnUploadAksi = document.querySelector('button[onclick="window.eksekusiUpload()"]');
                        if (btnUploadAksi) btnUploadAksi.style.display = 'none';
                        
                    }, 500); 
                    
                    console.log("Asisten Admin Login: Hanya bisa Edit, Review, dan Laporan.");
                } else {
                    console.log("Super Admin Login: Akses Penuh.");
                }

            } else {
                document.body.classList.remove('is-admin');
            }

            // C. PROSES GATEKEEPER (Pintu VIP)
            document.getElementById('loginOverlay').style.setProperty('display', 'none', 'important');
            if(gateOverlay) gateOverlay.style.display = 'flex';
            
            // Reset Tampilan Gatekeeper
            document.getElementById('gateLoading').style.display = 'block';
            document.getElementById('gateInputArea').style.display = 'none';

           // 🛑 JALUR TOL: CEK APAKAH USER BAWA LINK ROOM? (BYPASS VIP)
            const urlParams = new URLSearchParams(window.location.search);
            const roomTarget = urlParams.get('room');

            if (roomTarget) {
                console.log("Jalur VIP Bypass Aktif untuk Room:", roomTarget);
                lanjutKeAplikasi();
                
                setTimeout(async () => {
                    window.isVIPUser = false;
                    try {
                        const accRef = doc(db, "vip_access", user.email);
                        const accSnap = await getDoc(accRef);
                        if(accSnap.exists() && accSnap.data().isVerified === true) {
                            window.isVIPUser = true;
                        }
                    } catch(e) {}
                    
                    window.gabungRoomLatihanOtomatis(roomTarget);
                }, 1000);
                
                return; // BERHENTI DI SINI
            }

            // 🛑 JALUR TOL KHUSUS ADMIN & EDITOR (BYPASS GERBANG VIP)
            if (isSuperAdmin || isEditor) {
                console.log("Jalur Bebas Hambatan (VVIP) untuk Admin & Editor");
                window.isVIPUser = true; // Langsung cap halal sebagai VIP
                lanjutKeAplikasi();      // Terbangkan langsung ke Lobby
                return;                  // Hentikan sistem biar ga minta kode VIP!
            }

            // --- PROSES NORMAL JIKA TIDAK BAWA LINK ROOM (PESERTA BIASA) ---
            try {
                const accessRef = doc(db, "vip_access", user.email);
                const accessSnap = await getDoc(accessRef);
            
                if (accessSnap.exists()) {
                    if (accessSnap.data().isVerified === true) {
                        window.isVIPUser = true; // 🛑 TANDAI SEBAGAI VIP ASLI
                        lanjutKeAplikasi();
                    } else {
                        showGateInput(user.displayName, user.email);
                        window.updateUserStatus(true, "VIP Gatekeeper"); 
                    }
                } else {
                    // USER BARU (Atau Admin Baru) -> BIKIN KODE + KIRIM EMAIL
                    const randomAsas = legalTerms[Math.floor(Math.random() * legalTerms.length)];
                    const randomNum = Math.floor(100 + Math.random() * 899);
                    const finalCode = `${randomAsas}-${randomNum}`;

                    await setDoc(accessRef, {
                        name: user.displayName,
                        email: user.email,
                        code: finalCode,
                        isVerified: false,
                        createdAt: new Date()
                    });

                    // KIRIM EMAIL PAKE GOOGLE APPS SCRIPT
                    fetch("https://script.google.com/macros/s/AKfycbwZcPxD1ZX8CgW8yhGZA9AM3S39jmpxFlti9sU_RlYP/dev", {
                        method: "POST",
                        mode: "no-cors",
                        body: JSON.stringify({
                            user_name: user.displayName,
                            user_email: user.email,
                            vip_code: finalCode
                        })
                    }).then(() => {
                        showGateInput(user.displayName, user.email);
                        // --- TAMBAHAN: Lapor ke Radar ---
                        window.updateUserStatus(true, "VIP Gatekeeper");
                    }).catch(err => {
                        console.error("Gagal fetch GAS:", err);
                        showGateInput(user.displayName, user.email);
                        // --- TAMBAHAN: Lapor ke Radar walau email gagal ---
                        window.updateUserStatus(true, "VIP Gatekeeper");
                    });
                }
            } catch (e) {
                console.error("Error Gatekeeper:", e);
                alert("Gagal memuat data akses: " + e.message);
            }

        } else {
            // STATE LOGOUT
            document.body.classList.remove('is-admin');
            document.getElementById('loginOverlay').style.setProperty('display', 'block', 'important');
            document.getElementById('appSection').style.display = 'none';
            if(document.getElementById('gatekeeperOverlay')) document.getElementById('gatekeeperOverlay').style.display = 'none';
        }
    });
}
// Fungsi Sakti: Auto-Cari & Auto-Klik Soal dari Laporan
window.editSoalDariLaporan = async (modulId, encSnippet) => {
    // Decode teks penggalan dan buang titik-titiknya biar gampang dicari
    const snippet = decodeURIComponent(encSnippet).replace("...", "").trim();
    
    // 1. Pindah tab ke "Edit" dan isi target modul
    document.getElementById('editModulTarget').value = modulId;
    window.switchAdminTab('edit');
    
    // 2. Load daftar soal (wajib pakai await biar datanya kelar ditarik dulu)
    PROTAMA.loading("Mencari soal yang dilaporkan...");
    await window.loadSoalAdmin();
    
    // 3. Otomatis ketik di kolom pencarian & filter daftarnya
    const searchInput = document.getElementById('searchSoalAdmin');
    if (searchInput) {
        searchInput.value = snippet;
        window.filterSoalAdmin(); // Panggil fungsi filter lo
    }
    
    // 4. Auto-Klik soal yang cocok biar Form Edit langsung keisi!
    const listContainer = document.getElementById("listSoalAdmin");
    const items = listContainer.getElementsByTagName("div");
    let ketemu = false;
    
    for (let i = 0; i < items.length; i++) {
        // Cari elemen div yang nggak ke-hide (hasil filter)
        if (items[i].style.display !== "none") {
            items[i].click(); // Simulasikan klik
            ketemu = true;
            break;
        }
    }

    PROTAMA.close();
    
    if (!ketemu) {
        PROTAMA.alert("Oops!", "Soalnya nggak ketemu. Mungkin udah pernah dihapus/diedit sebelumnya.", "warning");
    }
};

// --- 4. FUNGSI PEMBANTU (WAJIB ADA) ---

// Fungsi Masuk Dashboard (Setelah Lolos VIP)
function lanjutKeAplikasi() {
    // Matikan semua overlay
    document.getElementById('loginOverlay').style.setProperty('display', 'none', 'important');
    const gate = document.getElementById('gatekeeperOverlay');
    if(gate) gate.style.display = 'none';

    // Buka Dashboard Utama
    document.getElementById('appSection').style.display = 'flex';
    
    // Panggil Logic Lobby
    if(typeof window.tampilkanLobby === 'function') window.tampilkanLobby();
    
    // Update Profil Sidebar
    if(currentUser) {
        document.getElementById('roleDisplay').innerText = currentUser.displayName; 
        document.getElementById('userAvatar').src = currentUser.photoURL;
        
        const roleLabel = document.querySelector('.user-role-label');
        if (ADMIN_EMAILS.includes(currentUser.email)) {
            if(roleLabel) roleLabel.innerHTML = '<i class="fas fa-user-shield" style="color:#ffd700;"></i> Administrator';
        } else {
            if(roleLabel) roleLabel.innerHTML = '<i class="fas fa-user-tie"></i> Peserta Ujian';
        }
    }

// Sembunyikan elemen ujian saat di lobby (VERSI AMAN ANTI CRASH)
    const fTimer = document.getElementById('floatingTimer');
    if (fTimer) fTimer.style.display = 'none';
    
    const mFooter = document.getElementById('mobileFooter');
    if (mFooter) mFooter.style.display = 'none'; 

    // Load Data Statistik Lobby
    setTimeout(() => { 
        if(typeof window.loadLobbyData === 'function') window.loadLobbyData(); 
    }, 1000);
    
    window.updateUserStatus(true, "Lobby Utama");
}

// Fungsi Tampilkan Form Input Kode
function showGateInput(name, email) {
    document.getElementById('gateLoading').style.display = 'none';
    document.getElementById('gateInputArea').style.display = 'block';
    document.getElementById('gateUserName').innerText = name.split(" ")[0];
    document.getElementById('gateEmailUser').innerText = email;
}

// Fungsi Verifikasi Tombol (Dipanggil via onclick HTML)
window.verifyVipCode = async () => {
    const input = document.getElementById('inputVipCode').value.trim().toUpperCase();
    const btn = document.getElementById('btnVerifyVip');
    
    if(!input) return alert("Silahkan masukan kode unik!");

    btn.innerText = "Memverifikasi...";
    btn.disabled = true;

    try {
        const accessRef = doc(db, "vip_access", currentUser.email);
        const accessSnap = await getDoc(accessRef);

        if (accessSnap.exists() && accessSnap.data().code === input) {
            // Update Status Jadi Verified
            await updateDoc(accessRef, { isVerified: true, verifiedAt: new Date() });
            
            alert("✅ Akses VIP Terbuka! Selamat Belajar.");
            // Masuk Aplikasi
            lanjutKeAplikasi();
        } else {
            document.getElementById('vipError').style.display = 'block';
            btn.innerText = "BUKA AKSES SEKARANG";
            btn.disabled = false;
        }
    } catch (e) { 
        alert("Error verifikasi: " + e.message); 
        btn.disabled = false; 
    }
};

// Fungsi Login & Logout
window.handleLogin = async () => {
    if(!auth) { alert("Firebase Error!"); return; }
    try { await signInWithPopup(auth, provider); } 
    catch (error) { document.getElementById('loginError').innerText = error.message; }
};
window.handleLogout = async () => { 
    if(auth) {
        if(currentUser) await window.updateUserStatus(false, "Offline");
        signOut(auth).then(() => location.reload()); 
    }
};
// --- 5. FUNGSI MAINTENANCE (WAJIB DITARUH DISINI BIAR GAK ERROR) ---
function watchMaintenance() {
    if (!db) return;
    const statusRef = doc(db, "settings", "app_status");
    
    onSnapshot(statusRef, (docSnap) => {
        if (docSnap.exists()) {
            const isMaintenance = docSnap.data().maintenance;
            const btn = document.getElementById('btnToggleMaintenance');
            const overlay = document.getElementById('maintenanceOverlay');

            // Update Tombol Admin
            if (btn) {
                if (isMaintenance) {
                    btn.innerHTML = '<i class="fas fa-lock"></i> Maintenance: ON';
                    btn.style.background = "#c0392b"; 
                } else {
                    btn.innerHTML = '<i class="fas fa-lock-open"></i> Maintenance: OFF';
                    btn.style.background = "#2e7d32"; 
                }
            }

            // Kunci Layar untuk User Biasa
            if (isMaintenance && !ADMIN_EMAILS.includes(currentUser?.email)) {
                if (overlay) overlay.style.display = 'block';
            } else {
                if (overlay) overlay.style.display = 'none';
            }
        }
    });
}

window.toggleMaintenanceStatus = async () => {
    const statusRef = doc(db, "settings", "app_status");
    try {
        const docSnap = await getDoc(statusRef);
        if (docSnap.exists()) {
            const currentStatus = docSnap.data().maintenance;
            await updateDoc(statusRef, {
                maintenance: !currentStatus,
                lastUpdated: new Date(),
                updatedBy: currentUser.displayName
            });
        } else {
            await setDoc(statusRef, { maintenance: true });
            alert("Status Maintenance dibuat: AKTIF");
        }
    } catch (e) {
        alert("Gagal mengubah status: " + e.message);
    }
};

// ==========================================
window.saveScoreToCloud = async (modulId, skor) => {
    if (!currentUser || !db) return;
    try {
        await addDoc(collection(db, "leaderboard"), {
            uid: currentUser.uid, nama: currentUser.displayName, modul: modulId, skor: skor, tanggal: new Date()
        });
    } catch (e) { console.error("Gagal simpan skor:", e); }
};

window.savePapiToCloud = async (status, totalFail, detail) => {
    if(!auth.currentUser) return;
    try {
        await addDoc(collection(db, "riwayat_psikotes"), {
            uid: auth.currentUser.uid,
            nama: auth.currentUser.displayName,
            modul: window.currentDatabaseId || "PAPI Kostick",
            status: status,
            fail_count: totalFail,
            detail_skor: detail,
            createdAt: new Date() 
        });
        console.log("Data PAPI Tersimpan!");
    } catch (e) {
        console.error("Gagal simpan PAPI:", e);
    }
};

// --- FUNGSI DUAL MODE LEADERBOARD (FIXED & FILTER PAPI) ---
window.openLeaderboard = async (mode = 'local') => {
    // 1. Cek Database
    if (!window.db) { 
        console.error("Database belum siap!"); 
        alert("Tunggu sebentar, sedang menyambungkan ke server..."); 
        return; 
    }
    
    console.log("Membuka Leaderboard Mode:", mode);

    // 2. Siapkan UI Overlay
    const overlay = document.getElementById('leaderboardOverlay');
    const tbody = document.getElementById('leaderboardBody');
    const titleEl = document.getElementById('lbModulName');
    const tableHeader = document.querySelector('#leaderboardOverlay .stats-table thead tr');

    if(overlay) overlay.style.display = 'flex';
    if(tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Memuat Data...</td></tr>';

    try {
        // === MODE 1: GLOBAL RANKING (HANYA HUKUM & TPA) ===
        if (mode === 'global') {
            if(titleEl) titleEl.innerText = "Ranking Global (Hukum & TPA)";
            
            // Ubah Header Tabel: No | Nama | Nilai | Total Tes
            if(tableHeader) tableHeader.innerHTML = '<th style="width:10%">No</th><th>Nama</th><th style="width:20%">Nilai</th><th style="width:25%">Total Tes</th>';
            
            // Ambil 1000 data teratas
            const qLb = query(collection(window.db, "leaderboard"), orderBy("skor", "desc"), limit(1000));
            const snapLb = await getDocs(qLb);
            
            let userTotals = {}; 
            
            snapLb.forEach(doc => {
                const d = doc.data();
                
                // --- 🔥 FILTER SAKTI: BUANG PAPI KOSTICK 🔥 ---
                const namaModul = d.modul ? d.modul.toString().toLowerCase() : "";
                if (namaModul.includes('papi') || namaModul === 'modul18') {
                    return; // SKIP DATA INI (Gak dihitung)
                }

                const nilai = parseInt(d.skor) || 0;
                
                // Inisialisasi object user kalau belum ada
                if (!userTotals[d.nama]) userTotals[d.nama] = {};
                
                // Logic: Hanya ambil nilai TERTINGGI di setiap modul
                if (!userTotals[d.nama][d.modul] || nilai > userTotals[d.nama][d.modul]) {
                    userTotals[d.nama][d.modul] = nilai;
                }
            });

            // Hitung Total Poin
            let rankingList = [];
            for (let [nama, modules] of Object.entries(userTotals)) {
                const totalPoints = Object.values(modules).reduce((a, b) => a + b, 0);
                const moduleCount = Object.keys(modules).length;
                rankingList.push({ nama: nama, total: totalPoints, count: moduleCount });
            }

            // Urutkan Peringkat (Poin Tertinggi di Atas)
            rankingList.sort((a, b) => b.total - a.total);

            // Render ke Tabel
            if(tbody) {
                tbody.innerHTML = '';
                if (rankingList.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4">Belum ada data Hukum/TPA.</td></tr>';
                } else {
                    // Tampilkan Top 50 Aja biar gak berat
                    rankingList.slice(0, 50).forEach((val, index) => {
                        let rankDisplay = index + 1;
                        let rowStyle = '';
                        let icon = '';
                        
                        // Styling Juara
                        if (index === 0) { rowStyle = 'background:#fff9c4; font-weight:bold;'; icon = '🥇 '; }
                        else if (index === 1) { rowStyle = 'background:#f5f5f5; font-weight:bold;'; icon = '🥈 '; }
                        else if (index === 2) { rowStyle = 'background:#fff; border:1px solid #d7ccc8; font-weight:bold;'; icon = '🥉 '; }

                        let tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td style="text-align:center; ${rowStyle}">${icon}${rankDisplay}</td>
                            <td style="${rowStyle}">${val.nama}</td>
                            <td style="text-align:center; ${rowStyle}">${val.total} Pts</td>
                            <td style="text-align:center; font-size:0.85rem; ${rowStyle}">${val.count} Modul</td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }

        } 
        // === MODE 2: LOCAL RANKING (PER MODUL) ===
        else {
            const currentModul = window.currentDatabaseId || "modul1";
            if(titleEl) {
                const elJudul = document.getElementById('modulTitle');
                titleEl.innerText = elJudul ? elJudul.innerText : currentModul;
            }

            // Balikin Header Tabel: No | Nama | Skor | Waktu
            if(tableHeader) tableHeader.innerHTML = '<th style="width:10%">#</th><th>Nama</th><th style="width:20%">Skor</th><th style="width:25%">Waktu</th>';

            const q = query(collection(window.db, "leaderboard"), where("modul", "==", currentModul), orderBy("skor", "desc"), limit(50));
            const snapshot = await getDocs(q);
            
            const bestScores = {};
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (!bestScores[data.nama] || parseInt(data.skor) > parseInt(bestScores[data.nama].skor)) {
                    bestScores[data.nama] = data;
                }
            });
            
            let sortedData = Object.values(bestScores).sort((a, b) => b.skor - a.skor);
            
            if(tbody) {
                tbody.innerHTML = '';
                if (sortedData.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="4">Belum ada data modul ini.</td></tr>';
                } else {
                    sortedData.forEach((val, index) => {
                        let tgl = val.tanggal && val.tanggal.seconds ? new Date(val.tanggal.seconds * 1000).toLocaleDateString('id-ID') : '-';
                        let tr = document.createElement('tr');
                        tr.innerHTML = `<td>${index + 1}</td><td>${val.nama}</td><td>${val.skor}</td><td>${tgl}</td>`;
                        tbody.appendChild(tr);
                    });
                }
            }
        }

    } catch (error) { 
        console.error("Error Leaderboard:", error); 
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" style="color:red;">Gagal memuat: ${error.message}</td></tr>`; 
    }
};

window.closeLeaderboard = () => { document.getElementById('leaderboardOverlay').style.display = 'none'; };

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
    
let currentModulKey = 'modul1';
let currentQuestions = [];
let currentIdx = 0;
let userAnswers = [];
let raguStatus = [];
let isSubmitted = false;
let timerInterval;
let timeRemaining;
let totalExamTime = 0;
let isReviewMode = false;
let wrongIndices = [];
let currentAppMode = 'ujian'; // Pilihan: 'ujian', 'latihan', 'room'
let trainingTimerInterval = null;
let trainingCountdown = 10;
let isAnswerLocked = false;
let roomListenerUnsubscribe = null;

window.currentDatabaseId = 'modul1';

// --- FIX TOGGLE SIDEBAR HP (AUTO HIDE BUTTONS) ---
window.toggleMobileSidebar = function() {
    const sidebar = document.querySelector('.sidebar-right');
    const floatingTimer = document.getElementById('floatingTimer');
    const mobileFooter = document.getElementById('mobileFooter');

    sidebar.classList.toggle('show-mobile');

    if (sidebar.classList.contains('show-mobile')) {
        if(floatingTimer) floatingTimer.style.setProperty('display', 'none', 'important');
        if(mobileFooter) mobileFooter.style.display = 'none';
    } else {
        if (document.body.classList.contains('ujian-berjalan')) {
            if(floatingTimer) floatingTimer.style.display = 'block';
            if(mobileFooter) mobileFooter.style.display = 'flex';
        }
    }

    if (!document.getElementById('btnCloseMobile')) {
        const btnClose = document.createElement('button');
        btnClose.id = 'btnCloseMobile';
        btnClose.className = 'close-sidebar-btn';
        btnClose.innerHTML = 'Tutup Daftar Soal ✖️';
        btnClose.onclick = window.toggleMobileSidebar;
        sidebar.insertBefore(btnClose, sidebar.firstChild);
    }
}

// --- FIX TOGGLE MODUL HP (AUTO HIDE BUTTONS) ---
window.toggleMobileModul = function() {
    const sidebar = document.querySelector('.sidebar-left');
    const timer = document.getElementById('floatingTimer');
    const mobileFooter = document.getElementById('mobileFooter');

    if (sidebar.style.display === 'flex') {
        sidebar.style.display = ''; 
        if(timer && document.body.classList.contains('ujian-berjalan')) timer.style.display = 'block';
        if(mobileFooter) mobileFooter.style.display = 'flex';
    } else {
        sidebar.style.display = 'flex'; 
        if(timer) timer.style.display = 'none';
        if(mobileFooter) mobileFooter.style.display = 'none';
    }
}

// ==========================================
// PENGAMAN KEYBOARD SHORTCUT (NONAKTIF DI MULTIPLAYER)
// ==========================================
document.addEventListener('keydown', function(event) {
    // 🛑 JIKA SEDANG DI LOBBY, DI MODAL, ATAU DI MODE ROOM (MULTIPLAYER), MATIKAN SEMUA SHORTCUT!
    if (document.getElementById('appSection').style.display === 'none') return;
    if (typeof currentAppMode !== 'undefined' && currentAppMode === 'room') return;

    // Tombol panah dan pilihan ganda hanya aktif di Singleplayer / Latihan Mandiri
    switch(event.key) {
        case "ArrowRight": window.changeQuestion(1); break;
        case "ArrowLeft": window.changeQuestion(-1); break;
        case "a": case "A": selectKey(0); break;
        case "b": case "B": selectKey(1); break;
        case "c": case "C": selectKey(2); break;
        case "d": case "D": selectKey(3); break;
        case "e": case "E":
            if(!isSubmitted) {
                const chk = document.getElementById('checkRagu');
                if(chk) { chk.checked = !chk.checked; window.toggleRagu(); }
            }
            break;
    }
});

function selectKey(idx) {
    if(!isSubmitted && !isReviewMode) {
        let labels = document.getElementsByClassName('option-label');
        if(labels[idx]) labels[idx].click();
    }
}

window.switchDatabase = async function(key) {
    if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
    window.speechSynthesis.cancel();
    
    document.getElementById('lobbySidebarContent').style.display = 'none';
    const examSide = document.getElementById('examSidebarContent');
    if(examSide) examSide.style.display = 'flex';
    currentModulKey = key;
    window.currentDatabaseId = key;

    window.updateUserStatus(true, "Mengerjakan " + key.toUpperCase());
    
    const qText = document.getElementById('questionText');
    const optCont = document.getElementById('optionsContainer');
    const footer = document.querySelector('.footer-nav');
    
    if(qText) qText.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px;">
            <i class="fas fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 20px;"></i>
            <p style="font-weight: 600; color: #555; animation: blink 1s infinite;">Sedang menyiapkan soal...</p>
        </div>
        <style>@keyframes blink { 50% { opacity: 0.5; } }</style>
    `;
    if(optCont) optCont.innerHTML = '';
    if(footer) footer.style.visibility = 'hidden';

    try {
        let judulModul = "Modul Latihan";
        const tombolMenu = document.getElementById('btn-' + key);
        if (tombolMenu) {
            judulModul = tombolMenu.innerText.trim(); 
        }

        let rawQuestions = [];
        let jumlahSoalServer = 0;

        // 🛑 JURUS BYPASS MABAR: Ambil dari brankas Room! 🛑
        if (currentAppMode === 'room' && window.currentRoomCode) {
            const roomRef = doc(db, "rooms", window.currentRoomCode);
            const roomSnap = await getDoc(roomRef);
            
            if (roomSnap.exists() && roomSnap.data().soalTersimpan) {
                rawQuestions = JSON.parse(JSON.stringify(roomSnap.data().soalTersimpan)); 
                jumlahSoalServer = rawQuestions.length;
                judulModul = roomSnap.data().nama || judulModul; 
                console.log(`🎮 Mode Mabar: Menyedot ${jumlahSoalServer} soal proporsional dari Room!`);
            } else {
                alert("⚠️ Data soal room tidak ditemukan!");
                return;
            }
        } 
        // 🛑 MODE SINGLEPLAYER BIASA (Cara Lama) 🛑
        else {
            const docRef = doc(db, "bank_soal", key);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().title) {
                judulModul = docSnap.data().title;
            }

            const qRef = collection(db, "bank_soal", key, "daftar_soal");
            const qSnap = await getDocs(qRef);

            if (qSnap.empty) {
                alert("⚠️ Soal untuk modul ini belum di-upload ke server!");
                if(qText) qText.innerText = "Belum ada soal.";
                return;
            }
            
            jumlahSoalServer = qSnap.size;
            qSnap.forEach((doc) => { 
                let d = JSON.parse(JSON.stringify(doc.data())); 
                d.id = doc.id; 
                rawQuestions.push(d); 
            });
        }

        const dataLama = loadProgresLokal(key);

        // SYARAT PAKAI CACHE
        if (dataLama && dataLama.soalAcak && dataLama.soalAcak.length > 0 && currentAppMode !== 'room' && dataLama.soalAcak.length === jumlahSoalServer) {
            console.log(`🔄 Melanjutkan progres lama untuk modul: ${key}`);
            currentQuestions = dataLama.soalAcak;
            userAnswers = dataLama.jawaban;
            raguStatus = dataLama.ragu;
            totalExamTime = currentQuestions.length * 30; 
            timeRemaining = dataLama.waktuSisa !== undefined ? dataLama.waktuSisa : totalExamTime;
        } else {
            console.log(`🆕 Mulai ujian baru...`);
            
            // 🛑 JANGAN DIACAK KALO MODE ROOM 
            if (currentAppMode !== 'room') {
                shuffleArray(rawQuestions); 
            }
            
            rawQuestions.forEach(q => {
                if(q.options && q.answer < q.options.length) {
                    let correctText = q.options[q.answer]; 
                    if (currentAppMode !== 'room') {
                        shuffleArray(q.options); 
                    }
                    q.answer = q.options.indexOf(correctText); 
                }
            });

            currentQuestions = rawQuestions;
            
            userAnswers = new Array(currentQuestions.length).fill(null);
            raguStatus = new Array(currentQuestions.length).fill(false);
            
            totalExamTime = currentQuestions.length * 30; 
            timeRemaining = totalExamTime;
            
            simpanProgresTotal(); 
        }

        isSubmitted = false;
        isReviewMode = false;
        isAnswerLocked = false;
        currentIdx = 0;

        let btnBalik = document.getElementById('btnSidebarKembali');
        if (btnBalik) {
            btnBalik.style.display = 'none';
        }

        document.querySelectorAll('.modul-btn').forEach(btn => btn.classList.remove('active-modul'));
        const activeBtn = document.getElementById('btn-'+key);
        if(activeBtn) activeBtn.classList.add('active-modul');

        const titleEl = document.getElementById('modulTitle');
        if(titleEl) titleEl.innerText = judulModul;
        
        const modeInd = document.getElementById('modeIndicator');
        if(modeInd) {
            modeInd.innerText = "Mode: Ujian";
            modeInd.style = "color: var(--warning); font-weight: bold; background:#fff3e0; padding:5px 15px; border-radius:20px; border:1px solid #ffe0b2; display:block;";
        }
        
        const finishCont = document.querySelector('.finish-container');
        if(finishCont) finishCont.style.display = 'block';
        
        document.getElementById('resultOverlay').style.display = 'none';
        document.getElementById('statsOverlay').style.display = 'none';
        document.getElementById('leaderboardOverlay').style.display = 'none';
        const btnScore = document.getElementById('btnShowScore');
        if(btnScore) btnScore.style.display = 'none';
        
        if(footer) {
            footer.style.visibility = 'visible';
            footer.style.display = 'flex';
        }
        if(qText) qText.style.display = 'block';
        
        updateTimerDisplay();
        renderSidebarGrid();
        
        // --- LOGIKA KHUSUS DAYA INGAT (MODUL 19.3) ---
        if (key === 'modul19.3') {
            if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
            showMemorizationPhase(); 
        } else {
            if (currentAppMode !== 'room') {
                startTimer();
            }
            loadQuestion(0);
        }
        
        if(window.innerWidth <= 768) {
            document.body.classList.add('ujian-berjalan'); 
            const mobileFooter = document.getElementById('mobileFooter');
            if(mobileFooter) mobileFooter.style.display = 'flex';
            
            const timer = document.getElementById('floatingTimer');
            if(timer) timer.style.display = 'block';
            const sbLeft = document.querySelector('.sidebar-left');
            if(sbLeft) sbLeft.style.display = ''; 
        }

    // 👇 INI DIA SI PENUTUP YANG HILANG 👇
    } catch (e) {
        console.error("Error ambil data:", e);
        alert("Gagal memuat soal: " + e.message);
    }
};

window.downloadSoal = async function(modulKey) {
    console.log(`Sedang mendownload soal ${modulKey}...`);
    const qRef = collection(db, "bank_soal", modulKey, "daftar_soal");
    const snapshot = await getDocs(qRef);
    let dataSoal = [];
    snapshot.forEach(doc => {
        const d = doc.data();
        dataSoal.push({
            q: d.q, options: d.options, answer: d.answer, explanation: d.explanation, cite: d.cite
        });
    });
    console.log("✅ COPY TEKS DI BAWAH INI KE NOTEPAD:");
    console.log(JSON.stringify(dataSoal, null, 2)); 
    return dataSoal;
};

window.timpaModul = async function(modulKey, dataBaruJson) {
    if(!confirm(`⚠️ BAHAYA: Ini akan MENGHAPUS semua soal lama di ${modulKey} dan menggantinya dengan data baru. Yakin?`)) return;
    const qRef = collection(db, "bank_soal", modulKey, "daftar_soal");
    const snapshot = await getDocs(qRef);
    const batchDelete = writeBatch(db);
    snapshot.forEach(doc => { batchDelete.delete(doc.ref); });
    await batchDelete.commit();
    const chunks = [];
    let currentBatch = writeBatch(db);
    let count = 0;
    for (const soal of dataBaruJson) {
        const newDocRef = doc(collection(db, "bank_soal", modulKey, "daftar_soal"));
        currentBatch.set(newDocRef, soal);
        count++;
        if (count >= 490) {
            chunks.push(currentBatch);
            currentBatch = writeBatch(db);
            count = 0;
        }
    }
    if (count > 0) chunks.push(currentBatch);
    for (let batch of chunks) await batch.commit();
    alert("✅ SUKSES! Modul berhasil direvisi total.");
    location.reload(); 
};

function startTimer() {
    // 🛑 SATPAM ROOM: Matikan mesin timer mandiri jika sedang di Mode Room!
    if (typeof currentAppMode !== 'undefined' && currentAppMode === 'room') return;

    // 🛑 PENANGKAL: Bersihin dulu timer lama biar gak jalan dobel/numpuk!
    if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (timeRemaining > 0) { 
            timeRemaining--; 
            updateTimerDisplay(); 
            simpanProgresTotal(); // Nge-save progres tiap detik
        }
        else { 
            clearInterval(timerInterval); 
            finishTime(); 
        }
    }, 1000);
}

function updateTimerDisplay() {
    if (currentAppMode === 'room') return;
    const m = Math.floor(timeRemaining / 60);
    const s = timeRemaining % 60;
    const textWaktu = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const t1 = document.getElementById('timerDisplay');
    const t2 = document.getElementById('floatingTimer');
    if(t1) t1.innerText = textWaktu;
    if(t2) t2.innerText = textWaktu;
    let persentase = (timeRemaining / totalExamTime) * 100;
    let colorClass = 'timer-green';
    if (persentase <= 10) colorClass = 'timer-panic';
    else if (persentase <= 30) colorClass = 'timer-yellow';
    if(t1) t1.className = 'timer-container ' + colorClass;
    if(t2) t2.className = colorClass;
}

function finishTime() { alert("Waktu Habis!"); window.submitQuiz(); }

function renderSidebarGrid() {
    const grid = document.getElementById('navGrid');
    grid.innerHTML = '';
    currentQuestions.forEach((_, idx) => {
        const btn = document.createElement('div');
        btn.className = 'nav-btn';
        btn.id = `nav-${idx}`;
        btn.innerText = idx + 1;
        btn.onclick = () => {
            loadQuestion(idx);
            if (window.innerWidth <= 768) {
                  const sb = document.querySelector('.sidebar-right');
                  if (sb && sb.classList.contains('show-mobile')) {
                      window.toggleMobileSidebar(); 
                  }
            }
        };
        grid.appendChild(btn);
    });
    updateSidebarStatus();
}

function updateSidebarStatus() {
    currentQuestions.forEach((q, idx) => {
        const btn = document.getElementById(`nav-${idx}`);
        if(!btn) return;
        btn.classList.remove('active', 'filled', 'correct', 'wrong', 'ragu');
        if (idx === currentIdx) btn.classList.add('active');
        if (isSubmitted) {
            if (userAnswers[idx] === q.answer) btn.classList.add('correct');
            else btn.classList.add('wrong');
        } else {
            if (raguStatus[idx]) btn.classList.add('ragu');
            else if (userAnswers[idx] !== null) btn.classList.add('filled');
        }
    });
}

// ==========================================================
// FUNGSI EKSEKUSI PEMBAHASAN OTOMATIS
// ==========================================================
function triggerPembahasanLatihan(idxPilihan) {
    isAnswerLocked = true; 

    const q = currentQuestions[currentIdx];
    if (idxPilihan !== null) userAnswers[currentIdx] = idxPilihan;
    
    // Warnain opsi
    const opsiElements = document.querySelectorAll('#optionsContainer .option-label');
    opsiElements.forEach((el, i) => {
        el.style.pointerEvents = 'none'; 
        el.innerHTML = el.innerHTML.replace(' ⏳ Me...', '');
        
        if (i === q.answer) {
            el.classList.add('review-correct');
            el.innerHTML += ' ✅ (Jawaban Benar)';
        } else if (idxPilihan !== null && i === idxPilihan) {
            el.classList.add('review-wrong');
            el.innerHTML += ' ❌';
        }
    });

    // Tampilkan Kotak Pembahasan
    const fb = document.getElementById('feedbackBox');
    if (fb) {
        fb.style.display = 'block';
        fb.classList.add('show');
        
        let fText = document.getElementById('feedbackText');
        if (idxPilihan === null) {
            fText.innerHTML = "<b style='color:red;'>WAKTU HABIS! Anda tidak menjawab.</b><br><br>" + (q.explanation || "-");
        } else {
            fText.innerHTML = q.explanation || "Tidak ada pembahasan spesifik.";
        }
        
        const fCite = document.getElementById('feedbackCite');
        if (fCite) fCite.innerText = "Sumber: " + (q.cite || "-");

        let countdownBadge = document.getElementById('trainingCountdownBadge');
        if (!countdownBadge) {
            countdownBadge = document.createElement('div');
            countdownBadge.id = 'trainingCountdownBadge';
            countdownBadge.style.cssText = "margin-top:20px; padding:12px; background:#e3f2fd; color:#1565c0; font-weight:bold; border-radius:8px; text-align:center; font-size:1.1rem; border:2px dashed #90caf9;";
            fb.appendChild(countdownBadge);
        }
        countdownBadge.style.display = 'block';

        // 🛑 MIKIR KERAS: Jika Room, STOP DI SINI. Timer diatur oleh pantauRoom!
        if (currentAppMode === 'room') {
            countdownBadge.innerHTML = `⏳ Lanjut otomatis dalam: <b id="angkaDetikPembahasan" style="font-size:1.3rem;">10</b> detik`;
            return; 
        }

        // --- DI BAWAH INI HANYA JALAN UNTUK LATIHAN MANDIRI ---
        if (typeof trainingTimerInterval !== 'undefined' && trainingTimerInterval) clearInterval(trainingTimerInterval);
        trainingCountdown = 10;
        
        const renderBadge = () => {
            countdownBadge.innerHTML = `⏳ Lanjut otomatis dalam: <b style="font-size:1.3rem;">${trainingCountdown}</b> detik`;
        };
        renderBadge();

        trainingTimerInterval = setInterval(() => {
            trainingCountdown--;
            if (trainingCountdown >= 0) renderBadge();
            if (trainingCountdown <= 0) {
                clearInterval(trainingTimerInterval);
                window.skipTrainingCountdown(); 
            }
        }, 1000);
    }
}

// ==========================================================
// FUNGSI AUTO-NEXT PINDAH SOAL
// ==========================================================
window.skipTrainingCountdown = async function() {
    if (trainingTimerInterval) clearInterval(trainingTimerInterval);
    isAnswerLocked = false;
    
    const badge = document.getElementById('trainingCountdownBadge');

    if (currentAppMode === 'room') {
        if (isHost) {
            if (badge) badge.innerHTML = `⏳ Mengirim komando soal berikutnya ke server...`; 
            try {
                // PASTIKAN INDEX MURNI ANGKA BIAR GA JADI "01"
                let angkaIndex = parseInt(currentIdx); 
                
                if (angkaIndex < currentQuestions.length - 1) {
                    await updateDoc(doc(window.db, "rooms", currentRoomCode), {
                        status: 'soal',
                        currentIdx: angkaIndex + 1
                    });
                } else {
                    await updateDoc(doc(window.db, "rooms", currentRoomCode), { status: 'selesai' });
                }
            } catch(e) { 
                console.error("Gagal ganti soal otomatis: ", e); 
            }
        } else {
            if (badge) badge.innerHTML = `⏳ Me Host memuat soal berikutnya...`;
        }
    } else {
        if (badge) badge.style.display = 'none';
        
        // Mode latihan mandiri
        if (parseInt(currentIdx) < currentQuestions.length - 1) {
            window.changeQuestion(1);
        } else {
            window.submitQuiz();
        }
    }
};
function loadQuestion(idx) {
// 1. DETEKSI MODE LEBIH KUAT (Cek juga apakah ada currentRoomCode)
    const isModeRoom = (typeof currentAppMode !== 'undefined' && currentAppMode === 'room') || (typeof currentRoomCode !== 'undefined' && currentRoomCode !== null && currentRoomCode !== "");
    const isSelesaiMode = (typeof isSubmitted !== 'undefined' && isSubmitted);
    // 🛑 SAFETY NET: Cetak ulang kotak nomor jika terhapus
    const navG = document.getElementById('navGrid');
    if (navG && navG.innerHTML.trim() === '' && typeof currentQuestions !== 'undefined' && currentQuestions.length > 0) {
        if (typeof renderSidebarGrid === 'function') renderSidebarGrid();
    }

    // 🛑 LOGIKA TOMBOL SELESAI UJIAN (HILANG DI MABAR, MUNCUL DI SINGLEPLAYER) 🛑
    const wadahSelesai = document.querySelector('.finish-container');
    if (wadahSelesai) {
        wadahSelesai.style.setProperty('display', (isSelesaiMode || isModeRoom) ? 'none' : 'block', 'important');
    }

    const tombolSelesaiDesktop = document.querySelector('.btn-finish');
    if (tombolSelesaiDesktop) {
        tombolSelesaiDesktop.style.setProperty('display', (isSelesaiMode || isModeRoom) ? 'none' : 'block', 'important');
        
        // RESET GEMBOK SISA MABAR BIAR TOMBOL BISA DIKLIK LAGI
        if (!isSelesaiMode && !isModeRoom) {
            tombolSelesaiDesktop.disabled = false;
            tombolSelesaiDesktop.removeAttribute('disabled');
            tombolSelesaiDesktop.style.setProperty('pointer-events', 'auto', 'important');
            tombolSelesaiDesktop.style.setProperty('opacity', '1', 'important');
        }
    }
    
    if (!isSelesaiMode) {
        const menuKembaliBawah = document.querySelector('.mobile-only-ui-review'); 
        if (menuKembaliBawah) menuKembaliBawah.remove(); 
        
        // RESET GEMBOK NOMOR SOAL (Biar nomor soal 1,2,3 gak warna hitam/abu-abu lagi!)
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.disabled = false;
            btn.removeAttribute('disabled');
            btn.style.setProperty('pointer-events', 'auto', 'important');
            btn.style.setProperty('opacity', '1', 'important');
        });
    }
    
    window.isAnswerLocked = false;

    window.speechSynthesis.cancel();
    const btnSpeakIcon = document.querySelector('#btnSpeak i');
    if(btnSpeakIcon) btnSpeakIcon.className = 'fas fa-volume-up';

    document.querySelector('.question-header').style.visibility = 'visible';
    document.querySelector('.footer-nav').style.visibility = 'visible';
    currentIdx = idx;
    const q = currentQuestions[idx];
    if (!q) return;

    const mainContent = document.querySelector('.main-content');
    if(mainContent) mainContent.scrollTop = 0;

    // UX BARU: Ubah format nomor jadi "1 / 50"
    const elNum = document.getElementById('qNum');
    if (elNum) {
        if (currentQuestions && currentQuestions.length > 0) {
            elNum.innerText = (idx + 1) + " / " + currentQuestions.length;
        } else {
            elNum.innerText = idx + 1;
        }
    }

    document.getElementById('questionText').innerText = q.q;
    
    updateSidebarStatus();
    updateProgress();

    // JURUS ANTI-KUNCI: BUKA GEMBOK SIDEBAR TIAP SOAL DIMUAT (KHUSUS MODE REVIEW)
    if (isSelesaiMode) {
        setTimeout(() => {
            document.querySelectorAll('.sidebar-right, .nav-container, .nav-grid').forEach(el => {
                el.style.setProperty('pointer-events', 'auto', 'important');
            });
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.disabled = false;
                btn.removeAttribute('disabled');
                btn.style.setProperty('pointer-events', 'auto', 'important');
                btn.style.setProperty('cursor', 'pointer', 'important');
                btn.style.setProperty('opacity', '1', 'important');
            });
        }, 50); 
    }
    
    document.getElementById('prevBtn').disabled = (typeof isReviewMode !== 'undefined' && isReviewMode ? false : idx === 0);
    
    const btnNext = document.getElementById('nextBtn');
    btnNext.style.display = 'block'; 
    
    if (idx === currentQuestions.length - 1) {
        if (isSelesaiMode || isModeRoom) { // 🔥 Hilangkan juga tombol Selesai versi HP pas Mabar
            btnNext.style.display = 'none'; 
        } else {
            if (window.innerWidth <= 768) {
                btnNext.innerHTML = "Selesai";
                btnNext.className = "btn btn-finish"; 
                btnNext.onclick = window.confirmFinish; 
                btnNext.disabled = false; // Pastikan bisa diklik
            } else {
                btnNext.style.display = 'none';
            }
        }
    } else {
        btnNext.innerHTML = typeof isReviewMode !== 'undefined' && isReviewMode ? "Lanjut (Salah) ❯" : "Selanjutnya ❯";
        if(isSelesaiMode) btnNext.innerHTML = "Selanjutnya ❯"; 
        
        btnNext.className = "btn btn-next"; 
        btnNext.onclick = () => window.changeQuestion(1);
    }
    
    if (typeof isReviewMode !== 'undefined' && isReviewMode) {
         btnNext.style.display = 'block';
         btnNext.innerHTML = "Lanjut (Salah) ❯";
         btnNext.className = "btn btn-next";
         btnNext.onclick = () => window.changeQuestion(1);
    }

    const fb = document.getElementById('feedbackBox');
    if (isSelesaiMode) {
        if(fb) { fb.style.display = 'block'; fb.classList.add('show'); }
        const teksPembahasan = q.explanation || ""; 
        const jawabanBenar = q.options && q.answer !== undefined ? q.options[q.answer] : ""; 
        const highlightTeks = (teks, keyword) => { if (!keyword) return teks; const regex = new RegExp(`(${keyword})`, 'gi'); return teks.replace(regex, `<span style="background-color: #fff9c4; color: #004d00; font-weight: bold; padding: 0 2px; border-bottom: 2px solid #d4af37;">$1</span>`); };
        const fText = document.getElementById('feedbackText'); if(fText) fText.innerHTML = highlightTeks(teksPembahasan, jawabanBenar);
        
        const teksSumber = q.cite || "-"; const fCite = document.getElementById('feedbackCite');
        if(fCite) {
            if (teksSumber !== "-") { const linkPencarian = `https://www.google.com/search?q=${encodeURIComponent("Isi " + teksSumber)}`; fCite.innerHTML = `Sumber: <a href="${linkPencarian}" target="_blank" style="color: #2980b9; text-decoration: underline; font-weight: bold; cursor: pointer; transition: 0.2s;" onmouseover="this.style.color='#d35400'" onmouseout="this.style.color='#2980b9'" title="Klik untuk baca full pasal ini">${teksSumber} <i class="fas fa-external-link-alt" style="font-size: 0.8rem; margin-left: 3px;"></i></a>`; } 
            else { fCite.innerHTML = "Sumber: -"; }
        }

        let adminDiv = document.getElementById('adminQuickEditDiv');
        if (!adminDiv && fb) {
            adminDiv = document.createElement('div');
            adminDiv.id = 'adminQuickEditDiv';
            adminDiv.style.cssText = "margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc; text-align: right;";
            adminDiv.innerHTML = `<button onclick="window.editSoalSekarang()" style="background: #e67e22; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.1); transition: 0.2s;"><i class="fas fa-pencil-alt"></i> Edit Soal Ini (Admin)</button>`;
            fb.appendChild(adminDiv);
        }
        if (adminDiv) {
            adminDiv.style.display = document.body.classList.contains('is-admin') ? 'block' : 'none';
        }

    // ==========================================
        // 🤖 INJEKSI KOTAK TANYA AI DI PEMBAHASAN PESERTA
        // ==========================================
        let aiChatDiv = document.getElementById('aiChatDiv');
        
        if (isModeRoom) {
            // 🔥 KALAU MABAR: HANCURKAN KOTAK AI SAMPAI KE AKARNYA (Anti Nyangkut) 🔥
            if (aiChatDiv) aiChatDiv.remove();
        } else {
            // 🟢 KALAU SINGLEPLAYER: BIKIN ATAU MUNCULKAN
            if (!aiChatDiv && fb) {
                aiChatDiv = document.createElement('div');
                aiChatDiv.id = 'aiChatDiv';
                aiChatDiv.style.cssText = "margin-top: 20px; padding: 15px; background: rgba(142, 68, 173, 0.1); border-radius: 8px; border-left: 5px solid #8e44ad;";
                
                aiChatDiv.innerHTML = `
                    <div style="font-weight: bold; color: #8e44ad; margin-bottom: 5px;"><i class="fas fa-robot"></i> Tanya AI Pro-Tama</div>
                    <p style="font-size: 0.8rem; color: #555; margin-top: 0; margin-bottom: 12px;">Masih belum paham? Tanyakan penjelasan lebih lanjut terkait soal ini ke AI.</p>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="aiInputPeserta" placeholder="Ketik pertanyaanmu di sini..." style="flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 0.9rem;">
                        <button onclick="window.tanyaAIPeserta()" style="background: #8e44ad; color: white; border: none; padding: 10px 15px; border-radius: 6px; cursor: pointer; transition: 0.2s;"><i class="fas fa-paper-plane"></i></button>
                    </div>
                    <div id="aiResponsePeserta" style="margin-top: 15px; padding: 12px; background: white; border: 1px dashed #8e44ad; border-radius: 6px; font-size: 0.9rem; line-height: 1.5; display: none;"></div>
                `;
                fb.appendChild(aiChatDiv);
            }
            
            // Pastikan tampil & bersihkan sisa ketikan soal sebelumnya
            aiChatDiv = document.getElementById('aiChatDiv');
            if (aiChatDiv) {
                aiChatDiv.style.display = 'block';
                
                const aiInput = document.getElementById('aiInputPeserta');
                const aiRes = document.getElementById('aiResponsePeserta');
                if (aiInput) aiInput.value = '';
                if (aiRes) {
                    aiRes.style.display = 'none';
                    aiRes.innerHTML = '';
                }
            }
        
    } else { 
        if(fb) { fb.style.display = 'none'; fb.classList.remove('show'); } 
    }
    
    const cont = document.getElementById('optionsContainer');
    cont.innerHTML = '';
    q.options.forEach((opt, i) => {
        const div = document.createElement('div');
        div.className = 'option-label';
        if(isSelesaiMode) {
            div.style.cursor = 'default';
            if(userAnswers[idx] === i) {
                div.innerHTML = i === q.answer ? opt + ' ✅' : opt + ' ❌';
                div.classList.add(i === q.answer ? 'review-correct' : 'review-wrong');
            }
            else if(i === q.answer) {
                div.innerHTML = opt + ' ⬅️ (Jawaban Benar)';
                div.classList.add('review-correct');
            } else {
                div.innerHTML = opt;
            }
        } else {
           div.innerHTML = opt;
           div.onclick = async () => { 
                if(!isSelesaiMode && !isAnswerLocked) { 
                    
                    if (isModeRoom) {
                        isAnswerLocked = true; 
                        div.style.background = "#fff9c4"; 
                        div.innerHTML += ' ⏳ (Menunggu Waktu Habis...)';
                        
                        userAnswers[idx] = i; 
                        
                        await updateDoc(doc(window.db, "rooms", currentRoomCode), {
                            [`players.${currentUser.uid}.jawabanSekarang`]: i
                        });
                    } 
                    else if (typeof currentAppMode !== 'undefined' && currentAppMode === 'latihan') {
                        triggerPembahasanLatihan(i); 
                    } 
                    else {
                        userAnswers[idx] = i; 
                        raguStatus[idx] = false; 
                        loadQuestion(idx); 
                        simpanProgresTotal();
                    }
                } 
            };
            if(userAnswers[idx] === i) div.classList.add('selected');
        }
        cont.appendChild(div);
    });

    // 🛑 MUNCULKAN KEMBALI CHECKBOX RAGU-RAGU DI SINGLEPLAYER 🛑
    const chk = document.getElementById('checkRagu');
    if(chk) {
        chk.checked = raguStatus[idx] || false;
        chk.disabled = isSelesaiMode;
        
        const raguWrapper = chk.closest('div') || chk.parentElement;
        if (raguWrapper) {
            raguWrapper.style.display = isModeRoom ? 'none' : ''; 
        }
    }
    // ==========================================================
    // 🛑 LOGIKA UX: TUKAR POSISI KOTAK NOMOR VS KLASEMEN LIVE
    // ==========================================================
    const navGridContainer = document.getElementById('navGrid');
    const legendContainer = document.querySelector('.legend'); // Legend warna Menjawab/Kosong
    let rightLb = document.getElementById('rightSidebarLeaderboard');

    if (currentAppMode === 'room') {
        const pBtn = document.getElementById('prevBtn');
        const nBtn = document.getElementById('nextBtn');
        const rWrap = document.querySelector('.ragu-wrapper');
        
        if(pBtn) pBtn.style.display = 'none';
        if(nBtn) nBtn.style.display = 'none';
        if(rWrap) rWrap.style.display = 'none';

        // KUNCI MATI SEMUA: Nomor Soal, Modul Kiri, Tombol Kanan (Admin/Keluar), & Tombol Selesai
        document.querySelectorAll('.nav-btn, .modul-btn, .btn-action, .btn-finish').forEach(btn => {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.4'; // Bikin kusam biar kelihatan ga bisa diklik
        });

        // 🛑 MAGIC UX: Kalo Ujian belum kelar, Sembunyikan Grid Nomor, Munculkan Klasemen!
        if (!isSubmitted) {
            if (navGridContainer) navGridContainer.style.display = 'none';
            if (legendContainer) legendContainer.style.display = 'none';
            if (rightLb) rightLb.style.display = 'block';
        } else {
            // Kalo udah masuk Pembahasan, balikin Grid Nomornya dan sembunyikan klasemen!
            if (navGridContainer) navGridContainer.style.display = ''; 
            if (legendContainer) legendContainer.style.display = 'flex';
            if (rightLb) rightLb.style.display = 'none';
        }
    } else {
        // Balikin ke normal kalo balik ke mode latihan mandiri (Singleplayer)
        document.querySelectorAll('.nav-btn, .modul-btn, .btn-action, .btn-finish').forEach(btn => {
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        });

        if (navGridContainer) navGridContainer.style.display = ''; 
        if (legendContainer) legendContainer.style.display = 'flex';
        if (rightLb) rightLb.style.display = 'none';
    }
} // <--- PASTIKAN KURUNG KURAWAL INI TETAP ADA SEBAGAI PENUTUP SEBAGAI PENUTUP
// ==========================================
// FUNGSI SUBMIT FINAL
// ==========================================
window.submitQuiz = function() {
    if(typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
    window.speechSynthesis.cancel();
    
    const currentDB = window.currentDatabaseId || "";
    hapusProgresModul(currentDB);
    
    const sbRight = document.querySelector('.sidebar-right');
    if (sbRight) { sbRight.classList.remove('show-mobile'); sbRight.style.display = ''; }
    
    const floatTimer = document.getElementById('floatingTimer');
    if(floatTimer) floatTimer.style.setProperty('display', 'none', 'important');

    if (currentDB === 'modul18' || currentDB.includes('papi') || currentDB === 'modul_papi') {
        document.body.classList.remove('mode-focus');
        isSubmitted = true;

        let papiScores = {}; 
        const traits = ['G','L','I','T','V','S','R','D','C','E','N','A','P','X','B','O','Z','K','F','W'];
        traits.forEach(t => papiScores[t] = 0);

        userAnswers.forEach((choiceIndex, qIndex) => {
            if (choiceIndex !== null && currentQuestions[qIndex]) {
                const qData = currentQuestions[qIndex];
                if (qData.papi_keys && qData.papi_keys.length === 2) {
                    const aspect = qData.papi_keys[choiceIndex];
                    if(papiScores[aspect] !== undefined) papiScores[aspect]++; 
                }
            }
        });

        const pdfTargets = [
            { id: 'R', mapTo: 'R', min: 6, max: 9, label: "Role Consistency (Rasional)", cat: "WAJIB" },
            { id: 'D', mapTo: 'I', min: 5, max: 7, label: "Decision Making (Tegas & Hati-hati)", cat: "WAJIB" }, 
            { id: 'E', mapTo: 'E', min: 6, max: 9, label: "Emotional Restraint (Tenang)", cat: "WAJIB" },
            { id: 'M', mapTo: 'F', min: 6, max: 9, label: "Discipline / Order (Patuh Hukum Acara)", cat: "WAJIB" }, 
            { id: 'B', mapTo: 'B', min: 6, max: 9, label: "Perseverance (Ketekunan)", cat: "WAJIB" },
            { id: 'N', mapTo: 'N', min: 6, max: 9, label: "Need to Finish (Tuntas)", cat: "WAJIB" },
            { id: 'C', mapTo: 'C', min: 6, max: 9, label: "Conformity (Rapi & Tertib)", cat: "WAJIB" },
            { id: 'A', mapTo: 'D', min: 6, max: 9, label: "Attention to Detail (Teliti)", cat: "WAJIB" }, 
            { id: 'Z', mapTo: 'Z', min: 5, max: 7, label: "Self Control (Adaptif)", cat: "WAJIB" },
            { id: 'W', mapTo: 'W', min: 7, max: 9, label: "Need for Rules (Patuh Etik/SOP)", cat: "WAJIB" },
            { id: 'L', mapTo: 'L', min: 4, max: 6, label: "Leadership (Wibawa)", cat: "NORMAL" },
            { id: 'T', mapTo: 'T', min: 4, max: 6, label: "Work Tempo (Kecepatan)", cat: "NORMAL" },
            { id: 'V', mapTo: 'V', min: 4, max: 6, label: "Vigor (Stamina Fisik)", cat: "NORMAL" },
            { id: 'P', mapTo: 'P', min: 5, max: 7, label: "Independence (Mandiri)", cat: "NORMAL" },
            { id: 'X', mapTo: 'X', min: 0, max: 4, label: "Need to be Noticed (Ingin Tampil)", cat: "RISK" },
            { id: 'S', mapTo: 'S', min: 0, max: 4, label: "Social Extension (Mudah Dipengaruhi)", cat: "RISK" },
            { id: 'G', mapTo: 'G', min: 0, max: 4, label: "Influence / Dominance", cat: "RISK" },
            { id: 'K', mapTo: 'K', min: 0, max: 3, label: "Aggression (Emosional)", cat: "RISK" },
            { id: 'O', mapTo: 'O', min: 0, max: 3, label: "Need for Closeness (Ketergantungan)", cat: "RISK" }
        ];

        let analysisTableRows = "";
        let riskCount = 0;
        let wajibFailCount = 0;
        let detailNotes = [];

        pdfTargets.forEach(t => {
            const score = papiScores[t.mapTo] !== undefined ? papiScores[t.mapTo] : 0;
            
            let status = "✅ OK";
            let color = "green";
            let rowBg = "";

            if (score < t.min || score > t.max) {
                if (t.cat === "RISK" && score > t.max) {
                    status = "⛔ BAHAYA";
                    color = "red";
                    rowBg = "#ffebee";
                    riskCount++;
                    detailNotes.push(`⚠️ <b>${t.label}</b> Tinggi (${score}). Risiko pelanggaran etik/independensi.`);
                } 
                else if (t.cat === "WAJIB") {
                    status = score < t.min ? "KURANG" : "BERLEBIH";
                    color = "#d35400"; 
                    rowBg = "#fff3e0";
                    wajibFailCount++;
                    if (score < t.min) detailNotes.push(`🔸 <b>${t.label}</b> Rendah (${score}). Perlu ditingkatkan.`);
                } 
                else {
                    status = "⚠️ Cek";
                    color = "#f39c12"; 
                }
            }

            analysisTableRows += `
            <tr style="border-bottom:1px solid #eee; background-color:${rowBg};">
                <td style="padding:6px;"><b>${t.id}</b> - ${t.label}</td>
                <td style="padding:6px; text-align:center;">${t.min}-${t.max}</td>
                <td style="padding:6px; text-align:center; font-weight:bold; font-size:1.1rem;">${score}</td>
                <td style="padding:6px; font-weight:bold; color:${color}; text-align:right;">${status}</td>
            </tr>`;
        });

        const analysisTable = `
            <table style="width:100%; border-collapse:collapse; font-size:0.85rem; margin-top:10px;">
                <tr style="background:#f5f5f5; text-align:left; border-bottom:2px solid #ddd;">
                    <th style="padding:8px;">Aspek (PDF)</th>
                    <th style="padding:8px; text-align:center;">Target</th>
                    <th style="padding:8px; text-align:center;">Skor</th>
                    <th style="padding:8px; text-align:right;">Status</th>
                </tr>
                ${analysisTableRows}
            </table>
        `;

        let statusAkhir = "DISARANKAN";
        let statusColor = "#2ecc71";
        let icon = "⚖️";
        let headerMsg = "Profil Sesuai Standar Kompetensi Hakim.";

        if (riskCount > 0) {
            statusAkhir = "PERLU PERBAIKAN";
            statusColor = "#c0392b"; 
            icon = "⛔";
            headerMsg = `Ditemukan ${riskCount} Indikator Risiko Tinggi!`;
        } else if (wajibFailCount > 2) { 
            statusAkhir = "PERLU PERBAIKAN";
            statusColor = "#e67e22"; 
            icon = "⚠️";
            headerMsg = `Profil belum konsisten (Gagal di ${wajibFailCount} aspek inti).`;
        }

        const scoreCircle = document.getElementById('finalScore');
        const passStatus = document.getElementById('passStatus');
        const msg = document.getElementById('resultMsg');
        const btnReview = document.getElementById('btnReviewWrong');
        
        scoreCircle.innerText = icon;
        scoreCircle.style.background = statusColor;
        passStatus.innerText = statusAkhir;
        passStatus.style.color = statusColor;
        
        msg.innerHTML = `<div style="text-align:left; margin-bottom:10px; font-weight:bold; color:${statusColor}">${headerMsg}</div>`;
        
        if (detailNotes.length > 0) {
            msg.innerHTML += `<div style="text-align:left; font-size:0.85rem; background:#fff8e1; padding:10px; border-radius:6px; border:1px solid #ffe0b2; margin-bottom:15px;">
                <strong>Catatan Penting:</strong>
                <ul style="margin:5px 0 0 0; padding-left:20px; color:#5d4037;">
                    ${detailNotes.map(n => `<li>${n}</li>`).join('')}
                </ul>
            </div>`;
        }

        msg.innerHTML += `<div style="max-height:250px; overflow-y:auto; border:1px solid #eee; border-radius:6px;">${analysisTable}</div>`;

        if(btnReview) btnReview.style.display = 'none';
        document.getElementById('modeIndicator').innerText = "PSIKOGRAM";
        
        const overlay = document.getElementById('resultOverlay');
        overlay.style.display = 'flex'; 
        overlay.style.visibility = 'visible'; 
        overlay.style.zIndex = '2147483647'; 
        
        window.scrollTo(0, 0);

        const btnShowScore = document.getElementById('btnShowScore');
        if(btnShowScore) {
            btnShowScore.style.display = 'flex'; 
            btnShowScore.innerHTML = "📝 Nilai"; 
            btnShowScore.onclick = function() {
                document.getElementById('resultOverlay').style.display = 'flex';
            };
        }
        
        let elementMapping = {};
        userAnswers.forEach((choiceIndex, qIndex) => {
            if (choiceIndex !== null && currentQuestions[qIndex]) {
                const qData = currentQuestions[qIndex];
                if (qData.papi_keys) {
                    const aspect = qData.papi_keys[choiceIndex];
                    if (!elementMapping[aspect]) elementMapping[aspect] = [];
                    elementMapping[aspect].push(qIndex + 1); 
                }
            }
        });

        if (typeof window.savePapiToCloud === 'function') {
            const totalFail = riskCount + wajibFailCount;
            window.savePapiToCloud(statusAkhir, totalFail, JSON.stringify({
                scores: papiScores,
                mapping: elementMapping
            }));
        }
        return;
    }
    
    // --- MODE NORMAL (HUKUM) ---
    isSubmitted = true;
    document.body.classList.remove('mode-focus');

    let score = 0;
    let correctCount = 0;
    let wrongCount = 0;
    wrongIndices = []; 

    userAnswers.forEach((a, i) => {
        if (currentQuestions[i]) {
            if(a === currentQuestions[i].answer) {
                score++; correctCount++;
            } else {
                wrongCount++;
                wrongIndices.push(i);
            }
        }
    });
    
    const final = Math.round((score/currentQuestions.length)*100);
    
    const overlay = document.getElementById('resultOverlay');
    if (overlay) {
        overlay.style.cssText = `
            display: flex !important; 
            visibility: visible !important; 
            opacity: 1 !important; 
            z-index: 2147483647 !important; 
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.85) !important;
        `;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const scoreCircle = document.getElementById('finalScore');
    const passStatus = document.getElementById('passStatus');
    const msg = document.getElementById('resultMsg');
    
    if(scoreCircle) {
        scoreCircle.innerText = final;
        scoreCircle.style.background = final >= 70 ? "var(--pass)" : "var(--fail)";
    }
    if(passStatus) {
        passStatus.innerText = final >= 70 ? "LULUS" : "TIDAK LULUS";
        passStatus.style.color = final >= 70 ? "var(--pass)" : "var(--fail)";
    }
    if(msg) msg.innerText = final >= 70 ? "Selamat! Memenuhi Standar." : "Belajar lagi ya.";

    const btnReview = document.getElementById('btnReviewWrong');
    if(btnReview) {
        if (wrongCount > 0) {
            btnReview.style.display = 'flex';
            btnReview.innerText = `🔍 Review ${wrongCount} Jawaban Salah`;
        } else {
            btnReview.style.display = 'none';
        }
    }
    
    const btnShowScore = document.getElementById('btnShowScore');
    if(btnShowScore) {
        btnShowScore.style.display = 'flex';
        btnShowScore.innerHTML = "📝 Nilai"; 
    }

    const modeInd = document.getElementById('modeIndicator');
    if(modeInd) {
        modeInd.innerText = "PEMBAHASAN";
        modeInd.style.color = "var(--success)";
    }
    
    const finishCont = document.querySelector('.finish-container');
    if(finishCont) finishCont.style.display = 'none';

    if (typeof window.saveScoreToCloud === 'function') window.saveScoreToCloud(currentDB, final);
    if (typeof window.saveAndShowChart === 'function') window.saveAndShowChart(final, correctCount, wrongCount);
    
    loadQuestion(currentIdx);
    console.log("✅ Ujian Selesai. Nilai:", final);
    PROTAMA.close();
};

window.confirmFinish = async function() { // <--- Ada async di sini
    const emptyCount = userAnswers.filter(a => a === null).length;
    const raguCount = raguStatus.filter(r => r === true).length;
    
    let msg = "Yakin mau menyelesaikan ujian?";
    
    if(emptyCount > 0 || raguCount > 0) {
        msg = ""; // Kita kosongkan dulu biar rapi di SweetAlert
        if (raguCount > 0) msg += `- Ada ${raguCount} soal RAGU-RAGU\n`;
        if (emptyCount > 0) msg += `- Ada ${emptyCount} soal BELUM DIJAWAB\n`;
        msg += `\nYakin mau dikumpulkan sekarang?`;
    }

    // Panggil Pop-up Modern lo
    const yakin = await PROTAMA.confirm("PERHATIAN!", msg);
    
    if(yakin) {
        PROTAMA.loading("Sedang menyimpan hasil ujian...");
        window.submitQuiz();
    }
}

// ==========================================================
// A. REVIEW SINGLEPLAYER (Membuka Tombol Keluar Kanan Atas)
// ==========================================================
window.closeResult = function() {
    if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
    if (window.innerWidth <= 768) {
        const sb = document.querySelector('.sidebar-right');
        if (sb && sb.classList.contains('show-mobile')) window.toggleMobileSidebar();
    }
    document.getElementById('resultOverlay').style.display = 'none';
    isReviewMode = false; 

    const t1 = document.getElementById('timerDisplay'); const t2 = document.getElementById('floatingTimer');
    if (t1) { t1.innerText = "00:00:00"; t1.className = 'timer-container timer-green'; }
    if (t2) { t2.innerText = "00:00:00"; t2.className = 'timer-green'; }

    // KUNCI KIRI SAJA
    document.querySelectorAll('.modul-btn').forEach(btn => { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.5'; btn.disabled = true; });

    // 🛑 BUKA KANAN ATAS (Biar Singleplayer bisa klik Keluar)
    document.querySelectorAll('.action-box button, .act-exit, .btn-action').forEach(btn => { btn.disabled = false; btn.style.pointerEvents = 'auto'; btn.style.opacity = '1'; });

    const footer = document.querySelector('.footer-nav');
    if (footer) { footer.style.visibility = 'visible'; footer.style.display = 'flex'; }

    let unfreezeStyle = document.getElementById('review-unfreeze');
    if (!unfreezeStyle) { unfreezeStyle = document.createElement('style'); unfreezeStyle.id = 'review-unfreeze'; document.head.appendChild(unfreezeStyle); }
    unfreezeStyle.innerHTML = `#optionsContainer, #feedbackBox, .option-label { pointer-events: auto !important; opacity: 1 !important; } .ragu-wrapper, .btn-finish, #btnFinish { display: none !important; }`;

    const ind = document.getElementById('modeIndicator');
    if (ind) { ind.innerText = "PEMBAHASAN"; ind.style.background = "#e8f5e9"; ind.style.color = "#2e7d32"; ind.style.border = "1px solid #c8e6c9"; }
    
    // 👇 BUMBU RAHASIA: Munculin tombol Kembali ke Menu Utama di Sidebar 👇
    let btnBalik = document.getElementById('btnSidebarKembali');
    if (btnBalik) {
        btnBalik.style.display = 'block';
    }
    // 👆 SAMPAI SINI 👆
    
    loadQuestion(currentIdx);
    window.isAnswerLocked = true; 

    setTimeout(() => {
        const pBtn = document.getElementById('prevBtn'); const nBtn = document.getElementById('nextBtn');
        if(pBtn) { pBtn.style.display = 'inline-block'; pBtn.disabled = false; pBtn.style.pointerEvents = 'auto'; }
        if(nBtn) { nBtn.style.display = 'inline-block'; nBtn.disabled = false; nBtn.style.pointerEvents = 'auto'; }
        document.querySelectorAll('#nomorGrid button, .nav-btn, .nomor-btn, #optionsContainer button, #optionsContainer input, .option-item').forEach(btn => {
            btn.disabled = false; btn.style.pointerEvents = 'auto'; btn.style.opacity = '1';
        });
    }, 100); 
};

window.startReviewWrong = function() {
    if (!wrongIndices || wrongIndices.length === 0) { alert("Tidak ada jawaban salah untuk direview."); return; }
    if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
    if (window.innerWidth <= 768) {
        const sb = document.querySelector('.sidebar-right');
        if (sb && sb.classList.contains('show-mobile')) window.toggleMobileSidebar();
    }
    isReviewMode = true;

    const t1 = document.getElementById('timerDisplay'); const t2 = document.getElementById('floatingTimer');
    if (t1) { t1.innerText = "00:00:00"; t1.className = 'timer-container timer-green'; }
    if (t2) { t2.innerText = "00:00:00"; t2.className = 'timer-green'; }

    // KUNCI KIRI SAJA
    document.querySelectorAll('.modul-btn').forEach(btn => { btn.style.pointerEvents = 'none'; btn.style.opacity = '0.5'; btn.disabled = true; });

    // 🛑 BUKA KANAN ATAS (Biar Singleplayer bisa klik Keluar)
    document.querySelectorAll('.action-box button, .act-exit, .btn-action').forEach(btn => { btn.disabled = false; btn.style.pointerEvents = 'auto'; btn.style.opacity = '1'; });

    const footer = document.querySelector('.footer-nav');
    if (footer) { footer.style.visibility = 'visible'; footer.style.display = 'flex'; }

    let unfreezeStyle = document.getElementById('review-unfreeze');
    if (!unfreezeStyle) { unfreezeStyle = document.createElement('style'); unfreezeStyle.id = 'review-unfreeze'; document.head.appendChild(unfreezeStyle); }
    unfreezeStyle.innerHTML = `#optionsContainer, #feedbackBox, .option-label { pointer-events: auto !important; opacity: 1 !important; } .ragu-wrapper, .btn-finish, #btnFinish { display: none !important; }`;

    const overlay = document.getElementById('resultOverlay');
    if(overlay) overlay.style.setProperty('display', 'none', 'important');
    
    const ind = document.getElementById('modeIndicator');
    if (ind) { ind.innerText = "MODE: REVIEW SALAH"; ind.style.background = "#ffebee"; ind.style.color = "#c62828"; ind.style.border = "1px solid #ffcdd2"; }
    
    // 👇 BUMBU RAHASIA: Munculin tombol Kembali ke Menu Utama di Sidebar 👇
    let btnBalik = document.getElementById('btnSidebarKembali');
    if (btnBalik) {
        btnBalik.style.display = 'block';
    }
    // 👆 SAMPAI SINI 👆
    
    loadQuestion(wrongIndices[0]);
    window.isAnswerLocked = true; 

    setTimeout(() => {
        const pBtn = document.getElementById('prevBtn'); const nBtn = document.getElementById('nextBtn');
        if(pBtn) { pBtn.style.display = 'inline-block'; pBtn.disabled = false; pBtn.style.pointerEvents = 'auto'; }
        if(nBtn) { nBtn.style.display = 'inline-block'; nBtn.disabled = false; nBtn.style.pointerEvents = 'auto'; }
        document.querySelectorAll('#nomorGrid button, .nav-btn, .nomor-btn, #optionsContainer button, #optionsContainer input, .option-item').forEach(btn => {
            btn.disabled = false; btn.style.pointerEvents = 'auto'; btn.style.opacity = '1';
        });
    }, 100); 
};

// ==========================================================
// B. REVIEW MULTIPLAYER (Mengunci Tombol Kanan Atas)
// ==========================================================
window.startReviewMultiplayer = function() {
    if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
    if (window.innerWidth <= 768) {
        const sb = document.querySelector('.sidebar-right');
        if (sb && sb.classList.contains('show-mobile')) window.toggleMobileSidebar();
    }
    isReviewMode = false; 

    const t1 = document.getElementById('timerDisplay'); const t2 = document.getElementById('floatingTimer');
    if (t1) { t1.innerText = "00:00:00"; t1.className = 'timer-container timer-green'; }
    if (t2) { t2.innerText = "00:00:00"; t2.className = 'timer-green'; }

    // 🛑 KUNCI TOTAL KIRI & KANAN ATAS (Karena Multiplayer pakai tombol ngambang)
    document.querySelectorAll('.modul-btn, .action-box button, .act-exit, .btn-action').forEach(btn => { 
        btn.style.pointerEvents = 'none'; btn.style.opacity = '0.4'; btn.disabled = true; 
    });

    const footer = document.querySelector('.footer-nav');
    if (footer) { footer.style.visibility = 'visible'; footer.style.display = 'flex'; }

    let unfreezeStyle = document.getElementById('review-unfreeze');
    if (!unfreezeStyle) { unfreezeStyle = document.createElement('style'); unfreezeStyle.id = 'review-unfreeze'; document.head.appendChild(unfreezeStyle); }
    unfreezeStyle.innerHTML = `#optionsContainer, #feedbackBox, .option-label { pointer-events: auto !important; opacity: 1 !important; } .ragu-wrapper, .btn-finish, #btnFinish { display: none !important; }`;

    const ind = document.getElementById('modeIndicator');
    if (ind) { ind.innerText = "REVIEW MULTIPLAYER"; ind.style.background = "#f3e5f5"; ind.style.color = "#8e24aa"; ind.style.border = "1px solid #ce93d8"; }
    
    loadQuestion(0);
    window.isAnswerLocked = true; 

    setTimeout(() => {
        const pBtn = document.getElementById('prevBtn'); const nBtn = document.getElementById('nextBtn');
        if(pBtn) { pBtn.style.display = 'inline-block'; pBtn.disabled = false; pBtn.style.pointerEvents = 'auto'; }
        if(nBtn) { nBtn.style.display = 'inline-block'; nBtn.disabled = false; nBtn.style.pointerEvents = 'auto'; }
        document.querySelectorAll('#nomorGrid button, .nav-btn, .nomor-btn, #optionsContainer button, #optionsContainer input, .option-item').forEach(btn => {
            btn.disabled = false; btn.style.pointerEvents = 'auto'; btn.style.opacity = '1';
        });
    }, 100); 
};

window.changeQuestion = function(step) {
    if (isReviewMode) {
        let currentWrongPos = wrongIndices.indexOf(currentIdx);
        if (currentWrongPos !== -1) {
            let nextWrongPos = currentWrongPos + step;
            if (nextWrongPos >= wrongIndices.length) nextWrongPos = 0;
            if (nextWrongPos < 0) nextWrongPos = wrongIndices.length - 1;
            loadQuestion(wrongIndices[nextWrongPos]);
        } else {
            if (step > 0) {
                let nextVal = wrongIndices.find(idx => idx > currentIdx);
                loadQuestion(nextVal !== undefined ? nextVal : wrongIndices[0]);
            } else {
                let prevVal = [...wrongIndices].reverse().find(idx => idx < currentIdx);
                loadQuestion(prevVal !== undefined ? prevVal : wrongIndices[wrongIndices.length - 1]);
            }
        }
    } else {
        const next = currentIdx + step;
        if (next >= 0 && next < currentQuestions.length) loadQuestion(next);
    }
};

window.backToMenu = async function() {  
    const yakin = await PROTAMA.confirm(
        "KEMBALI KE LOBBY", 
        "Yakin mau kembali ke menu utama?"
    );

    if (yakin) {
        const navGrid = document.getElementById('navGrid');
        if (navGrid) navGrid.innerHTML = ''; 
        const optContainer = document.getElementById('optionsContainer');
        if (optContainer) optContainer.innerHTML = ''; 
        const fbBox = document.getElementById('feedbackBox');
        if (fbBox) fbBox.style.display = 'none'; 
        const progText = document.getElementById('progressText');
        if (progText) progText.innerText = "Menjawab: 0/0"; 

        // 🛑 RESET VARIABEL LANGSUNG (TANPA WINDOW.)
        userAnswers = [];
        wrongIndices = [];
        currentQuestions = []; 
        currentIdx = 0;
        isAnswerLocked = false;
        isReviewMode = false;
        isSubmitted = false; 
        
        window.currentDatabaseId = null; 

        if(timerInterval) clearInterval(timerInterval);
        window.speechSynthesis.cancel();
        document.body.classList.remove('mode-focus');

        const btnMobile = document.getElementById('btnMobileNav');
        const btnModul = document.getElementById('btnMobileModul');
        if(btnMobile) btnMobile.style.display = 'none';
        if(btnModul) btnModul.style.display = 'none'; 
        document.getElementById('resultOverlay').style.display = 'none';
        document.getElementById('statsOverlay').style.display = 'none';
        document.getElementById('leaderboardOverlay').style.display = 'none';
        
        const sbLeft = document.querySelector('.sidebar-left');
        if(sbLeft) sbLeft.style.display = ''; 
        const sbRight = document.querySelector('.sidebar-right');
        if(sbRight) {
            sbRight.classList.remove('show-mobile'); 
            sbRight.style.display = ''; 
        }
        document.body.classList.remove('ujian-berjalan');
        const timer = document.getElementById('floatingTimer');
        if(timer) timer.style.display = 'none';
        const modulTitle = document.getElementById('modulTitle');
        if(modulTitle) modulTitle.innerText = "Menu Utama";
        document.getElementById('qNum').innerText = "-";
        
        window.tampilkanLobby();
        window.updateUserStatus(true, "Lobby Utama");

        if (window.innerWidth <= 768) {
            document.getElementById('mobileFooter').style.display = 'none';
        }
    }
};

window.keluarDariRoom = async () => {
    // Putus koneksi dari Room
    if (typeof roomListenerUnsubscribe !== 'undefined' && roomListenerUnsubscribe) roomListenerUnsubscribe();

    // Reset Variabel Mode
    currentRoomCode = null;
    window.currentRoomCode = null;
    isHost = false;
    window.isHost = false;
    currentAppMode = 'ujian'; 
    window.currentAppMode = 'ujian'; 
    
    // Reset Data Jawaban
    userAnswers = [];
    wrongIndices = [];
    currentQuestions = [];
    isAnswerLocked = false;
    isReviewMode = false;
    isSubmitted = false; 
    currentIdx = 0;
    window.currentDatabaseId = null; 

    // Bersihkan UI
    const unfreezeStyle = document.getElementById('review-unfreeze');
    if (unfreezeStyle) unfreezeStyle.remove();
    
    const btnOut = document.getElementById('btnKeluarRoomMode');
    if (btnOut) btnOut.remove(); 
    
    const overlay = document.getElementById('resultOverlay');
    if (overlay) overlay.style.display = 'none';

    // Tutup Chat, Buka Sidebar Modul
    const chatContainer = document.getElementById('roomChatContainer');
    const modulContainer = document.getElementById('modulSidebarContainer');
    const chatBox = document.getElementById('chatMessages');

    if (chatContainer && modulContainer) {
        chatContainer.style.display = 'none';   
        modulContainer.style.display = 'flex';  
    }

    if (chatBox) chatBox.innerHTML = ''; 
    
    const finishContainer = document.querySelector('.finish-container');
    if (finishContainer) finishContainer.style.display = 'block';
    
    document.body.classList.remove('ujian-berjalan', 'room-mode');

    // Buka Lobby
    setTimeout(() => {
        const navGrid = document.getElementById('navGrid');
        if (navGrid) navGrid.innerHTML = '';
        if (typeof window.tampilkanLobby === 'function') window.tampilkanLobby();
    }, 100);
};
window.showResult = function() {
    if(isSubmitted) {
        document.getElementById('resultOverlay').style.display = 'flex';
        
        // 👇 BUMBU RAHASIA: Munculin tombol kembali di sidebar pas nilai keluar 👇
        let btnBalik = document.getElementById('btnSidebarKembali');
        if (btnBalik) {
            btnBalik.style.display = 'block';
        }
        // 👆 SAMPAI SINI 👆
        
    } else {
        alert("Belum ada nilai! Silahkan kerjakan dulu soalnya");
    }
};
// ==========================================================
// 🛡️ MESIN PENENDANG OTOMATIS (KHUSUS NON-VIP) 🛡️
// ==========================================================

window.tendangNonVIP = () => {
    // Putus koneksi dari room biar nggak error di background
    if (typeof roomListenerUnsubscribe !== 'undefined' && roomListenerUnsubscribe) roomListenerUnsubscribe();
    
    // Munculkan peringatan dan tendang ke halaman awal
    Swal.fire({
        title: 'KELUAR',
        text: 'Anda otomatis dikeluarkan sistem',
        icon: 'info',
        confirmButtonColor: '#d32f2f',
        confirmButtonText: 'Keluar',
        allowOutsideClick: false,
        allowEscapeKey: false
    }).then(() => {
        window.location.href = window.location.origin + window.location.pathname;
    });
};

// 🛑 CEGAT TOMBOL KEMBALI KE LOBBY
const originalBackToMenu = window.backToMenu;
window.backToMenu = () => {
    // Kalau dia non-VIP, langsung tendang (cegah masuk lobby)
    if (window.isVIPUser === false) return window.tendangNonVIP();
    
    // Kalau VIP, biarkan kembali ke lobby normal
    if (typeof originalBackToMenu === 'function') originalBackToMenu();
    else window.location.reload();
};

// 🛑 CEGAT TOMBOL KELUAR DARI ROOM
const originalKeluarDariRoom = window.keluarDariRoom;
window.keluarDariRoom = async () => {
    // Kalau dia non-VIP, langsung tendang
    if (window.isVIPUser === false) return window.tendangNonVIP();
    
    // Kalau VIP, jalankan proses pembersihan room secara normal
    if (typeof originalKeluarDariRoom === 'function') originalKeluarDariRoom();
};

window.toggleRagu = function() {
    if(isSubmitted) return;
    const chk = document.getElementById('checkRagu');
    raguStatus[currentIdx] = chk.checked;
    if (chk.checked) userAnswers[currentIdx] = null;
    updateSidebarStatus();
    loadQuestion(currentIdx);
    simpanProgresTotal();
};

window.toggleFocusMode = function() { document.body.classList.toggle('mode-focus'); };

window.toggleHafalan = function() {
    const tempatOpsi = document.getElementById('optionsContainer');
    tempatOpsi.classList.toggle('mode-hafalan');
    
    const btnFlash = document.getElementById('btnFlashHafalan');
    if (tempatOpsi.classList.contains('mode-hafalan')) {
        btnFlash.style.color = 'var(--gold)'; 
    } else {
        btnFlash.style.color = 'var(--secondary)'; 
    }
};

let utterance = null;
window.toggleSpeech = function() {
    const synth = window.speechSynthesis;
    const text = document.getElementById('feedbackText').innerText;
    const btnIcon = document.querySelector('#btnSpeak i');

    if (synth.speaking) {
        synth.cancel();
        btnIcon.className = 'fas fa-volume-up';
        return;
    }

    if (text !== "") {
        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID'; 
        utterance.rate = 1.0; 

        utterance.onend = () => { 
            btnIcon.className = 'fas fa-volume-up'; 
        };
        
        btnIcon.className = 'fas fa-stop-circle'; 
        synth.speak(utterance);
    }
};

function updateProgress() {
    let answered = userAnswers.filter(a => a !== null).length;
    let total = currentQuestions.length;
    let txt = document.getElementById('progressText');
    if(txt) txt.innerText = `Menjawab: ${answered} / ${total}`;
}

window.saveAndShowChart = async function(finalScore, correct, wrong) {
    const usedSeconds = totalExamTime - timeRemaining;

    let arrayDetailPembahasan = [];
    if (typeof currentQuestions !== 'undefined' && currentQuestions.length > 0) {
        currentQuestions.forEach((q, index) => {
            let userAns = userAnswers[index]; 
            arrayDetailPembahasan.push({
                soal: q.q,
                opsi: q.options,
                jawabanUser: userAns !== undefined ? userAns : null,
                kunciJawaban: q.answer,
                pembahasan: q.explanation || "Tidak ada pembahasan spesifik."
            });
        });
    }

    const resultData = {
        uid: currentUser.uid, nama: currentUser.displayName, modul: currentModulKey,
        score: finalScore, correct: correct, wrong: wrong, date: new Date().toLocaleString('id-ID'),
        timestamp: new Date(), duration: usedSeconds,
        detailData: arrayDetailPembahasan 
    };

    try { await addDoc(collection(db, "riwayat_belajar"), resultData); }
    catch (e) { console.error("Gagal simpan history:", e); }
};

window.resetStats = async function() {
    // 1. Ganti confirm jadul pakai PROTAMA
    const yakin = await PROTAMA.confirm(
        "HAPUS RIWAYAT?", 
        "Yakin mau menghapus SEMUA riwayat nilai untuk modul ini? Data di Cloud akan hilang permanen."
    );
    
    // Kalau dia pencet "Batal", langsung berhenti (return)
    if (!yakin) return; 

    // 2. Kalau yakin, munculin loading
    PROTAMA.loading("Menghapus data dari Cloud...");

    try {
        const q = query(collection(db, "riwayat_belajar"), where("uid", "==", currentUser.uid), where("modul", "==", window.currentDatabaseId));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => { batch.delete(doc.ref); });
        
        await batch.commit();
        
        // 3. Ganti alert sukses (baris 1478)
        PROTAMA.alert("TERHAPUS!", "Data berhasil direset!", "success");
        window.openStats();
        
    } catch (e) { 
        console.error("Gagal reset:", e); 
        // 4. Ganti alert error (baris 1480)
        PROTAMA.alert("GAGAL", "Gagal menghapus data dari server.", "error"); 
    }
};

window.openStats = async function(mode = 'hukum') {
    if(!currentUser) { PROTAMA.alert("Akses Ditolak", "Login dulu bro!", "error"); return; }
    
    document.getElementById('statsOverlay').style.display = 'flex';
    const wm = document.getElementById('watermark');
    if(wm) wm.style.display = 'none';
    
    const tableBody = document.getElementById('statsTableBody');
    const statsTitle = document.getElementById('statsTitle');
    
    const thead = document.querySelector('#statsOverlay .stats-table thead tr');

    const chartCanvas = document.getElementById('statsChart');
    const chartContainer = chartCanvas.parentElement; 
    
    const chartCanvas2 = document.getElementById('allModulesChart');
    let chartContainer2 = null;
    if(chartCanvas2) chartContainer2 = chartCanvas2.parentElement;

    const lobbySidebar = document.getElementById('lobbySidebarContent');
    const isLobbyMode = (lobbySidebar && getComputedStyle(lobbySidebar).display !== 'none');

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Sedang mengambil data...</td></tr>';

    let switchContainer = document.getElementById('switchContainer');
    if (!switchContainer) {
        switchContainer = document.createElement('div');
        switchContainer.id = 'switchContainer';
        switchContainer.style = "margin-bottom: 15px; display: flex; gap: 10px; justify-content: center;";
        switchContainer.innerHTML = `
            <button id="btnModeHukum" onclick="openStats('hukum')" style="padding: 8px 15px; border:none; border-radius:20px; cursor:pointer; font-weight:bold;">📊 Skor Akademik</button>
            <button id="btnModePsikotes" onclick="openStats('psikotes')" style="padding: 8px 15px; border:none; border-radius:20px; cursor:pointer; font-weight:bold;">🧠 Kepribadian</button>
        `;
        const headerDiv = document.querySelector('#statsOverlay .result-box > div:first-child');
        if(headerDiv) headerDiv.parentNode.insertBefore(switchContainer, headerDiv.nextSibling);
    }

    const btnHukum = document.getElementById('btnModeHukum');
    const btnPsi = document.getElementById('btnModePsikotes');
    if(btnHukum) {
        btnHukum.style.background = mode === 'hukum' ? 'var(--primary)' : '#ddd';
        btnHukum.style.color = mode === 'hukum' ? 'white' : '#333';
    }
    if(btnPsi) {
        btnPsi.style.background = mode === 'psikotes' ? '#8e44ad' : '#ddd';
        btnPsi.style.color = mode === 'psikotes' ? 'white' : '#333';
    }

    if (mode === 'psikotes') {
        if(chartContainer) chartContainer.style.display = 'none'; 
        if(chartContainer2) chartContainer2.style.display = 'none';
        const title2 = document.querySelectorAll('.stats-section-title')[1];
        if(title2) title2.style.display = 'none';

        if (isLobbyMode) {
            if(statsTitle) statsTitle.innerText = "Ranking Profil Kepribadian (Global)";
            
            if(thead) thead.innerHTML = '<th style="width:5%">No</th><th style="width:40%">Nama Peserta</th><th style="width:25%">Nilai</th><th style="width:30%">Indikator</th>';

            try {
                const q = query(collection(db, "riwayat_psikotes"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                
                tableBody.innerHTML = '';
                if (querySnapshot.empty) {
                    tableBody.innerHTML = '<tr><td colspan="4">Belum ada data psikotes masuk.</td></tr>';
                } else {
                    let userBestMap = {};
                    querySnapshot.forEach(doc => {
                        let d = doc.data();
                        if (!d.createdAt || !d.nama) return;
                        let skorPrioritas = (d.status.includes('DISARANKAN') ? 1000 : 500) - (d.fail_count || 0);
                        d.sortingScore = skorPrioritas;
                        if (!userBestMap[d.uid] || d.sortingScore > userBestMap[d.uid].sortingScore) {
                            userBestMap[d.uid] = d;
                        }
                    });

                    let finalRanking = Object.values(userBestMap).sort((a, b) => b.sortingScore - a.sortingScore);
                    
                    finalRanking.forEach((d, idx) => {
                        const statusTeks = d.status || "Selesai";
                        const redFlagCount = d.fail_count !== undefined ? d.fail_count : 0;
                        let colorStatus = statusTeks.includes('PERLU') ? '#c0392b' : 'green';
                        let bgRow = (currentUser && d.uid === currentUser.uid) ? '#e3f2fd' : 'white';
                        let nameDisplay = (currentUser && d.uid === currentUser.uid) ? `<b>${d.nama} (Anda)</b>` : d.nama;

                        const tr = document.createElement('tr');
                        tr.style.borderBottom = "1px solid #eee";
                        tr.style.backgroundColor = bgRow;
                        
                        tr.innerHTML = `
                            <td style="padding:10px; text-align:center;">${idx + 1}</td>
                            <td style="padding:10px; text-align:left;">${nameDisplay}</td>
                            <td style="padding:10px; font-weight:bold; color:${colorStatus}; text-align:center;">${statusTeks}</td>
                            <td style="padding:10px; text-align:center;">${redFlagCount} Red Flags</td>
                        `;
                        tableBody.appendChild(tr);
                    });
                }
            } catch (e) { console.error("ERROR LOAD PSIKOTES GLOBAL:", e); }

        } 
        else {
            if(statsTitle) statsTitle.innerText = "Riwayat Tes Kepribadian Anda";
            
            if(thead) thead.innerHTML = '<th>No</th><th>Tanggal</th><th>Nilai</th><th>Indikator</th><th>Ket</th>';

            try {
                const q = query(collection(db, "riwayat_psikotes"), where("uid", "==", currentUser.uid), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                
                tableBody.innerHTML = '';
                if (querySnapshot.empty) {
                    tableBody.innerHTML = '<tr><td colspan="5">Belum ada riwayat tes PAPI.</td></tr>';
                } else {
                    querySnapshot.forEach((doc, idx) => {
                        let d = doc.data();
                        d.id = doc.id; 
                        let dDate = "-";
                        if (d.createdAt) {
                            dDate = d.createdAt.toDate().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                        }
                        
                        let statusTeks = d.status || "Selesai";
                        let redFlagCount = d.fail_count !== undefined ? d.fail_count : 0;
                        let redFlagInfo = `${redFlagCount} Flags`;
                        let colorStatus = statusTeks.includes('PERLU') ? '#c0392b' : 'green';

                        let btnCek = `
                            <button class="btn-cek" onclick="window.bukaDetailPapi('${d.id}')" 
                                style="font-size:0.7rem; cursor:pointer; background:#3498db; color:white; border:none; padding:3px 8px; border-radius:4px;">
                                Cek
                            </button>
                        `;
                        
                        const tr = document.createElement('tr');
                        tr.style.borderBottom = "1px solid #eee";
                        tr.innerHTML = `
                            <td style="padding:8px; text-align:center;">${idx + 1}</td>
                            <td style="padding:8px; font-size:0.75rem;">${dDate}</td>
                            <td style="padding:8px; font-weight:bold; color:${colorStatus}">${statusTeks}</td>
                            <td style="padding:8px; text-align:center;">${redFlagInfo}</td>
                            <td style="padding:8px; text-align:center;">${btnCek}</td>
                        `;
                        tableBody.appendChild(tr);
                    });
                }
            } catch (e) { console.error("ERROR LOAD PSIKOTES PERSONAL:", e); }
        }

    }
    
    else {
        if(chartContainer) chartContainer.style.display = 'block'; 
        if(chartContainer2) chartContainer2.style.display = 'block';
        const title2 = document.querySelectorAll('.stats-section-title')[1];
        if(title2) title2.style.display = 'block';

        try {
            const q = query(collection(db, "riwayat_belajar"), where("uid", "==", currentUser.uid), orderBy("timestamp", "asc"));
            const querySnapshot = await getDocs(q);
            let allHistory = [];
            querySnapshot.forEach((doc) => { allHistory.push(doc.data()); });

            if (isLobbyMode) {
                if(statsTitle) statsTitle.innerText = "Rata-Rata Statistik Akademik";
                thead.innerHTML = '<th>No</th><th>Modul</th><th>Nilai</th><th>Percobaan</th><th>Ket</th>';

                let summaryStats = {};
                allHistory.forEach(h => {
                    if(!summaryStats[h.modul]) summaryStats[h.modul] = { total: 0, count: 0 };
                    summaryStats[h.modul].total += parseInt(h.score);
                    summaryStats[h.modul].count++;
                });

                tableBody.innerHTML = '';
                const sortedKeys = Object.keys(summaryStats).sort();
                
                if (sortedKeys.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5">Belum ada data latihan.</td></tr>';
                } else {
                    sortedKeys.forEach((key, idx) => {
                        const data = summaryStats[key];
                        const avg = Math.round(data.total / data.count);
                        const modulName = key.replace('modul', 'MODUL ').toUpperCase();
                        
                        tableBody.innerHTML += `
                            <tr>
                                <td>${idx+1}</td>
                                <td style="text-align:left;">${modulName}</td>
                                <td style="font-weight:bold; color:${avg>=70?'green':'#d35400'}">${avg}</td>
                                <td>${data.count}x</td>
                                <td>${avg>=70 ? '✅ Aman' : '⚠️ Tingkatkan'}</td>
                            </tr>`;
                    });
                }

                setTimeout(() => {
                    const ctx = document.getElementById('statsChart').getContext('2d');
                    if (window.statsChartInstance) window.statsChartInstance.destroy();
                    const labels = sortedKeys.map(k => k.replace('modul', 'M-').toUpperCase());
                    const dataPoints = sortedKeys.map(k => Math.round(summaryStats[k].total / summaryStats[k].count));

                    window.statsChartInstance = new Chart(ctx, {
                        type: 'line', 
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Rata-Rata Nilai', 
                                data: dataPoints,
                                borderColor: '#004d00', 
                                backgroundColor: 'rgba(0, 77, 0, 0.2)', 
                                borderWidth: 3, 
                                tension: 0.3, 
                                fill: true, 
                                pointBackgroundColor: '#d4af37', 
                                pointBorderColor: '#004d00', 
                                pointRadius: 5
                            }]
                        },
                        options: { 
                            responsive: true, 
                            maintainAspectRatio: false, 
                            animation: {
                                x: {
                                    type: 'number',
                                    easing: 'linear',
                                    duration: 2000,
                                    from: NaN, 
                                    delay(ctx) {
                                        if (ctx.type !== 'data' || ctx.xStarted) return 0;
                                        ctx.xStarted = true;
                                        return ctx.index * 300;
                                    }
                                },
                                y: {
                                    type: 'number',
                                    easing: 'linear',
                                    duration: 1500,
                                    from: NaN,
                                    delay(ctx) {
                                        if (ctx.type !== 'data' || ctx.yStarted) return 0;
                                        ctx.yStarted = true;
                                        return ctx.index * 300;
                                    }
                                }
                            },
                            scales: { y: { beginAtZero: true, max: 100 } } 
                        }
                    });
                }, 100);

            } 
            else {
                let targetModul = window.currentDatabaseId || 'modul1';
                if(statsTitle) statsTitle.innerText = "Data Modul: " + targetModul;
                
                thead.innerHTML = '<th style="padding: 10px; border-radius: 8px 0 0 0;">No</th><th style="padding: 10px; text-align: left;">Tanggal</th><th style="padding: 10px;">Benar</th><th style="padding: 10px;">Salah</th><th style="padding: 10px;">Nilai</th><th style="padding: 10px; border-radius: 0 8px 0 0;">Ket</th>';

                const currentModulHistory = allHistory.filter(h => h.modul === targetModul);

                tableBody.innerHTML = '';
                if (currentModulHistory.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6" style="padding:15px;">Belum ada data untuk modul ini.</td></tr>';
                } else {
                    let sortedHistory = [...currentModulHistory].reverse();
                    window.tempDataRiwayatStats = sortedHistory;

                    sortedHistory.forEach((d, idx) => {
                        tableBody.innerHTML += `
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px;">${idx+1}</td>
                                <td style="padding: 10px; text-align: left;">${d.date || '-'}</td>
                                <td style="padding: 10px; font-weight: bold; color: green;">${d.correct || d.benar || 0} ✅</td>
                                <td style="padding: 10px; font-weight: bold; color: red;">${d.wrong || d.salah || 0} ❌</td>
                                <td style="padding: 10px; font-weight: 900; font-size: 1.1rem; color: ${d.score >= 70 ? 'var(--success)' : 'var(--danger)'};">${d.score}</td>
                                <td style="padding: 10px;">
                                    <button onclick="window.bukaReviewRiwayat(${idx})" style="background: var(--gold); color: #333; border: none; padding: 5px 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem;">
                                        🔍 Detail
                                    </button>
                                </td>
                            </tr>
                        `;
                    });
                }
                setTimeout(() => {
                    const ctx = document.getElementById('statsChart').getContext('2d');
                    if (window.statsChartInstance) window.statsChartInstance.destroy();
                    window.statsChartInstance = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: currentModulHistory.map((_, i) => "Tes " + (i+1)),
                            datasets: [{
                                label: 'Nilai Kamu', data: currentModulHistory.map(d => d.score),
                                borderColor: '#2980b9', backgroundColor: 'rgba(41, 128, 185, 0.2)', borderWidth: 2, tension: 0.3, fill: true
                            }, {
                                label: 'Batas Lulus (70)', data: currentModulHistory.map(() => 70),
                                borderColor: '#c0392b', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: false
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
                    });
                }, 100);
            }

            let modulStats = {};
            allHistory.forEach(h => {
                if(!modulStats[h.modul]) modulStats[h.modul] = { total: 0, count: 0 };
                modulStats[h.modul].total += parseInt(h.score);
                modulStats[h.modul].count++;
            });

            const sortedKeys = Object.keys(modulStats).sort((a, b) => {
                const numA = parseFloat(a.replace(/[^\d.]/g, '')) || 0;
                const numB = parseFloat(b.replace(/[^\d.]/g, '')) || 0;
                return numA - numB;
            });

            const labels = [];
            const dataScores = [];
            const backgroundColors = [];
            const colors = ['#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#2ecc71', '#e67e22', '#1abc9c'];

            sortedKeys.forEach((key, index) => {
                labels.push(key.replace('modul', 'M-').replace('btn-', ''));
                dataScores.push(Math.round(modulStats[key].total / modulStats[key].count));
                backgroundColors.push(colors[index % colors.length]);
            });

            setTimeout(() => {
                const ctxAll = document.getElementById('allModulesChart').getContext('2d');
                if (window.allModulesChartInstance) window.allModulesChartInstance.destroy();
                
                window.allModulesChartInstance = new Chart(ctxAll, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{ label: 'Rata-rata Nilai', data: dataScores, backgroundColor: backgroundColors, borderWidth: 1 }]
                    },
                    options: { 
                        animation: { duration: 2500, easing: 'easeOutBounce', y: { from: 0 } },
                        responsive: true, maintainAspectRatio: false, 
                        scales: { y: { beginAtZero: true, max: 100 } },
                        plugins: { legend: { display: false } } 
                    }
                });
            }, 100);

        } catch (e) { console.error("Error load data hukum:", e); }
    }
};
    
window.closeStats = function() {
    document.getElementById('statsOverlay').style.display = 'none';
    const wm = document.getElementById('watermark');
    if(wm) wm.style.display = 'block';
};

let currentRoomCode = null;
let isHost = false;

// ==========================================================
// 1. HOST: BIKIN ROOM BARU (VERSI JADWAL ZOOM & RACIK SOAL)
// ==========================================================
window.bikinRoomLatihan = () => {
    const modalRoom = document.getElementById('modalBikinRoom');
    if(modalRoom) modalRoom.style.display = 'flex';
    
    const listDiv = document.getElementById('listModulCheckbox');
    if(!listDiv) return;
    listDiv.innerHTML = '';
    
    document.querySelectorAll('.modul-selector .modul-btn').forEach(btn => {
        let idModul = btn.id.replace('btn-', '');
        let namaModul = btn.innerText;
        listDiv.innerHTML += `
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:5px; border-bottom:1px solid #eee;">
                <input type="checkbox" class="chk-modul-mabar" value="${idModul}">
                <span style="font-weight:600; color:var(--primary);">${namaModul}</span>
            </label>
        `;
    });
};

window.eksekusiBikinRoom = async () => {
    const namaRoom = document.getElementById('inputNamaRoom').value || 'Tryout Mabar';
    const jadwalStr = document.getElementById('inputJadwalRoom').value; 
    const chks = document.querySelectorAll('.chk-modul-mabar:checked');
    
    if(chks.length === 0) return PROTAMA.alert("Waduh!", "Pilih minimal 1 modul buat diracik bro!", "warning");
    
    const waktuMulaiMilis = jadwalStr ? new Date(jadwalStr).getTime() : new Date().getTime() + 5000; 
    let selectedModuls = Array.from(chks).map(c => c.value);
    
    document.getElementById('modalBikinRoom').style.display = 'none';
    PROTAMA.loading("Meracik Soal Mabar...");
    
    let kawahSoal = [];
    try {
        let totalSoalTarget = 100;
        let jumlahModul = selectedModuls.length;
        let baseJatah = Math.floor(totalSoalTarget / jumlahModul);
        let sisaJatah = totalSoalTarget % jumlahModul; 

        const tarikanServer = selectedModuls.map(async (modId, index) => {
            const qSnap = await getDocs(collection(window.db, "bank_soal", modId, "daftar_soal"));
            let soalModulIni = [];
            qSnap.forEach(docSnap => {
                let d = docSnap.data(); d.id = docSnap.id; soalModulIni.push(d);
            });
            
            shuffleArray(soalModulIni);
            
            let jatah = baseJatah + (index === jumlahModul - 1 ? sisaJatah : 0);
            return soalModulIni.slice(0, jatah);
        });

        const hasilTarikan = await Promise.all(tarikanServer);
        
        hasilTarikan.forEach(kumpulan => {
            kawahSoal = kawahSoal.concat(kumpulan);
        });

        if(kawahSoal.length === 0) {
            PROTAMA.close();
            return PROTAMA.alert("Kosong", "Modul yang dipilih belum ada soalnya!", "error");
        }

        shuffleArray(kawahSoal);
        let soalMabarFinal = kawahSoal; 

        soalMabarFinal.forEach(q => {
            if(q.options && q.answer < q.options.length) {
                let jawabanBenar = q.options[q.answer]; 
                shuffleArray(q.options); 
                q.answer = q.options.indexOf(jawabanBenar); 
            }
        });

        const kodeRoom = Math.floor(10000 + Math.random() * 90000).toString(); 

        await setDoc(doc(window.db, "rooms", kodeRoom), {
            nama: namaRoom,
            hostUid: currentUser.uid,
            hostName: currentUser.displayName,
            modulId: selectedModuls.length > 1 ? "latihan_campuran" : selectedModuls[0], 
            soalTersimpan: soalMabarFinal, 
            jadwal_mulai: waktuMulaiMilis,
            status: 'waiting', 
            currentIdx: 0,
            players: {
                // 🛑 SISIPKAN FOTO HOST DI SINI 🛑
                [currentUser.uid]: { nama: currentUser.displayName, skor: 0, jawabanSekarang: null, photoURL: currentUser.photoURL || null }
            },
            messages: [],
            createdAt: new Date()
        });

        isHost = true;
        currentRoomCode = kodeRoom;
        currentAppMode = 'room'; 
        
        PROTAMA.close();
        
        window.tampilkanWaitingRoom(kodeRoom, isHost, selectedModuls.length > 1 ? "latihan_campuran" : selectedModuls[0]); 
        window.pantauRoom(kodeRoom);

    } catch (e) {
        PROTAMA.close();
        PROTAMA.alert("Error", "Gagal membuat soal: " + e.message, "error");
    }
};

// ==========================================================
// 2. PESERTA: GABUNG KE ROOM (MANUAL DARI KODE)
// ==========================================================
window.gabungRoomLatihan = async () => {
    const { value: kodeRoom } = await Swal.fire({
        title: 'GABUNG ROOM',
        text: 'Masukkan 5 Digit Kode Room temanmu:',
        input: 'text',
        inputPlaceholder: 'Contoh: 12345',
        inputAttributes: { maxlength: 5, autocomplete: 'off' },
        showCancelButton: true,
        confirmButtonColor: '#2e7d32', 
        cancelButtonColor: '#d32f2f',  
        confirmButtonText: '<i class="fas fa-sign-in-alt"></i> Gabung',
        cancelButtonText: 'Batal',
        inputValidator: (value) => {
            if (!value) return 'Kode Room wajib diisi bro! 😅';
            if (value.length !== 5 || isNaN(value)) return 'Kode Room harus persis 5 digit angka!';
        },
        customClass: { popup: 'swal2-modal-modern', input: 'swal2-input-modern' }
    });

    if(!kodeRoom) return; 

    PROTAMA.loading("Mencari Room...");
    try {
        const roomRef = doc(window.db, "rooms", kodeRoom);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            PROTAMA.close();
            return PROTAMA.alert("Gagal", "Room tidak ditemukan atau sudah dibubarkan!", "error");
        }

        const dataRoom = roomSnap.data();
        const isPemainLama = dataRoom.players && dataRoom.players[currentUser.uid];

        if (dataRoom.status !== 'waiting' && !isPemainLama) {
            PROTAMA.close();
            return PROTAMA.alert("Telat", "Ujian di room ini udah dimulai, peserta baru tidak bisa masuk!", "warning");
        }

        if (!isPemainLama) {
            // 🛑 SISIPKAN FOTO PESERTA JOIN MANUAL DI SINI 🛑
            await updateDoc(roomRef, {
                [`players.${currentUser.uid}`]: { nama: currentUser.displayName, skor: 0, jawabanSekarang: null, photoURL: currentUser.photoURL || null }
            });
        } else {
            // Kalau dia udah ada, sekalian kita timpa fotonya (jaga-jaga kalau kemarin fotonya kosong)
            await updateDoc(roomRef, {
                [`players.${currentUser.uid}.photoURL`]: currentUser.photoURL || null
            });
            console.log("Pemain lama reconnect. Welcome back!");
        }

        window.isHost = (dataRoom.hostUid === currentUser.uid);
        isHost = window.isHost;
        
        currentRoomCode = kodeRoom;
        currentAppMode = 'room';
        
        PROTAMA.close();
        
        if (dataRoom.status === 'waiting') {
            window.tampilkanWaitingRoom(kodeRoom, isHost, dataRoom.modulId); 
        }
        window.pantauRoom(kodeRoom);

    } catch(e) {
        PROTAMA.close();
        alert("Gagal join: " + e.message);
    }
};

// ==========================================================
// 2.6. PESERTA: AUTO-JOIN DARI LINK (BYPASS)
// ==========================================================
window.gabungRoomLatihanOtomatis = async (kodeRoom) => {
    if(!kodeRoom) return;

    PROTAMA.loading("Mencari Room dari Link...");
    try {
        const roomRef = doc(window.db, "rooms", kodeRoom);
        const roomSnap = await getDoc(roomRef);

        if (!roomSnap.exists()) {
            PROTAMA.close();
            window.history.replaceState(null, null, window.location.pathname);
            return PROTAMA.alert("Gagal", "Room tidak ditemukan atau sudah dibubarkan!", "error");
        }

        const dataRoom = roomSnap.data();
        const isPemainLama = dataRoom.players && dataRoom.players[currentUser.uid];

        if (dataRoom.status !== 'waiting' && !isPemainLama) {
            PROTAMA.close();
            window.history.replaceState(null, null, window.location.pathname);
            return PROTAMA.alert("Telat", "Ujian di room ini udah dimulai, peserta baru tidak bisa masuk!", "warning");
        }

        if (!isPemainLama) {
            // 🛑 SISIPKAN FOTO PESERTA JOIN LINK DI SINI 🛑
            await updateDoc(roomRef, {
                [`players.${currentUser.uid}`]: { nama: currentUser.displayName, skor: 0, jawabanSekarang: null, photoURL: currentUser.photoURL || null }
            });
        } else {
            // Kalau dia udah ada, sekalian kita timpa fotonya
            await updateDoc(roomRef, {
                [`players.${currentUser.uid}.photoURL`]: currentUser.photoURL || null
            });
        }

        window.isHost = (dataRoom.hostUid === currentUser.uid);
        isHost = window.isHost;
        
        currentRoomCode = kodeRoom;
        currentAppMode = 'room';
        
        PROTAMA.close();
        
        if (dataRoom.status === 'waiting') {
            window.tampilkanWaitingRoom(kodeRoom, isHost, dataRoom.modulId); 
        }
        window.pantauRoom(kodeRoom);

        window.history.replaceState(null, null, window.location.pathname);

    } catch(e) {
        PROTAMA.close();
        alert("Gagal join otomatis: " + e.message);
    }
};
// ==========================================================
// 2.5. UI WAITING ROOM & TOMBOL MULAI (UPDATED - KAMUS MODUL + ANTI BOCOR)
// ==========================================================
window.tampilkanWaitingRoom = function(kode, isHost, modulId = "latihan") {
    if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
    
    // 🛑 BASMI BOCORAN UI SINGLEPLAYER KE WAITING ROOM
    const hideElements = ['.question-header', '.footer-nav', '.ragu-wrapper', '#feedbackBox'];
    hideElements.forEach(sel => {
        const el = document.querySelector(sel);
        if (el) {
            el.style.setProperty('display', 'none', 'important');
            el.style.visibility = 'hidden';
        }
    });

    document.getElementById('lobbySidebarContent').style.display = 'none';
    document.getElementById('examSidebarContent').style.display = 'flex';
    
    const qText = document.getElementById('questionText');
    qText.style.display = 'block';
    document.getElementById('optionsContainer').innerHTML = '';
    
    // 🛑 KAMUS NAMA MODUL BIAR TAMPILANNYA LENGKAP & RAPI
    const kamusModul = {
        "ilmu_hukum": "Ilmu Hukum Dasar (Materiil)",
        "modul1": "Modul 1: Kekuasaan Kehakiman (UU 48/2009)",
        "modul2": "Modul 2: Mahkamah Agung",
        "modul3": "Modul 3: Peradilan Agama",
        "modul6": "Modul 6: PMH & Wanprestasi",
        "modul8": "Modul 8: Perkawinan (KHI)",
        "modul8_1": "Modul 8.1: Perkawinan (Lanjutan)",
        "modul8_2": "Modul 8.2: Perkawinan (Lanjutan)",
        "modul8_3": "Modul 8.3: Perkawinan (Lanjutan)",
        "latihan": "Modul Latihan Campuran"
    };

    // Ambil nama dari kamus, kalau nggak ada, rapikan teksnya otomatis
    let namaModulBersih = "";
    if (modulId && kamusModul[modulId.toLowerCase()]) {
        namaModulBersih = kamusModul[modulId.toLowerCase()];
    } else {
        namaModulBersih = (modulId || "MODUL LATIHAN").replace(/_/g, ' ').toUpperCase();
        if (!namaModulBersih.includes('MODUL') && !namaModulBersih.includes('HUKUM')) {
            namaModulBersih = "MODUL " + namaModulBersih;
        }
    }
    
    let btnMulai = isHost ? 
        `<button onclick="window.mulaiUjianRoom('${kode}')" style="background:var(--success); color:white; padding:15px 30px; border:none; border-radius:8px; font-size:1.2rem; font-weight:bold; cursor:pointer; margin-top:10px; width:100%; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">🚀 MULAI</button>` : 
        `<div style="background:#fff3e0; border:1px solid #ffe0b2; padding:15px; border-radius:8px; margin-top:10px; color:#e67e22; font-weight:bold; font-size:1.1rem;"><i class="fas fa-spinner fa-spin"></i> Menunggu Host Memulai Ujian...</div>`;

    // 🛑 BIKIN LINK AUTO-JOIN
    const linkRoom = `${window.location.origin}${window.location.pathname}?room=${kode}`;

    // 🛑 LOGIKA KUNCI: Tombol Invite cuma dirender kalau isHost itu true!
    let btnInvite = isHost ? 
        `<button onclick="navigator.clipboard.writeText('${linkRoom}'); PROTAMA.alert('Link Disalin!', 'Kirim link ini ke temanmu via WhatsApp.', 'success');" style="background:#3498db; color:white; padding:10px 20px; border:none; border-radius:30px; cursor:pointer; font-weight:bold; font-size:0.9rem; margin-bottom:20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <i class="fas fa-link"></i> Salin Link Invite Room
        </button>` : ``;

    qText.innerHTML = `
        <div style="text-align:center; padding: 40px; background:white; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.05); max-width:600px; margin:0 auto; border-top:8px solid var(--primary);">
            <i class="fas fa-users" style="font-size:4rem; color:var(--primary); margin-bottom:15px;"></i>
            <h2 style="color:var(--primary); margin-bottom:5px;">WAITING ROOM</h2>
            <p style="color:#666; font-size:1rem; margin-bottom:5px;">Berikan kode ini ke user lain untuk bergabung:</p>
            
            <div style="background:#f1f8e9; border:2px dashed var(--success); padding:15px; border-radius:10px; font-size:3.5rem; font-weight:900; color:var(--success); letter-spacing:8px; margin-bottom:15px;">
                ${kode}
            </div>
            
            <!-- TOMBOL SALIN LINK OTOMATIS (GAIB BUAT PESERTA BIASA) -->
            ${btnInvite}
            
            <!-- KETERANGAN MODUL -->
            <div style="background:#e3f2fd; padding:10px; border-radius:8px; border:1px solid #90caf9; margin-bottom:20px; font-weight:bold; color:#1565c0; font-size: 0.95rem;">
                <i class="fas fa-book-open"></i> Materi Ujian: ${namaModulBersih}
            </div>
            
           <!-- LIST PESERTA YANG JOIN BARENG -->
            <div style="text-align:left; background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:20px; border: 1px solid #eee;">
                <h4 style="margin-top:0; color:#555; border-bottom:2px solid #ddd; padding-bottom:5px;">Peserta Terhubung: <span id="countPeserta">1</span></h4>
                <ul id="listPesertaRoom" style="list-style:none; padding:0; margin:0; max-height:150px; overflow-y:auto;">
                    <li style="padding:10px 0; color:#888;"><i class="fas fa-circle-notch fa-spin"></i> Memuat peserta...</li>
                </ul>
            </div>

            ${btnMulai}
            
            <br><br>
            <!-- 🛑 TOMBOL KELUAR DINAMIS BERDASARKAN STATUS VIP -->
            ${window.isVIPUser ? 
                `<button onclick="window.keluarDariRoom()" style="background:none; border:none; color:#1565c0; text-decoration:underline; cursor:pointer; font-weight:bold; font-size:1rem;"><i class="fas fa-arrow-left"></i> Kembali ke Lobby</button>` : 
                `<button onclick="window.tendangNonVIP()" style="background:var(--danger); color:white; padding:10px 20px; border:none; border-radius:30px; cursor:pointer; font-weight:bold; box-shadow:0 4px 6px rgba(0,0,0,0.2);"><i class="fas fa-power-off"></i> Keluar Aplikasi</button>`
            }
        </div>
    `;

    // ==========================================
    // LOGIKA COUNTDOWN JADWAL ZOOM-STYLE
    // ==========================================
    const roomRef = doc(window.db, "rooms", kode);
    getDoc(roomRef).then(snap => {
        if(snap.exists()) {
            let dataRoom = snap.data();
            let waktuMulai = dataRoom.jadwal_mulai;
            let tombolMulai = document.querySelector(`button[onclick="window.mulaiUjianRoom('${kode}')"]`);
            
            // Kalau bukan host, kita ubah div pesannya jadi tempat nampilin detik
            let divTunggu = document.querySelector('div.fa-spinner')?.parentNode;

            if(waktuMulai && waktuMulai > new Date().getTime()) {
                if(tombolMulai) {
                    tombolMulai.disabled = true;
                    tombolMulai.style.background = "#95a5a6";
                }
                
                let intervalTunggu = setInterval(() => {
                    let sisa = waktuMulai - new Date().getTime();
                    if(sisa <= 0) {
                        clearInterval(intervalTunggu);
                        if(tombolMulai) {
                            tombolMulai.disabled = false;
                            tombolMulai.style.background = "var(--success)";
                            tombolMulai.innerHTML = "🚀 MULAI UJIAN SEKARANG";
                        }
                        if(divTunggu && !isHost) {
                            divTunggu.innerHTML = '<i class="fas fa-unlock"></i> Pintu Ujian Terbuka! Menunggu Host Memulai...';
                            divTunggu.style.background = "#e8f5e9";
                            divTunggu.style.borderColor = "#c8e6c9";
                            divTunggu.style.color = "#2e7d32";
                        }
                    } else {
                        let jam = Math.floor((sisa / (1000 * 60 * 60)) % 24);
                        let mnt = Math.floor((sisa / 1000 / 60) % 60);
                        let dtk = Math.floor((sisa / 1000) % 60);
                        let teksWaktu = `Jadwal Dimulai Dalam: ${jam}j ${mnt}m ${dtk}d`;
                        
                        if(tombolMulai) tombolMulai.innerHTML = `⏳ ${teksWaktu}`;
                        if(divTunggu && !isHost) divTunggu.innerHTML = `⏳ ${teksWaktu} <br><small>Menunggu Host Memulai...</small>`;
                    }
                }, 1000);
            }
        }
    });
};

// ==========================================================
// FUNGSI RENDER JADWAL TRYOUT DI LOBBY (DENGAN COPY LINK & HAPUS KEBAL)
// ==========================================================
window.loadJadwalLobby = async () => {
    const listContainer = document.getElementById('listJadwalTryout');
    if (!listContainer) return;

    listContainer.innerHTML = '<p style="color:#ccc; text-align:center; margin: 10px 0;"><i class="fas fa-spinner fa-spin"></i> Mengecek jadwal...</p>';

    try {
        const qRef = collection(window.db || db, "rooms");
        const snapshot = await getDocs(qRef);

        let html = '';
        let adaJadwalAktif = false;
        let waktuSekarang = new Date().getTime();
        
        // 🛑 PERBAIKAN: Tarik data user dengan lebih akurat & kebal
        let uidSaya = null;
        let namaSaya = null;
        if (typeof currentUser !== 'undefined' && currentUser) {
            uidSaya = currentUser.uid;
            namaSaya = currentUser.displayName;
        } else if (window.currentUser) {
            uidSaya = window.currentUser.uid;
            namaSaya = window.currentUser.displayName;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const roomId = docSnap.id;

            if (data.status === 'waiting' && data.jadwal_mulai) {
                // Sembunyikan jadwal yang udah lewat lebih dari 2 jam
                if (waktuSekarang - data.jadwal_mulai > (2 * 60 * 60 * 1000)) return;

                adaJadwalAktif = true;
                
                let tgl = new Date(data.jadwal_mulai);
                let strHari = tgl.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
                let strJam = tgl.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                // 🛑 CEK HOST DIPERKUAT: 
                // Cocokkan UID, ATAU Cocokkan Nama, ATAU berikan Akses Dewa khusus untuk Ilham
                let isMyRoom = (uidSaya && data.hostUid === uidSaya) || 
                               (namaSaya && data.hostName === namaSaya) || 
                               (namaSaya && namaSaya.includes("Ilham Nur Pratama"));
                
                // 1. TOMBOL HAPUS (Khusus Host / Admin)
                let btnHapus = isMyRoom ? 
                    `<button onclick="window.hapusRoomJadwal('${roomId}')" style="background:transparent; color:#d32f2f; border:1px solid #d32f2f; padding:7px 10px; border-radius:6px; cursor:pointer; font-size:0.85rem; transition:0.3s;" title="Batalkan/Hapus Room">
                        <i class="fas fa-trash-alt"></i>
                    </button>` : '';

                // 2. TOMBOL COPY LINK
                let linkRoom = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
                let btnCopyLink = `
                    <button onclick="navigator.clipboard.writeText('${linkRoom}'); PROTAMA.alert('Link Disalin!', 'Bagikan link ini ke temanmu via WhatsApp.', 'success');" style="background:transparent; color:#3498db; border:1px solid #3498db; padding:7px 10px; border-radius:6px; cursor:pointer; font-size:0.85rem; margin-right:8px; transition:0.3s;" title="Salin Link Invite">
                        <i class="fas fa-link"></i>
                    </button>
                `;

                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; margin-bottom:10px; border:1px solid #e0e0e0; border-radius:8px; background:#f9f9f9; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                        <div style="flex:1;">
                            <h6 style="margin:0; color:var(--primary); font-size:0.95rem;">${data.nama}</h6>
                            <div style="margin-top:4px; font-size:0.8rem;">
                                <span style="background:#fff3e0; color:#e67e22; padding:2px 6px; border-radius:4px; font-weight:bold; margin-right:5px;">
                                    <i class="far fa-clock"></i> ${strHari} - ${strJam}
                                </span>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center;">
                            <button onclick="window.gabungRoomLatihanOtomatis('${roomId}')" style="background:var(--success); color:white; border:none; padding:8px 15px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.85rem; box-shadow:0 2px 5px rgba(0,0,0,0.1); min-width:70px; margin-right:8px;">
                                <i class="fas fa-sign-in-alt"></i> JOIN
                            </button>
                            ${btnCopyLink}
                            ${btnHapus}
                        </div>
                    </div>
                `;
            }
        });

        if (!adaJadwalAktif) {
            listContainer.innerHTML = '<p style="color:#999; text-align:center; margin: 15px 0; font-style:italic;">Belum ada jadwal Tryout terdekat.</p>';
        } else {
            listContainer.innerHTML = html;
        }

    } catch (e) {
        console.error("Gagal load jadwal:", e);
        listContainer.innerHTML = '<p style="color:var(--danger); text-align:center; margin: 10px 0;">Gagal memuat jadwal dari server.</p>';
    }
};
// ==========================================================
// FUNGSI EKSEKUSI HAPUS ROOM OLEH HOST
// ==========================================================
window.hapusRoomJadwal = async (roomId) => {
    const yakin = await PROTAMA.confirm("Batalkan Tryout?", "Room ini akan dihapus permanen dan peserta tidak akan bisa bergabung.");
    if (!yakin) return;
    
    PROTAMA.loading("Menghapus jadwal...");
    try {
        await deleteDoc(doc(window.db, "rooms", roomId));
        PROTAMA.close();
        PROTAMA.alert("Berhasil", "Jadwal Tryout berhasil dihapus.", "success");
        
        // Refresh daftar jadwal di lobi secara otomatis
        window.loadJadwalLobby();
    } catch (e) {
        PROTAMA.close();
        PROTAMA.alert("Error", "Gagal menghapus room: " + e.message, "error");
    }
};
// ==========================================================
// FUNGSI MULAI UJIAN (DIUBAH JADI TRIGGER MATCHMAKING)
// ==========================================================
window.mulaiUjianRoom = async (kode) => {
    // Pake PROTAMA.confirm biar popup modern dan gak diblokir browser
    const yakin = await PROTAMA.confirm(
        "MULAI MATCH?", 
        "Semua peserta akan diminta menekan tombol READY dalam 20 detik."
    );
    
    if (!yakin) return;

    PROTAMA.loading("Menyiapkan LEADERBOARD...");
    try {
        const roomRef = doc(window.db || db, "rooms", kode);
        const snap = await getDoc(roomRef);
        let data = snap.data();

        let updates = { status: 'ready_check' };
        
        // Paksa status semua player di database jadi "Belum Ready"
        for (let uid in data.players) {
            updates[`players.${uid}.isReady`] = false;
        }

        await updateDoc(roomRef, updates);
        PROTAMA.close();
    } catch(e) {
        PROTAMA.close();
        PROTAMA.alert("Gagal Mulai", "Error: " + e.message, "error");
    }
};

// Fungsi saat peserta nge-klik tombol "KLIK READY"
window.klikReadyMabar = (kodeRoom) => {
    // 🛑 FIX: Cari data user pake cara super kebal
    let myUser = typeof currentUser !== 'undefined' ? currentUser : window.currentUser;
    const uidGue = myUser ? myUser.uid : null;
    if(!uidGue) return;
    
    try { new Audio('https://www.myinstants.com/media/sounds/button-3.mp3').play(); } catch(e){}

    updateDoc(doc(window.db || db, "rooms", kodeRoom), {
        [`players.${uidGue}.isReady`]: true
    }).catch(e => console.log(e));
};
window.pantauRoom = (kodeRoom) => {
    currentAppMode = 'room';     
    window.currentRoomCode = kodeRoom; 

    let hideBtnStyle = document.getElementById('hide-kembali-mabar');
    if (!hideBtnStyle) {
        hideBtnStyle = document.createElement('style');
        hideBtnStyle.id = 'hide-kembali-mabar';
        hideBtnStyle.innerHTML = `#btnSidebarKembali { display: none !important; }`;
        document.head.appendChild(hideBtnStyle);
    }

    if (window.roomSyncTimer) clearInterval(window.roomSyncTimer);
    if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
    
    // 2. JURUS PAKSAAN MAKSIMAL: CLONING ELEMEN CHAT (PEMBASMI BUG)
    setTimeout(() => {
        const chatInp = document.getElementById('chatInput');
        const chatBtn = document.querySelector('#roomChatContainer button'); 
        
        if (chatInp) {
            chatInp.removeAttribute('onkeypress');
            chatInp.removeAttribute('disabled');
            const newChatInp = chatInp.cloneNode(true); 
            chatInp.parentNode.replaceChild(newChatInp, chatInp); 
            
            newChatInp.addEventListener('keydown', (e) => {
                e.stopPropagation(); 
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.kirimPesanChat();
                }
            });
        }
        if (chatBtn) {
            chatBtn.removeAttribute('onclick');
            chatBtn.removeAttribute('disabled');
            const newChatBtn = chatBtn.cloneNode(true);
            chatBtn.parentNode.replaceChild(newChatBtn, chatBtn);
            
            newChatBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.kirimPesanChat();
            });
        }
        
        let unfreezeChat = document.getElementById('chat-kebal-style');
        if(!unfreezeChat) {
            unfreezeChat = document.createElement('style');
            unfreezeChat.id = 'chat-kebal-style';
            unfreezeChat.innerHTML = `#roomChatContainer, #roomChatContainer * { pointer-events: auto !important; }`;
            document.head.appendChild(unfreezeChat);
        }
    }, 1000);

    // ========================================================
    // 🏆 FUNGSI RENDER LIVE SCORE (PINDAH KE KANAN & TAMPIL SEMUA)
    // ========================================================
    window.renderLiveScore = (playersObj) => {
        const oldContainer = document.getElementById('liveScoreContainer');
        if (oldContainer) oldContainer.remove();

        let rightLb = document.getElementById('rightSidebarLeaderboard');
        if (!rightLb) {
            const navGrid = document.getElementById('navGrid');
            const sidebarRight = document.querySelector('.sidebar-right');
            
            const lbHtml = `
            <div id="rightSidebarLeaderboard" style="display:none; width: 100%; padding: 5px 10px; margin-top: 15px;">
                <h4 style="text-align:center; color:#1565c0; border-bottom:2px solid #1565c0; padding-bottom:8px; margin-bottom:15px; font-weight:bold; font-size:1rem;">
                    <i class="fas fa-trophy" style="color:#f1c40f;"></i> Klasemen Sementara
                </h4>
                <div id="liveLeaderboardList" style="display:flex; flex-direction:column; gap:8px; max-height: 480px; overflow-y:auto; padding-right:5px;"></div>
            </div>`;
            
            if (navGrid) {
                navGrid.insertAdjacentHTML('afterend', lbHtml);
            } else if (sidebarRight) {
                sidebarRight.insertAdjacentHTML('beforeend', lbHtml);
            } else {
                return;
            }
            
            rightLb = document.getElementById('rightSidebarLeaderboard');
        }

        const listContainer = document.getElementById('liveLeaderboardList');
        if (!listContainer) return;

        let arr = Object.values(playersObj);
        arr.sort((a,b) => (b.skor || 0) - (a.skor || 0)); 

        let html = '';
        
        arr.forEach((p, i) => { 
            let medal = i===0 ? '🥇' : (i===1 ? '🥈' : (i===2 ? '🥉' : `<span style="color:#7f8c8d; font-weight:bold; font-size:0.85rem; min-width:22px; display:inline-block; text-align:center;">#${i+1}</span>`));
            
            let namaDepan = p.nama.split(" ")[0]; 
            let isMe = (window.currentUser && p.nama === window.currentUser.displayName) ? 'font-weight:bold; color:#1565c0;' : 'color:#333; font-weight:600;';
            let bgRow = (window.currentUser && p.nama === window.currentUser.displayName) ? 'background:#e3f2fd; border-color:#90caf9;' : 'background:white; border-color:#e0e0e0;';
            let skorTampil = Math.round(p.skor || 0);

            let isUdahJawab = p.jawabanSekarang !== null && p.jawabanSekarang !== undefined;
            let statusIcon = isUdahJawab ? '<i class="fas fa-check-circle" style="color:#2ecc71;" title="Sudah Jawab"></i>' : '<i class="fas fa-spinner fa-spin" style="color:#95a5a6;" title="Mikir..."></i>';

            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; padding:8px 12px; ${bgRow} border-radius:6px; border-width:1px; border-style:solid; font-size:0.85rem; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                    <div style="display:flex; align-items:center; gap:8px;">
                        ${medal} 
                        <span style="${isMe} text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:100px;">${namaDepan}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-weight:900; color:#e67e22;">${skorTampil} <small style="font-size:0.6rem; color:#888;">Pts</small></span>
                        ${statusIcon}
                    </div>
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
    };

// 🛑 INI DIA NYAWA FIREBASE YANG KEHAPUS! KITA KEMBALIKAN:
    if (typeof roomListenerUnsubscribe !== 'undefined' && roomListenerUnsubscribe) roomListenerUnsubscribe();
    const roomRef = doc(window.db || db, "rooms", kodeRoom); 
    
    roomListenerUnsubscribe = onSnapshot(roomRef, async (snap) => {
        if (!snap.exists()) {
            alert("Room telah dibubarkan oleh Host.");
            return window.keluarDariRoom();
        }
        
        const data = snap.data();
        
        // 👇 OBAT PIKUN: Simpan data terbaru ke global memori biar timer selalu update
        window.latestRoomData = data; 
        
        let myUser = typeof currentUser !== 'undefined' ? currentUser : window.currentUser;
        let myUid = myUser ? myUser.uid : null;

        // 🛑 FIX BUG 1: GLOBAL KICK DETECTION (KEBAL BYPASS)
        if (myUid && data.players && !data.players[myUid]) {
            // Kalau namaku tiba-tiba hilang dari database pas room udah mulai jalan
            if (data.status === 'ready_check' || data.status === 'soal' || data.status === 'pembahasan') {
                const overlayReady = document.getElementById('readyCheckOverlay');
                if (overlayReady) overlayReady.remove();
                
                PROTAMA.alert("KELUAR!", "Kamu KELUAR OTOMATIS dari Room karena tidak klik Ready.", "error");
                if (roomListenerUnsubscribe) roomListenerUnsubscribe();
                return window.keluarDariRoom(); // 🛑 BLOKIR TOTAL AKSES SOAL!
            }
        }

        // ========================================================
        // 👑 1. SISTEM TRANSFER HOST (ZOOM-STYLE DENGAN STRATA VIP)
        // ========================================================
        if (data.players && data.hostUid) {
            const hostMasihAda = data.players[data.hostUid];
            
            if (!hostMasihAda) {
                const sisaPemain = Object.keys(data.players);
                if (sisaPemain.length > 0 && window.currentUser && sisaPemain.includes(window.currentUser.uid)) {
                    sisaPemain.sort(); 
                    const myIndex = sisaPemain.indexOf(window.currentUser.uid);
                    
                    let delayClaim = window.isVIPUser ? (myIndex * 1500) : 6000 + (myIndex * 1500);
                    
                    if (window.hostClaimTimer) clearTimeout(window.hostClaimTimer);
                    
                    window.hostClaimTimer = setTimeout(() => {
                        console.log("Mengambil alih posisi Host...");
                        updateDoc(roomRef, { hostUid: window.currentUser.uid }).then(() => {
                            if (typeof PROTAMA !== 'undefined') {
                                PROTAMA.alert('Sistem Host Berpindah!', 'Host terputus. Karena otoritas akunmu, kamu kini dialihkan menjadi Host.', 'success');
                            }
                        }).catch(e => console.log("Gagal klaim host:", e));
                    }, delayClaim);
                }
            } else {
                if (window.hostClaimTimer) {
                    clearTimeout(window.hostClaimTimer);
                    window.hostClaimTimer = null;
                }
            }
        }

        // ========================================================
        // 🧹 2. PEMBERSIH LAYAR BUAT YANG TELAT JOIN (RECONNECT BUG)
        // ========================================================
        if (data.status === 'soal' || data.status === 'pembahasan') {
            const navGrid = document.getElementById('navGrid');
            if (navGrid) navGrid.innerHTML = ''; 
            
            const welcomeBanner = document.querySelector('.welcome-banner');
            if (welcomeBanner) welcomeBanner.style.display = 'none';

            const lobbySb = document.getElementById('lobbySidebarContent');
            const examSb = document.getElementById('examSidebarContent');
            if (lobbySb) lobbySb.style.setProperty('display', 'none', 'important');
            if (examSb) examSb.style.setProperty('display', 'flex', 'important');
            
            const qText = document.getElementById('questionText');
            if (qText && qText.innerHTML.includes('Riwayat')) { 
                 qText.innerHTML = `
                    <div style="text-align:center; padding:50px; background:white; border-radius:10px;">
                        <i class="fas fa-sync fa-spin fa-3x" style="color:#1565c0; margin-bottom:20px;"></i><br>
                        <h3 style="color:#1565c0;">Menyinkronkan Sesi...</h3>
                        <p>Kamu bergabung di pertengahan jalan. Menunggu Host beralih ke soal berikutnya agar layar sinkron.</p>
                    </div>`;
            }
        }
        
        const finishContainer = document.querySelector('.finish-container');
        if (finishContainer) {
            if (data.status === 'waiting' || data.status === 'pembahasan') {
                finishContainer.style.display = 'none'; 
            } else if (data.status === 'ujian') {
                finishContainer.style.display = 'block'; 
            }
        }
        
        const amIHost = (window.currentUser && data.hostUid === window.currentUser.uid);
        const chatContainer = document.getElementById('roomChatContainer');
        const modulContainer = document.getElementById('modulSidebarContainer');
        
        if (chatContainer && modulContainer) {
            modulContainer.style.display = 'none'; 
            chatContainer.style.display = 'flex';  
            
            chatContainer.style.pointerEvents = 'auto';
            const cInput = document.getElementById('chatInput');
            if (cInput) cInput.style.pointerEvents = 'auto';

            if (data.players) window.renderLiveScore(data.players);

            if (data.messages) {
                let myJoinTime = sessionStorage.getItem(`join_time_${kodeRoom}`);
                if (!myJoinTime) {
                    myJoinTime = new Date().toISOString();
                    sessionStorage.setItem(`join_time_${kodeRoom}`, myJoinTime);
                }
                const filteredMessages = data.messages.filter(m => m.waktu >= myJoinTime);
                window.renderChatMessages(filteredMessages);
            }
        }
        
        // --- A. WAITING ROOM ---
        if (data.status === 'waiting') {
            const listEl = document.getElementById('listPesertaRoom');
            const countEl = document.getElementById('countPeserta');
            if (listEl && data.players) {
                listEl.innerHTML = '';
                let count = 0;
                for (let uid in data.players) {
                    count++;
                    let p = data.players[uid];
                    let icon = uid === data.hostUid ? '👑' : '👤'; 
                    listEl.innerHTML += `<li style="padding:8px 0; border-bottom:1px solid #eee; font-weight:bold; color:#333;">${icon} ${p.nama}</li>`;
                }
                if (countEl) countEl.innerText = count;
            }
        }
        
     // --- B. FASE READY CHECK (ALA ML/PUBG) ---
        else if (data.status === 'ready_check') {
            let bgOverlay = document.getElementById('readyCheckOverlay');
            if (!bgOverlay) {
                bgOverlay = document.createElement('div');
                bgOverlay.id = 'readyCheckOverlay';
                bgOverlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.92); z-index:9999999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-family:'Poppins', sans-serif; backdrop-filter:blur(5px);";
                document.body.appendChild(bgOverlay);
            }

            const uidGue = myUid; // Ngambil variabel anti-error dari atas
            if(!uidGue) return;

            const isGueReady = data.players[uidGue].isReady === true;
            let totalPemain = Object.keys(data.players).length;
            let totalReady = Object.values(data.players).filter(p => p.isReady).length;
            
            // 👇 FIX BUG 2: CEK KESIAPAN DI LUAR TIMER BIAR HOST LANGSUNG MASUK SOAL
            let amIHost = (data.hostUid === uidGue);
            if (amIHost && totalReady === totalPemain && totalPemain > 0) {
                if (window.hostReadyTimerInterval) {
                    clearInterval(window.hostReadyTimerInterval);
                    window.hostReadyTimerInterval = null;
                }
                updateDoc(roomRef, { status: 'soal', currentIdx: 0 });
                return; // Langsung hajar masuk soal!
            }

            let htmlDaftarPemain = '<div style="margin-top: 30px; width: 100%; max-width: 400px; max-height: 250px; overflow-y: auto; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 10px; border: 1px solid rgba(255,255,255,0.1);">';
            
            for (let uid in data.players) {
                let p = data.players[uid];
                let iconMahkota = (data.hostUid === uid) ? '<i class="fas fa-crown" style="color:var(--gold); margin-right:5px;" title="Host"></i>' : '';
                let statusSiap = p.isReady ? 
                    `<span style="color:#2ecc71; font-weight:bold; font-size:0.85rem;"><i class="fas fa-check-circle"></i> SIAP</span>` : 
                    `<span style="color:#f1c40f; font-weight:bold; font-size:0.85rem; animation: blinkWait 1s infinite;"><i class="fas fa-spinner fa-spin"></i> MENUNGGU</span>`;

                htmlDaftarPemain += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div style="text-align: left; font-size: 0.95rem; font-weight: 500;">
                            ${iconMahkota}${p.nama}
                        </div>
                        <div>${statusSiap}</div>
                    </div>
                `;
            }
            htmlDaftarPemain += '</div>';

            let currentTimerVal = "20";
            let existingTimerEl = document.getElementById('readyTxtCountdown');
            if (existingTimerEl) currentTimerVal = existingTimerEl.innerText;

            bgOverlay.innerHTML = `
                <div style="animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); text-align:center; display: flex; flex-direction: column; align-items: center; width: 100%; padding: 20px;">
                    <h1 style="font-size:3.5rem; color:var(--gold); margin-bottom:5px; text-shadow: 0 0 25px rgba(241,196,15,0.6); font-weight:900;">SESSION READY!</h1>
                    <p style="font-size:1.2rem; margin-bottom:20px; color:#aaa;">Menunggu peserta siap... <b style="color:white;">(${totalReady}/${totalPemain})</b></p>
                    <div style="font-size:5rem; font-weight:900; color:#e74c3c; margin-bottom:30px; text-shadow: 0 0 30px rgba(231,76,60,0.6); font-variant-numeric: tabular-nums;" id="readyTxtCountdown">${currentTimerVal}</div>
                    ${isGueReady ?
                        `<button style="background:#27ae60; color:white; border:none; padding:15px 50px; font-size:1.5rem; font-weight:bold; border-radius:30px; box-shadow: 0 0 20px rgba(39,174,96,0.6); cursor:not-allowed;" disabled><i class="fas fa-check-circle"></i> SUDAH SIAP</button>`
                        :
                        `<button onclick="window.klikReadyMabar('${kodeRoom}')" style="background:#3498db; color:white; border:none; padding:15px 50px; font-size:1.5rem; font-weight:bold; border-radius:30px; box-shadow: 0 0 20px rgba(52,152,219,0.6); cursor:pointer; transition:0.3s; animation: pulseReady 1s infinite;"><i class="fas fa-bolt"></i> READY!</button>`
                    }
                    ${htmlDaftarPemain}
                </div>
                <style>
                    @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                    @keyframes pulseReady { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
                    @keyframes blinkWait { 50% { opacity: 0.3; } }
                </style>
            `;

            // 🛑 SISTEM TIMER KICK (Penyakit pikun udah diobatin)
            if (amIHost && !window.hostReadyTimerInterval) {
                let sisaWaktu = 20;
                window.hostReadyTimerInterval = setInterval(() => {
                    sisaWaktu--;
                    const txt = document.getElementById('readyTxtCountdown');
                    if (txt) txt.innerText = sisaWaktu;

                    if (sisaWaktu <= 0) {
                        clearInterval(window.hostReadyTimerInterval);
                        window.hostReadyTimerInterval = null;

                        // 👇 PAKAI DATA TERBARU DARI MEMORI GLOBAL 👇
                        let latestData = window.latestRoomData; 
                        let pemainValid = {};
                        for (let uid in latestData.players) {
                            if (latestData.players[uid].isReady) {
                                pemainValid[uid] = latestData.players[uid]; 
                            }
                        }
                        updateDoc(roomRef, {
                            players: pemainValid,
                            status: 'soal',
                            currentIdx: 0
                        });
                    }
                }, 1000);
            }
            else if (!amIHost && !window.clientReadyTimerInterval) {
                let sisaWaktuClient = 20;
                window.clientReadyTimerInterval = setInterval(() => {
                    sisaWaktuClient--;
                    const txt = document.getElementById('readyTxtCountdown');
                    if (txt) txt.innerText = sisaWaktuClient;
                    if (sisaWaktuClient <= 0) {
                        clearInterval(window.clientReadyTimerInterval);
                        window.clientReadyTimerInterval = null;
                    }
                }, 1000);
            }
        }
       // --- C. MENJAWAB SOAL (TIMER 30 DETIK) ---
        else if (data.status === 'soal') {
            
            // 👇 PEMBERSIH LAYAR READY CHECK 👇
            const overlayReady = document.getElementById('readyCheckOverlay');
            if (overlayReady) overlayReady.remove();
            if (window.hostReadyTimerInterval) { clearInterval(window.hostReadyTimerInterval); window.hostReadyTimerInterval = null; }
            if (window.clientReadyTimerInterval) { clearInterval(window.clientReadyTimerInterval); window.clientReadyTimerInterval = null; }
            
            currentAppMode = 'room'; 
            window.activePembahasanIdx = -1; 
            
            isSubmitted = false;
            window.isSubmitted = false;
            
            // 🛑 FIX KRISIS IDENTITAS HOST: Deteksi pakai cara kebal!
            let myUser = typeof currentUser !== 'undefined' ? currentUser : window.currentUser;
            let gueBeneranHost = (myUser && data.hostUid === myUser.uid);

            if (!currentQuestions || currentQuestions.length === 0 || window.currentDatabaseId !== data.modulId) {
                if (typeof PROTAMA !== 'undefined') PROTAMA.loading("Menyiapkan Ruang Ujian...");
                if (typeof window.switchDatabase === 'function') await window.switchDatabase(data.modulId); 
                if (typeof PROTAMA !== 'undefined') PROTAMA.close();
            }
            
            const modeInd = document.getElementById('modeIndicator');
            if (modeInd) {
                modeInd.innerText = "Mode: Room Multiplayer";
                modeInd.style.background = "#e3f2fd";
                modeInd.style.color = "#1565c0";
            }

            const fNav = document.querySelector('.footer-nav');
            if (fNav) { fNav.style.setProperty('display', 'flex', 'important'); fNav.style.visibility = 'visible'; }
            const qHead = document.querySelector('.question-header');
            if (qHead) { qHead.style.setProperty('display', 'flex', 'important'); qHead.style.visibility = 'visible'; }

            const qText = document.getElementById('questionText');
            const isWaitingRoomUI = qText ? qText.innerHTML.includes('WAITING ROOM') : false;

            if (window.activeRoomIdx !== data.currentIdx || isWaitingRoomUI) {
                window.activeRoomIdx = data.currentIdx;
                isAnswerLocked = false; 
                window.sedangAutoSkip = false; 
                
                const oldBadge = document.getElementById('roomBadgeKhusus');
                if (oldBadge) oldBadge.remove();
                const fbBox = document.getElementById('feedbackBox');
                if (fbBox) { 
                    fbBox.style.setProperty('display', 'none', 'important'); 
                    fbBox.classList.remove('show'); 
                }
                
                loadQuestion(data.currentIdx);
                currentIdx = parseInt(data.currentIdx);
                
                if (window.roomSyncTimer) clearInterval(window.roomSyncTimer);
                
                let sisaWaktuRoom = 45; 
                
                const setLayarTimer = (detik) => {
                    let txt = "00:00:" + String(detik).padStart(2, '0');
                    let t1 = document.getElementById('timerDisplay');
                    let t2 = document.getElementById('floatingTimer');
                    
                    let colorClass = 'timer-green';
                    if(detik <= 10) colorClass = 'timer-panic';
                    else if(detik <= 20) colorClass = 'timer-yellow';

                    if (t1) { t1.innerText = txt; t1.className = 'timer-container ' + colorClass; }
                    if (t2) { t2.innerText = txt; t2.className = colorClass; }
                };
                
                setLayarTimer(sisaWaktuRoom); 
                
                window.roomSyncTimer = setInterval(() => {
                    sisaWaktuRoom--;
                    if (sisaWaktuRoom >= 0) setLayarTimer(sisaWaktuRoom);
                    
                    if (sisaWaktuRoom <= 0) {
                        clearInterval(window.roomSyncTimer);
                        // 👇 CEK OTORITAS HOST PAS WAKTU HABIS 👇
                        if (gueBeneranHost) { 
                            updateDoc(roomRef, { status: 'pembahasan' }).catch(e => console.log(e));
                        } else {
                            let t1 = document.getElementById('timerDisplay');
                            let t2 = document.getElementById('floatingTimer');
                            if(t1) { t1.innerText = "MENUNGGU HOST..."; t1.className = 'timer-container timer-panic'; }
                            if(t2) { t2.innerText = "MENUNGGU HOST..."; t2.className = 'timer-panic'; }
                        }
                    }
                }, 1000);

                const pBtn = document.getElementById('prevBtn');
                const nBtn = document.getElementById('nextBtn');
                const rWrap = document.querySelector('.ragu-wrapper');
                if (pBtn) pBtn.style.display = 'none';
                if (nBtn) nBtn.style.display = 'none';
                if (rWrap) rWrap.style.display = 'none';
                
                document.querySelectorAll('.nav-btn, .modul-btn, .btn-action, .btn-finish').forEach(btn => {
                    if (!btn.closest('#roomChatContainer')) {
                        btn.style.pointerEvents = 'none';
                        btn.style.opacity = '0.4';
                    }
                });

                // 🛑 OBAT ISSUE 1 (LAG/BUG BEBERAPA DETIK)
                setTimeout(() => {
                    const opsiElements = document.querySelectorAll('#optionsContainer .option-label');
                    opsiElements.forEach((el, i) => {
                        el.onclick = (e) => {
                            e.preventDefault();
                            if (isAnswerLocked) return;
                            isAnswerLocked = true;
                            
                            el.style.background = "#fff9c4"; 
                            el.innerHTML += ' ⏳ (Menunggu Waktu Habis...)';
                            
                            userAnswers[currentIdx] = i;
                            let uidSekarang = myUser ? myUser.uid : null;
                            if (uidSekarang) {
                                updateDoc(roomRef, { [`players.${uidSekarang}.jawabanSekarang`]: i });
                            }
                        };
                    });
                }, 300);
            }

            if (data.players) {
                if (typeof window.renderLiveScore === 'function') {
                    window.renderLiveScore(data.players);
                }
                let totalPeserta = 0;
                let yangSudahJawab = 0;
                for (let uid in data.players) {
                    totalPeserta++;
                    if (data.players[uid].jawabanSekarang !== null && data.players[uid].jawabanSekarang !== undefined) {
                        yangSudahJawab++;
                    }
                }

                let txtProgress = document.getElementById('progressText');
                if (txtProgress) txtProgress.innerText = `Menjawab: ${yangSudahJawab} / ${totalPeserta}`;

                // 👇 CEK AUTO SKIP DENGAN VARIABEL HOST YANG BENAR 👇
                if (totalPeserta > 0 && yangSudahJawab === totalPeserta && gueBeneranHost) {
                    if (!window.sedangAutoSkip) {
                        window.sedangAutoSkip = true; 
                        if (window.roomSyncTimer) clearInterval(window.roomSyncTimer); 
                        setTimeout(() => {
                            updateDoc(roomRef, { status: 'pembahasan' }).catch(e => console.log(e));
                        }, 1000); // Ngasih jeda 1 detik biar puas liat kuningnya sebelum skip
                    }
                }
            }
        } // Penutup blok soal
            
       // --- D. PEMBAHASAN BARENG & HITUNG POIN OTOMATIS ---
        else if (data.status === 'pembahasan') {
            if (window.roomSyncTimer) clearInterval(window.roomSyncTimer); 
            
            if (window.activePembahasanIdx !== data.currentIdx) {
                window.activePembahasanIdx = data.currentIdx;
                isAnswerLocked = true;
                
                if (!currentQuestions || currentQuestions.length === 0) return;
                const q = currentQuestions[data.currentIdx];
                if (!q) return;

                // 🛑 FIX KRISIS IDENTITAS JILID 2: Deteksi User yang Kebal Bug
                let myUser = typeof currentUser !== 'undefined' ? currentUser : window.currentUser;
                let myUid = myUser ? myUser.uid : null;
                let gueBeneranHost = (myUser && data.hostUid === myUid);

                if (!myUid) return;

                const jawabanGue = data.players && data.players[myUid] ? data.players[myUid].jawabanSekarang : null;
                
                // 🏆 LOGIKA LIVE SCORE
                if (jawabanGue === q.answer) {
                    if (window.lastScoredIdx !== data.currentIdx) {
                        window.lastScoredIdx = data.currentIdx;
                        let bobotSoal = 100 / currentQuestions.length; 
                        let skorSekarang = parseFloat(data.players[myUid].skor || 0);
                        updateDoc(roomRef, {
                            [`players.${myUid}.skor`]: skorSekarang + bobotSoal
                        }).catch(e => console.log(e));
                    }
                } else {
                    window.lastScoredIdx = data.currentIdx; 
                }

                if (jawabanGue === null || jawabanGue === undefined) {
                    userAnswers[data.currentIdx] = -1; 
                }

                const opsiElements = document.querySelectorAll('#optionsContainer .option-label');
                opsiElements.forEach((el, i) => {
                    el.style.pointerEvents = 'none'; 
                    el.innerHTML = el.innerHTML.replace(' ⏳ (Menunggu Waktu Habis...)', '');
                    
                    if (i === q.answer) {
                        el.classList.add('review-correct');
                        if (!el.innerHTML.includes('✅')) el.innerHTML += ' ✅ (Kunci Jawaban)';
                    } else if (jawabanGue !== null && i === jawabanGue) {
                        el.classList.add('review-wrong');
                        if (!el.innerHTML.includes('❌')) el.innerHTML += ' ❌ (Jawabanmu Salah)';
                    } else if (jawabanGue === null || jawabanGue === -1) {
                        el.style.opacity = '0.5';
                    }
                });

                const fb = document.getElementById('feedbackBox');
                if (fb) {
                    fb.style.setProperty('display', 'block', 'important');
                    fb.style.setProperty('visibility', 'visible', 'important');
                    fb.classList.add('show');
                    
                    let fText = document.getElementById('feedbackText');
                    if (fText) {
                        if (jawabanGue === null || jawabanGue === undefined || jawabanGue === -1) {
                            fText.innerHTML = "<b style='color:red; font-size:1.1rem;'>❌ WAKTU HABIS! ANDA TIDAK MENJAWAB (DIANGGAP SALAH)</b><br><br>" + (q.explanation || "-");
                        } else {
                            fText.innerHTML = q.explanation || "Tidak ada pembahasan spesifik.";
                        }
                    }
                    const fCite = document.getElementById('feedbackCite');
                    if (fCite) fCite.innerText = "Sumber: " + (q.cite || "-");
                }

                if (jawabanGue === null || jawabanGue === undefined || jawabanGue === -1) {
                    const optContainer = document.getElementById('optionsContainer');
                    if (optContainer && !document.getElementById('warningTidakJawab')) {
                        const warningBox = document.createElement('div');
                        warningBox.id = 'warningTidakJawab';
                        warningBox.style.cssText = "background:#ffebee; color:#c62828; padding:10px; border-radius:6px; font-weight:bold; text-align:center; margin-bottom:15px; border:2px dashed #ef9a9a;";
                        warningBox.innerHTML = "❌ KAMU TIDAK MENJAWAB (JAWABAN DIANGGAP SALAH)";
                        optContainer.prepend(warningBox);
                    }
                }

                let oldBadge = document.getElementById('roomBadgeKhusus');
                if (oldBadge) oldBadge.remove();

                const badgeHtml = document.createElement('div');
                badgeHtml.id = 'roomBadgeKhusus';
                badgeHtml.style.cssText = "margin-top:20px; padding:15px; background:#e3f2fd; border-radius:8px; text-align:center; border:2px dashed #90caf9;";
                
                // 👇 PASTIKAN HOST DAPET KENDALI "LANJUT SOAL" 👇
                if (gueBeneranHost) {
                    badgeHtml.innerHTML = `
                        <div style="margin-bottom:10px; font-weight:bold; color:#1565c0;">Kendali Host: Silakan baca pembahasan, lalu klik Lanjut.</div>
                        <button id="btnNextHostRoom" style="background:#1565c0; color:white; padding:12px 20px; border:none; border-radius:6px; font-size:1.1rem; cursor:pointer; font-weight:bold; width:100%; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            Lanjut Soal Berikutnya ➔
                        </button>
                    `;
                } else {
                    badgeHtml.innerHTML = `<b style="color:#1565c0; font-size:1.2rem;">⏳ Menunggu Host melanjutkan ujian...</b>`;
                }
                
                const optContForBadge = document.getElementById('optionsContainer');
                if (optContForBadge && optContForBadge.parentNode) {
                    optContForBadge.parentNode.appendChild(badgeHtml);
                }

                if (gueBeneranHost) {
                    const btnNextHost = document.getElementById('btnNextHostRoom');
                    if (btnNextHost) {
                        btnNextHost.onclick = function() {
                            this.innerText = "Memuat soal berikutnya...";
                            this.disabled = true;
                            this.style.background = "#9e9e9e";
                            
                            let nextIndex = parseInt(data.currentIdx) + 1; 
                            if (nextIndex < currentQuestions.length) {
                                let updates = { status: 'soal', currentIdx: nextIndex };
                                if (data.players) {
                                    for (let uid in data.players) {
                                        updates[`players.${uid}.jawabanSekarang`] = null;
                                    }
                                }
                                updateDoc(roomRef, updates).catch(e=>console.log(e));
                            } else {
                                updateDoc(roomRef, { status: 'selesai' }).catch(e=>console.log(e));
                            }
                        };
                    }
                }
            }
        }
        
       // --- E. SELESAI ---
        else if (data.status === 'selesai') {
            // 👇 1. SAPU BERSIH SEMUA TIMER MABAR BIAR GA BERAT 👇
            if (window.roomSyncTimer) clearInterval(window.roomSyncTimer);
            if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
            if (window.hostReadyTimerInterval) clearInterval(window.hostReadyTimerInterval);
            if (window.clientReadyTimerInterval) clearInterval(window.clientReadyTimerInterval);
            
            // 👇 2. BERSIHKAN OVERLAY READY (Jaga-jaga kalau nyangkut) 👇
            const overlayReady = document.getElementById('readyCheckOverlay');
            if (overlayReady) overlayReady.remove();

            window.currentAppMode = 'ujian'; 

            let oldBadge = document.getElementById('roomBadgeKhusus');
            if (oldBadge) oldBadge.remove();

            document.querySelectorAll('.nav-btn, .modul-btn, .btn-action, .btn-finish').forEach(btn => {
                btn.style.pointerEvents = 'auto';
                btn.style.opacity = '1';
            });
            
            // Putus koneksi pantauan Firebase biar hemat kuota/memori
            if (roomListenerUnsubscribe) roomListenerUnsubscribe();
            
            // Blokir Pop-up UI Singleplayer
            const popUpBiasa = document.getElementById('resultOverlay');
            if (popUpBiasa) popUpBiasa.style.setProperty('display', 'none', 'important');
            
            // Eksekusi perhitungan nilai di balik layar
            if (typeof window.submitQuiz === 'function') {
                window.isSubmitted = true; // Bypass kalau ada sistem cegat di submitQuiz
                window.submitQuiz(); 
            }
            
            // Tampilkan Podium Juara Mabar!
            if (typeof window.tampilkanHasilMultiplayer === 'function') {
                window.tampilkanHasilMultiplayer(kodeRoom);
            }
        }
    }); // 👈 Penutup fungsi onSnapshot
}; // 👈 Penutup fungsi window.pantauRoom
// ==========================================================
// FUNGSI INJEKSI TOMBOL KELUAR ROOM DI HASIL UJIAN
// ==========================================================
window.tampilkanTombolKeluarRoom = function() {
    if (document.getElementById('btnKeluarRoomMode')) return; // Biar ga dobel
    
    // Cari wadah tombol-tombol di pop up hasil
    const divTombol = document.querySelector('#resultOverlay .result-box > div:last-of-type');
    
    if (divTombol) {
        const btnOut = document.createElement('button');
        btnOut.id = 'btnKeluarRoomMode';
        btnOut.innerHTML = '<i class="fas fa-sign-out-alt"></i> Keluar Mode Multiplayer';
        btnOut.style.cssText = 'width:100%; background:#d32f2f; color:white; border:none; padding:12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:1rem; transition:0.3s; display:flex; align-items:center; justify-content:center; gap:10px; margin-top:5px;';
        
        btnOut.onclick = () => window.keluarDariRoom();
        divTombol.appendChild(btnOut);
    }
};

window.tampilkanLobby = function() {
    let hideBtnStyle = document.getElementById('hide-kembali-mabar');
    if (hideBtnStyle) hideBtnStyle.remove();
    // 🛑 3. PENGAMANAN LAPIS DUA SAAT MASUK LOBBY
    window.isAnswerLocked = false;
    window.isReviewMode = false;
    
    // Hancurkan ulang DOM untuk memastikan bersih 100%
    const navGrid = document.getElementById('navGrid');
    if (navGrid) navGrid.innerHTML = ''; 
    const optContainer = document.getElementById('optionsContainer');
    if (optContainer) optContainer.innerHTML = ''; 
    const fbBox = document.getElementById('feedbackBox');
    if (fbBox) fbBox.style.display = 'none';
    const tDisp = document.getElementById('timerDisplay');
    if (tDisp) tDisp.innerText = "00:00:00";

    document.querySelector('.question-header').style.visibility = 'hidden';
    document.querySelector('.footer-nav').style.visibility = 'hidden';
    
    const examSide = document.getElementById('examSidebarContent');
    if(examSide) examSide.style.display = 'none';

    const lobbySide = document.getElementById('lobbySidebarContent');
    if(lobbySide) lobbySide.style.display = 'flex'; 

    const qText = document.getElementById('questionText');
    const namaPanggilan = currentUser ? currentUser.displayName.split(" ")[0] : "Peserta";

   qText.innerHTML = `
        <div style="padding: 20px; max-width: 800px; margin: 0 auto; animation: fadeIn 0.5s;">
            <div style="text-align: center; margin-bottom: 25px;">
                <div style="font-size: 3.5rem; margin-bottom: 10px;">👋</div>
                <h2 style="color: var(--primary); margin-bottom: 5px; font-weight: 800;">Halo, ${namaPanggilan}! Siap Latihan?</h2>
                <p style="font-size: 1.05rem; color: #666;">
                    Silahkan klik menu modul di kiri, atau pilih Tryout Live di bawah.
                </p>
            </div>

            <div style="background: white; border: 1px solid #eaeaea; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.04);">
                
                <!-- TOMBOL TAB NAVIGASI -->
                <div style="display: flex; background: #fafafa;">
                    <button onclick="window.switchTabLobby('jadwal')" id="btnTabJadwal" style="flex: 1; padding: 15px; border: none; border-bottom: 3px solid var(--primary); background: transparent; color: var(--primary); font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.3s;">
                        <i class="fas fa-calendar-alt"></i> Jadwal Tryout Live
                    </button>
                    <button onclick="window.switchTabLobby('riwayat')" id="btnTabRiwayat" style="flex: 1; padding: 15px; border: none; border-bottom: 1px solid #ddd; background: transparent; color: #666; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.3s;">
                        <i class="fas fa-history"></i> Riwayat Tes
                    </button>
                </div>

                <!-- ISI TAB 1: JADWAL -->
                <div id="tabJadwal" style="padding: 20px; display: block;">
                    <div id="listJadwalTryout" style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="text-align: center; padding: 20px;">
                            <i class="fas fa-circle-notch fa-spin" style="font-size: 1.5rem; color: #ddd;"></i>
                            <p style="color: #999; margin-top: 10px; font-size: 0.9rem;">Memuat jadwal dari server...</p>
                        </div>
                    </div>
                </div>

                <!-- ISI TAB 2: RIWAYAT (Sembunyi dulu di awal) -->
                <div id="tabRiwayat" style="padding: 20px; display: none;">
                    <div style="text-align: right; margin-bottom: 15px;">
                        <button onclick="window.openStats('hukum')" style="background: #e3f2fd; border: none; color: var(--primary); cursor: pointer; font-weight: bold; font-size: 0.85rem; padding: 8px 15px; border-radius: 6px;">
                            <i class="fas fa-chart-bar"></i> Lihat Detail Statistik
                        </button>
                    </div>
                    <div id="tableLobbyContainer" style="overflow-x: auto;">
                        <div style="text-align: center; padding: 30px;">
                            <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: #ddd;"></i>
                            <p style="color: #999; margin-top: 10px; font-size: 0.9rem;">Memuat riwayat belajar...</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
        <style>@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }</style>
    `;

    // BONGKAR SEMUA GEMBOK SIDEBAR KIRI SAAT MASUK LOBBY
    document.querySelectorAll('.modul-btn').forEach(el => {
        el.classList.remove('active-modul');
        el.disabled = false;             
        el.style.pointerEvents = 'auto'; 
        el.style.opacity = '1';          
    });

    // BONGKAR GEMBOK TOMBOL KANAN ATAS
    document.querySelectorAll('.action-box button, .act-exit, .btn-action').forEach(btn => {
        btn.disabled = false;
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
    });

    if(typeof window.loadRiwayatLobby === 'function') setTimeout(window.loadRiwayatLobby, 500);
    if(typeof window.loadJadwalLobby === 'function') window.loadJadwalLobby();
}
// ==========================================
// FUNGSI GANTI TAB LOBBY
// ==========================================
window.switchTabLobby = function(tab) {
    document.getElementById('tabJadwal').style.display = tab === 'jadwal' ? 'block' : 'none';
    document.getElementById('tabRiwayat').style.display = tab === 'riwayat' ? 'block' : 'none';
    
    const btnJadwal = document.getElementById('btnTabJadwal');
    const btnRiwayat = document.getElementById('btnTabRiwayat');
    
    if (tab === 'jadwal') {
        btnJadwal.style.color = 'var(--primary)';
        btnJadwal.style.borderBottom = '3px solid var(--primary)';
        btnRiwayat.style.color = '#666';
        btnRiwayat.style.borderBottom = '1px solid #ddd';
    } else {
        btnRiwayat.style.color = 'var(--primary)';
        btnRiwayat.style.borderBottom = '3px solid var(--primary)';
        btnJadwal.style.color = '#666';
        btnJadwal.style.borderBottom = '1px solid #ddd';
    }
};
// ========================================================
// 🏆 FUNGSI KLASEMEN AKHIR MABAR (LAYOUT PRO & EXCEL VIP)
// ========================================================
window.tampilkanHasilMultiplayer = async (kodeRoom) => {
    try {
        const popUpBiasa = document.getElementById('resultOverlay');
        if (popUpBiasa) popUpBiasa.style.setProperty('display', 'none', 'important');

        const roomRef = doc(window.db || db, "rooms", kodeRoom);
        const snap = await getDoc(roomRef);
        if (!snap.exists()) return;
        
        const data = snap.data();
        let arr = Object.values(data.players);
        
        arr.sort((a, b) => (b.skor || 0) - (a.skor || 0));

        let bgOverlay = document.getElementById('kahootResultOverlay');
        if (bgOverlay) bgOverlay.remove();

        bgOverlay = document.createElement('div');
        bgOverlay.id = 'kahootResultOverlay';
        bgOverlay.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(20, 30, 48, 0.95); z-index:2147483647; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:'Poppins', sans-serif; backdrop-filter:blur(10px); overflow-y:auto; padding: 20px; box-sizing: border-box; margin:0;";

        let p1 = arr[0] || null;
        let p2 = arr[1] || null;
        let p3 = arr[2] || null;

        // 🛑 FUNGSI PODIUM DENGAN FOTO GOOGLE & FALLBACK INISIAL
        const buatPodium = (player, posisi, tinggi, warna, ikon, delay) => {
            if (!player) return `<div class="podium-kosong" style="width:140px;"></div>`;
            
            let namaPendek = player.nama.split(" ")[0]; 
            let skor = Math.round(player.skor || 0);
            let isMe = window.currentUser && player.nama === window.currentUser.displayName;
            let badgeKamu = isMe ? '<div class="me-badge">KAMU</div>' : '';
            
            let fotoUser = player.photoURL || (isMe ? window.currentUser.photoURL : null);
            let urlFoto = fotoUser ? fotoUser : `https://ui-avatars.com/api/?name=${encodeURIComponent(namaPendek)}&background=random&color=fff&bold=true&size=150`;

            return `
            <div class="podium-wrapper" style="animation: slideUp 0.8s ease ${delay}s backwards;">
                <div class="podium-avatar" style="border: 4px solid ${warna}; background: #fff;">
                    <img src="${urlFoto}" referrerpolicy="no-referrer" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                </div>
                ${badgeKamu}
                <div class="podium-name">${namaPendek}</div>
                <div class="podium-score">${skor} Pts</div>
                <div class="podium-block" style="height:${tinggi}px; background:linear-gradient(to top, ${warna}, #ffffff33); border-top: 4px solid ${warna};">
                    <span class="podium-rank">${ikon}</span>
                </div>
            </div>`;
        };

        let htmlTop3 = `
            <div class="podium-container">
                ${buatPodium(p2, 2, 160, '#bdc3c7', '2', 0.2)} 
                ${buatPodium(p1, 1, 220, '#f1c40f', '1', 0.4)} 
                ${buatPodium(p3, 3, 120, '#e67e22', '3', 0)}   
            </div>
        `;

        let htmlSisaPemain = '';
        if (arr.length > 3) {
            htmlSisaPemain += `
            <div class="other-players-list">
                <table style="width:100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="background:#e0e0e0; color:#555; font-size:0.9rem;">
                            <th style="padding:10px; border-radius:8px 0 0 0;">Rank</th>
                            <th style="padding:10px;">Peserta</th>
                            <th style="padding:10px; text-align:right; border-radius:0 8px 0 0;">Skor</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            for (let i = 3; i < arr.length; i++) {
                let p = arr[i];
                let isMe = window.currentUser && p.nama === window.currentUser.displayName;
                let bgRow = isMe ? 'background: #e3f2fd; border-left: 4px solid #3498db;' : 'background: white; border-left: 4px solid transparent;';
                
                let fotoUserSisa = p.photoURL || (isMe ? window.currentUser.photoURL : null);
                let urlFotoSisa = fotoUserSisa ? fotoUserSisa : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nama.split(" ")[0])}&background=random&color=fff&bold=true&size=50`;

                htmlSisaPemain += `
                    <tr style="${bgRow} border-bottom: 1px solid #f0f0f0;">
                        <td style="padding:12px 10px; font-weight:bold; color:#7f8c8d;">${i + 1}</td>
                        <td style="padding:12px 10px; display:flex; align-items:center; font-weight:600; color:#2c3e50;">
                            <img src="${urlFotoSisa}" referrerpolicy="no-referrer" style="width:30px; height:30px; border-radius:50%; object-fit:cover; margin-right:10px; border:1px solid #ddd;">
                            ${p.nama} ${isMe ? '<span style="color:#3498db; font-size:0.8rem; margin-left:5px;">(Kamu)</span>' : ''}
                        </td>
                        <td style="padding:12px 10px; text-align:right; font-weight:bold; color:#e67e22;">${Math.round(p.skor || 0)} <small style="color:#888;">Pts</small></td>
                    </tr>
                `;
            }
            htmlSisaPemain += `</tbody></table></div>`;
        }

        let botMessageText = `🎉 HASIL MULTIPLAYER [ROOM: ${kodeRoom}] 🎉\n`;
        arr.forEach((p, i) => {
            let skorBot = Math.round(p.skor || 0);
            if (i < 3) {
                let simpleMedal = i === 0 ? '🥇' : (i === 1 ? '🥈' : '🥉');
                botMessageText += `${simpleMedal} ${p.nama} (${skorBot} Pts)\n`;
            }
        });
        botMessageText += `Selamat untuk para pemenang! Silakan saling review pembahasan.`;

        // 🛑 JURUS LOGIKA VIP UNTUK DOWNLOAD EXCEL EVALUASI (SINKRON DENGAN GATEKEEPER) 🛑
        window.triggerDownloadVIP = () => {
            let isUserVip = false;
            
            // 1. Cek dari variabel global Gatekeeper lu (isVIPUser)
            if (window.isVIPUser === true) {
                isUserVip = true;
            }
            
            // 2. Cek dari status Host (Host room bebas download)
            if (window.isHost) {
                isUserVip = true;
            }

            // 3. Cek dari class body (Kalau body punya class 'is-admin', berarti dia Admin/Editor)
            if (document.body.classList.contains('is-admin')) {
                isUserVip = true;
            }

            if (isUserVip) {
                if(typeof window.downloadEvaluasiPesertaExcel === 'function') {
                    window.downloadEvaluasiPesertaExcel();
                } else {
                    alert("Fungsi Excel Evaluasi belum dimuat!");
                }
            } else {
                if(typeof PROTAMA !== 'undefined' && PROTAMA.alert) {
                    PROTAMA.alert("VIP Only 👑", "Fitur Download Evaluasi & Pembahasan Soal hanya untuk Member VIP. Upgrade akunmu sekarang!", "warning");
                } else if(typeof Swal !== 'undefined') {
                    Swal.fire("VIP Only 👑", "Fitur Download Evaluasi & Pembahasan Soal hanya untuk Member VIP.", "warning");
                } else {
                    alert("🔒 Akses Terkunci!\nFitur Download Evaluasi khusus Member VIP, Silahkan Hubungi Admin.");
                }
            }
        };

        bgOverlay.innerHTML = `
            <div class="result-card" style="z-index:2147483648;">
                <div style="position: absolute; top: 20px; left: 20px; display: flex; flex-direction: column; gap: 5px; text-align: left;">
                    <div style="background: rgba(52, 152, 219, 0.1); color: #2980b9; padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9rem; border: 1px solid rgba(52, 152, 219, 0.3);">
                        <i class="fas fa-door-open" style="margin-right: 5px;"></i> Room: ${kodeRoom}
                    </div>
                    <div style="background: rgba(46, 204, 113, 0.1); color: #27ae60; padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9rem; border: 1px solid rgba(46, 204, 113, 0.3);">
                        <i class="fas fa-users" style="margin-right: 5px;"></i> Peserta: ${arr.length}
                    </div>
                </div>

                <button id="btnPlaySoundManual" style="display:none; position:absolute; top:20px; right:20px; background:#f39c12; color:white; border:none; padding:8px 15px; border-radius:20px; font-weight:bold; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.2); animation: pulseReady 1s infinite;"><i class="fas fa-volume-up"></i> Putar Musik</button>

                <h1 class="result-title"><i class="fas fa-trophy"></i> LEADERBOARD <i class="fas fa-trophy"></i></h1>
                
                ${htmlTop3}
                ${htmlSisaPemain}

                <div class="result-actions">
                    <button class="btn-review" onclick="window.reviewHasilMabar()"><i class="fas fa-search"></i> Review Jawaban</button>
                    <!-- 👉 TOMBOL EVALUASI VIP 👈 -->
                    <button onclick="window.triggerDownloadVIP()" style="background: #2c3e50; color: white; border: 2px solid #f1c40f; padding: 12px 25px; border-radius: 30px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.4);"><i class="fas fa-crown" style="color:#f1c40f;"></i> Evaluasi (VIP)</button>
                    <!-- ================================ -->
                    <button class="btn-tutup" onclick="document.getElementById('kahootResultOverlay').style.display='none'"><i class="fas fa-times"></i> Tutup & Kembali</button>
                </div>
            </div>

            <style>
                @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                @keyframes pulseReady { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

                .result-card { 
                    background: #ffffff; 
                    width: 100%; 
                    max-width: 850px; 
                    border-radius: 20px; 
                    padding: 40px 40px 30px 40px; 
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5); 
                    animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
                    position: relative; 
                    margin: auto; 
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 30px; 
                }
                
                .result-title { font-size: 2.2rem; color: #2c3e50; font-weight: 900; margin: 0; padding-top: 15px; text-transform: uppercase; text-align: center; }
                .podium-container { display: flex; justify-content: center; align-items: flex-end; gap: 15px; height: 280px; border-bottom: 3px solid #eee; margin: 0; width: 100%; }
                .podium-wrapper { display: flex; flex-direction: column; align-items: center; width: 140px; position: relative; }
                .podium-block { width: 100%; border-radius: 10px 10px 0 0; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 15px; box-shadow: inset 0 -10px 20px rgba(0,0,0,0.1); }
                .podium-rank { font-size: 4rem; font-weight: 900; color: rgba(255,255,255,0.9); text-shadow: 0 4px 10px rgba(0,0,0,0.2); font-family: 'Arial Black', sans-serif; }
                .podium-avatar { width: 80px; height: 80px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; box-shadow: 0 8px 15px rgba(0,0,0,0.15); margin-bottom: -40px; z-index: 10; padding:3px; overflow:hidden;}
                .podium-name { background: white; padding: 4px 15px; border-radius: 20px; font-weight: 800; color: #333; margin-bottom: 5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 10; font-size: 1.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; border: 1px solid #eee; }
                .podium-score { font-weight: 700; color: #555; margin-bottom: 15px; z-index: 10; background: rgba(255,255,255,0.8); padding: 2px 8px; border-radius: 10px;}
                .me-badge { position: absolute; top: -25px; background: #e74c3c; color: white; font-size: 0.75rem; font-weight: bold; padding: 4px 10px; border-radius: 15px; z-index: 11; box-shadow: 0 2px 6px rgba(231,76,60,0.4); border: 2px solid white;}
                .other-players-list { width: 100%; max-height: 220px; overflow-y: auto; background: #f8f9fa; border-radius: 12px; padding: 5px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.05); }
                .result-actions { display: flex; justify-content: center; gap: 15px; margin-top: 10px; width: 100%; }
                .result-actions button { padding: 12px 25px; border: none; border-radius: 30px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.3s; }
                .btn-review { background: #3498db; color: white; box-shadow: 0 4px 15px rgba(52,152,219,0.4); }
                .btn-review:hover { background: #2980b9; transform: translateY(-2px); }
                .btn-tutup { background: #e74c3c; color: white; box-shadow: 0 4px 15px rgba(231,76,60,0.4); }
                .btn-tutup:hover { background: #c0392b; transform: translateY(-2px); }

                @media (max-width: 600px) {
                    .podium-wrapper { width: 90px; }
                    .podium-rank { font-size: 2rem; }
                    .result-card { padding: 20px; border-radius: 10px; gap: 20px; }
                    .result-title { font-size: 1.5rem; padding-top: 40px; }
                    .podium-avatar { width: 60px; height: 60px; margin-bottom: -30px;}
                    .podium-name { font-size: 0.9rem;}
                }
            </style>
        `;

        document.body.appendChild(bgOverlay);

        const jalankanKembangApi = () => {
            let durasi = 5 * 1000;
            let animationEnd = Date.now() + durasi;
            let defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2147483649 };

            function randomInRange(min, max) { return Math.random() * (max - min) + min; }
            let interval = setInterval(function() {
                let timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                let particleCount = 50 * (timeLeft / durasi);
                window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
                window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
            }, 250);
        };

        if (!window.confetti) {
            let script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
            script.onload = jalankanKembangApi;
            document.head.appendChild(script);
        } else {
            jalankanKembangApi();
        }

// 🛑 JURUS AUDIO ANTI-BLOKIR (PAKAI FILE GITHUB SENDIRI) 🛑
        try {
            // Panggil file MP3 lokal yang udah lu upload di folder yang sama
            const audioUrl = './menang.mp3'; 
            
            const victorySound = new Audio(audioUrl);
            victorySound.volume = 0.8; 
            
            let playPromise = victorySound.play();
            
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay diblokir Chrome. Menunggu klik manual user...");
                    const btnAudio = document.getElementById('btnPlaySoundManual');
                    if (btnAudio) {
                        btnAudio.style.display = 'block'; // Munculkan tombol oranye
                        
                        btnAudio.onclick = () => {
                            // Tembak audio baru tepat saat diklik
                            const manualSound = new Audio(audioUrl);
                            manualSound.volume = 0.8;
                            manualSound.play().catch(err => console.log("Klik manual gagal:", err));
                            
                            // Sembunyikan tombol setelah diklik
                            btnAudio.style.display = 'none'; 
                        };
                    }
                });
            }
        } catch(e) { console.error("Error Sistem Audio:", e); }

        // Kuncian jawaban fisik awal saat Mabar berlangsung
        window.isAnswerLocked = true;

        document.querySelectorAll('.action-box button, .act-exit, .btn-finish').forEach(btn => {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.4';
        });

        // 🛑 FLOATING MENU UNTUK REVIEW DAN DOWNLOAD 🛑
        let floatMenu = document.getElementById('roomFloatingMenu');
        if (!floatMenu) {
            floatMenu = document.createElement('div');
            floatMenu.id = 'roomFloatingMenu';
            floatMenu.style.cssText = "position:fixed; bottom:20px; right:20px; display:flex; flex-direction:column; gap:10px; z-index:9999999; pointer-events:auto !important;";

            const btnRank = document.createElement('button');
            btnRank.innerHTML = '<i class="fas fa-trophy"></i> Lihat Podium';
            btnRank.style.cssText = "background:var(--gold); color:#333; font-weight:bold; padding:12px 20px; border-radius:30px; border:none; box-shadow:0 4px 10px rgba(0,0,0,0.3); cursor:pointer; transition:0.2s; pointer-events:auto !important;";
            btnRank.onclick = () => { 
                const resO = document.getElementById('kahootResultOverlay');
                if(resO) {
                    resO.style.display = 'flex'; 
                    resO.style.pointerEvents = 'auto';
                }
            };

            // 👉 TOMBOL EVALUASI VIP DI FLOATING MENU 👈
            const btnCsv = document.createElement('button');
            btnCsv.innerHTML = '<i class="fas fa-crown" style="color:#f1c40f;"></i> Evaluasi (VIP)';
            btnCsv.style.cssText = "background:#2c3e50; color:white; font-weight:bold; padding:12px 20px; border-radius:30px; border: 2px solid #f1c40f; box-shadow:0 4px 10px rgba(0,0,0,0.3); cursor:pointer; transition:0.2s; pointer-events:auto !important;";
            btnCsv.onclick = window.triggerDownloadVIP;

            const btnExit = document.createElement('button');
            btnExit.innerHTML = '<i class="fas fa-sign-out-alt"></i> Keluar Room';
            btnExit.style.cssText = "background:#c0392b; color:white; font-weight:bold; padding:12px 20px; border-radius:30px; border:none; box-shadow:0 4px 10px rgba(0,0,0,0.3); cursor:pointer; transition:0.2s; pointer-events:auto !important;";
            btnExit.onclick = window.konfirmasiKeluarRoom;

            floatMenu.appendChild(btnRank);
            floatMenu.appendChild(btnCsv); // Pasang btnCsv ke layar
            floatMenu.appendChild(btnExit);
            document.body.appendChild(floatMenu);
        }
        
        const amIHost = (window.currentUser && data.hostUid === window.currentUser.uid);
        if (amIHost) {
            setTimeout(async () => {
                try {
                    const roomDBRef = doc(window.db || db, "rooms", kodeRoom);
                    await updateDoc(roomDBRef, {
                        messages: arrayUnion({
                            uid: window.currentUser.uid,
                            nama: "🤖 PRO-BOT (Sistem)",
                            teks: botMessageText,
                            waktu: new Date().toISOString()
                        })
                    });
                } catch (e) {
                    console.error("Gagal mengirim pengumuman Bot:", e);
                }
            }, 1500);
        }

      // 🛑 JURUS BUKA GEMBOK SIDEBAR (VERSI PERMANEN ANTI-PUCAT) 🛑
        window.reviewHasilMabar = () => {
            // 1. SEMBUNYIKAN layar podium Kahoot
            const bgOverlay = document.getElementById('kahootResultOverlay');
            if (bgOverlay) bgOverlay.style.display = 'none';

            // 2. Eksekusi fungsi review bawaan sistem
            const btnReviewReal = document.querySelector('.btn-action[onclick*="showReview()"]');
            if (btnReviewReal) btnReviewReal.click();

            // 3. BERSIHKAN RAM BROWSER (Matikan interval lama jika masih nyangkut)
            if (window.dobrakInterval) clearInterval(window.dobrakInterval);

            // 4. JURUS PENDOBRAK PERMANEN (Jalan terus tanpa batas waktu)
            window.dobrakInterval = setInterval(() => {
                window.isAnswerLocked = false;

                const popUpBiasa = document.getElementById('resultOverlay');
                if (popUpBiasa) popUpBiasa.style.setProperty('display', 'none', 'important');

                // Buka wadah utama sidebar kanan 
                document.querySelectorAll('.sidebar-right, .nav-container, .nav-grid').forEach(el => {
                    el.style.setProperty('pointer-events', 'auto', 'important');
                });
                
                // 👉 NOMOR SOAL (1, 2, 3) DIPAKSA NYALA TERUS-MENERUS
                document.querySelectorAll('.nav-btn').forEach(btn => {
                    if (btn.disabled) {
                        btn.disabled = false;
                        btn.removeAttribute('disabled');
                    }
                    btn.style.setProperty('pointer-events', 'auto', 'important');
                    btn.style.setProperty('cursor', 'pointer', 'important');
                    btn.style.setProperty('opacity', '1', 'important'); 
                });

                // 👉 TOMBOL AKSI ATAS (Admin, Peringkat, Keluar) TETAP DIPAKSA MATI
                document.querySelectorAll('.right-header button, .action-box button, .act-exit, .btn-finish').forEach(btn => {
                    if (!btn.disabled) {
                        btn.disabled = true;
                        btn.setAttribute('disabled', 'true');
                    }
                    btn.style.setProperty('pointer-events', 'none', 'important');
                    btn.style.setProperty('opacity', '0.4', 'important');
                });

                // Pastikan menu melayang VIP & Podium tetap kebal
                const floatM = document.getElementById('roomFloatingMenu');
                if (floatM) {
                    floatM.style.setProperty('pointer-events', 'auto', 'important');
                    floatM.style.setProperty('opacity', '1', 'important');
                }

                // Gak ada lagi batas waktu (dobrakCount dihapus), sistem jalan terus ngebantah kuncian bawaan
            }, 500); // Dieksekusi tiap 0.5 detik
        };

    } catch (e) {
        console.error("Gagal memuat hasil mabar:", e);
    }
}; // INI TUTUP KURUNG UTAMA FUNGSI

// ==========================================================
// 📥 DOWNLOAD HASIL EVALUASI PESERTA KE EXCEL (FIXED & AMAN)
// ==========================================================
window.downloadEvaluasiPesertaExcel = function() {
    // 1. Tangkap variabel bawaan sistem lu secara aman (tanpa maksa pakai window.)
    const soalUjian = typeof currentQuestions !== 'undefined' ? currentQuestions : window.currentQuestions;
    const jawabanUser = typeof userAnswers !== 'undefined' ? userAnswers : window.userAnswers;

    // Pastikan data soal ada
    if (!soalUjian || soalUjian.length === 0) {
        return alert("Data evaluasi tidak tersedia. Selesaikan ujian dulu ya bro!");
    }

    // 2. Fungsi Helper untuk membersihkan tag HTML (<p>, <br>, dll) 
    // biar teks rapi dan gak ngerusak susunan cell/tabel Excel
    const bersihkanHTML = (teks) => {
        if (!teks) return "-";
        let div = document.createElement("div");
        div.innerHTML = teks;
        return div.textContent || div.innerText || "";
    };

    const namaPeserta = window.currentUser ? window.currentUser.displayName : "Peserta";
    const modul = (window.currentDatabaseId || "Latihan").toUpperCase();
    
    let tableHTML = `
        <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
            <meta charset="UTF-8">
            <style>
                td { vertical-align: top; padding: 5px; }
            </style>
        </head>
        <body>
            <h3>LEMBAR HASIL EVALUASI UJIAN - PRO-TAMA</h3>
            <p><b>Nama Peserta:</b> ${namaPeserta}<br>
            <b>Modul:</b> ${modul}<br>
            <b>Tanggal:</b> ${new Date().toLocaleString('id-ID')}</p>
            <table border="1" style="border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #004d00; color: white;">
                        <th>No</th>
                        <th>Pertanyaan</th>
                        <th>Jawaban Anda</th>
                        <th>Kunci Jawaban</th>
                        <th>Status</th>
                        <th>Pembahasan</th>
                        <th>Dasar Hukum</th>
                    </tr>
                </thead>
                <tbody>`;

    soalUjian.forEach((q, i) => {
        // Ambil data jawaban user dan kunci jawaban
        const ansUserIdx = jawabanUser ? jawabanUser[i] : null;
        const ansKunciIdx = q.answer;
        
        // Cek teks opsinya (kalo kosong atau gak kejawab kasih tanda)
        const teksUser = (ansUserIdx !== null && ansUserIdx !== undefined && q.options) ? q.options[ansUserIdx] : "(Tidak Dijawab)";
        const teksKunci = (q.options && q.options[ansKunciIdx]) ? q.options[ansKunciIdx] : "-";
        
        const isBenar = ansUserIdx === ansKunciIdx;
        const status = isBenar ? "BENAR" : "SALAH";
        const warnaRow = isBenar ? "#e8f5e9" : "#ffebee"; // Hijau muda buat benar, merah muda buat salah

        // Masukkan ke baris tabel (HTML-nya dibersihkan dulu)
        tableHTML += `
            <tr style="background-color: ${warnaRow};">
                <td style="text-align:center;">${i + 1}</td>
                <td>${bersihkanHTML(q.q)}</td>
                <td>${bersihkanHTML(teksUser)}</td>
                <td>${bersihkanHTML(teksKunci)}</td>
                <td style="text-align:center; font-weight:bold; color:${isBenar ? 'green' : 'red'};">${status}</td>
                <td>${bersihkanHTML(q.explanation)}</td>
                <td>${bersihkanHTML(q.cite)}</td>
            </tr>`;
    });

    tableHTML += `</tbody></table></body></html>`;

    // 3. Eksekusi Download 
    // Tambahin BOM '\uFEFF' biar karakter spesial (Arab, Simbol Hukum) gak error di Excel
    const blob = new Blob(['\uFEFF' + tableHTML], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Bikin nama file rapi, tanpa spasi
    a.download = `Hasil_Evaluasi_${modul}_${namaPeserta.replace(/\s+/g, '_')}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};
// ==========================================
// FUNGSI KONFIRMASI & BERSIH-BERSIH ROOM
// ==========================================
window.konfirmasiKeluarRoom = async () => {
    const yakin = await PROTAMA.confirm(
        "KELUAR ROOM?", 
        "Yakin mau keluar? Kamu tidak bisa melihat pembahasan lagi setelah keluar ke menu utama."
    );
    if (yakin) {
        window.tutupHasilMultiplayer();
    }
};

window.tutupHasilMultiplayer = () => {
    // 1. Hapus pop up hasil
    const overlay = document.getElementById('roomResultOverlay');
    if (overlay) overlay.remove();
    
    // 2. Hapus tumpukan tombol di kanan bawah
    const floatMenu = document.getElementById('roomFloatingMenu');
    if (floatMenu) floatMenu.remove();
    
    // 3. Lepas gembok panel kanan atas (Singleplayer)
    document.querySelectorAll('.action-box button, .act-exit, .btn-finish').forEach(btn => {
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
    });

    // 🛑 4. BERSIHKAN CSS ANTI-FREEZE SAAT KELUAR ROOM (Agar mode biasa kembali normal)
    const unfreezeStyle = document.getElementById('review-unfreeze');
    if (unfreezeStyle) unfreezeStyle.remove();

    // 5. Proses keluar seutuhnya
    window.keluarDariRoom();
};

window.loadRiwayatLobby = async () => {
    const container = document.getElementById('tableLobbyContainer');
    if (!container || !currentUser || !db) return;

    try {
        const q = query(
            collection(db, "riwayat_belajar"),
            where("uid", "==", currentUser.uid),
            orderBy("timestamp", "desc"),
            limit(5)
        );
        
        const snap = await getDocs(q);

        if (snap.empty) {
            container.innerHTML = `
                <div style="text-align:center; padding: 30px 0; color: #999;">
                    <i class="fas fa-clipboard-list" style="font-size: 2rem; margin-bottom: 10px; color: #e0e0e0;"></i>
                    <br>Belum ada riwayat tes.<br>Yuk mulai simulasi pertamamu!
                </div>`;
            return;
        }

        let tableHTML = `
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <thead>
                    <tr style="background-color: #f9fbf9; color: #555; text-align: left;">
                        <th style="padding: 12px; border-bottom: 2px solid #eee; border-radius: 8px 0 0 0;">Tanggal</th>
                        <th style="padding: 12px; border-bottom: 2px solid #eee;">Modul</th>
                        <th style="padding: 12px; border-bottom: 2px solid #eee; text-align: center;">Skor</th>
                        <th style="padding: 12px; border-bottom: 2px solid #eee; text-align: center; border-radius: 0 8px 0 0;">Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        snap.forEach(doc => {
            const d = doc.data();
            const isLulus = d.score >= 70; 
            const colorScore = isLulus ? 'var(--success)' : 'var(--danger)';
            
            const statusBadge = isLulus 
                ? '<span style="background:#e8f5e9; color:#2e7d32; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:bold; letter-spacing: 0.5px;">LULUS</span>' 
                : '<span style="background:#ffebee; color:#c62828; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:bold; letter-spacing: 0.5px;">GAGAL</span>';
            
            const modulName = (d.modul || "").replace('modul', 'Modul ').toUpperCase();
            
            const tanggalPendek = d.date ? d.date.split(' ')[0] : '-';

            tableHTML += `
                <tr style="border-bottom: 1px solid #f4f4f4; transition: background 0.2s;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px; color: #666;">${tanggalPendek}</td>
                    <td style="padding: 12px; font-weight: 600; color: #333;">${modulName}</td>
                    <td style="padding: 12px; text-align: center; font-weight: 800; color: ${colorScore}; font-size: 1rem;">${d.score}</td>
                    <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;

    } catch (e) {
        console.error("Error load riwayat lobby:", e);
        container.innerHTML = '<p style="color:red; text-align:center; padding: 20px;">Gagal memuat riwayat. Pastikan internet lancar.</p>';
    }
};

setTimeout(() => { 
    if(window.loadLobbyData) window.loadLobbyData(); 
}, 800); 

window.openAdminPanel = () => {
    // 1. Munculkan overlay admin
    document.getElementById('adminOverlay').style.display = 'flex';
    // --- Bikin Tombol Kembali (Injeksi) ---
    const adminBox = document.querySelector('#adminOverlay .modal-content');
    if (adminBox && !document.getElementById('btnKembaliMenuAdmin')) {
        // Bungkus tombol Navigasi dan Status ke dalam grup biar gampang disembunyiin
        const navDiv = document.querySelector('#adminOverlay button[onclick*="tambah"]').parentNode;
        navDiv.id = 'adminNavButtons';
        const statusDiv = document.querySelector('#adminOverlay').querySelectorAll('div')[1]; // asumsi teks status
        statusDiv.classList.add('admin-status-bar');

        const btnBack = document.createElement('button');
        btnBack.id = 'btnKembaliMenuAdmin';
        btnBack.className = 'btn-back-menu';
        btnBack.innerHTML = '<i class="fas fa-arrow-left"></i> Kembali ke Menu Admin';
        btnBack.onclick = () => window.resetAdminMenu();
        
        // Taruh di bawah judul "Panel Admin CBT"
        adminBox.insertBefore(btnBack, adminBox.children[1]); 
    }
    
    // Pastikan pas baru buka, tampilannya adalah "Menu"
    window.resetAdminMenu();

    // 2. Cek apakah user saat ini adalah Editor (Bukan Super Admin)
    const isSuper = ADMIN_EMAILS.includes(currentUser.email);
    const isEditUser = typeof EDITOR_EMAILS !== 'undefined' && EDITOR_EMAILS.includes(currentUser.email);

    if (isEditUser && !isSuper) {
        console.log("Menjalankan Protokol Sensor Editor...");
        
        setTimeout(() => {
            // A. Sembunyikan Tombol Navigasi yang dilarang
            // (Kata 'upload json' dan 'tambah' sudah DIHAPUS dari daftar blokir di bawah ini)
            const semuaTombolNav = document.querySelectorAll('#adminOverlay button');
            semuaTombolNav.forEach(btn => {
                const teks = btn.innerText.toLowerCase();
                const aksi = (btn.getAttribute('onclick') || '').toLowerCase();
                
                if (teks.includes('radar') || 
                    teks.includes('excel') || teks.includes('backup') || 
                    aksi.includes('status') || aksi.includes('download')) {
                    btn.style.setProperty('display', 'none', 'important');
                }
            });

            // B. Sembunyikan Tombol Maintenance di pojok kanan atas
            const btnMaintenance = document.getElementById('btnToggleMaintenance');
            if (btnMaintenance) btnMaintenance.style.setProperty('display', 'none', 'important');

            // C. Sembunyikan Area Input JSON (Textarea aslinya)
            const idsInput = ['jsonUploadArea', 'adminModulTarget'];
            idsInput.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.setProperty('display', 'none', 'important');
                    if (el.previousElementSibling) el.previousElementSibling.style.setProperty('display', 'none', 'important');
                }
            });
            
            // Sembunyikan tombol eksekusi JSON aslinya
            const btnUploadAksi = document.querySelector('button[onclick*="eksekusiUpload"]');
            if (btnUploadAksi) btnUploadAksi.style.setProperty('display', 'none', 'important');

            // D. BUKA TAB TAMBAH & PAKSA KE MODE MANUAL
            window.switchAdminTab('tambah'); // Langsung arahin ke tab tambah
            
            if (typeof window.setTambahMode === 'function') {
                window.setTambahMode('manual'); // Otomatis aktifkan form manual
            }
            
            // Sembunyikan tombol switch ke JSON biar asisten ga iseng ngeklik
            const btnModeJson = document.getElementById('btnModeJson');
            if (btnModeJson) btnModeJson.style.setProperty('display', 'none', 'important');
            
        }, 100); 
    }
};
// ==========================================================
// FUNGSI BALIK KE MENU ADMIN (TOMBOL MUNCUL SEMUA)
// ==========================================================
window.resetAdminMenu = () => {
    // 1. Sembunyikan Tombol Kembali
    const btnBack = document.getElementById('btnKembaliSakti');
    if(btnBack) btnBack.style.display = 'none';

    // 2. Munculkan SEMUA elemen Navigasi di atas (kecuali tab konten)
    const modalContent = document.querySelector('#adminOverlay .modal-content');
    if (modalContent) {
        Array.from(modalContent.children).forEach(el => {
            const id = el.id || '';
            // Kalau bukan tab dan bukan tombol kembali, TAMPILKAN!
            if (!id.includes('tab') && id !== 'btnKembaliSakti' && el.tagName !== 'H2' && el.tagName !== 'SPAN') {
                el.style.display = ''; // Balikin ke normal (flex/block)
            }
        });
    }

    // 3. Sembunyikan semua isi tab
    const tabs = ['tabTambah', 'tabEdit', 'tabReview', 'tabLaporan', 'tabStatus'];
    tabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
};

// ==========================================================
// FUNGSI SWITCH TAB & MASUK MODE FULL SCREEN (ANTI CACHE)
// ==========================================================
window.switchAdminTab = (tab) => {
    const modalContent = document.querySelector('#adminOverlay .modal-content');
    
    // 1. Paksa Lebarin Layar via JS (Biar lega ngetik soalnya)
    if (modalContent) {
        modalContent.style.width = '95%';
        modalContent.style.maxWidth = '1200px';
    }

    // 2. Sembunyikan SEMUA elemen Navigasi (Biar layar bersih)
    if (modalContent) {
        Array.from(modalContent.children).forEach(el => {
            const id = el.id || '';
            // Sembunyikan semuanya kecuali Judul (H2), Close (SPAN), dan Tab Konten
            if (!id.includes('tab') && id !== 'btnKembaliSakti' && el.tagName !== 'H2' && el.tagName !== 'H3' && el.tagName !== 'SPAN') {
                el.style.display = 'none';
            }
        });
    }

    // 3. Bikin Tombol Kembali Sakti (Kalau belum ada)
    let btnBack = document.getElementById('btnKembaliSakti');
    if (!btnBack) {
        btnBack = document.createElement('button');
        btnBack.id = 'btnKembaliSakti';
        btnBack.innerHTML = '⬅️ KEMBALI KE MENU ADMIN';
        btnBack.style.cssText = "background: #2c3e50; color: #fff; padding: 12px 20px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 20px; width: 100%; text-align: left; font-size: 1.1rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";
        btnBack.onclick = () => window.resetAdminMenu();
        
        // Taruh tepat di bawah judul
        if(modalContent) modalContent.insertBefore(btnBack, modalContent.children[1]);
    }
    btnBack.style.display = 'block';

    // 4. Munculkan hanya tab yang dipilih
    const tabs = ['tabTambah', 'tabEdit', 'tabReview', 'tabLaporan', 'tabStatus'];
    tabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = (id.toLowerCase().includes(tab)) ? 'block' : 'none';
        }
    });

    // 5. --- PEMBUATAN FORM MANUAL (TETAP AMAN DI SINI) ---
    const areaTambah = document.getElementById('tabTambah');
    if (areaTambah && !document.getElementById('switchTambahMode')) {
        const switcher = document.createElement('div');
        switcher.id = 'switchTambahMode';
        switcher.style = "margin-bottom: 15px; background: #eee; padding: 10px; border-radius: 8px; display: flex; gap: 10px;";
        switcher.innerHTML = `
            <button onclick="window.setTambahMode('json')" id="btnModeJson" style="flex:1; padding:8px; border:none; border-radius:5px; cursor:pointer; background:var(--primary); color:white;">Mode JSON (Massal)</button>
            <button onclick="window.setTambahMode('manual')" id="btnModeManual" style="flex:1; padding:8px; border:none; border-radius:5px; cursor:pointer; background:#ddd;">Mode Manual (Satu Soal)</button>
        `;
        areaTambah.insertBefore(switcher, areaTambah.firstChild);

        // Bikin Container Form Manual
        const formManual = document.createElement('div');
        formManual.id = 'formTambahManual';
        formManual.style = "display:none; background:#fff; padding:15px; border:1px solid #ddd; border-radius:8px; margin-bottom:15px;";
        formManual.innerHTML = `
            <div style="margin-bottom:15px; padding:10px; background:#e8f8f5; border-radius:6px; border:1px solid #a3e4d7;">
                <label style="font-weight:bold; color:#16a085;">Ketik Target Modul (Bisa Pakai Cabang):</label>
                <input type="text" id="manModulInput" placeholder="Contoh: modul1 atau modul1.1" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ccc; margin-top:5px; font-weight:bold;">
                <div style="font-size:0.8rem; color:#555; margin-top:4px;">*Ketik ID nyambung kecil semua (misal: <b>modul2.1</b>, <b>modul15.a</b>)</div>
            </div>
            <label>Pertanyaan:</label><textarea id="manQ" style="width:100%; height:80px; margin-bottom:10px; border-radius:4px; border:1px solid #ccc;"></textarea>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div><label>Opsi A:</label><input type="text" id="manOptA" style="width:100%; margin-bottom:10px;"></div>
                <div><label>Opsi B:</label><input type="text" id="manOptB" style="width:100%; margin-bottom:10px;"></div>
                <div><label>Opsi C:</label><input type="text" id="manOptC" style="width:100%; margin-bottom:10px;"></div>
                <div><label>Opsi D:</label><input type="text" id="manOptD" style="width:100%; margin-bottom:10px;"></div>
            </div>
            <label>Kunci Jawaban:</label>
            <select id="manAns" style="width:100%; margin-bottom:10px; padding:5px;">
                <option value="0">Opsi A</option><option value="1">Opsi B</option>
                <option value="2">Opsi C</option><option value="3">Opsi D</option>
            </select>
            <label>Pembahasan:</label><textarea id="manExp" style="width:100%; height:80px; margin-bottom:10px;"></textarea>
            <label>Dasar Hukum/Sumber:</label><input type="text" id="manCite" style="width:100%; margin-bottom:15px;">
            <button onclick="window.simpanSoalManual()" style="width:100%; padding:12px; background:var(--success); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">🚀 SIMPAN SOAL KE DATABASE</button>
        `;
        areaTambah.appendChild(formManual);
    }

    // 6. Khusus asisten, aktifin form manual
    if (tab === 'tambah' && typeof window.setTambahMode === 'function') {
        const isSuper = typeof ADMIN_EMAILS !== 'undefined' && currentUser && ADMIN_EMAILS.includes(currentUser.email);
        if(!isSuper) window.setTambahMode('manual');
    }

    // 7. Auto-load data 
    if (tab === 'laporan' && typeof window.loadLaporanAdmin === 'function') window.loadLaporanAdmin();
    if (tab === 'status' && typeof window.loadStatusAdmin === 'function') window.loadStatusAdmin();
};
    
window.loadReviewPembahasan = async () => {
    const modulId = document.getElementById('reviewModulTarget').value.trim();
    if(!modulId) return alert("Isi ID Modul!");
    
    const container = document.getElementById('containerReview');
    container.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Sabar, lagi narik data...</div>`;
    
    try {
        const qSnap = await getDocs(collection(db, "bank_soal", modulId, "daftar_soal"));
        container.innerHTML = "";
        
        if (qSnap.empty) {
            container.innerHTML = "<p style='color:red; text-align:center;'>Modul tidak ditemukan atau kosong!</p>";
            return;
        }
        
        qSnap.docs.forEach((docSnap, index) => {
            const data = docSnap.data();
            const item = document.createElement('div');
            item.style = "margin-bottom:20px; border-bottom:2px solid #eee; padding-bottom:10px;";
            
            const pembahasan = data.explanation ? data.explanation : "<em style='color:gray'>- Belum ada pembahasan -</em>";
            const sumber = data.cite ? data.cite : "-";

            // --- 1. SIAPIN HTML PILIHAN GANDA ---
            let opsiHtml = `<div style="margin: 10px 0; padding-left: 10px; font-size: 0.95rem;">`;
            if (data.options && Array.isArray(data.options)) {
                data.options.forEach((opt, idx) => {
                    const abjad = String.fromCharCode(65 + idx);
                    const isBenar = (idx == data.answer);
                    const styleBenar = isBenar ? `color: #2e7d32; font-weight: bold; background: #e8f5e9; padding: 4px 8px; border-radius: 4px; display: inline-block;` : `color: #444; padding: 4px 8px; display: inline-block;`;
                    opsiHtml += `<div style="margin-bottom: 5px;"><span style="${styleBenar}">${abjad}. ${opt} ${isBenar ? '✅' : ''}</span></div>`;
                });
            }
            opsiHtml += `</div>`;

            // --- 2. BIKIN TOMBOL AI (CARA AMAN TANPA STRING ONCLICK) ---
            const btnAI = document.createElement('button');
            btnAI.style.cssText = "background: #8e44ad; color: white; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: bold; float: right;";
            btnAI.innerHTML = `<i class="fas fa-robot"></i> Cek AI`;
            
            // Simpan data mentah langsung ke tombolnya (lebih aman dari kutip-kutipan)
            btnAI.onclick = function() {
                // Encode datanya di dalam JS, bukan di dalam HTML
                const qTeksEsc = encodeURIComponent(data.q || "");
                const optStrEsc = encodeURIComponent(JSON.stringify(data.options || []));
                const expEsc = encodeURIComponent(pembahasan);
                const citeEsc = encodeURIComponent(sumber);
                const ansIdx = data.answer;
                
                // Panggil fungsi AI global lu
                window.cekValiditasAI(this, docSnap.id, qTeksEsc, optStrEsc, ansIdx, expEsc, citeEsc);
            };

            // --- 3. BIKIN KERANGKA ITEMNYA ---
            const divHeader = document.createElement('div');
            divHeader.style.cssText = "font-weight:bold; color:var(--primary); margin-bottom:10px; border-bottom: 1px solid #eee; padding-bottom: 8px;";
            divHeader.innerHTML = `Soal No. ${index + 1} `;
            divHeader.appendChild(btnAI); // Tempelin tombol aman lu di sini

            const divContent = document.createElement('div');
            divContent.innerHTML = `
                <p style="margin-top:0;">${data.q}</p>
                ${opsiHtml}
                <div style="background:#f1f8e9; padding:15px; border-radius:8px; border-left:5px solid var(--success); margin-top: 15px;">
                    <strong>💡 Pembahasan:</strong><br>
                    <div style="margin-top:5px; line-height:1.5;">${pembahasan}</div>
                    <div style="margin-top:10px; font-size:0.85rem; color:#666;">
                        <i class="fas fa-book"></i> Sumber: ${sumber}
                    </div>
                </div>
                <div id="ai-result-${docSnap.id}" style="display: none; margin-top: 15px; padding: 12px; background: #f3e5f5; border-left: 4px solid #9b59b6; border-radius: 6px; font-size: 0.9rem; line-height: 1.5;"></div>
            `;

            // Gabungin header dan konten ke item
            item.appendChild(divHeader);
            item.appendChild(divContent);
            container.appendChild(item);
        });
    } catch(e) { 
        container.innerHTML = `<p style="color:red">Error: ${e.message}</p>`;
    }
};
    
window.eksekusiUpload = async () => {
    const modulId = document.getElementById('adminModulTarget').value.trim();
    const jsonRaw = document.getElementById('jsonUploadArea').value;
    
    if(!modulId || !jsonRaw) return alert("Modul ID dan JSON harus diisi!");
    
    try {
        const dataSoal = JSON.parse(jsonRaw);
        if(!Array.isArray(dataSoal)) return alert("Format JSON harus Array [ ... ]");

        if(!confirm(`Siap upload ${dataSoal.length} soal ke ${modulId}?`)) return;

        const batch = writeBatch(db);
        let count = 0;
        let chunks = [];
        let currentBatch = writeBatch(db);
        
        for (const item of dataSoal) {
            const docData = {
                q: item.q || item.pertanyaan,
                options: item.options || [item.opsiA, item.opsiB, item.opsiC, item.opsiD],
                answer: item.answer !== undefined ? item.answer : parseInt(item.kunci), 
                explanation: item.explanation || item.pembahasan || "-",
                cite: item.cite || "Modul Hakim",
                papi_keys: item.papi_keys || [], 
                createdAt: new Date()
            };

            const newDocRef = doc(collection(db, "bank_soal", modulId, "daftar_soal"));
            currentBatch.set(newDocRef, docData);
            count++;

            if (count % 450 === 0) {
                chunks.push(currentBatch);
                currentBatch = writeBatch(db);
            }
        }
        
        if (count % 450 !== 0) chunks.push(currentBatch);
        
        for (let b of chunks) await b.commit();
        
        alert(`✅ Sukses Upload ${count} Soal!`);
        document.getElementById('jsonUploadArea').value = ""; 
        
    } catch (e) {
        alert("Error: " + e.message);
        console.error(e);
    }
};

let currentAdminModul = "";

window.loadSoalAdmin = async () => {
    const modulId = document.getElementById('editModulTarget').value.trim();
    if(!modulId) return alert("Isi nama modul!");
    currentAdminModul = modulId;

    const searchInput = document.getElementById('searchSoalAdmin');
    if(searchInput) searchInput.value = "";

    const listDiv = document.getElementById('listSoalAdmin');
    listDiv.innerHTML = "Loading... (Sedang mengambil data)";

    try {
        const qRef = collection(db, "bank_soal", modulId, "daftar_soal");
        const snapshot = await getDocs(qRef); 

        listDiv.innerHTML = "";
        
        if (snapshot.empty) {
            listDiv.innerHTML = "<p style='padding:10px; color:red'>Zonk! Modul kosong atau ID salah.</p>";
            return;
        }

        let counter = 0;
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const div = document.createElement('div');
            
            // --- INI DIA KUNCI AJAIBNYA BIAR NYALA IJO ---
            div.className = "soal-item-admin"; 
            
            // Style bawaan lu biarin aja, aman.
            div.style.borderBottom = "1px solid #ddd";
            div.style.padding = "8px";
            div.style.cursor = "pointer";
            div.style.fontSize = "0.85rem";
            
            const teksSoal = data.q || data.pertanyaan || "(Soal Tanpa Teks)";
            div.innerText = `${++counter}. ${teksSoal.substring(0, 50)}...`;
            
            div.onclick = () => populateEditForm(docSnap.id, data);
            listDiv.appendChild(div);
        });
        
    } catch (e) {
        console.error(e); 
        alert("Gagal load: " + e.message + "\n\nTips: Cek apakah ID Modul persis sama (huruf besar/kecil)?");
    }
};

function populateEditForm(id, data) {
    document.getElementById('editDocId').value = id;
    document.getElementById('editQ').value = data.q;
    document.getElementById('editOpt').value = data.options.join(", "); 
    document.getElementById('editAns').value = data.answer;
    document.getElementById('editExp').value = data.explanation;
    document.getElementById('editCite').value = data.cite || "";

    // --- INJEKSI KODINGAN LANGKAH 2B (HIGHLIGHT SOAL AKTIF) ---
    // 1. Bersihin dulu warna hijau dari semua soal di daftar
    document.querySelectorAll('#listSoalAdmin div').forEach(el => el.classList.remove('active-soal'));
    
    // 2. Deteksi elemen mana yang baru aja diklik, lalu kasih warna hijau & bold
    if (window.event && window.event.target) {
        let itemSoal = window.event.target.closest('.soal-item-admin');
        // Kalau ketemu div bungkusnya, tembak class active-nya
        if (itemSoal) itemSoal.classList.add('active-soal');
    }
}

window.simpanPerubahan = async () => {
    const id = document.getElementById('editDocId').value;
    if(!id) return alert("Pilih soal dulu!");

    const optionsArray = document.getElementById('editOpt').value.split(",").map(s => s.trim()); 

    const newData = {
        q: document.getElementById('editQ').value,
        options: optionsArray,
        answer: parseInt(document.getElementById('editAns').value),
        explanation: document.getElementById('editExp').value,
        cite: document.getElementById('editCite').value
    };

    try {
        const docRef = doc(db, "bank_soal", currentAdminModul, "daftar_soal", id);
        await updateDoc(docRef, newData);
        alert("✅ Data terupdate!");
        window.loadSoalAdmin(); 
    } catch (e) {
        alert("Gagal update: " + e.message);
    }
};

window.hapusSoal = async () => {
    const id = document.getElementById('editDocId').value;
    if(!id) return alert("Pilih soal dulu!");
    if(!confirm("Yakin mau hapus soal ini permanen?")) return;

    try {
        const docRef = doc(db, "bank_soal", currentAdminModul, "daftar_soal", id);
        await deleteDoc(docRef);
        alert("🗑️ Soal dihapus.");
        window.loadSoalAdmin(); 
        document.getElementById('editDocId').value = "";
        document.getElementById('editQ').value = "";
    } catch (e) {
        alert("Gagal hapus: " + e.message);
    }
};

window.filterSoalAdmin = () => {
    let input = document.getElementById("searchSoalAdmin").value.toLowerCase();
    let listContainer = document.getElementById("listSoalAdmin");
    let itemSoal = listContainer.getElementsByTagName("div"); 

    for (let i = 0; i < itemSoal.length; i++) {
        let teksSoal = itemSoal[i].textContent || itemSoal[i].innerText;
        if (teksSoal.toLowerCase().indexOf(input) > -1) {
            itemSoal[i].style.display = ""; 
        } else {
            itemSoal[i].style.display = "none";
        }
    }
};
// ==========================================
// FUNGSI SHORTCUT EDIT DARI HALAMAN UJIAN
// ==========================================
window.editSoalSekarang = function() {
    const q = currentQuestions[currentIdx];
    
    if (!q || !q.id) {
        PROTAMA.alert("Gagal", "ID Soal tidak ditemukan! Kemungkinan Anda mereview dari riwayat cache lama. Silakan mulai ulang modul baru untuk mengedit.", "error");
        return;
    }
    
    // 1. Isi semua form edit secara otomatis!
    document.getElementById('editDocId').value = q.id;
    document.getElementById('editQ').value = q.q || q.pertanyaan || "";
    document.getElementById('editOpt').value = (q.options || []).join(", ");
    document.getElementById('editAns').value = q.answer;
    document.getElementById('editExp').value = q.explanation || "";
    document.getElementById('editCite').value = q.cite || "";
    
    // 2. Set target modulnya biar gak salah save
    document.getElementById('editModulTarget').value = window.currentDatabaseId;
    currentAdminModul = window.currentDatabaseId; // Wajib diset biar fungsi save nya tau
    
    // 3. Buka Pop-up & Pindah Tab Edit
    window.openAdminPanel();
    window.switchAdminTab('edit');
};

function showMemorizationPhase() {
    const overlay = document.createElement('div');
    overlay.id = "hafalanOverlay";
    overlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:white; z-index:1000000; padding:20px; overflow-y:auto; text-align:center; font-family:'Poppins', sans-serif;";
    
    overlay.innerHTML = `
        <div style="max-width:800px; margin: 20px auto; background:#fff; padding:30px; border-radius:15px; box-shadow:0 10px 30px rgba(0,0,0,0.1); border-top:8px solid var(--primary);">
            <h2 style="color:var(--primary); margin-bottom:10px;">🧠 TAHAP HAFALAN</h2>
            <p style="color:#666;">Hafalkan data di bawah ini dalam waktu <b>3 menit</b>!</p>
            <hr style="border:1px solid #eee; margin:15px 0;">
            
            <div style="background:#f9f9f9; padding:20px; border-radius:10px; display:grid; grid-template-columns: 1fr; text-align:left; font-family:monospace; border:2px solid #ddd; line-height:1.8; font-size:1rem; width:100%; box-sizing:border-box;">
                <b>BUNGA:</b> Dahlia, Flamboyan, Laret, Soka, Yasmin<br>
                <b>PERKAKAS:</b> Cangkul, Jarum, Kikir, Palu, Wajan<br>
                <b>BURUNG:</b> Elang, Itik, Tekukur, Nuri, Walet<br>
                <b>KESENIAN:</b> Arca, Gamelan, Opera, Quintet, Ukiran<br>
                <b>BINATANG:</b> Beruang, Harimau, Rusa, Zebra, Musang
            </div>

            <div id="countdownHafalan" style="font-size:3rem; font-weight:800; color:var(--danger); margin:30px 0;">03:00</div>
            
            <button id="btnSkipHafalan" style="background:var(--success); color:white; border:none; padding:15px 30px; border-radius:8px; cursor:pointer; font-weight:bold; width:100%; font-size:1rem;">
                SAYA SUDAH HAFAL (MULAI TES)
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);

    let timeLeft = 180; 
    const timerText = document.getElementById('countdownHafalan');
    
    window.hafalanCountdown = setInterval(() => {
        timeLeft--;
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerText.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        
        if (timeLeft <= 0) stopHafalanAndStartQuiz();
    }, 1000);

    document.getElementById('btnSkipHafalan').onclick = () => {
        if(confirm("Yakin sudah hafal? Data tidak bisa dilihat kembali saat ujian.")) {
            stopHafalanAndStartQuiz();
        }
    };
}

function stopHafalanAndStartQuiz() {
    clearInterval(window.hafalanCountdown);
    const overlay = document.getElementById('hafalanOverlay');
    if(overlay) overlay.remove();
    
    loadQuestion(0);
    startTimer();
}

window.toggleAccordion = function(groupId, btnElement) {
    const contentDiv = document.getElementById(groupId);
    const iconPanah = btnElement.querySelector('.icon-panah');

    // Cek apakah konten lagi ditutup
    if (contentDiv.style.display === 'none') {
        // Buka konten
        contentDiv.style.display = 'block';
        // Ubah ikon panah ke bawah
        if (iconPanah) {
            iconPanah.classList.remove('fa-chevron-right');
            iconPanah.classList.add('fa-chevron-down');
        }
    } else {
        // Tutup konten
        contentDiv.style.display = 'none';
        // Ubah ikon panah ke kanan
        if (iconPanah) {
            iconPanah.classList.remove('fa-chevron-down');
            iconPanah.classList.add('fa-chevron-right');
        }
    }
}

window.loadLobbyData = async () => {
    const user = auth.currentUser;
    if (!user || !db) return;

    try {
        const qHistory = query(collection(db, "riwayat_belajar"), where("uid", "==", user.uid));
        const snapHistory = await getDocs(qHistory);
        let bestScoresMap = {}; 
        
        snapHistory.forEach(doc => {
            const d = doc.data();
            const nilai = parseInt(d.score) || 0; 
            if (!bestScoresMap[d.modul] || nilai > bestScoresMap[d.modul]) {
                bestScoresMap[d.modul] = nilai;
            }
        });
        const modulesTaken = Object.values(bestScoresMap);
        let avg = 0;
        if (modulesTaken.length > 0) {
            const totalBest = modulesTaken.reduce((a, b) => a + b, 0);
            avg = Math.round(totalBest / modulesTaken.length);
        }
        const txtAvg = document.getElementById('avgScoreText');
        if(txtAvg) txtAvg.innerText = avg;
        const ctx = document.getElementById('lobbyMiniChart');
        if (ctx) {
            if (window.lobbyChartInstance) window.lobbyChartInstance.destroy();
            
            window.lobbyChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Pencapaian', 'Gap'],
                    datasets: [{
                        data: [avg, 100 - avg],
                        backgroundColor: [avg >= 70 ? '#2e7d32' : '#f39c12', '#eeeeee'], 
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true, 
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { 
                        legend: { display: false }, 
                        tooltip: { enabled: false } 
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true,
                        duration: 2000,
                        easing: 'easeOutBounce'
                    }
                }
            });
        }
    } catch (e) { console.error("Err History:", e); }

    try {
        const qLb = query(collection(db, "leaderboard"), orderBy("skor", "desc"), limit(500));
        const snapLb = await getDocs(qLb);
        let userTotals = {}; 
        snapLb.forEach(doc => {
            const d = doc.data();
            const nilai = parseInt(d.skor) || 0; 
            if (!userTotals[d.nama]) userTotals[d.nama] = {};
            if (!userTotals[d.nama][d.modul] || nilai > userTotals[d.nama][d.modul]) {
                userTotals[d.nama][d.modul] = nilai;
            }
        });
        let rankingList = [];
        for (let [nama, modules] of Object.entries(userTotals)) {
            const totalPoints = Object.values(modules).reduce((a, b) => a + b, 0);
            rankingList.push({ nama: nama, total: totalPoints });
        }
        rankingList.sort((a, b) => b.total - a.total);

        const lbContainer = document.getElementById('miniLeaderboardList');
        if (lbContainer) {
            if (rankingList.length === 0) {
                lbContainer.innerHTML = '<small style="color:#999;">Belum ada data.</small>';
            } else {
                let html = '';
                rankingList.slice(0, 3).forEach((u, i) => {
                    let medal = i===0 ? '🥇' : (i===1 ? '🥈' : '🥉');
                    html += `<div class="mini-rank-item"><span class="rank-num">${medal}</span><span class="rank-name">${u.nama}</span><span class="rank-score">${u.total} Pts</span></div>`;
                });
                lbContainer.innerHTML = html;
            }
        }
    } catch (e) { console.error("Err Leaderboard:", e); }
};

window.downloadSoalExcel = async () => {
    const modulId = prompt("Masukkan ID Modul (contoh: modul1, modul8.4):");
    if (!modulId) return;

    alert(`⏳ OTW narik data ${modulId} ke Excel... Tunggu bentar.`);

    try {
        const qRef = collection(window.db, "bank_soal", modulId, "daftar_soal");
        const snapshot = await getDocs(qRef);

        if (snapshot.empty) {
            alert("❌ Zonk! Modul kosong atau salah ID.");
            return;
        }

        let tableHTML = `
            <html xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head><meta charset="UTF-8"></head>
            <body>
                <table border="1">
                    <thead>
                        <tr style="background-color: #4CAF50; color: white;">
                            <th>No</th><th>Soal</th><th>Opsi A</th><th>Opsi B</th><th>Opsi C</th><th>Opsi D</th>
                            <th>Kunci (Angka)</th><th>Kunci (Huruf)</th><th>Pembahasan</th><th>Sumber</th>
                        </tr>
                    </thead>
                    <tbody>`;

        let no = 1;
        snapshot.forEach(doc => {
            const d = doc.data();
            const q = d.q || d.pertanyaan || "";
            const opt = d.options || ["", "", "", ""];
            const ans = d.answer !== undefined ? parseInt(d.answer) : -1;
            const keyChar = ans >= 0 ? String.fromCharCode(65 + ans) : "?";

            tableHTML += `<tr>
                <td>${no++}</td><td>${q}</td>
                <td>${opt[0]||""}</td><td>${opt[1]||""}</td><td>${opt[2]||""}</td><td>${opt[3]||""}</td>
                <td>${ans}</td><td>${keyChar}</td>
                <td>${d.explanation||""}</td><td>${d.cite||""}</td>
            </tr>`;
        });

        tableHTML += `</tbody></table></body></html>`;

        const blob = new Blob([tableHTML], { type: "application/vnd.ms-excel" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `BankSoal_${modulId}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

    } catch (e) {
        console.error(e);
        alert("Gagal download: " + e.message);
    }
};

window.downloadSoalJSON = async () => {
    const modulId = prompt("Masukkan ID Modul untuk Backup JSON (misal: modul1):");
    if (!modulId) return;

    alert(`⏳ Mengambil data RAW JSON dari ${modulId}...`);

    try {
        const qRef = collection(window.db, "bank_soal", modulId, "daftar_soal");
        const snapshot = await getDocs(qRef);

        if (snapshot.empty) {
            alert("❌ Modul kosong bro!");
            return;
        }

        let dataBackup = [];
        
        snapshot.forEach(doc => {
            const d = doc.data();
            delete d.createdAt; 
            dataBackup.push(d);
        });

        const jsonString = JSON.stringify(dataBackup, null, 2);

        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Backup_${modulId}_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        alert("✅ File JSON siap! Bisa langsung di-upload ulang di menu 'Upload JSON' kalau mau revisi massal.");

    } catch (e) {
        console.error(e);
        alert("Gagal download JSON: " + e.message);
    }
};
// ==========================================
// ANTI CHEAT & FUNGSI DETAIL (GABUNG DARI SCRIPT KEDUA)
// ==========================================

// 1. Matikan Klik Kanan
document.addEventListener('contextmenu', event => {
    if (document.body.classList.contains('is-admin')) return; // ADMIN BEBAS
    event.preventDefault();
});

// 2. Matikan Blok/Select Teks
document.addEventListener('selectstart', event => {
    if (document.body.classList.contains('is-admin')) return; // ADMIN BEBAS
    event.preventDefault();
});

document.addEventListener('dragstart', event => {
    if (document.body.classList.contains('is-admin')) return; // ADMIN BEBAS
    event.preventDefault();
});

// 3. Matikan Shortcut Keyboard
document.addEventListener('keydown', function(e) {
    if (document.body.classList.contains('is-admin')) return; // ADMIN BEBAS

    // Cegah F12, Inspect, Copy Paste
    if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') || 
        (e.ctrlKey && e.shiftKey && e.key === 'J') || 
        (e.ctrlKey && e.key === 'u') || 
        (e.ctrlKey && e.key === 'U') || 
        (e.ctrlKey && e.key === 's') || 
        (e.ctrlKey && e.key === 'p') || 
        (e.ctrlKey && e.key === 'a') || 
        (e.ctrlKey && e.key === 'c')
    ) {
        e.preventDefault();
        e.stopPropagation();
        alert("⚠️ Eits! Fitur ini dikunci demi keamanan ujian.");
        return false;
    }
});
// ==========================================================
// PENGAWAS ANTI-FREEZE SAAT PINDAH SOAL DI MODE REVIEW
// ==========================================================
document.addEventListener('click', function(e) {
    // Hanya bereaksi kalau aplikasi sedang dalam mode review (jawaban terkunci)
    if (window.isAnswerLocked) {
        
        // Cek apakah user ngeklik tombol Selanjutnya, Sebelumnya, atau Nomor Soal
        const isNavigasi = e.target.closest('#nextBtn') || 
                           e.target.closest('#prevBtn') || 
                           e.target.closest('.nav-btn') || 
                           e.target.closest('.nomor-btn');

        if (isNavigasi) {
            // Jeda 0.1 detik menunggu sistem lu ngegembok soal baru, lalu kita bongkar paksa lagi!
            setTimeout(() => {
                const pBtn = document.getElementById('prevBtn');
                const nBtn = document.getElementById('nextBtn');
                
                if (pBtn) { pBtn.disabled = false; pBtn.style.pointerEvents = 'auto'; }
                if (nBtn) { nBtn.disabled = false; nBtn.style.pointerEvents = 'auto'; }

                // Bebaskan kembali nomor urut dan pilihan jawaban
                document.querySelectorAll('#nomorGrid button, .nav-btn, .nomor-btn, #optionsContainer button, #optionsContainer input, .option-item').forEach(btn => {
                    btn.disabled = false;
                    btn.style.pointerEvents = 'auto';
                    btn.style.opacity = '1';
                });
            }, 100); 
        }
    }
});

window.bukaDetailPapi = async (docId) => {
    try {
        if (!window.db) return alert("Error: Database belum siap!");
        const docRef = doc(window.db, "riwayat_psikotes", docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const d = docSnap.data();
            let dataObj = typeof d.detail_skor === 'string' ? JSON.parse(d.detail_skor) : d.detail_skor;
            
            const scores = dataObj.scores ? dataObj.scores : dataObj; 
            const mapping = dataObj.mapping || {};

            const strategi = {
                // --- KELOMPOK UTAMAKAN (WAJIB TINGGI: 6-9)  ---
                'R': { label: "Role Consistency (Rasional)", target: "6-9", saran: "Pertahankan cara berpikir berbasis fakta dan aturan." },
                'D': { label: "Decision Making (Tegas)", target: "6-9", saran: "Bagus, hakim harus berani mengambil keputusan hukum." },
                'E': { label: "Emotional Restraint (Tenang)", target: "6-9", saran: "Stabilitas emosi adalah kunci kematangan hakim." },
                'M': { label: "Mental Activity (Waspada)", target: "6-9", saran: "Tetap waspada dan teliti dalam membedah perkara." },
                'B': { label: "Belonging to Group (Perseverance)", target: "6-9", saran: "Ketekunan dalam bekerja secara sistematis." },
                'N': { label: "Need to Finish (Tuntas)", target: "6-9", saran: "Selesaikan perkara tepat waktu, jangan ditunda." },
                'C': { label: "Conformity (Teratur/Rapi)", target: "6-9", saran: "Kerapian berkas mencerminkan kerapian logika putusan." },
                'A': { label: "Attention to Detail (Teliti)", target: "6-9", saran: "Ketelitian mencegah putusan yang rawan cacat." },
                'Z': { label: "Need for Change (Adaptif)", target: "6-9", saran: "Adaptif pada aturan baru, tapi tidak eksperimental." },
                'W': { label: "Need for Rules (Patuh Etik)", target: "7-9", saran: "Wajib patuh pada Kode Etik dan Pedoman Perilaku Hakim." },
            
                // --- KELOMPOK MODERAT (SEDANG: 4-6)  ---
                'L': { label: "Leadership (Kepemimpinan)", target: "4-6", saran: "Pimpin persidangan secara fungsional, bukan dominan." },
                'T': { label: "Pace (Kecepatan)", target: "4-6", saran: "Bekerja dengan ritme stabil, utamakan ketelitian." },
                'V': { label: "Vigor (Energi Vitalitas)", target: "4-6", saran: "Jaga stamina kerja untuk menghadapi sidang yang panjang." },
                'P': { label: "Control Others (Mengatur)", target: "4-6", saran: "Atur jalannya sidang sesuai hukum acara." },
            
                // --- KELOMPOK HINDARI (RENDAH: 0-4)  ---
                'X': { label: "Need to be Noticed (Populer)", target: "0-4", saran: "Hakim bekerja untuk keadilan, bukan untuk panggung." },
                'S': { label: "Social Extension (Bergaul)", target: "0-4", saran: "Batasi pergaulan untuk menjaga independensi hakim." },
                'I': { label: "Theoretical Type (Inisiatif)", target: "0-4", saran: "Patuhi hukum positif, jangan membuat eksperimen hukum." },
                'G': { label: "Hard Intense Worker (Ambisi)", target: "0-4", saran: "Hindari ambisi berlebihan yang merusak objektivitas." },
                'K': { label: "Aggression (Emosional/Agresif)", target: "0-3", saran: "Hindari sikap defensif atau mudah marah di persidangan." },
                'O': { label: "Need for Closeness (Kedekatan)", target: "0-4", saran: "Jangan terlalu bergantung pada instruksi orang lain." }
            };

            let report = `⚖️ ANALISIS PROFIL\n${"=".repeat(35)}\n\n`;

            const keys = Object.keys(scores);
            if (keys.length === 0) report += "Data skor tidak ditemukan.";

            keys.forEach(el => {
                const info = strategi[el] || { label: "Elemen Pendukung", target: "-", saran: "Jaga keseimbangan profil." };
                const score = scores[el];
                const soalList = mapping[el] ? mapping[el].join(", ") : "Tersedia di tes berikutnya";
                
                let evalMsg = "⚠️ CEK";
                if (strategi[el]) {
                    const range = info.target.match(/\d+/g);
                    const min = parseInt(range[0]);
                    const max = parseInt(range[1] || range[0]);
                    evalMsg = (score >= min && score <= max) ? "✅ IDEAL" : "❌ EVALUASI";
                }

                report += `● [${el}] ${info.label}: ${score}\n`;
                report += `  Status: ${evalMsg} (Target: ${info.target})\n`;
                if(mapping[el]) report += `  Nomor Soal: ${soalList}\n`;
                report += `  Saran: ${info.saran}\n\n`;
            });

            alert(report);
        }
    } 
    catch (e) {
        alert("Gagal membedah data: " + e.message);
    }
};

window.bukaReviewRiwayat = (index) => {
    const data = window.tempDataRiwayatStats[index];
    
    if (!data || !data.detailData || data.detailData.length === 0) {
        alert("⚠️ Detail pembahasan tidak tersedia. Ini karena tes ini dikerjakan sebelum fitur review diaktifkan.");
        return;
    }

    let listSoalHTML = "";
    data.detailData.forEach((item, i) => {
        let isBenar = item.jawabanUser === item.kunciJawaban;
        let bgColor = isBenar ? "#f1f8e9" : "#ffebee";
        let borderColor = isBenar ? "#c8e6c9" : "#ffcdd2";
        let iconTitle = isBenar ? "✅ BENAR" : "❌ SALAH";
        let ansUserText = (item.jawabanUser !== null && item.jawabanUser !== undefined && item.jawabanUser !== "") ? item.opsi[item.jawabanUser] : "<i>(Kosong / Tidak Menjawab)</i>";
        let ansKunciText = item.opsi[item.kunciJawaban];

        listSoalHTML += `
            <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <strong style="font-size: 1.1rem; color: #333;">Soal No. ${i + 1}</strong>
                    <strong style="color: ${isBenar ? 'green' : 'red'};">${iconTitle}</strong>
                </div>
                <p style="margin: 0 0 15px 0; font-size: 0.95rem; line-height: 1.5; color: #222;">${item.soal}</p>
                
                <div style="font-size: 0.9rem; margin-bottom: 15px; background: rgba(255,255,255,0.6); padding: 10px; border-radius: 6px;">
                    <div style="margin-bottom: 5px;">Jawaban Kamu: <b style="color: ${isBenar ? 'green' : 'red'};">${ansUserText}</b></div>
                    ${!isBenar ? `<div>Kunci Jawaban: <b style="color: green;">${ansKunciText}</b></div>` : ""}
                </div>
                
                <hr style="border: 0; border-top: 1px dashed ${borderColor}; margin: 10px 0;">
                <div style="font-size: 0.9rem;">
                    <strong><i class="fas fa-gavel" style="color: var(--primary);"></i> Pembahasan:</strong><br>
                    <span style="color: #444; line-height: 1.5;">${item.pembahasan}</span>
                </div>
            </div>
        `;
    });

    let modalHTML = `
        <div id="modalReviewOverlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 99999999; display: flex; justify-content: center; align-items: center; padding: 20px; box-sizing: border-box; backdrop-filter: blur(5px);">
            <div style="background: white; width: 100%; max-width: 800px; height: 90vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.5); animation: zoomIn 0.3s ease;">
                
                <div style="padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: var(--primary); color: white; border-radius: 12px 12px 0 0;">
                    <div>
                        <h3 style="margin: 0; font-size: 1.2rem; color: white;">Detail Pembahasan</h3>
                        <small style="color: #ddd;">Skor Akhir: <b style="color: var(--gold);">${data.score}</b> | Tanggal: ${data.date}</small>
                    </div>
                    <button onclick="document.getElementById('modalReviewOverlay').remove()" style="background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: 0.2s;">
                        <i class="fas fa-times"></i> Tutup
                    </button>
                </div>

                <div style="padding: 20px; overflow-y: auto; flex: 1; background: #fafafa;">
                    ${listSoalHTML}
                </div>
            </div>
        </div>
        <style>@keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }</style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// ==========================================
// FUNGSI LAPOR KESALAHAN SOAL (INJECTED)
// ==========================================

// 1. Fungsi Buka/Tutup Modal Laporan
window.openLaporModal = () => {
    // Pastikan user udah milih modul dan lagi di soal berapa
    if (!window.currentDatabaseId || currentIdx === undefined) {
        alert("Sistem belum memuat soal secara penuh.");
        return;
    }
    document.getElementById('laporOverlay').style.display = 'flex';
    // Fokusin kursor ke text area biar user langsung bisa ngetik
    document.getElementById('laporAlasan').focus();
};

window.closeLaporModal = () => {
    document.getElementById('laporOverlay').style.display = 'none';
    // Kosongin inputan kalo di-close
    document.getElementById('laporAlasan').value = "";
    document.getElementById('laporReferensi').value = "";
};

// 2. Fungsi Kirim Data ke Firebase
window.submitLaporan = async () => {
    const alasan = document.getElementById('laporAlasan').value.trim();
    const referensi = document.getElementById('laporReferensi').value.trim();
    const btnSubmit = document.getElementById('btnSubmitLaporan');

    // Validasi input
    if (!alasan) {
        alert("Alasan kesalahannya wajib diisi ya bro!");
        return;
    }

    // Ambil teks soalnya sekalian biar lo sebagai admin gampang ngeceknya
    const qData = currentQuestions[currentIdx];
    const teksSoal = qData ? qData.q : "Teks soal tidak ditemukan";

    // Ubah tombol biar ada efek loading
    btnSubmit.innerText = "Mengirim...";
    btnSubmit.disabled = true;
    btnSubmit.style.background = "#999";

    try {
        // Nembak ke collection baru bernama 'laporan_soal'
        await addDoc(collection(window.db, "laporan_soal"), {
            uid_pelapor: currentUser.uid,
            nama_pelapor: currentUser.displayName,
            modul_id: window.currentDatabaseId, // Modul apa (cth: modul1)
            nomor_soal_index: currentIdx + 1,     // Index soal (ditambah 1 biar sesuai nomor layar)
            teks_soal_penggalan: teksSoal.substring(0, 50) + "...", // Penggalan buat clue
            alasan: alasan,
            dasar_hukum: referensi || "Tidak melampirkan dasar hukum",
            status: "Belum Diperbaiki",         // Status awal
            tanggal_lapor: new Date()
        });

        alert("✅ Laporan berhasil dikirim! Makasih ya koreksinya.");
        window.closeLaporModal();

    } catch (error) {
        console.error("Gagal ngirim laporan:", error);
        alert("Gagal mengirim laporan: " + error.message);
    } finally {
        // Balikin tombol ke semula
        btnSubmit.innerText = "Kirim Laporan";
        btnSubmit.disabled = false;
        btnSubmit.style.background = "#d32f2f";
    }
};

// ==========================================
// FUNGSI ADMIN CEK LAPORAN (INJECTED)
// ==========================================

window.loadLaporanAdmin = async () => {
    const container = document.getElementById('containerLaporan');
    if(!container) return;

    container.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Sabar, lagi narik data laporan...</div>`;

    try {
        // Tarik data dari Firestore, diurutin dari yang paling baru
        const qLaporan = query(collection(window.db, "laporan_soal"), orderBy("tanggal_lapor", "desc"));
        const snap = await getDocs(qLaporan);
        
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:green; font-weight:bold;"><i class="fas fa-check-circle"></i> Mantap! Belum ada laporan masuk.</div>`;
            return;
        }

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const idDoc = docSnap.id;
            
            // Format tanggal yang enak dibaca
            const tgl = d.tanggal_lapor ? d.tanggal_lapor.toDate().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : "-";

            const item = document.createElement('div');
            item.style = "background:white; border:1px solid #ccc; border-radius:8px; padding:15px; margin-bottom:15px; box-shadow:0 2px 5px rgba(0,0,0,0.05);";
            
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:10px;">
                    <div>
                        <span style="background:var(--primary); color:white; padding:3px 8px; border-radius:4px; font-weight:bold; font-size:0.8rem;">${(d.modul_id || "Modul").toUpperCase()} - SOAL NO. ${d.nomor_soal_index}</span>
                        <span style="font-size:0.8rem; color:#666; margin-left:10px;"><i class="far fa-clock"></i> ${tgl}</span>
                    </div>
                    <div style="font-size:0.8rem; font-weight:bold; color:#555;">
                        <i class="fas fa-user"></i> ${d.nama_pelapor || "Anonim"}
                    </div>
                </div>
                
                <div style="font-size:0.9rem; color:#444; margin-bottom:10px; background:#f5f5f5; padding:8px; border-radius:4px;">
                    <em>" ${d.teks_soal_penggalan || "(Teks soal)"} "</em>
                </div>

                <div style="font-size:0.9rem; margin-bottom:5px;">
                    <span style="font-weight:bold; color:#d32f2f;">Alasan:</span> ${d.alasan}
                </div>
                <div style="font-size:0.9rem; margin-bottom:15px;">
                    <span style="font-weight:bold; color:var(--success);">Dasar Hukum:</span> ${d.dasar_hukum}
                </div>

                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    <button onclick="hapusLaporan('${idDoc}')" style="background:#e74c3c; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:bold;">
                        <i class="fas fa-trash"></i> Hapus Laporan
                    </button>
                    <button onclick="window.editSoalDariLaporan('${d.modul_id}', '${encodeURIComponent(d.teks_soal_penggalan || "")}')" style="background:var(--gold); color:#333; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem; font-weight:bold;">
                        <i class="fas fa-magic"></i> Auto-Edit Soal
                    </button>
                </div>
            `;
            container.appendChild(item);
        });

    } catch (e) {
        container.innerHTML = `<p style="color:red">Error ngambil data: ${e.message}</p>`;
        console.error(e);
    }
};

window.hapusLaporan = async (idDoc) => {
    if(!confirm("Udah beres direvisi? Yakin mau hapus laporan ini dari daftar?")) return;
    
    try {
        await deleteDoc(doc(window.db, "laporan_soal", idDoc));
        alert("Laporan berhasil dihapus!");
        loadLaporanAdmin(); // Refresh list otomatis
    } catch (error) {
        alert("Gagal menghapus laporan: " + error.message);
    }
};

// ==========================================
// FUNGSI PRESENCE (STATUS ONLINE) & RADAR ADMIN
// ==========================================

// 1. Fungsi ngirim sinyal ke Firebase
window.updateUserStatus = async (isOnline, modulName = "Lobby") => {
    if (!currentUser || !window.db) return;
    try {
        const statusRef = doc(window.db, "user_status", currentUser.uid);
        await setDoc(statusRef, {
            uid: currentUser.uid,
            nama: currentUser.displayName,
            email: currentUser.email,
            isOnline: isOnline,
            lastActive: new Date(),
            currentModul: modulName
        }, { merge: true });
    } catch (e) {
        console.error("Gagal update status:", e);
    }
};

// 2. Deteksi kalau user tiba-tiba nutup tab browser (X)
window.addEventListener('beforeunload', () => {
    if (currentUser) window.updateUserStatus(false, "Offline");
});

// 3. Fungsi Admin buat nampilin data di tabel (Update: Ditambah Kode VIP)
window.loadStatusAdmin = async () => {
    const container = document.getElementById('containerStatus');
    if(!container) return;

    container.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Mendeteksi sinyal peserta dan menarik data VIP...</div>`;

    try {
        // --- 1. TARIK DATA KODE VIP DULU ---
        const qVip = query(collection(window.db, "vip_access"));
        const snapVip = await getDocs(qVip);
        let vipMap = {};
        snapVip.forEach(doc => {
            // Kita simpan ke "kamus" dengan kunci email user
            vipMap[doc.id] = doc.data().code; 
        });

        // --- 2. TARIK DATA STATUS ONLINE ---
        const qStatus = query(
            collection(window.db, "user_status"), 
            orderBy("lastActive", "desc"), 
            limit(10)
        );
        const snap = await getDocs(qStatus);
        
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<p style="text-align:center; padding:20px; color:gray;">Belum ada data peserta terekam.</p>`;
            return;
        }

        // --- 3. BIKIN HEADER TABEL BARU (Ada Kolom Kode VIP) ---
        let html = `<table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
            <thead><tr style="background:#eee; text-align:left;">
                <th style="padding:10px;">Nama & Email</th>
                <th style="padding:10px; color:var(--primary);">Kode VIP</th>
                <th style="padding:10px;">Status</th>
                <th style="padding:10px;">Aktivitas Terakhir</th>
            </tr></thead><tbody>`;

        const sekarang = new Date();

        snap.forEach(docSnap => {
            const d = docSnap.data();
            const waktu = d.lastActive ? d.lastActive.toDate() : new Date();
            
            const selisihMs = sekarang - waktu;
            const selisihMenit = Math.floor(selisihMs / 60000);
            const selisihJam = Math.floor(selisihMenit / 60);
            const selisihHari = Math.floor(selisihJam / 24);

            let ketWaktu = "";
            if (selisihMenit < 1) ketWaktu = "Baru saja";
            else if (selisihMenit < 60) ketWaktu = `${selisihMenit} menit lalu`;
            else if (selisihJam < 24) ketWaktu = `${selisihJam} jam lalu`;
            else ketWaktu = `${selisihHari} hari lalu`;

            let isBeneranOnline = d.isOnline;
            if (selisihMenit > 120) isBeneranOnline = false;

            let aktivitasTeks = d.currentModul || 'Lobby';
            let warnaAktivitas = 'var(--primary)';
            let customBadge = null; // Siapin wadah buat badge custom
            
            // Highlight khusus kalau nyangkut di VIP Gatekeeper
            if (aktivitasTeks === "VIP Gatekeeper") {
                warnaAktivitas = '#d35400'; // Warna oren gelap
                aktivitasTeks = '<i class="fas fa-user-clock"></i> Pending Access'; // Teks aktivitas lebih keren
                
                // Timpa badge "Online" jadi "Unregistered" kalau dia belum masukin kode
                customBadge = `<span style="background:#fff3e0; color:#e67e22; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.8rem;">🟡 UNREGISTERED</span>`;
            }

            // Atur Badge Status
            let badgeStatus = customBadge ? customBadge : (isBeneranOnline 
                ? `<span style="background:#e8f5e9; color:#2e7d32; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.8rem;">🟢 ONLINE</span>` 
                : `<span style="background:#ffebee; color:#c62828; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.8rem;">🔴 OFFLINE</span>`);

            // Atur Teks Aktivitas
            let infoAktivitas = isBeneranOnline 
                ? `<span style="color:${warnaAktivitas}; font-weight:bold;">${aktivitasTeks}</span>`
                : `<span style="color:#888;">${ketWaktu}</span>`;

            // --- 4. COCOKAN EMAIL USER DENGAN KODE VIP ---
            let kodeVipUser = "Belum Buat";
            if (d.email && vipMap[d.email]) {
                kodeVipUser = vipMap[d.email];
            }

            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px; color:#444;">
                    <strong style="display:block;">${d.nama}</strong>
                    <span style="font-size:0.75rem; color:#888;">${d.email || '-'}</span>
                </td>
                <td style="padding:10px;">
                    <span style="background:#fff3e0; color:#d35400; padding:5px 10px; border-radius:6px; font-family:monospace; font-weight:bold; border:1px solid #ffe0b2;">
                        ${kodeVipUser}
                    </span>
                </td>
                <td style="padding:10px;">${badgeStatus}</td>
                <td style="padding:10px;">${infoAktivitas}</td>
            </tr>`;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

    } catch (e) {
        container.innerHTML = `<p style="color:red">Error radar: ${e.message}</p>`;
        console.error(e);
    }
};

// ==========================================
// FUNGSI DARK MODE 
// ==========================================
window.toggleDarkMode = () => {
    const body = document.body;
    const btn = document.getElementById('btnDarkModeToggle');
    
    // Switch class
    body.classList.toggle('dark-mode');
    
    // Ganti Ikon dan Simpan ke Memory
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('protama_theme', 'dark');
        btn.innerHTML = '<i class="fas fa-sun"></i>';
        btn.style.color = '#f39c12'; // Warna oren cerah buat matahari
        btn.title = "Matikan Mode Gelap";
    } else {
        localStorage.setItem('protama_theme', 'light');
        btn.innerHTML = '<i class="fas fa-moon"></i>';
        btn.style.color = '#f1c40f'; // Warna kuning buat bulan
        btn.title = "Aktifkan Mode Gelap";
    }
};

// Cek memori pas web baru dibuka
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('protama_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const btn = document.getElementById('btnDarkModeToggle');
        if(btn) {
            btn.innerHTML = '<i class="fas fa-sun"></i>';
            btn.style.color = '#f39c12';
        }
    }
});
// =======================================================
// FUNGSI LOGIKA TAB TAMBAH (MANUAL VS JSON)
// =======================================================
window.setTambahMode = (mode) => {
    const isManual = mode === 'manual';

    // 1. Tampilkan/Sembunyikan Form Manual
    const formManual = document.getElementById('formTambahManual');
    if (formManual) formManual.style.display = isManual ? 'block' : 'none';

    // 2. Sembunyikan Kotak JSON & Labelnya
    const jsonArea = document.getElementById('jsonUploadArea');
    if (jsonArea) {
        jsonArea.style.display = isManual ? 'none' : 'block';
        if (jsonArea.previousElementSibling) jsonArea.previousElementSibling.style.display = isManual ? 'none' : 'block';
    }

    // 3. Sembunyikan Target Modul Bawaan & Labelnya
    const targetInput = document.getElementById('adminModulTarget');
    if (targetInput) {
        targetInput.style.display = isManual ? 'none' : 'block';
        if (targetInput.previousElementSibling) targetInput.previousElementSibling.style.display = isManual ? 'none' : 'block';
    }

    // 4. Sembunyikan Tombol "Upload ke Firebase" yang asli
    const btnUpload = document.querySelector('button[onclick*="eksekusiUpload"]');
    if (btnUpload) btnUpload.style.display = isManual ? 'none' : 'block';

    // 5. Ubah Warna Tombol Switch (Pakai warna Ijo Langsung)
    const btnManual = document.getElementById('btnModeManual');
    const btnJson = document.getElementById('btnModeJson');
    if (btnManual && btnJson) {
        btnManual.style.background = isManual ? '#27ae60' : '#ddd'; // Ijo keren
        btnManual.style.color = isManual ? 'white' : '#333';
        btnJson.style.background = isManual ? '#ddd' : '#27ae60'; 
        btnJson.style.color = isManual ? '#333' : 'white';
    }
};

window.simpanSoalManual = async () => {
    // Ambil input dari ID yang baru (dan paksa huruf kecil + hapus spasi biar ga error)
    const modulIdRaw = document.getElementById('manModulInput').value;
    const modulId = modulIdRaw.trim().toLowerCase().replace(/\s+/g, '');
    
    if (!modulId) return alert("Ketikin dulu nama Modulnya bro!");
    
    const q = document.getElementById('manQ').value.trim();
    const optA = document.getElementById('manOptA').value.trim();
    const optB = document.getElementById('manOptB').value.trim();
    const optC = document.getElementById('manOptC').value.trim();
    const optD = document.getElementById('manOptD').value.trim();
    const ans = parseInt(document.getElementById('manAns').value);
    const exp = document.getElementById('manExp').value.trim();
    const cite = document.getElementById('manCite').value.trim();

    if (!q || !optA || !optB) return alert("Pertanyaan dan minimal 2 opsi pertama wajib diisi!");

    PROTAMA.loading("Sedang memasukkan soal ke " + modulId + "...");
    try {
        await addDoc(collection(db, "bank_soal", modulId, "daftar_soal"), {
            q: q,
            options: [optA, optB, optC, optD],
            answer: ans,
            explanation: exp || "-",
            cite: cite || "-",
            createdAt: new Date()
        });
        PROTAMA.close();
        PROTAMA.alert("MANTAP!", "Soal berhasil masuk ke " + modulId, "success");
        
        // Reset form isian aja, kolom modul tetep utuh biar ga capek ngetik ulang
        ['manQ', 'manOptA', 'manOptB', 'manOptC', 'manOptD', 'manExp', 'manCite'].forEach(id => {
            document.getElementById(id).value = "";
        });
    } catch (e) {
        PROTAMA.close();
        alert("Gagal simpan ke Firebase: " + e.message);
    }
};
// =========================================================================
// FUNGSI AUTO-SAVE PROGRES LOKAL (ANTI-HILANG JAWABAN & URUTAN SOAL)      
// =========================================================================

// 1. Simpan Seluruh Status Ujian (Jawaban, Ragu, Sisa Waktu, & Urutan Soal)
function simpanProgresTotal() {
    // 🛑 PENGECUALIAN: Jangan auto-save ke lokal kalau lagi Mode Room!
    if (!window.currentDatabaseId || isSubmitted || currentAppMode === 'room') return; 
    
    let progres = JSON.parse(localStorage.getItem('protama_progres')) || {};
    
    progres[window.currentDatabaseId] = {
        jawaban: userAnswers,
        ragu: raguStatus,
        waktuSisa: timeRemaining,
        soalAcak: currentQuestions,
        terakhirDisimpan: new Date().getTime() // Simpan waktu dalam milidetik
    };
    
    localStorage.setItem('protama_progres', JSON.stringify(progres));
    console.log(`💾 Progres Modul ${window.currentDatabaseId} disimpan!`);
}

// 2. Tarik Data Pas Modul Dibuka
function loadProgresLokal(idModul) {
    const dataTersimpan = localStorage.getItem('protama_progres');
    if (dataTersimpan) {
        let progresSemua = JSON.parse(dataTersimpan);
        let dataModul = progresSemua[idModul];

        if (dataModul) {
            const waktuSekarang = new Date().getTime();
            const waktuSimpan = dataModul.terakhirDisimpan || 0;
            const selisihJam = (waktuSekarang - waktuSimpan) / (1000 * 60 * 60);

            // CEK APAKAH SUDAH LEWAT 24 JAM?
            if (selisihJam > 24) {
                console.log("⏰ Progres sudah lebih dari 24 jam. Otomatis Reset!");
                hapusProgresModul(idModul); // Panggil fungsi hapus
                return null; // Kembalikan null supaya sistem mulai ujian baru (soal ngacak lagi)
            }

            return dataModul; 
        }
    }
    return null;
}

// 3. Hapus Progres (Dipanggil pas klik Selesai Ujian)
function hapusProgresModul(idModul) {
    let progres = JSON.parse(localStorage.getItem('protama_progres'));
    if (progres && progres[idModul]) {
        delete progres[idModul];
        localStorage.setItem('protama_progres', JSON.stringify(progres));
        console.log(`🧹 [Clear] Progres modul ${idModul} dihapus karena ujian selesai.`);
    }
}
// ==========================================
// FITUR VALIDASI AI (ADMIN - MENGGUNAKAN GROQ LLAMA 3)
// ==========================================
window.cekValiditasAI = async (btn, idSoal, qTeksEsc, optStrEsc, ansIdx, expEsc, citeEsc) => {
    // Decode data yang dikirim dari tombol
    const teksSoal = decodeURIComponent(qTeksEsc);
    const opsiArr = JSON.parse(decodeURIComponent(optStrEsc));
    const pembahasan = decodeURIComponent(expEsc);
    const sumber = decodeURIComponent(citeEsc);
    
    // Siapin UI loading
    const resultDiv = document.getElementById(`ai-result-${idSoal}`);
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Mikir...`;
    btn.disabled = true;
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<span style="color: #8e44ad;"><i class="fas fa-cog fa-spin"></i> AI sedang menganalisis akurasi hukum...</span>`;

    const GROQ_API_KEY = "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";

    // Bikin perintah (Prompt) khusus hukum buat AI
    const prompt = `Anda adalah Hakim Agung di Indonesia. Tolong validasi soal ujian Calon Hakim (Cakim) berikut ini:

    SOAL: "${teksSoal}"
    PILIHAN JAWABAN: 
    ${opsiArr.map((o, i) => `${String.fromCharCode(65 + i)}.${o}`).join('\n')}
    
    KUNCI JAWABAN DARI ADMIN: Pilihan ${String.fromCharCode(65 + ansIdx)}
    PEMBAHASAN ADMIN: "${pembahasan}"
    DASAR HUKUM/SUMBER: "${sumber}"

    TUGAS: 
    1. Apakah kunci jawaban tersebut sudah BENAR secara hukum positif Indonesia saat ini?
    2. Apakah pembahasan dan dasar hukumnya akurat?
    3. Jika ada yang salah atau kurang tepat, tolong koreksi!
    
    Berikan kesimpulan di awal (contoh: **VALID** atau **TIDAK VALID**), lalu jelaskan alasannya dengan singkat, padat, dan profesional. Gunakan format Markdown standar (*tebal*, _miring_).`;

    try {
        const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({ 
                model: 'qwen/qwen3.8-27b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "Gagal terhubung ke API Groq.");
        }

        if (data.choices && data.choices.length > 0) {
             let aiReply = data.choices[0].message.content;
             
             // Bersihkan Markdown biar rapi jadi HTML
             aiReply = aiReply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); 
             aiReply = aiReply.replace(/\*(.*?)\*/g, '<em>$1</em>'); 
             aiReply = aiReply.replace(/\n/g, '<br>'); 
             
             resultDiv.innerHTML = `<strong style="color: #8e44ad;"><i class="fas fa-gavel"></i> Analisis Hakim AI:</strong><br><br>${aiReply}`;
        } else {
             resultDiv.innerHTML = `<span style="color: red;"><strong>Error:</strong> AI gagal memberikan jawaban yang valid.</span>`;
        }
        
    } catch (e) {
        resultDiv.innerHTML = `<span style="color: red;"><strong>Error dari API:</strong> ${e.message}</span>`;
    } finally {
        btn.innerHTML = `<i class="fas fa-check"></i> Selesai Dicek`;
        btn.disabled = false;
    }
};

// ==========================================
// 🤖 FITUR CHAT AI PESERTA (DI PEMBAHASAN - MENGGUNAKAN GROQ LLAMA 3)
// ==========================================
window.tanyaAIPeserta = async function() {
    const inputEl = document.getElementById('aiInputPeserta');
    const resDiv = document.getElementById('aiResponsePeserta');
    const pertanyaan = inputEl.value.trim();
    
    if (!pertanyaan) return;
    
    // Tampilkan animasi loading
    resDiv.style.display = 'block';
    resDiv.innerHTML = '<i class="fas fa-circle-notch fa-spin" style="color: #8e44ad;"></i> <span style="color: #555;">AI sedang mencari dasar hukum...</span>';
    
    const GROQ_API_KEY = "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";

    // Ambil data soal yang lagi dibuka user
    const q = currentQuestions[currentIdx];
    const teksSoal = q.q || "";
    const teksBahas = q.explanation || "";

    const prompt = `Anda adalah Tutor Ahli Hukum di Indonesia. Seorang peserta ujian menanyakan hal terkait soal berikut:
    
    Konteks Soal: "${teksSoal}"
    Pembahasan Asli: "${teksBahas}"
    
    Pertanyaan Peserta: "${pertanyaan}"
    
    Tugas: Jawab pertanyaan peserta secara ramah, profesional, ringkas, dan mudah dipahami berdasarkan konteks soal di atas. Jika perlu, sebutkan dasar hukumnya. Gunakan format Markdown standar (*tebal*, _miring_).`;

    try {
        const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({ 
                model: 'qwen/qwen3.8-27b',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3 
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "Gagal terhubung ke API Groq.");
        }

        let reply = data.choices[0].message.content;
        
        reply = reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        reply = reply.replace(/\*(.*?)\*/g, '<em>$1</em>');
        reply = reply.replace(/\n/g, '<br>');
        
        resDiv.innerHTML = `<strong style="color: #8e44ad;"><i class="fas fa-robot"></i> Jawaban AI Pro-Tama:</strong><br><br>${reply}`;
        
    } catch (e) {
        resDiv.innerHTML = `<span style="color: red;"><strong>Maaf, terjadi kesalahan:</strong> ${e.message}</span>`;
    }
};

// Fitur tambahan: Peserta bisa tekan 'Enter' di keyboard buat ngirim pertanyaan
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'aiInputPeserta') {
        window.tanyaAIPeserta();
    }
});
// ==========================================
// SCRIPT MIGRASI HEMAT READ FIREBASE
// ==========================================
window.migrasiModulBiarHemat = async function(modulId) {
    if (!window.db) return console.error("Database belum siap, bro!");
    
    console.log(`🚀 Mulai narik semua soal dari ${modulId} (Format Lama)...`);
    
    try {
        // 1. Tarik semua soal dari format lama (Sub-collection)
        const qRef = collection(window.db, "bank_soal", modulId, "daftar_soal");
        const snapshot = await getDocs(qRef);
        
        if (snapshot.empty) {
            return console.log(`❌ Zonk! Modul ${modulId} kosong atau nggak ketemu.`);
        }

        let arraySoal = [];
        snapshot.forEach(docSnap => {
            let d = docSnap.data();
            // Opsional: Buang createdAt biar data lebih enteng
            delete d.createdAt; 
            arraySoal.push(d);
        });

        console.log(`✅ Berhasil narik ${arraySoal.length} soal. Sekarang nyimpen ke format Array...`);

        // 2. Simpan ke koleksi baru "bank_soal_v2"
        const docBaruRef = doc(window.db, "bank_soal_v2", modulId);
        await setDoc(docBaruRef, {
            title: modulId.toUpperCase(),
            total_soal: arraySoal.length,
            daftar_soal_array: arraySoal,
            migratedAt: new Date()
        });

        console.log(`🎉 MANTAP! Modul ${modulId} sukses dimigrasi ke format baru.`);
        console.log(`Cek di Firestore lo: bank_soal_v2 -> ${modulId} -> daftar_soal_array`);
        
    } catch (e) {
        console.error("Gagal migrasi:", e);
    }
};
window.kirimPesanChat = async () => {
    const roomCode = window.currentRoomCode || (typeof currentRoomCode !== 'undefined' ? currentRoomCode : null);
    if (!roomCode) return console.error("❌ Error: Kode Room hilang!");
    
    const input = document.getElementById('chatInput');
    if (!input) return;

    const teks = input.value.trim();
    if (!teks) return;

    input.value = ''; 
    input.focus();    

    const database = window.db || (typeof db !== 'undefined' ? db : null);
    const userSkrg = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    
    if (!database || !userSkrg) return;

    const roomRef = doc(database, "rooms", roomCode);
    try {
        await updateDoc(roomRef, {
            messages: arrayUnion({
                uid: userSkrg.uid,
                nama: userSkrg.displayName.split(" ")[0],
                teks: teks,
                waktu: new Date().toISOString()
            })
        });
    } catch (e) {
        console.error("❌ Gagal kirim chat ke Firebase:", e);
    }
};

// 🛑 LISTENER PAKSAAN: Tembus segala macam gembok UI
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const chatInp = document.getElementById('chatInput');
        // Kalau kursor lagi kedap-kedip di dalam input chat, kirim paksa!
        if (document.activeElement === chatInp) {
            e.preventDefault();
            window.kirimPesanChat();
        }
    }
});

window.renderChatMessages = (messages) => {
    const chatBox = document.getElementById('chatMessages');
    if (!chatBox) return;

    const prevCount = chatBox.childElementCount;
    let html = '';
    
    // 🛑 CARI UID USER ASLI BIAR CHAT BISA DI KANAN
    let myUid = null;
    if (typeof auth !== 'undefined' && auth.currentUser) myUid = auth.currentUser.uid;
    else if (window.currentUser) myUid = window.currentUser.uid;

    messages.forEach(m => {
        const isMe = (myUid && m.uid === myUid);
        const align = isMe ? 'flex-end' : 'flex-start';
        const bg = isMe ? '#dcf8c6' : '#ffffff'; 
        const radius = isMe ? '12px 12px 0 12px' : '12px 12px 12px 0'; 
        const namaWarna = isMe ? '#2e7d32' : '#d35400';
        
        let jam = "";
        if (m.waktu) {
            const dateObj = new Date(m.waktu);
            const h = String(dateObj.getHours()).padStart(2, '0');
            const min = String(dateObj.getMinutes()).padStart(2, '0');
            jam = `${h}:${min}`;
        }

        html += `
            <div style="align-self: ${align}; max-width: 85%; display:flex; flex-direction:column; margin-bottom:8px;">
                <span style="font-size: 0.65rem; color: ${namaWarna}; font-weight:bold; margin-bottom: 2px; text-align: ${isMe ? 'right' : 'left'}">${isMe ? 'Kamu' : m.nama}</span>
                <div style="background: ${bg}; padding: 6px 10px 18px 10px; border-radius: ${radius}; font-size: 0.85rem; box-shadow: 0 1px 2px rgba(0,0,0,0.15); word-wrap: break-word; color:#333; position:relative; min-width: 70px;">
                    <span style="display:block; line-height: 1.4;">${m.teks}</span>
                    <span style="font-size: 0.6rem; color: #888; position: absolute; bottom: 3px; right: 7px;">${jam}</span>
                </div>
            </div>
        `;
    });
    
    chatBox.innerHTML = html;

    const body = document.getElementById('chatBody');
    const badge = document.getElementById('chatNotifBadge');
    if (messages.length > prevCount && body && body.style.display === 'none') {
        if (badge) badge.style.display = 'inline-block';
    }

    setTimeout(() => {
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 50);
};
// ==========================================
// LOGIKA UI CHAT: MINIMIZE & DRAG
// ==========================================

// Fungsi Buka Tutup Chat
window.toggleChatBody = () => {
    const body = document.getElementById('chatBody');
    const chevron = document.getElementById('chatChevron');
    const badge = document.getElementById('chatNotifBadge');

    if (body.style.display === 'none') {
        body.style.display = 'flex';
        chevron.classList.replace('fa-chevron-up', 'fa-chevron-down');
        // Sembunyikan notif "Baru!" karena pesan udah dilihat
        if (badge) badge.style.display = 'none'; 
        
        // Auto scroll pas dibuka
        const chatBox = document.getElementById('chatMessages');
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    } else {
        body.style.display = 'none';
        chevron.classList.replace('fa-chevron-down', 'fa-chevron-up');
    }
};

// Fungsi Bikin Chat Melayang (Draggable)
const initDraggableChat = () => {
    const chatContainer = document.getElementById('roomChatContainer');
    const chatHeader = document.getElementById('chatHeader');

    if (!chatContainer || !chatHeader) return;

    let isDragging = false;
    let initialX, initialY, currentX, currentY;
    let xOffset = 0, yOffset = 0;

    chatHeader.addEventListener('mousedown', (e) => {
        // Jangan di-drag kalau yg diklik tombol minimize-nya
        if (e.target.tagName.toLowerCase() === 'i' || e.target.tagName.toLowerCase() === 'button' || e.target.tagName.toLowerCase() === 'span') {
             // Biarkan klik jalan (bisa di klik buka/tutup)
        } else {
             initialX = e.clientX - xOffset;
             initialY = e.clientY - yOffset;
             isDragging = true;
             chatHeader.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mouseup', () => {
        if(isDragging) {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
            chatHeader.style.cursor = 'grab';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            xOffset = currentX;
            yOffset = currentY;
            // Geser kotaknya
            chatContainer.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
        }
    });
};

// Jalankan fungsi drag saat halaman siap
document.addEventListener("DOMContentLoaded", () => {
    initDraggableChat();
});
// ==========================================================
// FUNGSI MENU STIKER CHAT
// ==========================================================
window.toggleStikerMenu = () => {
    const menu = document.getElementById('stikerMenu');
    if (menu) {
        // Sistem buka-tutup (Toggle)
        menu.style.display = (menu.style.display === 'none' || menu.style.display === '') ? 'block' : 'none';
    }
};

window.kirimStiker = (teksStiker) => {
    const chatInp = document.getElementById('chatInput');
    if (chatInp) {
        chatInp.value = teksStiker; // Tembak teks stiker ke dalam input
        
        if (typeof window.kirimPesanChat === 'function') {
            window.kirimPesanChat(); // Langsung kirim pakai fungsi chat bawaan lu
        }
        
        // Tutup kembali pop-up stikernya setelah terkirim
        document.getElementById('stikerMenu').style.display = 'none';
    }
};

// Tambahan: Tutup menu stiker otomatis kalau user ngeklik di luar area chat
document.addEventListener('click', (e) => {
    const menu = document.getElementById('stikerMenu');
    const btnSmile = document.querySelector('button[onclick="window.toggleStikerMenu()"]');
    if (menu && menu.style.display === 'block') {
        if (!menu.contains(e.target) && !btnSmile.contains(e.target)) {
            menu.style.display = 'none';
        }
    }
});
