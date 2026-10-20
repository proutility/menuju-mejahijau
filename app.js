import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    getFirestore, 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager, 
    enableIndexedDbPersistence, 
    collection, addDoc, query, where, orderBy, limit, getDocs, deleteDoc, writeBatch, doc, getDoc, updateDoc, setDoc, onSnapshot, arrayUnion, deleteField 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const EDITOR_EMAILS = ["febrilliank@gmail.com", "glorifikalaw@gmail.com", "amifaveiro9@gmail.com", "brain1dead@gmail.com"];
let db, auth, provider, currentUser;

// ==========================================
// SISTEM NOTIFIKASI PREMIUM PRO-TAMA (FIX OVERLAP)
// ==========================================
window.PROTAMA = {
    alert: (title, text, icon = 'success') => {
        const colors = { success: '#004d00', error: '#c0392b', warning: '#f39c12', info: '#3498db' };
        Swal.fire({
            title: title.toUpperCase(),
            html: text,
            icon: icon,
            confirmButtonColor: colors[icon] || '#004d00',
            confirmButtonText: 'Selesai',
            background: document.body.classList.contains('dark-mode') ? '#242424' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#333',
            didOpen: () => {
                const swalBox = document.querySelector('.swal2-container');
                if (swalBox) swalBox.style.setProperty('z-index', '2147483647', 'important');
            }
        });
    },

    confirm: async (title, text, confirmBtnText = 'Ya, Lanjutkan', confirmBtnColor = null) => {
        const isDanger = confirmBtnText.toLowerCase().includes('keluarkan') || 
                         confirmBtnText.toLowerCase().includes('batalkan') || 
                         confirmBtnText.toLowerCase().includes('hapus') || 
                         confirmBtnText.toLowerCase().includes('keluar');
        const defaultColor = isDanger ? '#c0392b' : '#004d00';
        const result = await Swal.fire({
            title: title.toUpperCase(),
            html: text,
            icon: isDanger ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonColor: confirmBtnColor || defaultColor,
            cancelButtonColor: '#7f8c8d',
            confirmButtonText: confirmBtnText,
            cancelButtonText: 'Batal',
            background: document.body.classList.contains('dark-mode') ? '#242424' : '#fff',
            color: document.body.classList.contains('dark-mode') ? '#fff' : '#333',
            didOpen: () => {
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

// Inisialisasi Firebase dengan Offline Persistence
if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    
    // 🛑 AKTIFKAN OFFLINE PERSISTENCE BAWAAN FIREBASE
    try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        console.log("✅ Offline persistence Firebase aktif (Multi-tab cache)");
    } catch (e) {
        console.warn("Inisialisasi persistentLocalCache dialihkan ke fallback:", e);
        db = getFirestore(app);
        if (typeof enableIndexedDbPersistence === 'function') {
            enableIndexedDbPersistence(db).catch(err => {
                if (err.code === 'failed-precondition') {
                    console.warn("Offline persistence gagal: Banyak tab terbuka sekaligus.");
                } else if (err.code === 'unimplemented') {
                    console.warn("Browser tidak mendukung offline persistence IndexedDB.");
                }
            });
        }
    }

    window.db = db; // Bikin global biar console aman
    provider = new GoogleAuthProvider();
}

// =========================================================================
// 🔒 BRANKAS PRIVAT DATA KUNCI JAWABAN (DIPISAH DARI FRONTEND SAAT UJIAN)
// =========================================================================
const _kunciJawabanStore = new Map();

// Helper untuk mengambil kunci jawaban HANYA saat ujian disubmit/selesai
async function loadKunciJawabanUjian(key) {
    // 1. Cek dari memori privat sesi ini
    if (_kunciJawabanStore.has(key)) {
        return _kunciJawabanStore.get(key);
    }
    
    // 2. Jika di Firestore kunci jawaban dipisah dalam node/dokumen khusus 'kunci_jawaban'
    try {
        const kunciDocRef = doc(db, "kunci_jawaban", key);
        const kunciSnap = await getDoc(kunciDocRef);
        if (kunciSnap.exists() && kunciSnap.data()) {
            const dataK = kunciSnap.data();
            return dataK.kunci || dataK.daftar_kunci || dataK;
        }

        const kunciColSnap = await getDocs(collection(db, "kunci_jawaban", key, "daftar_kunci"));
        if (!kunciColSnap.empty) {
            const res = {};
            kunciColSnap.forEach(d => { res[d.id] = d.data(); });
            return res;
        }
    } catch(err) {
        console.warn("Info: Node terpisah kunci_jawaban belum tersedia di Firestore:", err);
    }
    return {};
}

// =========================================================================
// 🖼️ HELPER LAZY LOADING MEDIA / GAMBAR PADA SOAL
// =========================================================================
function renderLazyMedia(textOrHtml) {
    if (!textOrHtml) return '';
    // Format markdown image ![alt](url) -> <img> with lazy loading
    let rendered = textOrHtml.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/gi, (match, alt, src) => {
        return `<div class="soal-media-wrapper" style="text-align:center; margin:12px 0;">
            <img src="${src}" alt="${alt || 'Media Soal'}" loading="lazy" decoding="async" class="soal-media-img" style="max-width:100%; max-height:360px; border-radius:8px; box-shadow:0 3px 10px rgba(0,0,0,0.12); cursor:pointer;" onclick="window.previewImageModal && window.previewImageModal('${src}')" />
        </div>`;
    });
    // Injeksi loading="lazy" & decoding="async" ke seluruh tag <img> HTML jika belum ada
    rendered = rendered.replace(/<img\s+(?![^>]*\bloading=)([^>]+)>/gi, '<img loading="lazy" decoding="async" class="soal-media-img" $1>');
    return rendered;
}

window.previewImageModal = function(src) {
    let modal = document.getElementById('modalImagePreview');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalImagePreview';
        modal.style.cssText = "position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:2147483647; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:20px; box-sizing:border-box;";
        modal.innerHTML = `<img id="previewModalImg" src="" style="max-width:95vw; max-height:90vh; border-radius:8px; box-shadow:0 8px 30px rgba(0,0,0,0.5); object-fit:contain;" /><div style="position:absolute; top:20px; right:25px; color:white; font-size:2rem; font-weight:bold;">&times;</div>`;
        modal.onclick = () => { modal.style.display = 'none'; };
        document.body.appendChild(modal);
    }
    const img = document.getElementById('previewModalImg');
    if (img) img.src = src;
    modal.style.display = 'flex';
};

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
            window.currentUser = user;
            const gateOverlay = document.getElementById('gatekeeperOverlay');

            // Set default peran awal
            window.userRoleCakim = "PESERTA"; 

            // A. PANGGIL MAINTENACE
            watchMaintenance(); 

            // B. CEK ADMIN & ASISTEN ADMIN
            const isSuperAdmin = ADMIN_EMAILS.includes(user.email);
            const isEditor = typeof EDITOR_EMAILS !== 'undefined' && EDITOR_EMAILS.includes(user.email);

            if (isSuperAdmin) {
                window.userRoleCakim = "SUPER_ADMIN"; // ðŸ‘‘ Super Admin
                document.body.classList.add('is-admin'); 
                
                const btnAdmin = document.getElementById('btnAdminPanel');
                if(btnAdmin) {
                    btnAdmin.style.display = 'flex'; 
                    btnAdmin.innerHTML = '<i class="fas fa-cogs"></i> <span id="labelBtnAdminPanel">Panel Admin</span>';
                }
                
                const btnAdminLobby = document.getElementById('btnAdminLobby');
                if(btnAdminLobby) {
                    btnAdminLobby.style.display = 'block';
                    btnAdminLobby.innerHTML = '<i class="fas fa-cogs"></i> <span id="labelBtnAdminLobby">Panel Admin</span>';
                }
                
                console.log("Super Admin Login: Akses Penuh.");
            } 
            else if (isEditor) {
                window.userRoleCakim = "EDITOR"; // ðŸ“ Editor
                document.body.classList.add('is-admin'); // Tetap kasih class admin buat ngedit
                
                const btnAdmin = document.getElementById('btnAdminPanel');
                if(btnAdmin) {
                    btnAdmin.style.display = 'flex'; 
                    btnAdmin.innerHTML = '<i class="fas fa-user-edit"></i> <span id="labelBtnAdminPanel">Panel Editor</span>';
                }
                
                const btnAdminLobby = document.getElementById('btnAdminLobby');
                if(btnAdminLobby) {
                    btnAdminLobby.style.display = 'block';
                    btnAdminLobby.innerHTML = '<i class="fas fa-user-edit"></i> <span id="labelBtnAdminLobby">Panel Editor</span>';
                }

                console.log("Editor Login: Akses Panel Editor (Edit, Review, dan Laporan).");
            } 
            else {
                document.body.classList.remove('is-admin');
            }

            // C. PROSES GATEKEEPER (Pintu VIP)
            document.getElementById('loginOverlay').style.setProperty('display', 'none', 'important');
            if(gateOverlay) gateOverlay.style.display = 'flex';
            
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
                            window.userRoleCakim = "VIP";
                        }
                    } catch(e) {}
                    
                    window.gabungRoomLatihanOtomatis(roomTarget);
                }, 1000);
                
                return; // BERHENTI DI SINI
            }

            // 🛑 JALUR TOL KHUSUS ADMIN & EDITOR (BYPASS GERBANG VIP)
            if (window.userRoleCakim === "SUPER_ADMIN" || window.userRoleCakim === "EDITOR") {
                console.log(`Jalur Bebas Hambatan untuk: ${window.userRoleCakim}`);
                window.isVIPUser = true; 
                lanjutKeAplikasi();      
                return;                  
            }

            // --- PROSES NORMAL JIKA TIDAK BAWA LINK ROOM (PESERTA BIASA) ---
            try {
                // 1. CEK DULU DI CACHE BROWSER (GRATIS, GAK PAKAI FIREBASE READ)
                let cachedRole = sessionStorage.getItem("userRole_v1");
                
                if (cachedRole === "VIP" || cachedRole === "SUPER_ADMIN" || cachedRole === "EDITOR") {
                    console.log("Akses dari Cache! Hemat 1 Read Firebase.");
                    window.isVIPUser = true;
                    window.userRoleCakim = cachedRole;
                    lanjutKeAplikasi();
                    return; // BERHENTI DI SINI, GAK JADI MANGGIL FIREBASE
                }

                // 2. KALAU GAK ADA DI CACHE, BARU MINTA KE FIREBASE (BAYAR 1 READ)
                const accessRef = doc(db, "vip_access", user.email);
                let isAlreadyVerified = false;

                try {
                    const accessSnap = await getDoc(accessRef);
                    if (accessSnap.exists() && accessSnap.data().isVerified === true) {
                        isAlreadyVerified = true;
                    }
                } catch (errRead) {
                    // Sesuai Security Rules baru:
                    // User yang belum terverifikasi DILARANG membaca dokumennya sendiri
                    // agar tidak bisa mengintip field 'code' di console browser!
                    isAlreadyVerified = false;
                }
            
                if (isAlreadyVerified) {
                    window.isVIPUser = true; 
                    window.userRoleCakim = "VIP"; // Tandai VIP
                    
                    // SIMPAN KE BROWSER BIAR BESOK-BESOK GAK USAH FETCH LAGI
                    sessionStorage.setItem("userRole_v1", "VIP");
                    
                    lanjutKeAplikasi();
                    return;
                }

                // USER BARU / BELUM VERIFIKASI
                // Generate pendaftaran dokumen awal di Firestore (hanya diizinkan jika isVerified == false)
                try {
                    const randomAsas = legalTerms[Math.floor(Math.random() * legalTerms.length)];
                    const randomNum = Math.floor(100 + Math.random() * 899);
                    const finalCode = `${randomAsas}-${randomNum}`;

                    await setDoc(accessRef, {
                        name: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        code: finalCode,
                        isVerified: false,
                        createdAt: new Date()
                    });
                } catch (eCreate) {
                    // Jika dokumen sudah pernah dibuat sebelumnya, setDoc ditolak oleh Rules
                    // untuk menjaga agar kode unik yang tersimpan di DB tidak tertimpa/berubah.
                }

                showGateInput(user.displayName, user.email);
                window.updateUserStatus(true, "VIP Gatekeeper");
            } catch (e) {
                console.error("Error Gatekeeper:", e);
                alert("Gagal memuat data akses: " + e.message);
            }

        } else {
            // STATE LOGOUT
            window.userRoleCakim = null;
            sessionStorage.removeItem("userRole_v1"); // Hapus cache saat logout
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
        } else if (typeof EDITOR_EMAILS !== 'undefined' && EDITOR_EMAILS.includes(currentUser.email)) {
            if(roleLabel) roleLabel.innerHTML = '<i class="fas fa-user-edit" style="color:#3498db;"></i> Editor CBT';
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
    const errEl = document.getElementById('vipError');
    if (errEl) errEl.style.display = 'none';
    
    if(!input) return alert("Silahkan masukan kode unik!");

    btn.innerText = "Memverifikasi...";
    btn.disabled = true;

    try {
        const accessRef = doc(db, "vip_access", currentUser.email);
        
        // SERVER-SIDE VALIDATION:
        // Firestore Rules mengecek:
        // request.resource.data.inputCode == resource.data.code && request.resource.data.isVerified == true
        // Client tidak perlu dan tidak bisa membaca kode rahasia terlebih dahulu!
        await updateDoc(accessRef, { 
            isVerified: true, 
            inputCode: input,
            verifiedAt: new Date() 
        });
        
        window.isVIPUser = true;
        window.userRoleCakim = "VIP";
        sessionStorage.setItem("userRole_v1", "VIP");

        alert("\u2705 Akses VIP Terbuka! Selamat Belajar.");
        lanjutKeAplikasi();
    } catch (e) { 
        console.error("Gagal verifikasi kode VIP:", e);
        if (errEl) {
            errEl.style.display = 'block';
            errEl.innerText = "\u26A0\uFE0F Kode akses tidak sesuai atau belum diaktivasi oleh Admin!";
        } else {
            alert("\u26A0\uFE0F Kode akses tidak sesuai!");
        }
        btn.innerText = "BUKA AKSES SEKARANG";
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
        currentUser = null; window.currentUser = null;
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
    if (window.updateUserStatus) window.updateUserStatus(true, 'Melihat Peringkat / Klasemen');
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
            if(tableHeader) tableHeader.innerHTML = '<th style="width:10%">No</th><th>Nama</th><th style="width:20%">Nilai</th><th style="width:%">Total Tes</th>';
            
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

// ==========================================================
// PEMBERSIH STATE MODE (ISOLASI SINGLEPLAYER VS MULTIPLAYER)
// ==========================================================
window.bersihkanStateMode = function(modeTarget = 'ujian') {
    // 1. Matikan semua interval timer
    if (window.dobrakInterval) { clearInterval(window.dobrakInterval); window.dobrakInterval = null; }
    if (modeTarget === 'ujian') {
        if (window.roomHeartbeatTimer) { clearInterval(window.roomHeartbeatTimer); window.roomHeartbeatTimer = null; }
        if (window.hostClaimTimer) { clearTimeout(window.hostClaimTimer); window.hostClaimTimer = null; }
        if (window.roomSyncTimer) { clearInterval(window.roomSyncTimer); window.roomSyncTimer = null; }
        if (window.hostReadyTimerInterval) { clearInterval(window.hostReadyTimerInterval); window.hostReadyTimerInterval = null; }
        if (window.clientReadyTimerInterval) { clearInterval(window.clientReadyTimerInterval); window.clientReadyTimerInterval = null; }
        window.activeRoomIdx = -1;
        window.lastScoredIdx = -1;
        window.activePembahasanIdx = -1;
        window.sudahPernahDiRoom = false;
        window.activeRoomCodeLoaded = null;
        window.questionRenderTime = null;
    }
    if (typeof timerInterval !== 'undefined' && timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (typeof trainingTimerInterval !== 'undefined' && trainingTimerInterval) { clearInterval(trainingTimerInterval); trainingTimerInterval = null; }
    if (window.hafalanCountdown) { clearInterval(window.hafalanCountdown); window.hafalanCountdown = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (window.confettiInterval) { clearInterval(window.confettiInterval); window.confettiInterval = null; }
    if (window.confetti && typeof window.confetti.reset === 'function') { try { window.confetti.reset(); } catch(e) {} }

    // 2. Bersihkan inject CSS anti-freeze / style sisa review
    const unfreezeStyle = document.getElementById('review-unfreeze');
    if (unfreezeStyle) unfreezeStyle.remove();
    const hideBtnStyle = document.getElementById('hide-kembali-mabar');
    if (hideBtnStyle) hideBtnStyle.remove();

    // 3. Bersihkan inject elemen AI Chat & Admin Quick Edit dari DOM
    const aiChat = document.getElementById('aiChatDiv');
    if (aiChat) aiChat.remove();
    const adminQuick = document.getElementById('adminQuickEditDiv');
    if (adminQuick) adminQuick.remove();
    const roomBadge = document.getElementById('roomBadgeKhusus');
    if (roomBadge) roomBadge.remove();
    const warnTidakJawab = document.getElementById('warningTidakJawab');
    if (warnTidakJawab) warnTidakJawab.remove();
    const readyOverlay = document.getElementById('readyCheckOverlay');
    if (readyOverlay) readyOverlay.remove();
    const btnOutRoom = document.getElementById('btnKeluarRoomMode');
    if (btnOutRoom) btnOutRoom.remove();
    const floatMenu = document.getElementById('roomFloatingMenu');
    if (floatMenu) floatMenu.remove();
    const kahootOverlay = document.getElementById('kahootResultOverlay');
    if (kahootOverlay) kahootOverlay.remove();
    const roomResOverlay = document.getElementById('roomResultOverlay');
    if (roomResOverlay) roomResOverlay.remove();

    // 4. Buka SEMUA gembok & opacity kusam pada tombol (Kiri, Kanan Atas, Kanan Bawah, Finish)
    document.querySelectorAll('.nav-btn, .modul-btn, .btn-action, .btn-finish, .act-exit, .act-rank, .act-data, .act-admin, .action-box button, .right-header button, #btnShowScore, #btnAdminPanel, #btnFinish, #prevBtn, #nextBtn, .footer-nav button').forEach(btn => {
        btn.style.removeProperty('pointer-events');
        btn.style.removeProperty('opacity');
        btn.style.removeProperty('cursor');
        btn.style.setProperty('pointer-events', 'auto', 'important');
        btn.style.setProperty('opacity', '1', 'important');
        btn.style.setProperty('cursor', 'pointer', 'important');
        btn.disabled = false;
        btn.removeAttribute('disabled');
    });

    document.querySelectorAll('.sidebar-right, .nav-container, .nav-grid, .footer-nav').forEach(el => {
        el.style.removeProperty('pointer-events');
        el.style.removeProperty('opacity');
        el.style.setProperty('pointer-events', 'auto', 'important');
        el.style.setProperty('opacity', '1', 'important');
    });

    const rightLb = document.getElementById('rightSidebarLeaderboard');
    const navGrid = document.getElementById('navGrid');
    const legendContainer = document.querySelector('.legend');
    const raguWrapper = document.querySelector('.ragu-wrapper');
    const finishContainer = document.querySelector('.finish-container');
    const pBtn = document.getElementById('prevBtn');
    const nBtn = document.getElementById('nextBtn');
    const fbBox = document.getElementById('feedbackBox');
    const chatContainer = document.getElementById('roomChatContainer');
    const modulContainer = document.getElementById('modulSidebarContainer');

    if (modeTarget === 'room') {
        currentAppMode = 'room';
        window.currentAppMode = 'room';
        document.body.classList.add('room-mode');

        if (raguWrapper) raguWrapper.style.display = 'none';
        if (finishContainer) finishContainer.style.display = 'none';
        if (fbBox) {
            fbBox.style.display = 'none';
            fbBox.classList.remove('show');
            const aiInFb = fbBox.querySelector('#aiChatDiv');
            if (aiInFb) aiInFb.remove();
            const admInFb = fbBox.querySelector('#adminQuickEditDiv');
            if (admInFb) admInFb.remove();
        }
    } else {
        // Mode Singleplayer / Ujian Mandiri / Lobby
        currentAppMode = 'ujian';
        window.currentAppMode = 'ujian';
        currentRoomCode = null;
        window.currentRoomCode = null;
        isHost = false;
        window.isHost = false;
        isAnswerLocked = false;
        window.isAnswerLocked = false;
        isSubmitted = false;
        window.isSubmitted = false;
        isReviewMode = false;
        window.isReviewMode = false;

        document.body.classList.remove('room-mode');

        if (rightLb) rightLb.style.display = 'none';
        if (navGrid) {
            navGrid.style.display = '';
            navGrid.style.removeProperty('pointer-events');
            navGrid.style.removeProperty('opacity');
            navGrid.style.setProperty('pointer-events', 'auto', 'important');
            navGrid.style.setProperty('opacity', '1', 'important');
        }
        if (legendContainer) legendContainer.style.display = 'flex';
        if (raguWrapper) raguWrapper.style.display = '';
        if (finishContainer) {
            finishContainer.style.removeProperty('display');
            finishContainer.style.display = 'block';
        }
        if (pBtn) {
            pBtn.style.display = 'inline-block';
            pBtn.style.removeProperty('pointer-events');
            pBtn.style.removeProperty('opacity');
            pBtn.style.setProperty('pointer-events', 'auto', 'important');
            pBtn.style.setProperty('opacity', '1', 'important');
        }
        if (nBtn) {
            nBtn.style.display = 'inline-block';
            nBtn.style.removeProperty('pointer-events');
            nBtn.style.removeProperty('opacity');
            nBtn.style.setProperty('pointer-events', 'auto', 'important');
            nBtn.style.setProperty('opacity', '1', 'important');
        }

        if (fbBox) {
            fbBox.style.display = 'none';
            fbBox.classList.remove('show');
            const aiInFb = fbBox.querySelector('#aiChatDiv');
            if (aiInFb) aiInFb.remove();
            const admInFb = fbBox.querySelector('#adminQuickEditDiv');
            if (admInFb) admInFb.remove();
        }

        if (chatContainer) chatContainer.style.display = 'none';
        if (modulContainer) modulContainer.style.display = 'flex';
    }
};

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
    
    // 🛑 RESET TOTAL ISOLASI JIKA MEMULAI UJIAN MANDIRI (SINGLEPLAYER) 🛑
    if (currentAppMode !== 'room' || !window.currentRoomCode) {
        window.bersihkanStateMode('ujian');
    }

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
        // 🛑 MODE SINGLEPLAYER CBT: HANYA memanggil get() pada collection modul yang sedang aktif 🛑
        else {
            // 1. Panggil langsung collection modul yang sedang aktif (sesuai paket ujian per modul)
            const modulColRef = collection(db, key);
            let qSnap = await getDocs(modulColRef);

            // Fallback kompatibilitas jika koleksi modul masih di subkoleksi bank_soal/{key}/daftar_soal
            if (qSnap.empty) {
                const legacySubCol = collection(db, "bank_soal", key, "daftar_soal");
                const legacySnap = await getDocs(legacySubCol);
                if (!legacySnap.empty) {
                    qSnap = legacySnap;
                } else {
                    const v2Doc = await getDoc(doc(db, "bank_soal_v2", key));
                    if (v2Doc.exists() && v2Doc.data().daftar_soal_array) {
                        judulModul = v2Doc.data().title || judulModul;
                        const arr = v2Doc.data().daftar_soal_array;
                        arr.forEach((item, idx) => {
                            let d = JSON.parse(JSON.stringify(item));
                            d.id = d.id || `${key}_${idx}`;
                            rawQuestions.push(d);
                        });
                        jumlahSoalServer = rawQuestions.length;
                    }
                }
            }

            if (rawQuestions.length === 0) {
                if (qSnap.empty) {
                    alert("⚠️ Soal untuk modul ini belum tersedia atau belum di-upload!");
                    if(qText) qText.innerText = "Belum ada soal.";
                    return;
                }
                
                jumlahSoalServer = qSnap.size;
                qSnap.forEach((docSnap) => { 
                    let d = JSON.parse(JSON.stringify(docSnap.data())); 
                    d.id = docSnap.id; 
                    rawQuestions.push(d); 
                });
            }
        }

        // 🛑 PENGATURAN KUNCI JAWABAN: Terisolasi untuk Ujian Mandiri, Aktif untuk Multiplayer 🛑
        const mapKunciModul = {};
        rawQuestions.forEach((q, idx) => {
            const idSoal = q.id || `q_${idx}`;
            if (q.answer !== undefined || q.kunci !== undefined || q.explanation) {
                mapKunciModul[idSoal] = {
                    answer: q.answer !== undefined ? q.answer : q.kunci,
                    explanation: q.explanation || "-",
                    cite: q.cite || "-"
                };
            }
            // HAPUS kunci jawaban & pembahasan dari objek soal HANYA saat Ujian Mandiri (Singleplayer)
            // Di mode Multiplayer (Room), kunci & pembahasan TETAP AKTIF untuk fitur bedah soal & live score!
            if (currentAppMode !== 'room') {
                delete q.answer;
                delete q.kunci;
                delete q.explanation;
                delete q.cite;
            }
        });

        if (Object.keys(mapKunciModul).length > 0) {
            _kunciJawabanStore.set(key, mapKunciModul);
            if (window.currentRoomCode) {
                _kunciJawabanStore.set(window.currentRoomCode, mapKunciModul);
            }
        }

        const dataLama = loadProgresLokal(key);

        // SYARAT PAKAI CACHE
        if (dataLama && dataLama.soalAcak && dataLama.soalAcak.length > 0 && currentAppMode !== 'room' && dataLama.soalAcak.length === jumlahSoalServer) {
            console.log(`🔄 Melanjutkan progres lama untuk modul: ${key}`);
            currentQuestions = dataLama.soalAcak;
            // Pastikan tidak ada kunci jawaban yang tertinggal di cache lama untuk singleplayer
            currentQuestions.forEach(q => {
                delete q.answer;
                delete q.kunci;
                delete q.explanation;
                delete q.cite;
            });
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
            
            const mapKunci = _kunciJawabanStore.get(key) || {};

            rawQuestions.forEach((q, idx) => {
                const idSoal = q.id || `q_${idx}`;
                const infoKunci = mapKunci[idSoal];

                if(q.options) {
                    let correctText = null;
                    if (infoKunci && infoKunci.answer !== undefined && infoKunci.answer < q.options.length) {
                        correctText = q.options[infoKunci.answer]; 
                    } else if (q.answer !== undefined && q.answer < q.options.length) {
                        correctText = q.options[q.answer];
                    }

                    if (currentAppMode !== 'room') {
                        shuffleArray(q.options); 
                    }

                    if (correctText !== null) {
                        if (infoKunci) {
                            infoKunci.answer = q.options.indexOf(correctText);
                            infoKunci.correctAnswerText = correctText;
                        }
                        if (currentAppMode === 'room') {
                            q.answer = q.options.indexOf(correctText);
                        }
                    }
                }

                // Bersihkan properti kunci dari objek soal HANYA saat Ujian Mandiri
                if (currentAppMode !== 'room') {
                    delete q.answer;
                    delete q.kunci;
                    delete q.explanation;
                    delete q.cite;
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
        window.isSubmitted = false;
        isReviewMode = false;
        window.isReviewMode = false;
        isAnswerLocked = false;
        window.isAnswerLocked = false;
        currentIdx = 0;

        if (currentAppMode !== 'room') {
            document.querySelectorAll('.nav-btn, .modul-btn, .btn-action, .btn-finish, .act-exit, .act-rank, .act-data, .act-admin, .action-box button, .right-header button, #btnShowScore, #btnAdminPanel, #btnFinish').forEach(btn => {
                btn.style.removeProperty('pointer-events');
                btn.style.removeProperty('opacity');
                btn.style.removeProperty('cursor');
                btn.style.setProperty('pointer-events', 'auto', 'important');
                btn.style.setProperty('opacity', '1', 'important');
                btn.style.setProperty('cursor', 'pointer', 'important');
                btn.disabled = false;
                btn.removeAttribute('disabled');
            });
            document.querySelectorAll('.sidebar-right, .nav-container, .nav-grid, .footer-nav').forEach(el => {
                el.style.removeProperty('pointer-events');
                el.style.removeProperty('opacity');
                el.style.setProperty('pointer-events', 'auto', 'important');
                el.style.setProperty('opacity', '1', 'important');
            });
        }

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

    // 🛑 PEMBERSIHAN KETAT MODE ROOM: AI Chat & Admin Quick Edit tidak boleh ada di Room
    if (isModeRoom) {
        const ai = document.getElementById('aiChatDiv');
        if (ai) ai.remove();
        const adm = document.getElementById('adminQuickEditDiv');
        if (adm) adm.remove();
    }
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

    // Render teks pertanyaan dan gambar/media dengan Lazy Loading
    const mediaUrl = q.image || q.gambar || q.media || q.foto || q.img || q.mediaUrl;
    let extraMediaHtml = '';
    if (mediaUrl) {
        extraMediaHtml = `
            <div class="soal-media-container" style="text-align:center; margin:14px 0;">
                <img src="${mediaUrl}" 
                     alt="Media Soal" 
                     loading="lazy" 
                     decoding="async" 
                     class="soal-media-img" 
                     style="max-width:100%; max-height:360px; border-radius:8px; box-shadow:0 3px 10px rgba(0,0,0,0.12); object-fit:contain; cursor:pointer;" 
                     onclick="window.previewImageModal && window.previewImageModal('${mediaUrl}')" />
            </div>`;
    }

    const qTextEl = document.getElementById('questionText');
    if (qTextEl) {
        qTextEl.innerHTML = renderLazyMedia(q.q) + extraMediaHtml;
    }
    
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
        const fText = document.getElementById('feedbackText'); if(fText) fText.innerHTML = renderLazyMedia(highlightTeks(teksPembahasan, jawabanBenar));
        
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
        }
        
    } else { 
        if(fb) { fb.style.display = 'none'; fb.classList.remove('show'); } 
    }
    
    const cont = document.getElementById('optionsContainer');
    cont.innerHTML = '';
    q.options.forEach((opt, i) => {
        const div = document.createElement('div');
        div.className = 'option-label';
        const formattedOpt = renderLazyMedia(opt);
        if(isSelesaiMode) {
            div.style.cursor = 'default';
            if(userAnswers[idx] === i) {
                div.innerHTML = i === q.answer ? formattedOpt + ' ✅' : formattedOpt + ' ❌';
                div.classList.add(i === q.answer ? 'review-correct' : 'review-wrong');
            }
            else if(i === q.answer) {
                div.innerHTML = formattedOpt + ' ⬅️ (Jawaban Benar)';
                div.classList.add('review-correct');
            } else {
                div.innerHTML = formattedOpt;
            }
        } else {
           div.innerHTML = formattedOpt;
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
        document.querySelectorAll('.nav-btn, .modul-btn, .btn-action, .btn-finish, .act-exit, .act-rank, .act-data, .act-admin, .action-box button, .right-header button, #btnShowScore, #btnAdminPanel, #btnFinish').forEach(btn => {
            btn.style.removeProperty('pointer-events');
            btn.style.removeProperty('opacity');
            btn.style.removeProperty('cursor');
            btn.style.setProperty('pointer-events', 'auto', 'important');
            btn.style.setProperty('opacity', '1', 'important');
            btn.style.setProperty('cursor', 'pointer', 'important');
            btn.disabled = false;
            btn.removeAttribute('disabled');
        });

        if (navGridContainer) navGridContainer.style.display = ''; 
        if (legendContainer) legendContainer.style.display = 'flex';
        if (rightLb) rightLb.style.display = 'none';
    }
} // <--- PASTIKAN KURUNG KURAWAL INI TETAP ADA SEBAGAI PENUTUP SEBAGAI PENUTUP
// ==========================================
// FUNGSI SUBMIT FINAL
// ==========================================
window.submitQuiz = async function() {
    if(typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
    window.speechSynthesis.cancel();
    
    const currentDB = window.currentDatabaseId || "";
    hapusProgresModul(currentDB);
    
    const sbRight = document.querySelector('.sidebar-right');
    if (sbRight) { sbRight.classList.remove('show-mobile'); sbRight.style.display = ''; }
    
    const floatTimer = document.getElementById('floatingTimer');
    if(floatTimer) floatTimer.style.setProperty('display', 'none', 'important');

    // 🛑 AMBIL KUNCI JAWABAN SAAT UJIAN SELESAI (EVALUASI NILAI & PEMBAHASAN) 🛑
    // Kunci jawaban sengaja tidak dipanggil saat ujian sedang berjalan demi integritas CBT
    const kunciMap = await loadKunciJawabanUjian(currentDB);
    if (currentQuestions && currentQuestions.length > 0) {
        currentQuestions.forEach((q, idx) => {
            const idSoal = q.id || `q_${idx}`;
            const kData = kunciMap[idSoal] || kunciMap[idx];
            if (kData) {
                q.answer = typeof kData === 'object' && kData.answer !== undefined ? kData.answer : kData;
                q.explanation = (typeof kData === 'object' && kData.explanation) ? kData.explanation : (q.explanation || "-");
                q.cite = (typeof kData === 'object' && kData.cite) ? kData.cite : (q.cite || "-");
            }
        });
    }

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
        "Yakin mau kembali ke menu utama?",
        "Ya, Kembali"
    );

    if (yakin) {
        if (typeof window.bersihkanStateMode === 'function') {
            window.bersihkanStateMode('ujian');
        }

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
    // ðŸ›‘ 0. LANGSUNG PUTUS KONEKSI SEBELUM UPDATE KE FIREBASE
    // Agar snapshot sisa / status room tidak menimpa kembali UI lobby
    if (typeof roomListenerUnsubscribe !== 'undefined' && roomListenerUnsubscribe) {
        try { roomListenerUnsubscribe(); roomListenerUnsubscribe = null; } catch(e) {}
    }

    const leavingRoomCode = currentRoomCode || window.currentRoomCode;
    const activeUser = (typeof currentUser !== 'undefined' && currentUser) || window.currentUser;
    const leavingUid = activeUser ? activeUser.uid : null;

    // Reset Variabel Mode segera
    currentRoomCode = null;
    window.currentRoomCode = null;
    isHost = false;
    window.isHost = false;
    currentAppMode = 'ujian'; 
    window.currentAppMode = 'ujian';
    window.activeRoomIdx = -1;
    window.lastScoredIdx = -1;
    window.activePembahasanIdx = -1;
    window.sudahPernahDiRoom = false;
    window.activeRoomCodeLoaded = null;
    window.questionRenderTime = null;

    // Matikan kembang api dan bersihkan overlay podium
    if (window.confettiInterval) { clearInterval(window.confettiInterval); window.confettiInterval = null; }
    if (window.confetti && typeof window.confetti.reset === 'function') { try { window.confetti.reset(); } catch(e) {} }
    const kahootOverlay = document.getElementById('kahootResultOverlay');
    if (kahootOverlay) kahootOverlay.remove();

    // ðŸ›‘ PERBARUI LAST SEEN SAAT KELUAR KE LOBBY (ROOM TETAP AKTIF AGAR BISA GABUNG LAGI DARI LOBBY)
    if (leavingRoomCode && leavingUid) {
        try {
            const roomRef = doc(window.db || db, "rooms", leavingRoomCode);
            let updatePayload = {
                [`players.${leavingUid}.isOffline`]: true,
                [`players.${leavingUid}.lastSeen`]: 0
            };
            if (isHost || (window.latestRoomData && window.latestRoomData.hostUid === leavingUid)) {
                updatePayload.hostTerputusAt = Date.now();
            }
            updateDoc(roomRef, updatePayload).catch(() => {});
        } catch(e) {
            console.log("Gagal sinkron lastSeen saat keluar ke lobby:", e);
        }
    }
    if (typeof window.bersihkanStateMode === 'function') {
        window.bersihkanStateMode('ujian');
    }

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
        "Yakin mau menghapus SEMUA riwayat nilai untuk modul ini? Data di Cloud akan hilang permanen.",
        "Ya, Hapus"
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
    if (window.updateUserStatus) window.updateUserStatus(true, 'Melihat Statistik Belajar');
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
    if (window.updateUserStatus) window.updateUserStatus(true, 'Lobby Utama');
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
    
    // Opsi Pilih Semua Modul
    listDiv.innerHTML += `
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; padding:6px; border-bottom:2px solid #ddd; background:#eef2f5; border-radius:4px; font-weight:bold; color:var(--primary); margin-bottom:4px;">
            <input type="checkbox" id="chkPilihSemuaModul" onchange="document.querySelectorAll('.chk-modul-mabar').forEach(c => c.checked = this.checked)">
            <span>✓ Pilih Semua Modul</span>
        </label>
    `;

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
    
    // Ambil Pengaturan Jumlah Soal & Waktu Per Soal yang Ditentukan Host
    const rawJumlahSoal = document.getElementById('inputJumlahSoal') ? document.getElementById('inputJumlahSoal').value.trim() : '';
    const targetJumlahSoal = (rawJumlahSoal && !isNaN(rawJumlahSoal) && parseInt(rawJumlahSoal) > 0) ? parseInt(rawJumlahSoal) : null;

    const rawWaktu = document.getElementById('inputWaktuPerSoal') ? document.getElementById('inputWaktuPerSoal').value.trim() : '';
    const waktuPerSoal = (rawWaktu && !isNaN(rawWaktu) && parseInt(rawWaktu) >= 5) ? parseInt(rawWaktu) : 30;

    const waktuMulaiMilis = jadwalStr ? new Date(jadwalStr).getTime() : new Date().getTime() + 5000; 
    let selectedModuls = Array.from(chks).map(c => c.value);
    
    document.getElementById('modalBikinRoom').style.display = 'none';
    PROTAMA.loading("Meracik Soal Mabar...");
    
    try {
        // Fungsi helper multi-skema untuk mengambil bank soal modul
        const ambilSoalModul = async (modId) => {
            let soalModulIni = [];
            try {
                // 1. Cek koleksi langsung (modulId)
                const modulColRef = collection(window.db, modId);
                let qSnap = await getDocs(modulColRef);

                // 2. Fallback legacy bank_soal/{modId}/daftar_soal
                if (qSnap.empty) {
                    const legacyCol = collection(window.db, "bank_soal", modId, "daftar_soal");
                    const legacySnap = await getDocs(legacyCol);
                    if (!legacySnap.empty) {
                        qSnap = legacySnap;
                    } else {
                        // 3. Fallback bank_soal_v2 array dokumen
                        const v2Doc = await getDoc(doc(window.db, "bank_soal_v2", modId));
                        if (v2Doc.exists() && v2Doc.data().daftar_soal_array) {
                            const arr = v2Doc.data().daftar_soal_array;
                            arr.forEach((item, idx) => {
                                let d = JSON.parse(JSON.stringify(item));
                                d.id = d.id || `${modId}_${idx}`;
                                d._asalModul = modId;
                                soalModulIni.push(d);
                            });
                        }
                    }
                }

                if (qSnap.empty && soalModulIni.length === 0) {
                    const aliasMap = {
                        'modul_4': ['modul_hir', 'modul_hir_rbg_rv', 'hafalan_hir_rbg_rv', 'modul_hafalan_hir'],
                        'modul_5': ['modul_sema', 'kumpulan_sema', 'modul_kumpulan_sema'],
                        'modul_hir': ['modul_4'],
                        'modul_sema': ['modul_5']
                    };
                    if (aliasMap[modId]) {
                        for (const altKey of aliasMap[modId]) {
                            let altColRef = collection(window.db, altKey);
                            let altSnap = await getDocs(altColRef);
                            if (altSnap.empty) {
                                altSnap = await getDocs(collection(window.db, "bank_soal", altKey, "daftar_soal"));
                            }
                            if (!altSnap.empty) {
                                qSnap = altSnap;
                                break;
                            }
                        }
                    }
                }

                if (soalModulIni.length === 0 && !qSnap.empty) {
                    qSnap.forEach(docSnap => {
                        let d = JSON.parse(JSON.stringify(docSnap.data()));
                        d.id = docSnap.id;
                        d._asalModul = modId;
                        soalModulIni.push(d);
                    });
                }
            } catch (err) {
                console.warn(`Gagal memuat modul ${modId}:`, err);
            }
            return soalModulIni;
        };

        // Ambil soal dari semua modul yang dipilih secara paralel
        const kumpulanPerModul = await Promise.all(selectedModuls.map(m => ambilSoalModul(m)));
        
        // Acak masing-masing modul lebih dulu agar pengambilan acak merata
        kumpulanPerModul.forEach(list => shuffleArray(list));

        const totalSoalTersedia = kumpulanPerModul.reduce((sum, list) => sum + list.length, 0);

        if (totalSoalTersedia === 0) {
            PROTAMA.close();
            return PROTAMA.alert("Kosong", "Modul yang dipilih belum memiliki bank soal!", "error");
        }

        // Tentukan batas soal yang diinginkan
        let batasFinal = (targetJumlahSoal !== null && targetJumlahSoal < totalSoalTersedia) ? targetJumlahSoal : totalSoalTersedia;

        // Distribusi proporsional adil (Round-Robin) antar modul yang dipilih
        let kawahSoal = [];
        let indexPerModul = new Array(kumpulanPerModul.length).fill(0);
        let masihAdaSoal = true;

        while (kawahSoal.length < batasFinal && masihAdaSoal) {
            masihAdaSoal = false;
            for (let m = 0; m < kumpulanPerModul.length; m++) {
                if (indexPerModul[m] < kumpulanPerModul[m].length) {
                    kawahSoal.push(kumpulanPerModul[m][indexPerModul[m]]);
                    indexPerModul[m]++;
                    masihAdaSoal = true;
                    if (kawahSoal.length >= batasFinal) break;
                }
            }
        }

        // Acak kembali urutan soal gabungan agar tidak berurutan per modul
        shuffleArray(kawahSoal);
        let soalMabarFinal = kawahSoal; 

        // Acak pilihan jawaban per soal dan kunci jawaban yang benar
        soalMabarFinal.forEach(q => {
            if(q.options && q.answer !== undefined && q.answer < q.options.length) {
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
            waktuPerSoal: waktuPerSoal, // Waktu per soal ditentukan oleh Host
            jumlahSoalTarget: soalMabarFinal.length, // Total soal hasil racikan
            status: 'waiting', 
            currentIdx: 0,
            players: {
                // 🛑 SISIPKAN FOTO HOST DI SINI 🛑
                [currentUser.uid]: { nama: currentUser.displayName, skor: 0, totalWaktu: 0, jawabanSekarang: null, photoURL: currentUser.photoURL || null, isVIP: !!window.isVIPUser, email: currentUser.email || '', lastSeen: Date.now() }
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
        if (dataRoom.kickedUids && currentUser && dataRoom.kickedUids.includes(currentUser.uid)) {
            PROTAMA.close();
            return PROTAMA.alert("Akses Ditolak", "Kamu telah dikeluarkan (kick) oleh Host dari room ini dan tidak dapat bergabung kembali.", "error");
        }
        const isPemainLama = dataRoom.players && dataRoom.players[currentUser.uid];

        if (dataRoom.status !== 'waiting' && !isPemainLama) {
            PROTAMA.close();
            return PROTAMA.alert("Telat", "Ujian di room ini udah dimulai, peserta baru tidak bisa masuk!", "warning");
        }

        if (!isPemainLama) {
            // 🛑 SISIPKAN FOTO PESERTA JOIN MANUAL DI SINI 🛑
            await updateDoc(roomRef, {
                [`players.${currentUser.uid}`]: { nama: currentUser.displayName, skor: 0, totalWaktu: 0, jawabanSekarang: null, photoURL: currentUser.photoURL || null, isVIP: !!window.isVIPUser, email: currentUser.email || '', lastSeen: Date.now() }
            });
        } else {
            // Kalau dia udah ada, sekalian kita timpa fotonya (jaga-jaga kalau kemarin fotonya kosong)
            await updateDoc(roomRef, {
                [`players.${currentUser.uid}.photoURL`]: currentUser.photoURL || null,
                [`players.${currentUser.uid}.isVIP`]: !!window.isVIPUser,
                [`players.${currentUser.uid}.lastSeen`]: Date.now(),
                [`players.${currentUser.uid}.isOffline`]: false,
                hostTerputusAt: null
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
        if (dataRoom.kickedUids && currentUser && dataRoom.kickedUids.includes(currentUser.uid)) {
            PROTAMA.close();
            return PROTAMA.alert("Akses Ditolak", "Kamu telah dikeluarkan (kick) oleh Host dari room ini dan tidak dapat bergabung kembali.", "error");
        }
        const isPemainLama = dataRoom.players && dataRoom.players[currentUser.uid];

        if (dataRoom.status !== 'waiting' && !isPemainLama) {
            PROTAMA.close();
            window.history.replaceState(null, null, window.location.pathname);
            return PROTAMA.alert("Telat", "Ujian di room ini udah dimulai, peserta baru tidak bisa masuk!", "warning");
        }

        if (!isPemainLama) {
            // 🛑 SISIPKAN FOTO PESERTA JOIN LINK DI SINI 🛑
            await updateDoc(roomRef, {
                [`players.${currentUser.uid}`]: { nama: currentUser.displayName, skor: 0, totalWaktu: 0, jawabanSekarang: null, photoURL: currentUser.photoURL || null, isVIP: !!window.isVIPUser, email: currentUser.email || '', lastSeen: Date.now() }
            });
        } else {
            // Kalau dia udah ada, sekalian kita timpa fotonya
            await updateDoc(roomRef, {
                [`players.${currentUser.uid}.photoURL`]: currentUser.photoURL || null,
                [`players.${currentUser.uid}.isVIP`]: !!window.isVIPUser,
                [`players.${currentUser.uid}.lastSeen`]: Date.now(),
                [`players.${currentUser.uid}.isOffline`]: false,
                hostTerputusAt: null
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
window.tampilkanWaitingRoom = function(kode, isHostParam, modulId = "latihan") {
    const activeUser = (typeof currentUser !== 'undefined' && currentUser) || window.currentUser;
    const activeUid = activeUser ? activeUser.uid : null;
    let effectiveIsHost = (typeof isHostParam !== 'undefined') ? !!isHostParam : (window.isHost || (activeUid && window.latestRoomData && window.latestRoomData.hostUid === activeUid));
    window.isHost = effectiveIsHost;
    isHost = effectiveIsHost;
    if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
    if (typeof window.bersihkanStateMode === 'function') {
        window.bersihkanStateMode('room');
    }
    
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
            
            <!-- KETERANGAN MODUL & PENGATURAN -->
            <div style="background:#e3f2fd; padding:12px; border-radius:8px; border:1px solid #90caf9; margin-bottom:20px; font-weight:bold; color:#1565c0; font-size: 0.95rem;">
                <div><i class="fas fa-book-open"></i> Materi Ujian: ${namaModulBersih}</div>
                <div id="wrInfoDetailSoal" style="margin-top:8px; font-size:0.85rem; color:#2c3e50; font-weight:600; display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
                    <span>⏳ Memuat konfigurasi room...</span>
                </div>
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
            ${effectiveIsHost ? `
                <div style="margin-top: 15px;">
                    <button onclick="window.hapusRoomJadwal('${kode}')" style="background:none; border:none; color:#e74c3c; font-size:0.85rem; cursor:pointer; text-decoration:underline;">
                        <i class="fas fa-trash-alt"></i> Batalkan / Bubarkan Room Ini
                    </button>
                </div>
            ` : ''}
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

            // Render Info Konfigurasi Room (Jumlah Soal & Durasi Waktu)
            const totalSoal = (dataRoom.soalTersimpan && Array.isArray(dataRoom.soalTersimpan)) ? dataRoom.soalTersimpan.length : (dataRoom.jumlahSoalTarget || 0);
            const detikPerSoal = dataRoom.waktuPerSoal || 30;
            const elInfo = document.getElementById('wrInfoDetailSoal');
            if (elInfo) {
                elInfo.innerHTML = `
                    <span style="background:white; padding:4px 12px; border-radius:15px; border:1px solid #bbdefb; box-shadow:0 1px 3px rgba(0,0,0,0.05);"><i class="fas fa-list-ol" style="color:var(--primary);"></i> <b>${totalSoal} Soal</b></span>
                    <span style="background:white; padding:4px 12px; border-radius:15px; border:1px solid #bbdefb; box-shadow:0 1px 3px rgba(0,0,0,0.05);"><i class="fas fa-stopwatch" style="color:#e67e22;"></i> <b>${detikPerSoal} Detik / Soal</b></span>
                `;
            }

            let tombolMulai = document.querySelector(`button[onclick="window.mulaiUjianRoom('${kode}')"]`);
            const activeUserWR = (typeof currentUser !== 'undefined' && currentUser) || window.currentUser;
            const activeUidWR = activeUserWR ? activeUserWR.uid : null;
            if (activeUidWR && dataRoom.hostUid === activeUidWR) {
                window.isHost = true;
                isHost = true;
                if (!tombolMulai) {
                    const divTungguWR = document.querySelector('div.fa-spinner')?.parentNode;
                    if (divTungguWR) {
                        divTungguWR.outerHTML = `<button onclick="window.mulaiUjianRoom('${kode}')" style="background:var(--success); color:white; padding:15px 30px; border:none; border-radius:8px; font-size:1.2rem; font-weight:bold; cursor:pointer; margin-top:10px; width:100%; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"><i class="fas fa-rocket"></i> MULAI</button>`;
                        tombolMulai = document.querySelector(`button[onclick="window.mulaiUjianRoom('${kode}')"]`);
                    }
                }
            }
            
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

    listContainer.innerHTML = '<p style="color:#ccc; text-align:center; margin: 10px 0;"><i class="fas fa-spinner fa-spin"></i> Mengecek jadwal & room aktif...</p>';

    try {
        const qRef = collection(window.db || db, "rooms");
        const snapshot = await getDocs(qRef);

        let html = '';
        let adaJadwalAktif = false;
        let waktuSekarang = new Date().getTime();
        
        let uidSaya = null;
        let namaSaya = null;
        if (typeof currentUser !== 'undefined' && currentUser) {
            uidSaya = currentUser.uid;
            namaSaya = currentUser.displayName;
        } else if (window.currentUser) {
            uidSaya = window.currentUser.uid;
            namaSaya = window.currentUser.displayName;
        }

        const kamusModul = {
            "ilmu_hukum": "Ilmu Hukum Dasar",
            "modul1": "Modul 1: Kekuasaan Kehakiman",
            "modul2": "Modul 2: Mahkamah Agung",
            "modul3": "Modul 3: Peradilan Agama",
            "modul6": "Modul 6: PMH & Wanprestasi",
            "modul8": "Modul 8: Perkawinan (KHI)",
            "modul8_1": "Modul 8.1: Perkawinan",
            "latihan": "Modul Latihan Campuran"
        };

        const statusAktif = ['waiting', 'ready_check', 'soal', 'pembahasan', 'ujian'];

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const roomId = docSnap.id;

            if (statusAktif.includes(data.status)) {
                // Sembunyikan room lama (lebih dari 6 jam)
                let waktuBuat = (data.createdAt && data.createdAt.toMillis) ? data.createdAt.toMillis() : (data.jadwal_mulai || 0);
                if (waktuBuat && (waktuSekarang - waktuBuat > (6 * 60 * 60 * 1000))) return;

                adaJadwalAktif = true;

                let isMyRoom = (uidSaya && data.hostUid === uidSaya) || 
                               (namaSaya && data.hostName === namaSaya);
                let isAlreadyJoined = (uidSaya && data.players && !!data.players[uidSaya]);
                let totalPeserta = Object.keys(data.players || {}).length;

                let namaModul = kamusModul[data.modulId] || (data.modulId || "Modul Latihan").replace(/_/g, ' ').toUpperCase();

                // 1. TOMBOL HAPUS (Khusus Host / Super Admin)
                let btnHapus = (isMyRoom || (window.userRoleCakim === "SUPER_ADMIN")) ? 
                    `<button onclick="window.hapusRoomJadwal('${roomId}')" style="background:transparent; color:#d32f2f; border:1px solid #d32f2f; padding:7px 10px; border-radius:6px; cursor:pointer; font-size:0.85rem; transition:0.3s;" title="Batalkan / Bubarkan Room">
                        <i class="fas fa-trash-alt"></i>
                    </button>` : '';

                // 2. TOMBOL COPY LINK
                let linkRoom = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
                let btnCopyLink = `
                    <button onclick="navigator.clipboard.writeText('${linkRoom}'); PROTAMA.alert('Link Disalin!', 'Bagikan link ini ke temanmu via WhatsApp.', 'success');" style="background:transparent; color:#3498db; border:1px solid #3498db; padding:7px 10px; border-radius:6px; cursor:pointer; font-size:0.85rem; margin-right:6px; transition:0.3s;" title="Salin Link Invite">
                        <i class="fas fa-link"></i>
                    </button>
                `;

                // 3. BADGE STATUS & TOMBOL AKSI
                let badgeStatus = '';
                let btnAksi = '';

                if (data.status === 'waiting') {
                    badgeStatus = `<span style="background:#e8f5e9; color:#2e7d32; border:1px solid #c8e6c9; padding:2px 8px; border-radius:12px; font-weight:bold; font-size:0.75rem;"><i class="fas fa-hourglass-half"></i> Ruang Tunggu</span>`;
                    if (isMyRoom) {
                        btnAksi = `<button onclick="window.gabungRoomLatihanOtomatis('${roomId}')" style="background:#2e7d32; color:white; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.85rem; box-shadow:0 2px 5px rgba(0,0,0,0.1); margin-right:6px;">
                            <i class="fas fa-crown"></i> Masuk (Host)
                        </button>`;
                    } else if (isAlreadyJoined) {
                        btnAksi = `<button onclick="window.gabungRoomLatihanOtomatis('${roomId}')" style="background:#1565c0; color:white; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.85rem; box-shadow:0 2px 5px rgba(0,0,0,0.1); margin-right:6px;">
                            <i class="fas fa-sign-in-alt"></i> Masuk Kembali
                        </button>`;
                    } else {
                        btnAksi = `<button onclick="window.gabungRoomLatihanOtomatis('${roomId}')" style="background:var(--success); color:white; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.85rem; box-shadow:0 2px 5px rgba(0,0,0,0.1); margin-right:6px;">
                            <i class="fas fa-sign-in-alt"></i> GABUNG
                        </button>`;
                    }
                } else {
                    // Sedang jalan ujian / ready check / pembahasan
                    badgeStatus = `<span style="background:#fee2e2; color:#dc2626; border:1px solid #fecaca; padding:2px 8px; border-radius:12px; font-weight:bold; font-size:0.75rem;"><i class="fas fa-bolt"></i> Live Ujian (Soal ${(data.currentIdx || 0) + 1}/${(data.soalTersimpan || []).length})</span>`;
                    if (isAlreadyJoined || isMyRoom) {
                        btnAksi = `<button onclick="window.gabungRoomLatihanOtomatis('${roomId}')" style="background:#e67e22; color:white; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.85rem; box-shadow:0 2px 5px rgba(0,0,0,0.1); margin-right:6px;">
                            <i class="fas fa-sync-alt"></i> Reconnect Mabar
                        </button>`;
                    } else {
                        btnAksi = `<span style="color:#888; font-size:0.8rem; font-style:italic; padding:6px 10px; background:#eee; border-radius:6px; margin-right:6px;"><i class="fas fa-lock"></i> Sesi Berjalan</span>`;
                    }
                }

                html += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:14px; margin-bottom:12px; border:1px solid #e0e0e0; border-radius:10px; background:#ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.03); gap:12px; flex-wrap:wrap;">
                        <div style="flex:1; min-width:200px;">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                                <h6 style="margin:0; color:var(--primary); font-size:1rem; font-weight:bold;">${data.nama || ('Room ' + roomId)}</h6>
                                ${badgeStatus}
                            </div>
                            <div style="font-size:0.82rem; color:#666; display:flex; gap:12px; flex-wrap:wrap; margin-top:5px;">
                                <span><i class="fas fa-key" style="color:#f39c12;"></i> Kode: <b>${roomId}</b></span>
                                <span><i class="fas fa-book-open" style="color:var(--primary);"></i> ${namaModul}</span>
                                <span><i class="fas fa-crown" style="color:#f1c40f;"></i> Host: <b>${data.hostName || 'Host'}</b></span>
                                <span><i class="fas fa-users" style="color:#3498db;"></i> <b>${totalPeserta}</b> Peserta</span>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center;">
                            ${btnAksi}
                            ${btnCopyLink}
                            ${btnHapus}
                        </div>
                    </div>
                `;
            }
        });

        if (!adaJadwalAktif) {
            listContainer.innerHTML = '<p style="color:#999; text-align:center; margin: 15px 0; font-style:italic;">Belum ada room atau jadwal Tryout aktif.</p>';
        } else {
            listContainer.innerHTML = html;
        }

    } catch (e) {
        console.error("Gagal load jadwal:", e);
        listContainer.innerHTML = '<p style="color:var(--danger); text-align:center; margin: 10px 0;">Gagal memuat jadwal dari server.</p>';
    }
};

window.hapusRoomJadwal = async (roomId) => {
    const yakin = await PROTAMA.confirm("Batalkan Tryout?", "Room ini akan dibatalkan permanen dan peserta lain akan dikeluarkan.");
    if (!yakin) return;

    PROTAMA.loading("Membatalkan Room...");
    try {
        const roomRef = doc(window.db || db, "rooms", roomId);
        await updateDoc(roomRef, { status: 'dibatalkan' }).catch(() => {});
        await deleteDoc(roomRef).catch(() => {});
        PROTAMA.close();
        PROTAMA.alert("Berhasil", "Room Tryout berhasil dibatalkan dan dihapus.", "success");
        if (typeof window.loadJadwalLobby === 'function') window.loadJadwalLobby();
        if (currentRoomCode === roomId || window.currentRoomCode === roomId) {
            window.keluarDariRoom();
        }
    } catch (e) {
        PROTAMA.close();
        PROTAMA.alert("Error", "Gagal membatalkan room: " + e.message, "error");
    }
};
// ==========================================================
// FUNGSI MULAI UJIAN (DIUBAH JADI TRIGGER MATCHMAKING)
// ==========================================================
window.mulaiUjianRoom = async (kode) => {
    // Pake PROTAMA.confirm biar popup modern dan gak diblokir browser
    const yakin = await PROTAMA.confirm(
        "MULAI MATCH?", 
        "Semua peserta akan diminta menekan tombol READY dalam 20 detik.",
        "Ya, Mulai"
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
window.batalReadyMabar = async (kodeRoom) => {
    let myUser = typeof currentUser !== 'undefined' ? currentUser : window.currentUser;
    const uidGue = myUser ? myUser.uid : null;
    let latestHost = window.latestRoomData ? window.latestRoomData.hostUid : null;
    if (latestHost && uidGue && latestHost !== uidGue) {
        if (typeof PROTAMA !== 'undefined') PROTAMA.alert("Akses Ditolak", "Hanya Host yang berhak membatalkan sesi Ready.", "warning");
        return;
    }
    if (window.hostReadyTimerInterval) { clearInterval(window.hostReadyTimerInterval); window.hostReadyTimerInterval = null; }
    if (window.clientReadyTimerInterval) { clearInterval(window.clientReadyTimerInterval); window.clientReadyTimerInterval = null; }
    const overlay = document.getElementById('readyCheckOverlay');
    if (overlay) overlay.remove();

    try {
        const roomRef = doc(window.db || db, "rooms", kodeRoom);
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
            const data = snap.data();
            const updates = { status: 'waiting' };
            for (let uid in data.players) {
                updates[`players.${uid}.isReady`] = false;
            }
            await updateDoc(roomRef, updates);
            if (typeof PROTAMA !== 'undefined') {
                PROTAMA.alert("Sesi Ready Dibatalkan", "Kembali ke Waiting Room. Silakan klik Mulai lagi jika semua peserta sudah siap.", "info");
            }
        }
    } catch(e) {
        console.error("Gagal batalkan sesi ready:", e);
    }
};

window.pantauRoom = (kodeRoom) => {
    currentAppMode = 'room';     
    window.currentRoomCode = kodeRoom; 

    window.activeRoomIdx = -1;
    window.lastScoredIdx = -1;
    window.activePembahasanIdx = -1;
    window.sudahPernahDiRoom = false;
    window.activeRoomCodeLoaded = null;
    window.questionRenderTime = null;

    let hideBtnStyle = document.getElementById('hide-kembali-mabar');
    if (!hideBtnStyle) {
        hideBtnStyle = document.createElement('style');
        hideBtnStyle.id = 'hide-kembali-mabar';
        hideBtnStyle.innerHTML = `#btnSidebarKembali { display: none !important; }`;
        document.head.appendChild(hideBtnStyle);
    }

    if (window.roomSyncTimer) { clearInterval(window.roomSyncTimer); window.roomSyncTimer = null; }
    if (window.roomHeartbeatTimer) { clearInterval(window.roomHeartbeatTimer); window.roomHeartbeatTimer = null; }
    if (window.hostClaimTimer) { clearTimeout(window.hostClaimTimer); window.hostClaimTimer = null; }
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

        let kickedListLS = (window.latestRoomData && window.latestRoomData.kickedUids) || [];
        let arr = Object.entries(playersObj || {})
            .filter(([uid, p]) => p && typeof p === 'object' && p.nama && !kickedListLS.includes(uid))
            .map(([uid, p]) => ({ uid, ...p }));

        // ðŸ›‘ SISTEM KLASEMEN ANTI-GOYANG (4-TIER DETERMINISTIC SORT):
        // 1. Skor Tertinggi
        // 2. Kecepatan Waktu Total (totalWaktu terkecil)
        // 3. Waktu Jawab Terakhir (siapa tercepat klik di soal ini)
        // 4. UID comparison (fallback mutlak deterministik agar tidak pernah tukar posisi/kedip)
        arr.sort((a, b) => {
            const skorA = Math.round(a.skor || 0);
            const skorB = Math.round(b.skor || 0);
            if (skorB !== skorA) return skorB - skorA;

            const waktuA = a.totalWaktu !== undefined ? a.totalWaktu : 999999;
            const waktuB = b.totalWaktu !== undefined ? b.totalWaktu : 999999;
            if (waktuA !== waktuB) return waktuA - waktuB;

            const lastA = a.waktuJawabTerakhir || 9999999999999;
            const lastB = b.waktuJawabTerakhir || 9999999999999;
            if (lastA !== lastB) return lastA - lastB;

            return (a.uid || a.nama || "").localeCompare(b.uid || b.nama || "");
        }); 

        const activeUserScore = (typeof currentUser !== 'undefined' && currentUser) || window.currentUser;
        const myUidScore = activeUserScore ? activeUserScore.uid : null;
        const currentHostUid = window.latestRoomData ? window.latestRoomData.hostUid : null;
        const amICurrentHost = !!(myUidScore && currentHostUid === myUidScore);

        let html = '';
        
        arr.forEach((p, i) => { 
            let medal = i===0 ? '<i class="fas fa-medal" style="color:#f1c40f; font-size:1.05rem; min-width:20px; text-align:center;" title="Juara 1"></i>' : (i===1 ? '<i class="fas fa-medal" style="color:#bdc3c7; font-size:1.05rem; min-width:20px; text-align:center;" title="Juara 2"></i>' : (i===2 ? '<i class="fas fa-medal" style="color:#cd7f32; font-size:1.05rem; min-width:20px; text-align:center;" title="Juara 3"></i>' : `<span style="color:#7f8c8d; font-weight:bold; font-size:0.85rem; min-width:20px; display:inline-block; text-align:center;">#${i+1}</span>`));
            
            let namaDepan = (p.nama || 'Peserta').split(" ")[0]; 
            let isMe = (myUidScore && p.uid === myUidScore) || (window.currentUser && p.nama === window.currentUser.displayName);
            let styleNama = isMe ? 'font-weight:bold; color:#1565c0;' : 'color:#333; font-weight:600;';
            let bgRow = isMe ? 'background:#e3f2fd; border-color:#90caf9;' : 'background:white; border-color:#e0e0e0;';
            let skorTampil = Math.round(p.skor || 0);

            let isUdahJawab = p.jawabanSekarang !== null && p.jawabanSekarang !== undefined;
            let statusIcon = isUdahJawab ? '<i class="fas fa-check-circle" style="color:#2ecc71;" title="Sudah Jawab"></i>' : '<i class="fas fa-spinner fa-spin" style="color:#95a5a6;" title="Mikir..."></i>';

            let isThisPlayerHost = (p.uid === currentHostUid);
            let hostCrown = isThisPlayerHost ? '<i class="fas fa-crown" style="color:#f1c40f; font-size:0.85rem; margin-left:3px;" title="Host Room"></i>' : '';

            let isOffline = !isMe && p.lastSeen && (Date.now() - p.lastSeen > 35000);
            let offlineIcon = isOffline ? '<i class="fas fa-wifi" style="color:#e74c3c; font-size:0.75rem; margin-left:3px;" title="Terputus / Gangguan Koneksi"></i>' : '';

            let kontrolHost = '';
            if (amICurrentHost && !isMe) {
                kontrolHost = `
                    <div style="display:inline-flex; align-items:center; gap:4px; margin-left:6px;">
                        <button onclick="window.delegasikanHost('${p.uid}', '${(p.nama || '').replace(/'/g, "\\'")}')" style="background:#fff3e0; border:1px solid #ffe0b2; color:#e67e22; border-radius:4px; padding:2px 5px; font-size:0.7rem; cursor:pointer;" title="Alihkan Host ke ${p.nama}">
                            <i class="fas fa-crown"></i> Alihkan
                        </button>
                        <button onclick="window.kickPeserta('${p.uid}', '${(p.nama || '').replace(/'/g, "\\'")}')" style="background:#fee2e2; border:1px solid #fecaca; color:#dc2626; border-radius:4px; padding:2px 5px; font-size:0.7rem; cursor:pointer;" title="Keluarkan ${p.nama} (mempercepat ujian)">
                            <i class="fas fa-times"></i> Kick
                        </button>
                    </div>
                `;
            }

            html += `
                <div style="display:flex; flex-direction:column; margin-bottom:4px; padding:8px 10px; ${bgRow} border-radius:6px; border-width:1px; border-style:solid; font-size:0.85rem; box-shadow:0 1px 2px rgba(0,0,0,0.05); gap:4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                            ${medal} 
                            <img src="${p.photoURL || (isMe ? (window.currentUser && window.currentUser.photoURL) : '') || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(namaDepan) + '&background=004d00&color=fff&bold=true&size=60'}" referrerpolicy="no-referrer" style="width:24px; height:24px; border-radius:50%; object-fit:cover; border:1.5px solid ${i===0 ? '#f1c40f' : (i===1 ? '#bdc3c7' : (i===2 ? '#e67e22' : '#ddd'))}; flex-shrink:0;" alt="${namaDepan}">
                            <span style="${styleNama} text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:85px;">${namaDepan}</span>
                            ${hostCrown}
                            ${offlineIcon}
                        </div>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-weight:900; color:#e67e22;">${skorTampil} <small style="font-size:0.6rem; color:#888;">Pts</small></span>
                            ${statusIcon}
                        </div>
                    </div>
                    ${kontrolHost ? `<div style="display:flex; justify-content:flex-end; padding-top:2px; border-top:1px dashed #eee;">${kontrolHost}</div>` : ''}
                </div>
            `;
        });
        
        listContainer.innerHTML = html;
    };

    window.delegasikanHost = async (targetUid, targetNama) => {
        const kodeRoom = currentRoomCode || window.currentRoomCode;
        if (!kodeRoom || !targetUid) return;

        const yakin = await PROTAMA.confirm(
            "Alihkan Posisi Host?",
            `Yakin ingin menyerahkan posisi Host kepada <b>${targetNama}</b>?<br><small style="color:#666;">Kamu akan dialihkan menjadi peserta biasa.</small>`,
            "Ya, Alihkan"
        );
        if (!yakin) return;

        PROTAMA.loading("Mengalihkan Host...");
        try {
            const roomRef = doc(window.db || db, "rooms", kodeRoom);
            await updateDoc(roomRef, {
                hostUid: targetUid,
                hostName: targetNama
            });
            window.isHost = false;
            isHost = false;
            PROTAMA.close();
            PROTAMA.alert("Host Dialihkan!", `Posisi Host sekarang resmi dipegang oleh <b>${targetNama}</b>.`, "success");
        } catch (e) {
            PROTAMA.close();
            PROTAMA.alert("Gagal", "Gagal mengalihkan host: " + e.message, "error");
        }
    };

    window.kickPeserta = async (targetUid, targetNama) => {
        const kodeRoom = currentRoomCode || window.currentRoomCode;
        if (!kodeRoom || !targetUid) return;

        const yakin = await PROTAMA.confirm(
            "Keluarkan Peserta?",
            `Keluarkan <b>${targetNama}</b> dari room tryout?<br><br><span style="font-size:0.88rem; color:#666;">Peserta yang dikeluarkan tidak akan bisa masuk kembali ke room ini. Jika ia terputus atau tidak menjawab, mengeluarkannya akan memperlancar ujian tanpa harus menunggu waktu habis.</span>`
        );
        if (!yakin) return;

        PROTAMA.loading("Mengeluarkan Peserta...");
        try {
            const roomRef = doc(window.db || db, "rooms", kodeRoom);
            await updateDoc(roomRef, {
                [`players.${targetUid}`]: deleteField(),
                kickedUids: arrayUnion(targetUid)
            });

            // Hapus instan dari data lokal memori Host agar langsung lenyap seketika (1x klik)
            if (window.latestRoomData) {
                if (!window.latestRoomData.kickedUids) window.latestRoomData.kickedUids = [];
                if (!window.latestRoomData.kickedUids.includes(targetUid)) {
                    window.latestRoomData.kickedUids.push(targetUid);
                }
                if (window.latestRoomData.players) {
                    delete window.latestRoomData.players[targetUid];
                }

                // Re-render antarmuka Waiting Room seketika jika sedang di waiting room
                const listEl = document.getElementById('listPesertaRoom');
                const countEl = document.getElementById('countPeserta');
                if (listEl && window.latestRoomData.players) {
                    listEl.innerHTML = '';
                    let count = 0;
                    for (let uid in window.latestRoomData.players) {
                        if (window.latestRoomData.kickedUids.includes(uid)) continue;
                        let p = window.latestRoomData.players[uid];
                        if (!p || typeof p !== 'object' || !p.nama) continue;
                        count++;
                        let icon = uid === window.latestRoomData.hostUid ? '<i class="fas fa-crown" style="color:var(--gold); margin-right:5px;" title="Host"></i>' : '<i class="fas fa-user" style="color:#7f8c8d; margin-right:5px;"></i>';
                        let isHostUser = (window.isHost && uid !== window.currentUser?.uid);
                        let aksiHost = isHostUser ? `
                            <div style="display:inline-flex; gap:6px; margin-left:auto;">
                                <button onclick="window.delegasikanHost('${uid}', '${(p.nama||'').replace(/'/g, "\\'")}')" style="background:#fff3e0; border:1px solid #ffe0b2; color:#e67e22; border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer;" title="Alihkan Host ke ${p.nama}"><i class="fas fa-crown"></i> Jadikan Host</button>
                                <button onclick="window.kickPeserta('${uid}', '${(p.nama||'').replace(/'/g, "\\'")}')" style="background:#fee2e2; border:1px solid #fecaca; color:#dc2626; border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer;" title="Keluarkan ${p.nama}"><i class="fas fa-times"></i> Kick</button>
                            </div>
                        ` : '';
                        listEl.innerHTML += `<li style="padding:8px 0; border-bottom:1px solid #eee; font-weight:bold; color:#333; display:flex; align-items:center; justify-content:space-between;"><span>${icon} ${p.nama}</span> ${aksiHost}</li>`;
                    }
                    if (countEl) countEl.innerText = count;
                }

                // Re-render Klasemen Sementara seketika jika sedang di soal/pembahasan
                if (typeof window.renderLiveScore === 'function' && window.latestRoomData.players) {
                    window.renderLiveScore(window.latestRoomData.players);
                }

                // Evaluasi ulang progres jawaban & auto-skip seketika
                let totalPeserta = 0;
                let yangSudahJawab = 0;
                for (let uid in window.latestRoomData.players) {
                    if (window.latestRoomData.kickedUids.includes(uid)) continue;
                    let p = window.latestRoomData.players[uid];
                    if (!p || !p.nama) continue;
                    totalPeserta++;
                    if (p.jawabanSekarang !== null && p.jawabanSekarang !== undefined) {
                        yangSudahJawab++;
                    }
                }
                let txtProgress = document.getElementById('progressText');
                if (txtProgress) txtProgress.innerText = `Menjawab: ${yangSudahJawab} / ${totalPeserta}`;

                if (totalPeserta > 0 && yangSudahJawab === totalPeserta && window.isHost && !window.sedangAutoSkip) {
                    window.sedangAutoSkip = true;
                    if (window.roomSyncTimer) { clearInterval(window.roomSyncTimer); window.roomSyncTimer = null; }
                    setTimeout(() => {
                        updateDoc(roomRef, { status: 'pembahasan' }).catch(e => console.log(e));
                    }, 500);
                }
            }

            PROTAMA.close();
            PROTAMA.alert("Peserta Dikeluarkan", `<b>${targetNama}</b> berhasil dikeluarkan dan diblokir dari room ini.`, "success");
        } catch (e) {
            PROTAMA.close();
            PROTAMA.alert("Gagal", "Gagal mengeluarkan peserta: " + e.message, "error");
        }
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

        // ðŸ›‘ GLOBAL KICK DETECTION (KEBAL BYPASS & RESURRECTION)
        const isKicked = (myUid && data.kickedUids && data.kickedUids.includes(myUid)) || (myUid && data.players && !data.players[myUid] && (data.status === 'soal' || data.status === 'pembahasan'));
        if (isKicked) {
            if (window.roomHeartbeatTimer) { clearInterval(window.roomHeartbeatTimer); window.roomHeartbeatTimer = null; }
            if (window.roomSyncTimer) { clearInterval(window.roomSyncTimer); window.roomSyncTimer = null; }
            if (roomListenerUnsubscribe) { try { roomListenerUnsubscribe(); roomListenerUnsubscribe = null; } catch(e){} }
            const overlayReady = document.getElementById('readyCheckOverlay');
            if (overlayReady) overlayReady.remove();
            
            window.keluarDariRoom();
            PROTAMA.alert('Dikeluarkan dari Room', 'Kamu telah dikeluarkan oleh Host dari room ini.', 'error');
            return;
        }

        // ========================================================
        // ðŸ‘‘ 1. SISTEM TRANSFER HOST (ZOOM-STYLE DENGAN STRATA VIP)
        // ========================================================
        const activeUserPR = (typeof currentUser !== 'undefined' && currentUser) || window.currentUser;
        const myActiveUid = activeUserPR ? activeUserPR.uid : (myUid || null);
        const amIHost = !!(myActiveUid && data.hostUid === myActiveUid);
        const hostBerubah = (window.isHost !== amIHost);
        window.isHost = amIHost;
        isHost = amIHost;

        // Jika host berubah saat di waiting room, render ulang kontrol host
        if (hostBerubah && data.status === 'waiting') {
            window.tampilkanWaitingRoom(kodeRoom, amIHost, data.modulId);
        }

        // Heartbeat kehadiran player aktif (setiap 8 detik)
        if (!window.roomHeartbeatTimer && myActiveUid) {
            if ((currentRoomCode || window.currentRoomCode) && myActiveUid) {
                updateDoc(roomRef, { 
                    [`players.${myActiveUid}.lastSeen`]: Date.now(),
                    [`players.${myActiveUid}.isOffline`]: false
                }).catch(() => {});
            }
            window.roomHeartbeatTimer = setInterval(() => {
                if ((currentRoomCode || window.currentRoomCode) && myActiveUid) {
                    // Cegah player yang sudah di-kick mengirim denyut heartbeat
                    if (window.latestRoomData && window.latestRoomData.kickedUids && window.latestRoomData.kickedUids.includes(myActiveUid)) {
                        clearInterval(window.roomHeartbeatTimer);
                        window.roomHeartbeatTimer = null;
                        return;
                    }
                    updateDoc(roomRef, { 
                        [`players.${myActiveUid}.lastSeen`]: Date.now(),
                        [`players.${myActiveUid}.isOffline`]: false
                    }).catch(() => {});
                }
            }, 8000);
        }

        // PENGALIHAN HOST OTOMATIS:
        // HANYA AKTIF SAAT PERMAINAN BERJALAN ('soal' atau 'pembahasan').
        // SANGAT DILARANG PINDAH DI: 'waiting' ATAU 'ready_check' (Host masih pegang kendali penuh).
        const sesiBolehPindahHost = (data.status === 'soal' || data.status === 'pembahasan');
        if (sesiBolehPindahHost && data.players && data.hostUid) {
            const hostData = data.players[data.hostUid];
            // Batas toleransi diperpanjang jadi 45 detik (tidak agresif, cegah salah deteksi koneksi)
            // Atau host sengaja keluar ke lobby (hostTerputusAt terpasang saat keluar)
            const hostTerputus = !hostData || (hostData.isOffline && !!data.hostTerputusAt) || (hostData.lastSeen && (Date.now() - hostData.lastSeen > 45000));
            
            if (hostTerputus) {
                const sisaPemain = Object.keys(data.players).filter(u => u !== data.hostUid && !data.players[u]?.isOffline);
                if (sisaPemain.length > 0 && myActiveUid && sisaPemain.includes(myActiveUid)) {
                    sisaPemain.sort((a, b) => {
                        const vipA = data.players[a]?.isVIP ? 1 : 0;
                        const vipB = data.players[b]?.isVIP ? 1 : 0;
                        if (vipA !== vipB) return vipB - vipA;
                        return a.localeCompare(b);
                    });
                    const myIndex = sisaPemain.indexOf(myActiveUid);
                    
                    // Beri jeda 45 detik yang lapang agar host asli punya kesempatan reconnect
                    let waktuPutus = data.hostTerputusAt || (hostData?.lastSeen ? hostData.lastSeen + 45000 : Date.now());
                    let sudahLewat = Math.max(0, Date.now() - waktuPutus);
                    let sisaTunggu = Math.max(3000, 45000 - sudahLewat) + (myIndex * 3000);
                    
                    if (window.hostClaimTimer) clearTimeout(window.hostClaimTimer);
                    
                    window.hostClaimTimer = setTimeout(() => {
                        console.log("Mengambil alih posisi Host secara otomatis...");
                        updateDoc(roomRef, { 
                            hostUid: myActiveUid, 
                            hostName: (activeUserPR && activeUserPR.displayName) || "Host",
                            hostTerputusAt: null
                        }).then(() => {
                            if (typeof PROTAMA !== 'undefined') {
                                PROTAMA.alert('Sistem Host Berpindah!', 'Host sebelumnya terputus lebih dari 45 detik. Posisi Host kini otomatis dialihkan kepadamu (Member VIP).', 'info');
                            }
                        }).catch(e => console.log("Gagal klaim host:", e));
                    }, sisaTunggu);
                }
            } else {
                if (window.hostClaimTimer) {
                    clearTimeout(window.hostClaimTimer);
                    window.hostClaimTimer = null;
                }
            }
        } else {
            // Jika di waiting room atau ready check: BATALKAN semua timer klaim host (pembuat room adalah host mutlak)
            if (window.hostClaimTimer) {
                clearTimeout(window.hostClaimTimer);
                window.hostClaimTimer = null;
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
        
        // amIHost already declared above in pantauRoom
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
            const overlayReady = document.getElementById('readyCheckOverlay');
            if (overlayReady) overlayReady.remove();
            if (window.hostReadyTimerInterval) { clearInterval(window.hostReadyTimerInterval); window.hostReadyTimerInterval = null; }
            if (window.clientReadyTimerInterval) { clearInterval(window.clientReadyTimerInterval); window.clientReadyTimerInterval = null; }
            const listEl = document.getElementById('listPesertaRoom');
            const countEl = document.getElementById('countPeserta');
            if (listEl && data.players) {
                listEl.innerHTML = '';
                let count = 0;
                let kickedListWR = data.kickedUids || [];
                for (let uid in data.players) {
                    if (kickedListWR.includes(uid)) continue;
                    let p = data.players[uid];
                    if (!p || typeof p !== 'object' || !p.nama) continue;
                    count++;
                    let icon = uid === data.hostUid ? '<i class="fas fa-crown" style="color:var(--gold); margin-right:5px;" title="Host"></i>' : '<i class="fas fa-user" style="color:#7f8c8d; margin-right:5px;"></i>'; 
                    let isHostUser = (myActiveUid && data.hostUid === myActiveUid);
                    let aksiHost = '';
                    if (isHostUser && uid !== myActiveUid) {
                        aksiHost = `
                            <div style="display:inline-flex; gap:6px; margin-left:auto;">
                                <button onclick="window.delegasikanHost('${uid}', '${(p.nama||'').replace(/'/g, "\\'")}')" style="background:#fff3e0; border:1px solid #ffe0b2; color:#e67e22; border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer;" title="Alihkan Host ke ${p.nama}"><i class="fas fa-crown"></i> Jadikan Host</button>
                                <button onclick="window.kickPeserta('${uid}', '${(p.nama||'').replace(/'/g, "\\'")}')" style="background:#fee2e2; border:1px solid #fecaca; color:#dc2626; border-radius:4px; padding:2px 8px; font-size:0.75rem; cursor:pointer;" title="Keluarkan ${p.nama}"><i class="fas fa-times"></i> Kick</button>
                            </div>
                        `;
                    }
                    listEl.innerHTML += `<li style="padding:8px 0; border-bottom:1px solid #eee; font-weight:bold; color:#333; display:flex; align-items:center; justify-content:space-between;"><span>${icon} ${p.nama}</span> ${aksiHost}</li>`;
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
                updateDoc(roomRef, { status: 'soal', currentIdx: 0, soalMulaiAt: Date.now() });
                return; // Langsung hajar masuk soal!
            }

            let htmlDaftarPemain = '<div style="margin-top: 30px; width: 100%; max-width: 400px; max-height: 250px; overflow-y: auto; background: rgba(255,255,255,0.05); border-radius: 12px; padding: 10px; border: 1px solid rgba(255,255,255,0.1);">';
            
            let kickedListRC = data.kickedUids || [];
            for (let uid in data.players) {
                if (kickedListRC.includes(uid)) continue;
                let p = data.players[uid];
                if (!p || typeof p !== 'object' || !p.nama) continue;
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
                    ${amIHost ? `
                    <button onclick="window.batalReadyMabar('${kodeRoom}')" style="margin-top: 15px; background: rgba(231, 76, 60, 0.2); color: #ff6b6b; border: 1.5px solid #e74c3c; padding: 10px 24px; font-size: 0.95rem; font-weight: bold; border-radius: 25px; cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center; gap: 8px;">
                        <i class="fas fa-undo-alt"></i> Batal & Kembali ke Waiting Room
                    </button>
                    ` : ''}
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
                        let totalP = Object.keys(latestData.players || {}).length;
                        let readyP = Object.values(latestData.players || {}).filter(p => p.isReady).length;

                        if (readyP < totalP) {
                            let updates = { status: 'waiting' };
                            for (let uid in latestData.players) {
                                updates[`players.${uid}.isReady`] = false;
                            }
                            updateDoc(roomRef, updates).then(() => {
                                if (typeof PROTAMA !== 'undefined') {
                                    PROTAMA.alert("Sebagian Peserta Belum Siap", "Waktu 20 detik habis dan belum semua peserta menekan READY. Sesi dikembalikan ke Waiting Room agar bisa bersiap ulang.", "warning");
                                }
                            });
                            return;
                        }
                        let pemainValid = {};
                        for (let uid in latestData.players) {
                            if (latestData.players[uid].isReady) {
                                pemainValid[uid] = latestData.players[uid]; 
                            }
                        }
                        updateDoc(roomRef, {
                            players: pemainValid,
                            status: 'soal',
                            currentIdx: 0,
                            soalMulaiAt: Date.now()
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

            // ðŸ›‘ SINKRONISASI SOAL MABAR LANGSUNG DARI BRANKAS ROOM (ANTI-STALE CACHE)
            if (!currentQuestions || currentQuestions.length === 0 || window.activeRoomCodeLoaded !== kodeRoom) {
                window.activeRoomCodeLoaded = kodeRoom;
                window.currentDatabaseId = data.modulId;
                if (data.soalTersimpan && Array.isArray(data.soalTersimpan) && data.soalTersimpan.length > 0) {
                    currentQuestions = JSON.parse(JSON.stringify(data.soalTersimpan));
                } else if (typeof window.switchDatabase === 'function') {
                    await window.switchDatabase(data.modulId);
                }
                userAnswers = new Array(currentQuestions.length).fill(null);
                raguStatus = new Array(currentQuestions.length).fill(false);
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
                
                if (window.roomSyncTimer) { clearInterval(window.roomSyncTimer); window.roomSyncTimer = null; }
    // roomHeartbeatTimer tetap jalan
    if (window.hostClaimTimer) { clearTimeout(window.hostClaimTimer); window.hostClaimTimer = null; }
                
                let durasiPerSoal = parseInt(data.waktuPerSoal || data.durasiPerSoal || 30);
                
                // ðŸ›‘ TIMER ANTI-CLOCK SKEW & ANTI-LAG:
                // Catat waktu render lokal di layar perangkat user
                let waktuMulaiLokal = Date.now();
                window.questionRenderTime = waktuMulaiLokal;
                
                let elapsedHost = 0;
                if (data.soalMulaiAt) {
                    elapsedHost = Math.floor((Date.now() - data.soalMulaiAt) / 1000);
                }

                // Jika user sudah berada di dalam room saat transisi soal, berikan durasi penuh durasiPerSoal
                // Jangan dipotong oleh clock skew jika elapsedHost tidak wajar
                let sisaWaktuRoom = durasiPerSoal;
                if (elapsedHost > 3 && elapsedHost < durasiPerSoal && !isWaitingRoomUI && window.sudahPernahDiRoom) {
                    sisaWaktuRoom = durasiPerSoal - elapsedHost;
                }
                window.sudahPernahDiRoom = true;
                
                const setLayarTimer = (detik) => {
                    let menit = Math.floor(detik / 60);
                    let sisaDetik = detik % 60;
                    let txt = "00:" + String(menit).padStart(2, '0') + ":" + String(sisaDetik).padStart(2, '0');
                    let t1 = document.getElementById('timerDisplay');
                    let t2 = document.getElementById('floatingTimer');
                    
                    let panicThreshold = Math.max(5, Math.floor(durasiPerSoal * 0.25));
                    let warnThreshold = Math.max(10, Math.floor(durasiPerSoal * 0.5));

                    let colorClass = 'timer-green';
                    if(detik <= panicThreshold) colorClass = 'timer-panic';
                    else if(detik <= warnThreshold) colorClass = 'timer-yellow';

                    if (t1) { t1.innerText = txt; t1.className = 'timer-container ' + colorClass; }
                    if (t2) { t2.innerText = txt; t2.className = colorClass; }
                };
                
                setLayarTimer(sisaWaktuRoom); 
                
                window.roomSyncTimer = setInterval(() => {
                    let elapsedDetik = Math.floor((Date.now() - waktuMulaiLokal) / 1000);
                    let detikSekarang = Math.max(0, sisaWaktuRoom - elapsedDetik);
                    setLayarTimer(detikSekarang);
                    
                    if (detikSekarang <= 0) {
                        clearInterval(window.roomSyncTimer);
                        window.roomSyncTimer = null;
                        let latestHost = window.latestRoomData ? window.latestRoomData.hostUid : data.hostUid;
                        let amICurrentHostNow = (myUid && latestHost === myUid);
                        if (amICurrentHostNow) { 
                            updateDoc(roomRef, { status: 'pembahasan' }).catch(e => console.log(e));
                        } else {
                            let t1 = document.getElementById('timerDisplay');
                            let t2 = document.getElementById('floatingTimer');
                            if(t1) { t1.innerText = "00:00:00"; t1.className = 'timer-container timer-panic'; }
                            if(t2) { t2.innerText = "00:00:00"; t2.className = 'timer-panic'; }
                        }
                    }
                }, 500);

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

                // Catat jawaban dan waktu kecepatan jawab peserta
                setTimeout(() => {
                    const opsiElements = document.querySelectorAll('#optionsContainer .option-label');
                    opsiElements.forEach((el, i) => {
                        el.onclick = (e) => {
                            e.preventDefault();
                            if (isAnswerLocked) return;
                            isAnswerLocked = true;
                            
                            el.style.background = "#fff9c4"; 
                            el.innerHTML += ' \u23F3 (Menunggu Waktu Habis...)';
                            
                            userAnswers[currentIdx] = i;
                            let uidSekarang = myUser ? myUser.uid : null;
                            if (uidSekarang) {
                                let waktuDetikSoal = 0;
                                if (window.questionRenderTime) {
                                    waktuDetikSoal = Math.max(0.1, parseFloat(((Date.now() - window.questionRenderTime) / 1000).toFixed(1)));
                                }
                                let totalWaktuLama = (data.players && data.players[uidSekarang] && data.players[uidSekarang].totalWaktu) || 0;
                                let totalWaktuBaru = parseFloat((totalWaktuLama + waktuDetikSoal).toFixed(1));

                                updateDoc(roomRef, { 
                                    [`players.${uidSekarang}.jawabanSekarang`]: i,
                                    [`players.${uidSekarang}.totalWaktu`]: totalWaktuBaru,
                                    [`players.${uidSekarang}.waktuJawabTerakhir`]: Date.now()
                                });
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
                        if (window.roomSyncTimer) { clearInterval(window.roomSyncTimer); window.roomSyncTimer = null; }
    // roomHeartbeatTimer tetap jalan
    if (window.hostClaimTimer) { clearTimeout(window.hostClaimTimer); window.hostClaimTimer = null; } 
                        setTimeout(() => {
                            updateDoc(roomRef, { status: 'pembahasan' }).catch(e => console.log(e));
                        }, 1000); // Ngasih jeda 1 detik biar puas liat kuningnya sebelum skip
                    }
                }
            }
        } // Penutup blok soal
            
       // --- D. PEMBAHASAN BARENG & HITUNG POIN OTOMATIS ---
        else if (data.status === 'pembahasan') {
            if (window.roomSyncTimer) { clearInterval(window.roomSyncTimer); window.roomSyncTimer = null; }
    // roomHeartbeatTimer tetap jalan
    if (window.hostClaimTimer) { clearTimeout(window.hostClaimTimer); window.hostClaimTimer = null; } 
            
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
                
                // 🏆 LOGIKA LIVE SCORE & PEMBAHASAN MULTIPLAYER
                const roomKunciMap = _kunciJawabanStore.get(window.currentRoomCode) || _kunciJawabanStore.get(data.modulId) || _kunciJawabanStore.get(window.currentDatabaseId) || {};
                const kInfo = roomKunciMap[q.id || `q_${data.currentIdx}`] || roomKunciMap[data.currentIdx];
                const realAnswer = (typeof kInfo === 'object' && kInfo.answer !== undefined) ? kInfo.answer : (q.answer !== undefined ? q.answer : null);
                const realExplanation = (typeof kInfo === 'object' && kInfo.explanation) ? kInfo.explanation : (q.explanation || "-");
                const realCite = (typeof kInfo === 'object' && kInfo.cite) ? kInfo.cite : (q.cite || "-");

                if (realAnswer !== null && jawabanGue === realAnswer) {
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
                    
                    if (realAnswer !== null && i === realAnswer) {
                        el.classList.add('review-correct');
                        if (!el.innerHTML.includes('✅')) el.innerHTML += ' ✅ (Kunci Jawaban)';
                    } else if (jawabanGue !== null && i === jawabanGue) {
                        el.classList.add('review-wrong');
                        if (!el.innerHTML.includes('❌')) el.innerHTML += ' ❌ (Jawabanmu Salah)';
                    } else if (jawabanGue === null || jawabanGue === -1) {
                        el.style.opacity = '0.5';
                    }
                });

                // 💡 TAMPILKAN KOTAK PEMBAHASAN UNTUK MODE MULTIPLAYER (BEDAH SOAL BERSAMA)
                const fb = document.getElementById('feedbackBox');
                if (fb) {
                    // Pastikan Tanya AI & Admin Quick Edit TIDAK PERNAH muncul di mode multiplayer
                    const aiChatOld = document.getElementById('aiChatDiv');
                    if (aiChatOld) aiChatOld.remove();
                    const admOld = document.getElementById('adminQuickEditDiv');
                    if (admOld) admOld.remove();

                    fb.style.setProperty('display', 'block', 'important');
                    fb.style.setProperty('visibility', 'visible', 'important');
                    fb.classList.add('show');
                    
                    let fText = document.getElementById('feedbackText');
                    if (fText) {
                        if (jawabanGue === null || jawabanGue === undefined || jawabanGue === -1) {
                            fText.innerHTML = "<b style='color:red; font-size:1.1rem;'>❌ WAKTU HABIS! ANDA TIDAK MENJAWAB (DIANGGAP SALAH)</b><br><br>" + renderLazyMedia(realExplanation);
                        } else {
                            fText.innerHTML = renderLazyMedia(realExplanation || "Tidak ada pembahasan spesifik.");
                        }
                    }
                    const fCite = document.getElementById('feedbackCite');
                    if (fCite) fCite.innerText = "Sumber: " + (realCite || "-");
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

            } // Penutup if (window.activePembahasanIdx !== data.currentIdx)

            // ðŸ‘‘ RENDER KENDALI HOST DINAMIS (Selalu re-evaluasi agar tombol ikut pindah saat delegasi host)
            let myUserPb = typeof currentUser !== 'undefined' ? currentUser : window.currentUser;
            let myUidPb = myUserPb ? myUserPb.uid : null;
            let currentHostNow = window.latestRoomData ? window.latestRoomData.hostUid : data.hostUid;
            let gueHostPb = !!(myUidPb && currentHostNow === myUidPb);

            let oldBadge = document.getElementById('roomBadgeKhusus');
            if (oldBadge) oldBadge.remove();

            const badgeHtml = document.createElement('div');
            badgeHtml.id = 'roomBadgeKhusus';
            badgeHtml.style.cssText = "margin-top:20px; padding:15px; background:#e3f2fd; border-radius:8px; text-align:center; border:2px dashed #90caf9;";
            
            if (gueHostPb) {
                badgeHtml.innerHTML = `
                    <div style="margin-bottom:10px; font-weight:bold; color:#1565c0;">Kendali Host: Silakan baca pembahasan bersama, lalu klik Lanjut.</div>
                    <button id="btnNextHostRoom" style="background:#1565c0; color:white; padding:12px 20px; border:none; border-radius:6px; font-size:1.1rem; cursor:pointer; font-weight:bold; width:100%; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        Lanjut Soal Berikutnya <i class="fas fa-arrow-right"></i>
                    </button>
                `;
            } else {
                badgeHtml.innerHTML = `<b style="color:#1565c0; font-size:1.2rem;"><i class="fas fa-hourglass-half"></i> Menunggu Host melanjutkan ujian...</b>`;
            }
            
            const optContForBadge = document.getElementById('optionsContainer');
            if (optContForBadge && optContForBadge.parentNode) {
                optContForBadge.parentNode.appendChild(badgeHtml);
            }

            if (gueHostPb) {
                const btnNextHost = document.getElementById('btnNextHostRoom');
                if (btnNextHost) {
                    btnNextHost.onclick = function() {
                        let latestHostCheck = window.latestRoomData ? window.latestRoomData.hostUid : data.hostUid;
                        if (!myUidPb || latestHostCheck !== myUidPb) {
                            if (typeof PROTAMA !== 'undefined') {
                                PROTAMA.alert("Bukan Host", "Kewenangan memindahkan soal hanya dimiliki oleh Host saat ini.", "warning");
                            }
                            return;
                        }
                        this.innerText = "Memuat soal berikutnya...";
                        this.disabled = true;
                        this.style.background = "#9e9e9e";
                        
                        let nextIndex = parseInt(data.currentIdx) + 1; 
                        if (nextIndex < currentQuestions.length) {
                            let updates = { 
                                status: 'soal', 
                                currentIdx: nextIndex,
                                soalMulaiAt: Date.now()
                            };
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
       // --- E. ROOM DIBATALKAN ---
        else if (data.status === 'dibatalkan') {
            if (roomListenerUnsubscribe) { try { roomListenerUnsubscribe(); roomListenerUnsubscribe = null; } catch(e) {} }
            if (window.roomSyncTimer) { clearInterval(window.roomSyncTimer); window.roomSyncTimer = null; }
            if (window.roomHeartbeatTimer) { clearInterval(window.roomHeartbeatTimer); window.roomHeartbeatTimer = null; }
            if (window.hostClaimTimer) { clearTimeout(window.hostClaimTimer); window.hostClaimTimer = null; }
            if (typeof window.bersihkanStateMode === 'function') window.bersihkanStateMode('ujian');
            if (currentAppMode === 'room' || window.currentAppMode === 'room') {
                if (typeof PROTAMA !== 'undefined') {
                    PROTAMA.alert("Room Ditutup", "Room mabar telah dibatalkan atau host telah keluar.", "info");
                }
                if (typeof window.keluarDariRoom === 'function') {
                    window.keluarDariRoom();
                }
            }
        }

       // --- F. SELESAI ---
        else if (data.status === 'selesai') {
            // ðŸ‘‡ 1. SAPU BERSIH SEMUA TIMER MABAR BIAR GA BERAT ðŸ‘‡
            if (window.roomSyncTimer) { clearInterval(window.roomSyncTimer); window.roomSyncTimer = null; }
            if (window.roomHeartbeatTimer) { clearInterval(window.roomHeartbeatTimer); window.roomHeartbeatTimer = null; }
            if (window.hostClaimTimer) { clearTimeout(window.hostClaimTimer); window.hostClaimTimer = null; }
            if (typeof timerInterval !== 'undefined' && timerInterval) clearInterval(timerInterval);
            if (window.hostReadyTimerInterval) clearInterval(window.hostReadyTimerInterval);
            if (window.clientReadyTimerInterval) clearInterval(window.clientReadyTimerInterval);
            
            // ðŸ‘‡ 2. BERSIHKAN OVERLAY READY (Jaga-jaga kalau nyangkut) ðŸ‘‡
            const overlayReady = document.getElementById('readyCheckOverlay');
            if (overlayReady) overlayReady.remove();

            // ðŸ›‘ JANGAN TAMPILKAN PODIUM JIKA USER SUDAH TIDAK DI ROOM / ROOM DIBATALKAN DI WAITING ROOM
            if (!currentRoomCode && !window.currentRoomCode) return;
            if (currentAppMode !== 'room' && window.currentAppMode !== 'room') return;
            if (!data.soalTersimpan || data.soalTersimpan.length === 0) return;
            if (data.statusSebelumnya === 'waiting' || (window.latestRoomData && window.latestRoomData.status === 'waiting' && data.currentIdx === 0 && !data.jawabanHost)) {
                return;
            }

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
            
            // ðŸ›‘ JURUS PENYELAMAT SKOR MULTIPLAYER:
            // Ambil skor asli dari Room Firebase (skor realtime mabar tanpa dirusak kunci jawaban singleplayer)
            let myUidSelesai = myUser ? myUser.uid : (currentUser ? currentUser.uid : null);
            let skorMabarAsli = 0;
            if (myUidSelesai && data.players && data.players[myUidSelesai]) {
                skorMabarAsli = Math.round(data.players[myUidSelesai].skor || 0);
            }

            if (typeof window.saveScoreToCloud === 'function' && myUidSelesai) {
                window.saveScoreToCloud(data.modulId || "multiplayer", skorMabarAsli);
            }

            try {
                if (currentUser && window.db) {
                    addDoc(collection(window.db, "riwayat_belajar"), {
                        uid: currentUser.uid,
                        nama: currentUser.displayName,
                        modul: data.modulId || "multiplayer",
                        score: skorMabarAsli,
                        tipe: "Multiplayer Mabar",
                        tanggal: new Date().toLocaleString('id-ID'),
                        timestamp: new Date()
                    }).catch(e => console.log(e));
                }
            } catch(e) {}




            
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
    if (typeof window.bersihkanStateMode === 'function') {
        window.bersihkanStateMode('ujian');
    }
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
        
        arr.sort((a, b) => {
            const skorA = Math.round(a.skor || 0);
            const skorB = Math.round(b.skor || 0);
            if (skorB !== skorA) return skorB - skorA;

            const waktuA = a.totalWaktu !== undefined ? a.totalWaktu : 999999;
            const waktuB = b.totalWaktu !== undefined ? b.totalWaktu : 999999;
            if (waktuA !== waktuB) return waktuA - waktuB;

            const lastA = a.waktuJawabTerakhir || 9999999999999;
            const lastB = b.waktuJawabTerakhir || 9999999999999;
            if (lastA !== lastB) return lastA - lastB;

            return (a.uid || a.nama || "").localeCompare(b.uid || b.nama || "");
        });

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
                ${buatPodium(p2, 2, 140, '#bdc3c7', '2', 0.2)} 
                ${buatPodium(p1, 1, 190, '#f1c40f', '1', 0.4)} 
                ${buatPodium(p3, 3, 100, '#e67e22', '3', 0)}   
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
                    <button class="btn-tutup" onclick="if(window.confettiInterval) clearInterval(window.confettiInterval); if(window.confetti && typeof window.confetti.reset==='function') window.confetti.reset(); const o=document.getElementById('kahootResultOverlay'); if(o) o.remove();"><i class="fas fa-times"></i> Tutup & Kembali</button>
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
                
                .result-title { font-size: 2.2rem; color: #2c3e50; font-weight: 900; margin: 0 0 10px 0; padding-top: 10px; text-transform: uppercase; text-align: center; letter-spacing: 2px; position: relative; z-index: 20; }
                .podium-container { display: flex; justify-content: center; align-items: flex-end; gap: 20px; height: 350px; border-bottom: 3px solid #eee; margin: 30px 0 0 0; width: 100%; padding-top: 40px; box-sizing: border-box; position: relative; }
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
            if (window.confettiInterval) { clearInterval(window.confettiInterval); window.confettiInterval = null; }
            let durasi = 5 * 1000;
            let animationEnd = Date.now() + durasi;
            let defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2147483649 };

            function randomInRange(min, max) { return Math.random() * (max - min) + min; }
            window.confettiInterval = setInterval(function() {
                // Hentikan jika overlay sudah ditutup atau user sudah keluar
                if (!document.getElementById('kahootResultOverlay')) {
                    if (window.confettiInterval) clearInterval(window.confettiInterval);
                    return;
                }
                let timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) {
                    if (window.confettiInterval) clearInterval(window.confettiInterval);
                    return;
                }
                let particleCount = 50 * (timeLeft / durasi);
                if (typeof window.confetti === 'function') {
                    window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
                    window.confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
                }
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
        "Yakin mau keluar? Kamu tidak bisa melihat pembahasan lagi setelah keluar ke menu utama.",
        "Ya, Keluar"
    );
    if (yakin) {
        window.tutupHasilMultiplayer();
    }
};

window.tutupHasilMultiplayer = () => {
    // 1. Bersihkan semua state room dan gembok
    if (typeof window.bersihkanStateMode === 'function') {
        window.bersihkanStateMode('ujian');
    }

    // 2. Hapus pop up hasil & podium
    const overlay = document.getElementById('roomResultOverlay');
    if (overlay) overlay.remove();
    const kahootOverlay = document.getElementById('kahootResultOverlay');
    if (kahootOverlay) kahootOverlay.remove();
    
    // 3. Hapus tumpukan tombol di kanan bawah
    const floatMenu = document.getElementById('roomFloatingMenu');
    if (floatMenu) floatMenu.remove();

    // 4. Proses keluar seutuhnya
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
    const overlay = document.getElementById('adminOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    const isSuper = typeof ADMIN_EMAILS !== 'undefined' && currentUser && ADMIN_EMAILS.includes(currentUser.email);

    // Update Judul Modal: Admin CBT vs Editor CBT
    const modalTitle = document.getElementById('modalAdminTitle');
    if (modalTitle) {
        modalTitle.innerHTML = isSuper ? '<i class="fas fa-user-shield"></i> Panel Admin CBT' : '<i class="fas fa-user-edit"></i> Panel Editor CBT';
    }

    // Pastikan pas baru buka, tampilannya adalah "Menu" rapi (tanpa form terbuka di bawah)
    window.resetAdminMenu();
    if (window.updateUserStatus) window.updateUserStatus(true, 'Panel ' + (isSuper ? 'Admin' : 'Editor') + ': Menu Navigasi');
};

// ==========================================================
// FUNGSI BALIK KE MENU ADMIN / EDITOR (TOMBOL MUNCUL SESUAI ROLE)
// ==========================================================
window.resetAdminMenu = () => {
    const isSuper = typeof ADMIN_EMAILS !== 'undefined' && currentUser && ADMIN_EMAILS.includes(currentUser.email);

    // 1. Sembunyikan Tombol Kembali
    const btnBack = document.getElementById('btnKembaliSakti');
    if(btnBack) btnBack.style.display = 'none';

    // 2. Munculkan Navigasi utama dan pastikan header tetap flex
    const modalBox = document.getElementById('adminModalBox') || document.querySelector('#adminOverlay .result-box') || document.querySelector('#adminOverlay .modal-content');
    if (modalBox) {
        modalBox.style.width = '100vw';
        modalBox.style.maxWidth = '100vw';
        Array.from(modalBox.children).forEach(el => {
            const id = el.id || '';
            if (id === 'adminPanelHeader') {
                el.style.display = 'flex';
            } else if (!id.includes('tab') && id !== 'btnKembaliSakti' && el.tagName !== 'SPAN') {
                el.style.display = 'block';
            }
        });
    }

    // 3. Sembunyikan semua isi tab
    const tabs = ['tabTambah', 'tabEdit', 'tabReview', 'tabLaporan', 'tabStatus'];
    tabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 5. Atur Hak Akses Navigasi: Admin vs Editor
    const btnMaint = document.getElementById('btnToggleMaintenance');
    const statusTitle = document.getElementById('adminStatusTitle');
    const statusDesc = document.getElementById('adminStatusDesc');
    const btnUpload = document.getElementById('btnNavUploadJson') || document.querySelector('#adminOverlay button[onclick*="tambah"]');
    const btnRadar = document.getElementById('btnNavRadar') || document.querySelector('#adminOverlay button[onclick*="status"]');
    const toolsDiv = document.getElementById('adminToolsContainer');

    if (isSuper) {
        if (btnMaint) btnMaint.style.display = 'inline-block';
        if (statusTitle) statusTitle.innerText = "Status Aplikasi";
        if (statusDesc) statusDesc.innerText = "Klik tombol di kanan untuk buka/tutup akses ujian.";
        if (btnUpload) btnUpload.style.display = 'inline-block';
        if (btnRadar) btnRadar.style.display = 'inline-block';
        if (toolsDiv) toolsDiv.style.display = 'flex';
    } else {
        // EDITOR: Hanya 3 menu (Edit / Revisi, Review Jawaban, Laporan Masuk)
        if (btnMaint) btnMaint.style.display = 'none';
        if (statusTitle) statusTitle.innerText = "Status Akses: Editor CBT";
        if (statusDesc) statusDesc.innerText = "Hak akses: Edit / Revisi Soal, Review Jawaban, dan Laporan Masuk.";
        if (btnUpload) btnUpload.style.display = 'none';
        if (btnRadar) btnRadar.style.display = 'none';
        if (toolsDiv) toolsDiv.style.display = 'none';
    }
};

// ==========================================================
// FUNGSI SWITCH TAB & MASUK MODE FULL SCREEN (ANTI CACHE)
// ==========================================================
window.switchAdminTab = (tab) => {
    const isSuper = typeof ADMIN_EMAILS !== 'undefined' && currentUser && ADMIN_EMAILS.includes(currentUser.email);

    // Proteksi: Editor dilarang membuka tab Tambah (Upload JSON) atau Radar Status
    if (!isSuper && (tab === 'tambah' || tab === 'status')) {
        alert("Peringatan: Fitur ini hanya untuk Super Admin.");
        return;
    }

    const modalContent = document.getElementById('adminModalBox') || document.querySelector('#adminOverlay .result-box') || document.querySelector('#adminOverlay .modal-content');
    
    // 1. Sembunyikan elemen Navigasi utama kecuali Header dan Tab Konten
    if (modalContent) {
        modalContent.style.width = '100vw';
        modalContent.style.maxWidth = '100vw';
        Array.from(modalContent.children).forEach(el => {
            const id = el.id || '';
            if (id === 'adminPanelHeader') {
                el.style.display = 'flex'; // Header + Tombol Tutup tetap aktif di pojok kanan atas!
            } else if (!id.includes('tab') && id !== 'btnKembaliSakti' && el.tagName !== 'SPAN') {
                el.style.display = 'none';
            }
        });
    }

    // 2. Tombol Kembali Sakti
    let btnBack = document.getElementById('btnKembaliSakti');
    if (!btnBack) {
        btnBack = document.createElement('button');
        btnBack.id = 'btnKembaliSakti';
        btnBack.style.cssText = "background: #2c3e50; color: #fff; padding: 12px 20px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 15px; width: 100%; text-align: left; font-size: 1.05rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); flex-shrink: 0;";
        btnBack.onclick = () => window.resetAdminMenu();

        if(modalContent) modalContent.insertBefore(btnBack, modalContent.children[1]);
    }
    btnBack.innerHTML = isSuper ? '<i class="fas fa-arrow-left"></i> KEMBALI KE MENU ADMIN' : '<i class="fas fa-arrow-left"></i> KEMBALI KE MENU EDITOR';
    btnBack.style.display = 'block';

    // 3. Munculkan hanya tab yang dipilih
    const tabs = ['tabTambah', 'tabEdit', 'tabReview', 'tabLaporan', 'tabStatus'];
    tabs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = (id.toLowerCase().includes(tab)) ? 'flex' : 'none';
        }
    });

    // Radar Tracking: Update aktivitas Admin / Editor secara detail
    if (window.updateUserStatus) {
        const roleLabel = isSuper ? "Admin" : "Editor";
        if (tab === "edit") window.updateUserStatus(true, "Panel " + roleLabel + ": Edit/Revisi Soal");
        else if (tab === "review") window.updateUserStatus(true, "Panel " + roleLabel + ": Review Jawaban");
        else if (tab === "laporan") window.updateUserStatus(true, "Panel " + roleLabel + ": Cek Laporan Masuk");
        else if (tab === "status") window.updateUserStatus(true, "Panel Admin: Radar Peserta");
        else if (tab === "tambah") window.updateUserStatus(true, "Panel Admin: Upload Soal JSON/Manual");
    }

    // 5. Khusus Super Admin: Tab Tambah Form Manual / JSON switcher
    if (tab === 'tambah' && isSuper) {
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
                <button onclick="window.simpanSoalManual()" style="width:100%; padding:12px; background:var(--success); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">ðŸš€ SIMPAN SOAL KE DATABASE</button>
            `;
            areaTambah.appendChild(formManual);
        }
    }

    // 6. Auto-load data 
    if (tab === 'laporan' && typeof window.loadLaporanAdmin === 'function') window.loadLaporanAdmin();
    if (tab === 'status' && typeof window.loadStatusAdmin === 'function') window.loadStatusAdmin();
};
    
window.loadReviewPembahasan = async () => {
    const isSupRev = typeof ADMIN_EMAILS !== 'undefined' && currentUser && ADMIN_EMAILS.includes(currentUser.email);
    const modRevTarget = document.getElementById('reviewModulTarget')?.value?.trim();
    if (window.updateUserStatus) window.updateUserStatus(true, (isSupRev ? 'Admin' : 'Editor') + ': Review Jawaban ' + (modRevTarget || ''));
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
    const isSupAct = typeof ADMIN_EMAILS !== 'undefined' && currentUser && ADMIN_EMAILS.includes(currentUser.email);
    if (window.updateUserStatus) window.updateUserStatus(true, (isSupAct ? 'Admin' : 'Editor') + ': Mengedit ' + modulId);

    const searchInput = document.getElementById('searchSoalAdmin');
    if(searchInput) searchInput.value = "";

    const listDiv = document.getElementById('listSoalAdmin');
    listDiv.innerHTML = "Loading... (Sedang mengambil data)";

    try {
        const qRef = collection(db, "bank_soal", modulId, "daftar_soal");
        let snapshot = await getDocs(qRef); 

        if (snapshot.empty) {
            const directCol = collection(db, modulId);
            const directSnap = await getDocs(directCol);
            if (!directSnap.empty) {
                snapshot = directSnap;
            } else {
                const aliasMap = {
                    'modul_4': ['modul_hir', 'modul_hir_rbg_rv', 'hafalan_hir_rbg_rv', 'modul_hafalan_hir'],
                    'modul_5': ['modul_sema', 'kumpulan_sema', 'modul_kumpulan_sema'],
                    'modul_hir': ['modul_4'],
                    'modul_sema': ['modul_5']
                };
                if (aliasMap[modulId]) {
                    for (const altKey of aliasMap[modulId]) {
                        const altLegacy = await getDocs(collection(db, "bank_soal", altKey, "daftar_soal"));
                        if (!altLegacy.empty) {
                            snapshot = altLegacy;
                            currentAdminModul = altKey;
                            break;
                        }
                        const altDirect = await getDocs(collection(db, altKey));
                        if (!altDirect.empty) {
                            snapshot = altDirect;
                            currentAdminModul = altKey;
                            break;
                        }
                    }
                }
            }
        } 

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
    const isSupPop = typeof ADMIN_EMAILS !== 'undefined' && currentUser && ADMIN_EMAILS.includes(currentUser.email);
    if (window.updateUserStatus) window.updateUserStatus(true, (isSupPop ? 'Admin' : 'Editor') + ': Edit Soal (' + (currentAdminModul || 'Modul') + ')');
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
    const isSupLap = typeof ADMIN_EMAILS !== 'undefined' && currentUser && ADMIN_EMAILS.includes(currentUser.email);
    if (window.updateUserStatus) window.updateUserStatus(true, (isSupLap ? 'Admin' : 'Editor') + ': Cek Laporan Masuk');
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

    container.innerHTML = `<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Membuka radar peserta, melacak aktivitas, dan menarik data VIP...</div>`;

    try {
        // --- 1. TARIK DATA KODE VIP (KHUSUS SUPER ADMIN) ---
        let vipMap = {};
        try {
            const qVip = query(collection(window.db, "vip_access"));
            const snapVip = await getDocs(qVip);
            snapVip.forEach(doc => {
                vipMap[doc.id] = doc.data().code; 
            });
        } catch (vipErr) {
            console.warn("Daftar kode VIP hanya dapat diakses oleh Super Admin.");
        }

        // --- 2. TARIK DATA STATUS DENGAN DAYA JANGKAU LUAS (LIMIT 100) ---
        const qStatus = query(
            collection(window.db, "user_status"), 
            orderBy("lastActive", "desc"), 
            limit(100)
        );
        const snap = await getDocs(qStatus);
        
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<p style="text-align:center; padding:20px; color:gray;">Belum ada data peserta terekam pada radar.</p>`;
            return;
        }

        // --- 3. BIKIN TABEL RADAR MODERN ---
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

            let aktivitasTeks = d.currentModul || 'Lobby Utama';
            let customBadge = null;

            // Highlight khusus kalau nyangkut di VIP Gatekeeper
            if (aktivitasTeks === "VIP Gatekeeper") {
                customBadge = `<span style="background:#fff3e0; color:#e67e22; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.8rem;">UNREGISTERED</span>`;
            }

            // Atur Badge Status
            let badgeStatus = customBadge ? customBadge : (isBeneranOnline 
                ? `<span style="background:#e8f5e9; color:#2e7d32; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.8rem;">ONLINE</span>` 
                : `<span style="background:#ffebee; color:#c62828; padding:3px 8px; border-radius:12px; font-weight:bold; font-size:0.8rem;">OFFLINE</span>`);

            // Atur Badge & Icon Aktivitas Luas
            let badgeAktivitas = "";
            if (aktivitasTeks.includes("Pusat Studi")) {
                badgeAktivitas = `<span style="background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:6px; font-weight:600; display:inline-flex; align-items:center; gap:6px; border:1px solid #bae6fd;">
                    <i class="fas fa-graduation-cap"></i> ${aktivitasTeks}
                </span>`;
            } else if (aktivitasTeks.includes("Admin") || aktivitasTeks.includes("Editor")) {
                badgeAktivitas = `<span style="background:#f3e8ff; color:#7e22ce; padding:4px 10px; border-radius:6px; font-weight:600; display:inline-flex; align-items:center; gap:6px; border:1px solid #e9d5ff;">
                    <i class="fas fa-tools"></i> ${aktivitasTeks}
                </span>`;
            } else if (aktivitasTeks.includes("Multiplayer")) {
                badgeAktivitas = `<span style="background:#fef3c7; color:#b45309; padding:4px 10px; border-radius:6px; font-weight:600; display:inline-flex; align-items:center; gap:6px; border:1px solid #fde68a;">
                    <i class="fas fa-users"></i> ${aktivitasTeks}
                </span>`;
            } else if (aktivitasTeks.startsWith("Mengerjakan")) {
                badgeAktivitas = `<span style="background:#dcfce7; color:#15803d; padding:4px 10px; border-radius:6px; font-weight:600; display:inline-flex; align-items:center; gap:6px; border:1px solid #bbf7d0;">
                    <i class="fas fa-pencil-alt"></i> ${aktivitasTeks}
                </span>`;
            } else if (aktivitasTeks === "VIP Gatekeeper") {
                badgeAktivitas = `<span style="color:#d35400; font-weight:bold;"><i class="fas fa-user-clock"></i> Pending Access</span>`;
            } else if (aktivitasTeks.includes("Lobby")) {
                badgeAktivitas = `<span style="background:#f1f5f9; color:#475569; padding:4px 10px; border-radius:6px; font-weight:600; display:inline-flex; align-items:center; gap:6px; border:1px solid #e2e8f0;">
                    <i class="fas fa-home"></i> Lobby Utama
                </span>`;
            } else {
                badgeAktivitas = `<span style="background:#f8fafc; color:#334155; padding:4px 10px; border-radius:6px; font-weight:600; display:inline-flex; align-items:center; gap:6px; border:1px solid #cbd5e1;">
                    <i class="fas fa-desktop"></i> ${aktivitasTeks}
                </span>`;
            }

            let infoAktivitas = isBeneranOnline 
                ? badgeAktivitas 
                : `<div style="display:flex; flex-direction:column; gap:2px;"><span style="color:#888; font-size:0.85rem;"><i class="fas fa-clock"></i> ${ketWaktu}</span><small style="color:#aaa;">Terakhir: ${aktivitasTeks}</small></div>`;

            let kodeVipUser = "Belum Buat";
            if (d.email && vipMap[d.email]) {
                kodeVipUser = vipMap[d.email];
            }

            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:10px; color:#444;">
                    <strong style="display:block;">${d.nama || 'Peserta'}</strong>
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
        container.innerHTML = html;} catch (e) {
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
    
    // Pastikan data kunci jawaban tidak tersimpan ke penyimpanan browser saat ujian berlangsung
    const safeQuestions = currentQuestions.map(q => {
        const copy = { ...q };
        delete copy.answer;
        delete copy.kunci;
        delete copy.explanation;
        delete copy.cite;
        return copy;
    });

    progres[window.currentDatabaseId] = {
        jawaban: userAnswers,
        ragu: raguStatus,
        waktuSisa: timeRemaining,
        soalAcak: safeQuestions,
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
// ==========================================
// 📅 FITUR JADWAL SELEKSI CAKIM (VERSI POP-UP OVERLAY)
// ==========================================
window.initJadwalCakim = () => {
    // 1. Data Timeline Utama (Tidak ada perubahan)
    const phases = [
        ["1","Finalisasi Administrasi","Batas akhir: 2 Nov 2026 • 23.59 WIB","Cetak SKP 1 tahun terakhir (baik), SPT 1 tahun terakhir, dan urus Surat Izin Pimpinan PA Serang. Scan berwarna KTP, Ijazah S-1, Transkrip, dan SK PNS. Unggah seluruh dokumen ke portal."],
        ["2","Eksekusi TOEFL ITP","Kamis, 8 Okt 2026","Amankan skor minimal 450. Gunakan strategi scanning teks dan jangan biarkan ada jawaban kosong."],
        ["3","Medical & Legal Clearance","9–16 Okt 2026","Tes kesehatan jasmani, rohani, dan bebas narkoba di RS Pemerintah. Ajukan Surat Keterangan Tidak Pernah Dijatuhi Hukuman Disiplin ke Bawas MA."],
        ["4","SKB: Tes CAT","9–10 Nov 2026","Hadapi Tes Substansi Hukum & Teknologi Informasi berbasis komputer. Maksimalkan simulasi harian di PRO-TAMA."],
        ["5","SKB: Tes Tertulis","11–12 Nov 2026","Ujian analisis kasus hukum peradilan. Gunakan insting minutasi harian di PA Serang untuk merangkai argumen hukum."],
        ["6","Wawancara & Kitab Kuning","7–11 Des 2026","Ujian lisan membaca dan memahami Kitab Kuning serta psikotes (sistem gugur). Fokus pemaparan business logic dari teks hukum keluarga."],
        ["7","Pengumuman Kelulusan","31 Des 2026","Pantau hasil kelulusan akhir pengadaan Calon Hakim 2026."]
    ];
    
    // Render Timeline (PERBAIKAN: data-task diubah menjadi data-id agar seragam)
    const tlWadah = document.getElementById('renderTimelineCakim');
    if (tlWadah) {
        tlWadah.innerHTML = phases.map((p,i)=>`<div class="item-cakim"><div class="num-cakim">${p[0]}</div><div><h3 class="h3-cakim">${p[1]}</h3><div class="date-cakim">${p[2]}</div><div class="desc-cakim">${p[3]}</div></div><input class="check-cakim" type="checkbox" onchange="window.saveCakim()" data-id="phase_${i}" aria-label="Selesai"></div>`).join("");
    }

    // 2. Data Admin Checklist (Tidak ada perubahan)
    const admin = [
        ["5 Okt","Bikin akun portal pendaftaran. Temui pimpinan satker saat istirahat untuk Surat Izin Pimpinan dan Surat Keterangan Tidak Sedang Cuti."],
        ["6 Okt","Cetak dan mintakan legalisasi/tanda tangan basah SKP 1 tahun terakhir (predikat baik) dan tanda bukti lapor SPT 1 tahun terakhir."],
        ["7 Okt","Drafting Surat Lamaran dan dua Surat Pernyataan (kesediaan penempatan & diangkat Hakim Pratama). Siapkan meterai Rp10.000."],
        ["8 Okt","Eksekusi TOEFL ITP. Fokus total pada ujian dan pastikan skor menyentuh angka aman di atas 450."],
        ["9 Okt","Izin untuk tes ke RS Pemerintah: Surat Keterangan Sehat Jasmani, Rohani, dan Bebas Narkoba."],
        ["12 Okt","Ajukan Surat Keterangan Tidak Pernah Dijatuhi Hukuman Disiplin (Sedang/Berat) ke Bawas MA."],
        ["18 Okt","Scan berwarna seluruh dokumen: KTP, pas foto latar merah, Ijazah S-1, Transkrip, SK PNS, dan surat yang terkumpul."],
        ["19–21 Okt","Upload berkala ke portal. Pastikan PDF terbaca jelas dan tidak corrupt. Klik submit final."]
    ];
    
    // Render Admin (PERBAIKAN: data-admin diubah menjadi data-id agar seragam)
    const admWadah = document.getElementById('renderAdminCakim');
    if (admWadah) {
        admWadah.innerHTML = admin.map((x,i)=>`<label class="task-cakim"><input type="checkbox" class="check-cakim" onchange="window.saveCakim()" data-id="admin_${i}"><span><b>${x[0]}</b> — ${x[1]}</span></label>`).join("");
    }

    // Panggil render jadwal mingguan yang dinamis
    window.renderJadwalMingguan();

    // Tarik data yang udah disimpen sebelumnya
    window.loadCakim();
};

window.saveCakim = () => {
    const KEY = "cakim2026-checklist-v1";
    let saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    
    // Looping semua kotak centang menggunakan data-id atau data-extra
    document.querySelectorAll('.cakim-wrapper input[type=checkbox]').forEach(el => {
        const k = el.getAttribute('data-id') || el.getAttribute('data-extra');
        if(k) saved[k] = el.checked;
    });
    
    localStorage.setItem(KEY, JSON.stringify(saved)); 
    window.updateProgressCakim();
};

window.loadCakim = () => {
    const KEY = "cakim2026-checklist-v1";
    let saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    
    document.querySelectorAll('.cakim-wrapper input[type=checkbox]').forEach(el => {
        const k = el.getAttribute('data-id') || el.getAttribute('data-extra');
        if(k) {
            el.checked = saved[k] === true; 
            
            // Atur animasi background warna hijau khusus timeline
            const item = el.closest('.item-cakim');
            if(item) item.classList.toggle('done-cakim', el.checked);
        }
    });
    
    window.updateProgressCakim();
};

window.updateProgressCakim = () => {
    const all = [...document.querySelectorAll('.cakim-wrapper input[type=checkbox]')];
    const done = all.filter(x=>x.checked).length;
    const total = all.length;
    const pct = total ? Math.round(done/total*100) : 0;
    
    const bar = document.getElementById("barCakim");
    if(bar) bar.style.width = pct+"%";
    
    const pText = document.getElementById("progressTextCakim");
    if(pText) pText.textContent = pct+"% selesai";
    
    const cText = document.getElementById("countTextCakim");
    if(cText) cText.textContent = done+" / "+total+" tugas";
    
    const elDone = document.getElementById("doneCakim");
    if(elDone) elDone.textContent = done;
    
    const elRem = document.getElementById("remainCakim");
    if(elRem) elRem.textContent = total-done;
    
    const elPct = document.getElementById("pctCakim");
    if(elPct) elPct.textContent = pct+"%";
    
    document.querySelectorAll('.item-cakim').forEach(i => {
        const c = i.querySelector('.check-cakim');
        if(c) i.classList.toggle('done-cakim', c.checked);
    });
};

window.showTabCakim = (id, btn) => {
    document.querySelectorAll('.section-cakim').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('.nav-cakim button').forEach(b => b.classList.remove('active')); 
    btn.classList.add('active');
};

window.resetCakimAll = () => {
    if(confirm("Yakin mau ngereset semua checklist?")) {
        localStorage.removeItem("cakim2026-checklist-v1");
        document.querySelectorAll('.cakim-wrapper input[type=checkbox]').forEach(x => x.checked = false);
        window.updateProgressCakim();
    }
};

window.bukaJadwalCakim = () => {
    if (window.updateUserStatus) window.updateUserStatus(true, 'Pusat Studi: Master Checklist');
    const overlay = document.getElementById('jadwalOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        
        // --- INJEKSI NAMA USER DINAMIS ---
        const namaPill = document.getElementById('cakimUserNameText');
        if (namaPill) {
            // Coba ambil dari variabel currentUser Firebase kalau ada
            if (typeof currentUser !== 'undefined' && currentUser) {
                namaPill.textContent = currentUser.displayName || currentUser.email.split('@')[0];
            } else {
                // Kalau nggak ketemu, copy dari nama yang udah tampil di sidebar kiri
                const roleDisplay = document.getElementById('roleDisplay');
                if (roleDisplay && roleDisplay.innerText !== "Memuat Nama...") {
                    namaPill.textContent = roleDisplay.innerText;
                } else {
                    namaPill.textContent = "Peserta Ujian";
                }
            }
        }
        // ---------------------------------

        // Render ulang data tiap kali pop-up dibuka
        if(typeof window.initJadwalCakim === 'function') {
            window.initJadwalCakim();
        }
    } else {
        alert("HTML Overlay Master Cakim belum dipasang!");
    }
};

// Default jadwal jika user belum pernah mengatur sama sekali
const defaultJadwalMingguan = [
    { waktu: "05.00–06.00", senkam: "Simulasi CAT (PRO-TAMA): 1 set soal TI & Hukum Acara PA tiap subuh.", jumat: "Simulasi CAT: latihan soal studi kasus kewarisan.", sabtu: "Istirahat / bebas.", minggu: "Olahraga/Gym (jaga stamina & sehat)." },
    { waktu: "08.00–12.00", senkam: "Kerja rutin PA Serang.", jumat: "Kerja rutin PA Serang.", sabtu: "Kuliah S2 (pagi): materi S2.", minggu: "Free time / nugas S2." },
    { waktu: "12.00–13.00", senkam: "1 jam krusial: urus admin / hafalan vocab.", jumat: "Jumatan & istirahat.", sabtu: "Kuliah S2 (siang).", minggu: "Deep Work: bedah aturan hukum." },
    { waktu: "13.00–16.30", senkam: "Kerja rutin PA Serang.", jumat: "Kerja rutin / izin kampus.", sabtu: "Pulang / istirahat.", minggu: "Cicil scan dokumen & cek PDF." },
    { waktu: "16.30–19.30", senkam: "Perjalanan pulang, makan malam.", jumat: "Kuliah S2 (sore).", sabtu: "Istirahat / quality time.", minggu: "Istirahat / makan malam." },
    { waktu: "19.30–21.30", senkam: "Crash Course Kitab Kuning: Fiqh as-Sunnah.", jumat: "Kuliah S2 (malam): istirahat.", sabtu: "Review soal salah seminggu.", minggu: "Crash Course Kitab Kuning." },
    { waktu: "21.30–22.00", senkam: "Review hafalan vocab hari itu.", jumat: "Istirahat pemulihan.", sabtu: "Review hafalan vocab.", minggu: "Review hafalan vocab." }
];

window.renderJadwalMingguan = () => {
    const KEY = "cakim2026-jadwal-dinamis";
    // Tarik data jadwal dari localStorage, jika kosong gunakan default
    let savedJadwal = JSON.parse(localStorage.getItem(KEY));
    if (!savedJadwal || savedJadwal.length === 0) {
        savedJadwal = [...defaultJadwalMingguan];
        localStorage.setItem(KEY, JSON.stringify(savedJadwal));
    }

    const tbody = document.getElementById('renderJadwalMingguan');
    if (!tbody) return;

    tbody.innerHTML = savedJadwal.map((j, index) => `
        <tr>
            <td style="text-align:center; font-weight:bold; color:var(--muted);">${index + 1}</td>
            <td contenteditable="true" onblur="window.updateJadwalMingguan(${index}, 'waktu', this.innerText)" style="font-weight:bold;">${j.waktu}</td>
            <td contenteditable="true" onblur="window.updateJadwalMingguan(${index}, 'senkam', this.innerText)">${j.senkam}</td>
            <td contenteditable="true" onblur="window.updateJadwalMingguan(${index}, 'jumat', this.innerText)">${j.jumat}</td>
            <td contenteditable="true" onblur="window.updateJadwalMingguan(${index}, 'sabtu', this.innerText)">${j.sabtu}</td>
            <td contenteditable="true" onblur="window.updateJadwalMingguan(${index}, 'minggu', this.innerText)">${j.minggu}</td>
            <td style="text-align:center;">
                <button onclick="window.hapusJadwalMingguan(${index})" style="background:var(--danger); color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer;" title="Hapus Baris">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join("");
};

window.updateJadwalMingguan = (index, field, value) => {
    const KEY = "cakim2026-jadwal-dinamis";
    let savedJadwal = JSON.parse(localStorage.getItem(KEY) || "[]");
    
    if (savedJadwal[index]) {
        savedJadwal[index][field] = value;
        localStorage.setItem(KEY, JSON.stringify(savedJadwal));
    }
};

window.tambahJadwalMingguan = () => {
    const KEY = "cakim2026-jadwal-dinamis";
    let savedJadwal = JSON.parse(localStorage.getItem(KEY) || "[]");
    
    savedJadwal.push({
        waktu: "00.00-00.00",
        senkam: "Klik untuk mengedit...",
        jumat: "Klik untuk mengedit...",
        sabtu: "Klik untuk mengedit...",
        minggu: "Klik untuk mengedit..."
    });
    
    localStorage.setItem(KEY, JSON.stringify(savedJadwal));
    window.renderJadwalMingguan();
};

window.hapusJadwalMingguan = (index) => {
    if(confirm("Yakin ingin menghapus jadwal di baris ini?")) {
        const KEY = "cakim2026-jadwal-dinamis";
        let savedJadwal = JSON.parse(localStorage.getItem(KEY) || "[]");
        
        savedJadwal.splice(index, 1); // Hapus 1 elemen pada index tersebut
        localStorage.setItem(KEY, JSON.stringify(savedJadwal));
        window.renderJadwalMingguan();
    }
};
// ==========================================
// 🚀 FITUR PETA TEMPUR 24 HARI CAKIM
// ==========================================

const petaTempurData = [
    {
        title: "MINGGU 1 (16 – 21 OKTOBER 2026)",
        subtitle: "Fokus Pilar 1 & 2: Hukum Acara Perdata, Hukum Acara PA, & TI Peradilan (E-Court)",
        days: [
            {
                dateStr: "20261016", dayLabel: "Hari 1 • Jumat, 16 Okt", tag: "Start + Kuliah S2", tagBg: "background:#fef3c7; color:#92400e;",
                tasks: [
                    { id: "pt-d1-t1", time: "Pagi (05.30)", text: "2.1. Asas Peradilan Agama + Menu Konsolidasi UU PA" },
                    { id: "pt-d1-t2", time: "Siang [TI]", text: "Modul 17: E-Court & Tercatat (PERMA 1/2019 jo. PERMA 7/2022)" },
                    { id: "pt-d1-t3", time: "Malam", text: "STOP BELAJAR CAKIM! Fokus Kuliah S2 & Tidur Maksimal 22.00" }
                ]
            },
            {
                dateStr: "20261017", dayLabel: "Hari 2 • Sabtu, 17 Okt", tag: "Zona Bebas Cakim", tagBg: "background:#f3e8ff; color:#6b21a8;",
                tasks: [
                    { id: "pt-d2-t1", time: "Pagi–Sore", text: "Fokus Full Kuliah S2 (Cicil kerangka tugas S2 di sela jam kuliah)" },
                    { id: "pt-d2-t2", time: "Malam", text: "Istirahat Total / Refreshing Otak (Tidur Maksimal 22.00)" }
                ]
            },
            {
                dateStr: "20261018", dayLabel: "Hari 3 • Minggu, 18 Okt", tag: "Waktu Emas Pagi", tagBg: "background:#d1fae5; color:#065f46;",
                tasks: [
                    { id: "pt-d3-t1", time: "08.00–09.30", text: "1. BUKU II PA (Grup Acara) + Menu Bedah Buku II PA 2026" },
                    { id: "pt-d3-t2", time: "09.30–11.00", text: "Modul 4: Pendaftaran & Relaas (Panggilan Sidang Sah & Patut)" },
                    { id: "pt-d3-t3", time: "Siang/Malam", text: "Bereskan Tugas S2 • Malam Free Time & Tidur 22.00" }
                ]
            },
            {
                dateStr: "20261019", dayLabel: "Hari 4 • Senin, 19 Okt", tag: "Acara PA Inti", tagBg: "background:#dbeafe; color:#1e40af;",
                tasks: [
                    { id: "pt-d4-t1", time: "Pagi (05.30)", text: "Modul 5: Gugatan & Permohonan (Syarat Formil/Materil, Kumulasi, Rekonvensi)" },
                    { id: "pt-d4-t2", time: "Siang (12.15)", text: "Modul 7: Mediasi di Pengadilan (PERMA No. 1 Tahun 2016)" },
                    { id: "pt-d4-t3", time: "Malam (20.30)", text: "Drilling 25 Soal HOTS UU Peradilan Agama + Bedah Pasal" }
                ]
            },
            {
                dateStr: "20261020", dayLabel: "Hari 5 • Selasa, 20 Okt", tag: "Sita & E-Litigasi", tagBg: "background:#dbeafe; color:#1e40af;",
                tasks: [
                    { id: "pt-d5-t1", time: "Pagi (05.30)", text: "Modul 12: Sita Jaminan (Conservatoir, Revindicatoir, Sita Marital)" },
                    { id: "pt-d5-t2", time: "Siang [TI]", text: "Modul 16: Prodeo & Posbakum + Review Alur Teknis SIPP/E-Litigasi" },
                    { id: "pt-d5-t3", time: "Malam (20.30)", text: "Modul 6: PMH & Wanprestasi (Irisan Hukum Acara & Perdata)" }
                ]
            },
            {
                dateStr: "20261021", dayLabel: "Hari 6 • Rabu, 21 Okt", tag: "Kunci HAPER 2023", tagBg: "background:#e0e7ff; color:#3730a3;",
                tasks: [
                    { id: "pt-d6-t1", time: "Pagi (05.30)", text: "3. HAPER Cakim 2023 (Bagian 1 – Pemetaan Pola Soal Acara Perdata)" },
                    { id: "pt-d6-t2", time: "Siang (12.15)", text: "3. HAPER Cakim 2023 (Bagian 2)" },
                    { id: "pt-d6-t3", time: "Malam (20.30)", text: "Bedah Pasal HIR / RBg dari Soal HAPER 2023 yang Masih Salah" }
                ]
            }
        ]
    },
    {
        title: "MINGGU 2 (22 – 26 OKTOBER 2026)",
        subtitle: "Fokus Pilar 3A: Hukum Islam — Bedah KHI Buku I (Perkawinan) & Buku III (Perwakafan)",
        days: [
            {
                dateStr: "20261022", dayLabel: "Hari 7 • Kamis, 22 Okt", tag: "KHI Perkawinan 1", tagBg: "background:#d1fae5; color:#065f46;",
                tasks: [
                    { id: "pt-d7-t1", time: "Pagi (05.30)", text: "Baca KHI Buku I (Bab I–VI: Peminangan, Rukun, Mahar, Larangan) + Modul 8" },
                    { id: "pt-d7-t2", time: "Siang (12.15)", text: "Modul 8.3: Perkawinan (UU No. 1/1974 jo. UU No. 16/2019)" },
                    { id: "pt-d7-t3", time: "Malam (20.30)", text: "Modul 8.4: Peraturan Pelaksana (PP No. 9 Tahun 1975)" }
                ]
            },
            {
                dateStr: "20261023", dayLabel: "Hari 8 • Jumat, 23 Okt", tag: "KHI 2 + Kuliah S2", tagBg: "background:#fef3c7; color:#92400e;",
                tasks: [
                    { id: "pt-d8-t1", time: "Pagi (05.30)", text: "Baca KHI Buku I (Bab VII–XII: Perjanjian, Poligami, Batal Kawin) + Modul 8.1" },
                    { id: "pt-d8-t2", time: "Siang [TI]", text: "Review TI Umum, UU ITE, Tanda Tangan Elektronik & SPBE MA" },
                    { id: "pt-d8-t3", time: "Malam", text: "STOP BELAJAR CAKIM! Fokus Kuliah S2 & Tidur Cepat" }
                ]
            },
            {
                dateStr: "20261024", dayLabel: "Hari 9 • Sabtu, 24 Okt", tag: "Zona Bebas Cakim", tagBg: "background:#f3e8ff; color:#6b21a8;",
                tasks: [
                    { id: "pt-d9-t1", time: "Pagi–Sore", text: "Fokus Full Kuliah S2 (Berpikir Hukum di Kelas = Olahraga Otak)" },
                    { id: "pt-d9-t2", time: "Malam", text: "Istirahat Total & Tidur Maksimal 22.00" }
                ]
            },
            {
                dateStr: "20261025", dayLabel: "Hari 10 • Minggu, 25 Okt", tag: "Tuntas KHI Buku I", tagBg: "background:#d1fae5; color:#065f46;",
                tasks: [
                    { id: "pt-d10-t1", time: "08.00–09.45", text: "Baca KHI Buku I (Bab XIII–XIX: Harta Bersama, Hadhanah, Putus Kawin, Iddah)" },
                    { id: "pt-d10-t2", time: "09.45–11.00", text: "Modul 9: Perwalian & Pengangkatan Anak" },
                    { id: "pt-d10-t3", time: "Siang & Malam", text: "Tugas S2 Siang Hari • Malam Free Time & Tidur 22.00" }
                ]
            },
            {
                dateStr: "20261026", dayLabel: "Hari 11 • Senin, 26 Okt", tag: "KHI Wakaf & Buku Saku", tagBg: "background:#d1fae5; color:#065f46;",
                tasks: [
                    { id: "pt-d11-t1", time: "Pagi (05.30)", text: "Baca KHI Buku III (Perwakafan) & UU Wakaf + Modul 14: Perwakafan" },
                    { id: "pt-d11-t2", time: "Siang (12.15)", text: "Modul 15: Buku Saku Peradilan Agama A" },
                    { id: "pt-d11-t3", time: "Malam (20.30)", text: "Modul 15.1: Buku Saku PA B & Modul 15.2: Buku Saku PA C" }
                ]
            }
        ]
    },
    {
        title: "MINGGU 3 (27 OKT – 1 NOV 2026)",
        subtitle: "Fokus Pilar 3B: KHI Buku II (Kewarisan, Wasiat, Hibah) & Ekonomi Syariah",
        days: [
            {
                dateStr: "20261027", dayLabel: "Hari 12 • Selasa, 27 Okt", tag: "Waris Islam & KHI", tagBg: "background:#fef3c7; color:#92400e;",
                tasks: [
                    { id: "pt-d12-t1", time: "Pagi (05.30)", text: "Baca KHI Buku II (Pasal 171–193) + Modul 10: Waris Islam (Dasar)" },
                    { id: "pt-d12-t2", time: "Siang (12.15)", text: "Hafalan Pasti Ashabul Furudh, Hijab-Mahjub, Masalah Aul & Radd" },
                    { id: "pt-d12-t3", time: "Malam (20.30)", text: "Modul 10.1: Waris KHI (Ahli Waris Pengganti & Wasiat Wajibah)" }
                ]
            },
            {
                dateStr: "20261028", dayLabel: "Hari 13 • Rabu, 28 Okt", tag: "Hitungan Waris & Hibah", tagBg: "background:#fef3c7; color:#92400e;",
                tasks: [
                    { id: "pt-d13-t1", time: "Pagi (05.30)", text: "Baca KHI Buku II (Pasal 194–214) + Modul 11: Wasiat & Hibah" },
                    { id: "pt-d13-t2", time: "Siang (12.15)", text: "Modul 10.2: Waris BW (Cukup Skimming Cepat untuk Perbandingan)" },
                    { id: "pt-d13-t3", time: "Malam (20.30)", text: "Modul 10.3: Studi Kasus Waris (Wajib Latihan Corat-Coret Hitungan!)" }
                ]
            },
            {
                dateStr: "20261029", dayLabel: "Hari 14 • Kamis, 29 Okt", tag: "Ekonomi Syariah", tagBg: "background:#fef3c7; color:#92400e;",
                tasks: [
                    { id: "pt-d14-t1", time: "Pagi (05.30)", text: "Modul 13: Ekonomi Syariah A (Kompetensi Absolut & Prinsip Dasar)" },
                    { id: "pt-d14-t2", time: "Siang (12.15)", text: "Modul 13.1: Akad Syariah (Murabahah, Mudharabah, Musyarakah, Ijarah)" },
                    { id: "pt-d14-t3", time: "Malam (20.30)", text: "Modul 13.2: Ekonomi Syariah B (Sengketa & Eksekusi Jaminan Syariah)" }
                ]
            },
            {
                dateStr: "20261030", dayLabel: "Hari 15 • Jumat, 30 Okt", tag: "Cakim 2017 + S2", tagBg: "background:#fef3c7; color:#92400e;",
                tasks: [
                    { id: "pt-d15-t1", time: "Pagi (05.30)", text: "2. Substansi Cakim 2017 (Bagian 1)" },
                    { id: "pt-d15-t2", time: "Siang (12.15)", text: "2. Substansi Cakim 2017 (Bagian 2)" },
                    { id: "pt-d15-t3", time: "Malam", text: "STOP BELAJAR CAKIM! Fokus Kuliah S2 & Tidur Cepat" }
                ]
            },
            {
                dateStr: "20261031", dayLabel: "Hari 16 • Sabtu, 31 Okt", tag: "Zona Bebas Cakim", tagBg: "background:#f3e8ff; color:#6b21a8;",
                tasks: [
                    { id: "pt-d16-t1", time: "Pagi–Sore", text: "Fokus Full Kuliah S2" },
                    { id: "pt-d16-t2", time: "Malam", text: "Istirahat Total & Tidur Maksimal 22.00" }
                ]
            },
            {
                dateStr: "20261101", dayLabel: "Hari 17 • Minggu, 1 Nov", tag: "Modul Pelengkap", tagBg: "background:#e2e8f0; color:#1e293b;",
                tasks: [
                    { id: "pt-d17-t1", time: "08.00–09.30", text: "Sesi Jaring Pengaman: Menu UU Kekuasaan Kehakiman & UU MA" },
                    { id: "pt-d17-t2", time: "09.30–11.00", text: "Skimming Cepat: 3. KEPPH, 1. Ilmu Hukum & 2. Asas Umum" },
                    { id: "pt-d17-t3", time: "Siang & Malam", text: "Tugas S2 Siang Hari • Malam Free Time & Tidur 22.00" }
                ]
            }
        ]
    },
    {
        title: "MINGGU 4 & KARANTINA EMAS (2 – 12 NOVEMBER 2026)",
        subtitle: "Penguncian 4 Pilar, Cuti/WFA/Izin Kuliah, & Eksekusi Hari H",
        days: [
            {
                dateStr: "20261102", dayLabel: "Hari 18 • Senin, 2 Nov", tag: "Review Pilar 1 & 2", tagBg: "background:#ffe4e6; color:#9f1239;",
                tasks: [
                    { id: "pt-d18-t1", time: "Pagi & Siang", text: "Review Total Hukum Acara Perdata & PA (Buku II PA, Modul 4, 5, 7, 12, 16)" },
                    { id: "pt-d18-t2", time: "Malam (20.30)", text: "Ulang Soal Salah di 3. HAPER Cakim 2023" }
                ]
            },
            {
                dateStr: "20261103", dayLabel: "Hari 19 • Selasa, 3 Nov", tag: "Review Perkawinan & Eksyar", tagBg: "background:#ffe4e6; color:#9f1239;",
                tasks: [
                    { id: "pt-d19-t1", time: "Pagi & Siang", text: "Review Total KHI Buku I (Perkawinan) & Wakaf" },
                    { id: "pt-d19-t2", time: "Malam (20.30)", text: "Review Total Ekonomi Syariah & Akad" }
                ]
            },
            {
                dateStr: "20261104", dayLabel: "Hari 20 • Rabu, 4 Nov", tag: "Review Waris & Hibah", tagBg: "background:#ffe4e6; color:#9f1239;",
                tasks: [
                    { id: "pt-d20-t1", time: "Pagi & Siang", text: "Review Total KHI Buku II (Waris, Wasiat, Hibah)" },
                    { id: "pt-d20-t2", time: "Malam (20.30)", text: "Drilling Cepat Hitungan Kasus Waris" }
                ]
            },
            {
                dateStr: "20261105", dayLabel: "Hari 21 • Kamis, 5 Nov", tag: "🔥 CUTI (Karantina 1)", tagBg: "background:#fde047; color:#0f172a;",
                tasks: [
                    { id: "pt-d21-t1", time: "08.00–11.30", text: "Simulasi Full Gabungan: Substansi 2017 + HAPER 2023 + Drilling HOTS UU PA" },
                    { id: "pt-d21-t2", time: "13.30–16.00", text: "Pendalaman Fokus Materi Teknologi Informasi (TI) & E-Court/E-Litigasi" },
                    { id: "pt-d21-t3", time: "Malam", text: "Evaluasi Singkat & Tidur Maksimal 21.30" }
                ]
            },
            {
                dateStr: "20261106", dayLabel: "Hari 22 • Jumat, 6 Nov", tag: "🔥 WFA (Karantina 2)", tagBg: "background:#fde047; color:#0f172a;",
                tasks: [
                    { id: "pt-d22-t1", time: "08.00–11.30", text: "Baca Tuntas Pasal-Pasal Emas KHI (Pasal 1 s.d. 170 - Perkawinan)" },
                    { id: "pt-d22-t2", time: "13.30–16.00", text: "Baca Tuntas Pasal-Pasal Emas KHI (Pasal 171 s.d. 229 - Waris & Wakaf)" },
                    { id: "pt-d22-t3", time: "Malam", text: "Istirahat Penuh (Mode Hemat Energi)" }
                ]
            },
            {
                dateStr: "20261107", dayLabel: "Hari 23 • Sabtu, 7 Nov", tag: "🔥 IZIN S2 (Karantina 3)", tagBg: "background:#fde047; color:#0f172a;",
                tasks: [
                    { id: "pt-d23-t1", time: "08.00–11.30", text: "Latihan Kerangka Tes Tertulis (Duduk Perkara -> Legal Issue -> Pertimbangan -> Amar)" },
                    { id: "pt-d23-t2", time: "13.30–15.30", text: "Review Buku Saku PA (A, B, C) & SEMA Kamar Agama" },
                    { id: "pt-d23-t3", time: "Malam", text: "Nabung Tidur (Sleep Banking) - Tidur Jam 21.30" }
                ]
            },
            {
                dateStr: "20261108", dayLabel: "Hari 24 • Minggu, 8 Nov", tag: "🧘 H-1 Cooling Down", tagBg: "background:#a7f3d0; color:#064e3b;",
                tasks: [
                    { id: "pt-d24-t1", time: "08.00–10.00", text: "Skimming Ringan Catatan yang Sering Salah (Jangan Belajar Materi Baru!)" },
                    { id: "pt-d24-t2", time: "16.00 WIB", text: "TUTUP BUKU TOTAL! Siapkan Kartu Ujian, Pakaian, Mental Tenang & Tidur 21.00" }
                ]
            },
            {
                dateStr: "20261109", dayLabel: "9 – 10 Nov 2026", tag: "⚔️ HARI H GERBANG 1", tagBg: "background:#e11d48; color:#ffffff;",
                tasks: [
                    { id: "pt-d25-t1", time: "Siang/Pagi", text: "EKSEKUSI TES CAT (Fokus, Jangan Terpaku 1 Soal Macet, Jangan Bahas Soal Lalu)" },
                    { id: "pt-d25-t2", time: "Malam", text: "Review 45 Menit Format Putusan & Hitungan Waris untuk Tes Tertulis" }
                ]
            },
            {
                dateStr: "20261111", dayLabel: "11 – 12 Nov 2026", tag: "⚔️ HARI H GERBANG 2", tagBg: "background:#e11d48; color:#ffffff;",
                tasks: [
                    { id: "pt-d26-t1", time: "Hari H", text: "EKSEKUSI TES TERTULIS (Tuangkan Logika Hakim: Fakta, Pasal, & Amar yang Tegas)" }
                ]
            }
        ]
    }
];

window.renderPetaTempur = () => {
    const container = document.getElementById("renderPetaTempur");
    if (!container) return;
    
    const KEY = "cakim2026-checklist-v1";
    let saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    
    let html = "";
    petaTempurData.forEach(phase => {
        let daysHtml = phase.days.map(day => {
            let tasksHtml = day.tasks.map(t => {
                const isChecked = !!saved[t.id];
                return `
                    <label class="pt-task-row">
                        <input type="checkbox" class="pt-checkbox" data-id="${t.id}" onchange="window.savePetaTempur(this)" ${isChecked ? "checked" : ""}>
                        <span class="pt-task-text"><strong>[${t.time}]</strong> ${t.text}</span>
                    </label>
                `;
            }).join("");

            return `
                <div class="pt-day-card">
                    <div class="pt-day-header">
                        <span class="pt-day-label">${day.dayLabel}</span>
                        <span class="pt-day-tag" style="${day.tagBg}">${day.tag}</span>
                    </div>
                    <div>${tasksHtml}</div>
                </div>
            `;
        }).join("");

        html += `
            <div class="pt-phase-block">
                <div class="pt-phase-header">
                    <span class="pt-phase-badge">${phase.title}</span>
                    <h2 class="pt-phase-title">${phase.subtitle}</h2>
                </div>
                <div class="pt-day-grid">${daysHtml}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    window.updateProgressPeta();
};

// Fungsi SIMPAN KHUSUS PETA TEMPUR biar update bar-nya kepanggil
window.savePetaTempur = (elCheckbox) => {
    const KEY = "cakim2026-checklist-v1";
    let saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    
    const taskId = elCheckbox.getAttribute('data-id');
    if(taskId) {
        saved[taskId] = elCheckbox.checked;
        localStorage.setItem(KEY, JSON.stringify(saved));
    }
    
    // Update progress bar Peta Tempur
    window.updateProgressPeta();
    // Update juga progress bar Master Checklist (biar sinkron)
    if(typeof window.updateProgressCakim === 'function') window.updateProgressCakim();
};

window.updateProgressPeta = () => {
    const KEY = "cakim2026-checklist-v1";
    let saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    
    let total = 0;
    let completed = 0;
    petaTempurData.forEach(p => p.days.forEach(d => d.tasks.forEach(t => {
        total++;
        if (saved[t.id]) completed++;
    })));

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    const txt = document.getElementById("ptProgressText");
    const bar = document.getElementById("ptProgressBar");
    
    if(txt) txt.textContent = `${completed} / ${total} Sesi Selesai (${pct}%)`;
    if(bar) bar.style.width = `${pct}%`;

    // Update Countdown
    const targetDate = new Date("2026-11-09T07:00:00+07:00").getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
    const cdEl = document.getElementById("countdownCAT");
    if(cdEl) {
        if (diffDays > 0) cdEl.textContent = `🔥 Sisa ${diffDays} Hari Lagi!`;
        else if (diffDays === 0) cdEl.textContent = `🔥 HARI H TEMPUR!`;
        else cdEl.textContent = `Semangat Ujian!`;
    }
};

window.resetPetaTempur = () => {
    if(confirm("Yakin ingin menghapus semua ceklis di Peta Tempur 24 Hari?")) {
        const KEY = "cakim2026-checklist-v1";
        let saved = JSON.parse(localStorage.getItem(KEY) || "{}");
        petaTempurData.forEach(p => p.days.forEach(d => d.tasks.forEach(t => {
            delete saved[t.id]; // Hapus cuma punya peta tempur
        })));
        localStorage.setItem(KEY, JSON.stringify(saved));
        window.renderPetaTempur();
        window.updateProgressCakim(); // Update progress bar utama master checklist juga
    }
};

window.downloadICSPeta = () => {
    let icsLines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Peta Tempur Cakim PA 2026//ID", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    petaTempurData.forEach(phase => {
        phase.days.forEach(day => {
            const summary = `🎯 [CAKIM PA] ${day.dayLabel} (${day.tag})`;
            const desc = day.tasks.map(t => `[${t.time}] ${t.text}`).join("\\n") + "\\n\\nWajib Tidur Jam 22.00 WIB!";
            const dtStart = `${day.dateStr}T053000`;
            const dtEnd = `${day.dateStr}T061500`;
            const uid = `cakim-${day.dateStr}@etama.local`;

            icsLines.push("BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:20261015T150000Z`, `DTSTART;TZID=Asia/Jakarta:${dtStart}`, `DTEND;TZID=Asia/Jakarta:${dtEnd}`, `SUMMARY:${summary}`, `DESCRIPTION:${desc}`, "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:Saatnya Sesi Pagi Calon Hakim PA!", "END:VALARM", "END:VEVENT");
        });
    });
    icsLines.push("END:VCALENDAR");

    const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Jadwal_Tempur_Cakim_PA_2026.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Pastikan dipanggil pas init
const originalInit = window.initJadwalCakim;
window.initJadwalCakim = () => {
    if(originalInit) originalInit();
    window.renderPetaTempur();
};
// ==========================================
// 📖 FITUR 60 HARI KITAB KUNING (FIREBASE VERSI OBJECT)
// ==========================================
window.bukaKitabKuning = () => {
    if (window.updateUserStatus) window.updateUserStatus(true, 'Pusat Studi: 60 Hari Kitab Kuning');
    const overlay = document.getElementById('kitabOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        if(typeof window.initKitabKuning === 'function') {
            window.initKitabKuning();
        }
    } else {
        alert("HTML Overlay Kitab Kuning belum dipasang!");
    }
};

window.initKitabKuning = async () => {
    // --- AUDIO PLAYBACK FUNCTION (TTS) ---
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = function() {
            window.speechSynthesis.getVoices();
        };
    }

    window.suaraArabGlobal = null;
    window.playTextKitab = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); 
            window.suaraArabGlobal = new SpeechSynthesisUtterance(text);
            window.suaraArabGlobal.lang = 'ar-SA';
            window.suaraArabGlobal.rate = 0.4; 
            window.suaraArabGlobal.volume = 1.0;

            let voices = window.speechSynthesis.getVoices();
            let arabicVoice = voices.find(v => v.lang.toLowerCase().includes('ar'));
            if (arabicVoice) window.suaraArabGlobal.voice = arabicVoice;

            window.suaraArabGlobal.onerror = (event) => {
                console.error("Error dari browser:", event);
                alert("Gagal memutar! Pastikan Tab Chrome ini tidak di-Mute (Klik kanan tab > Unmute Site).");
            };
            window.speechSynthesis.speak(window.suaraArabGlobal);
        } else {
            alert("Fitur suara tidak didukung browser ini.");
        }
    };

    if (window.kitabSudahRender) {
        window.switchTabKitab('vocab');
        return;
    }

    PROTAMA.loading("Membuka Lembaran Kitab Kuning dari Server...");

    try {
        const vocabDoc = await getDoc(doc(window.db, "kitab_kuning", "master_vocab"));
        const kalimatDoc = await getDoc(doc(window.db, "kitab_kuning", "master_kalimat"));
        const shorofDoc = await getDoc(doc(window.db, "kitab_kuning", "master_shorof"));

        if (!vocabDoc.exists() || !kalimatDoc.exists() || !shorofDoc.exists()) {
            PROTAMA.close();
            return alert("Data Kitab Kuning belum tersedia di server!");
        }

        // 1. Ekstrak data Object dari Firebase
        const dataV = vocabDoc.data();
        
        // 2. Balikin (Convert) Object ke bentuk Nested Array aslinya biar kuis lo jalan
        const mapKeArray = (arrObj) => arrObj.map(o => [o.arab, o.latin, o.arti]);
        const vM = mapKeArray(dataV.vocabM);
        const vW = mapKeArray(dataV.vocabW);
        const vE = mapKeArray(dataV.vocabE);
        const vQ = mapKeArray(dataV.vocabQ);

        // Balikin array kalimat
        window.kalimatData = kalimatDoc.data().data.map(o => [
            o.arab_harokat, o.arab_gundul, o.latin, o.arti, o.shorof, o.kategori
        ]);

        window.fiilData = shorofDoc.data().data; // Shorof udah object dari awal
        window.allVocabsKitab = [...vM, ...vW, ...vE, ...vQ];

        // Rakit ulang tahapan (Stages)
        window.stagesVocab = [
            ["Khitbah & Akad","Munakahat",vM.slice(0,5)],["Rukun Nikah","Munakahat",vM.slice(5,10)],["Mahar & Hak","Munakahat",vM.slice(10,16)],["Talak & Khulu'","Munakahat",vM.slice(16,21)],["Iddah & Hadhanah","Munakahat",vM.slice(21,26)],
            ["Dasar Waris","Mawaris",vW.slice(0,4)],["Furudh 1","Mawaris",vW.slice(4,8)],["Furudh 2","Mawaris",vW.slice(8,12)],["Asabah & Hijab","Mawaris",vW.slice(12,16)],["Kasus Waris","Mawaris",vW.slice(16,20)],
            ["Jual Beli & Riba","Ekonomi Syariah",vE.slice(0,4)],["Gadai & Utang","Ekonomi Syariah",vE.slice(4,8)],["Syirkah & Kuasa","Ekonomi Syariah",vE.slice(8,12)],["Sewa & Bagi Hasil","Ekonomi Syariah",vE.slice(12,16)],["Wakaf & Hibah","Ekonomi Syariah",vE.slice(16,20)],
            ["Hakim & Gugatan","Hukum Acara",vQ.slice(0,4)],["Saksi & Sumpah","Hukum Acara",vQ.slice(4,8)],["Putusan & Iqrar","Hukum Acara",vQ.slice(8,12)],["Kecakapan Hukum","Hukum Acara",vQ.slice(12,15)],["Simulasi Gabungan","Campuran",[...vM.slice(18,20), ...vE.slice(4,6)]]
        ];

        window.kitabSudahRender = true;
        PROTAMA.close();
    } catch (error) {
        PROTAMA.close();
        return alert("Gagal memuat Kitab Kuning: " + error.message);
    }

    // --- STATE MANAGEMENT ---
    window.stateKitab = JSON.parse(localStorage.getItem("kitab60_v7") || "{}");
    window.filterKitab = "all";
    window.currentTabKitab = "vocab"; 
    window.isGhostModeKitab = false;

    window.stageForKitab = (d) => {
        if(window.currentTabKitab === "vocab") {
            return window.stagesVocab[Math.min(Math.floor((d-1)/3), window.stagesVocab.length-1)];
        } else {
            let s = window.kalimatData[(d-1) % window.kalimatData.length];
            return [`Bedah Teks ${d}`, s[5], [s]]; 
        }
    };

    window.toggleGlobalGhostKitab = () => {
        window.isGhostModeKitab = !window.isGhostModeKitab;
        document.querySelector('.kitab-wrapper').classList.toggle('ghost-mode', window.isGhostModeKitab);
        let btn = document.getElementById('btn-ghost-kitab');
        btn.innerText = window.isGhostModeKitab ? "👻 Ghost Global: ON" : "👻 Ghost Global";
        btn.style.background = window.isGhostModeKitab ? "var(--navy)" : "#eef2f4";
        btn.style.color = window.isGhostModeKitab ? "#fff" : "var(--navy)";
    };

    window.toggleLocalGhostKitab = (btn) => {
        let dayDiv = btn.closest('.day');
        let isActive = dayDiv.classList.toggle('ghost-mode');
        btn.classList.toggle('active', isActive);
        btn.innerText = isActive ? "👻 Ghost: ON" : "👻 Ghost";
    };

    window.toggleSecretKitab = (el) => { el.classList.toggle("hidden-content"); };

    window.switchTabKitab = (tab) => {
        window.currentTabKitab = tab;
        document.querySelectorAll('.kitab-wrapper .tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');
        
        document.getElementById('main-title-kitab').innerHTML = tab === 'vocab' ? "📅 Kurikulum Vocab (Mufradat)" : "📖 Kurikulum Bedah Teks & Shorof";
        document.getElementById('main-sub-kitab').innerHTML = tab === 'vocab' ? "Hafalkan kosa kata teknis pengadilan, tutupi terjemahan, dan klik ikon speaker 🔊 untuk mendengar makhraj-nya." : "Baca teks gundul Arab, dengarkan cara bacanya 🔊, pahami artinya, lalu bedah kedudukan <i>I'rab/Shorof</i>-nya.";
        
        window.filterKitab = "all";
        document.querySelectorAll("#filter-controls-kitab .btn-kitab").forEach(x=>{
            if(x.id!=='btn-ghost-kitab' && !x.innerText.includes('Drill') && !x.innerText.includes('Reset')) x.classList.remove("active");
        });
        document.querySelector("#filter-controls-kitab .btn-kitab").classList.add("active");
        window.renderKitab();
    };

    window.renderKitab = () => {
        const q=(document.getElementById("search-kitab").value||"").toLowerCase();
        const box=document.getElementById("days-kitab");
        box.innerHTML="";

        for(let d=1;d<=60;d++){
            let [topic,type,vs]=window.stageForKitab(d);
            if(window.filterKitab!=="all" && type!==window.filterKitab && type!=="Campuran")continue;
            let hay=`hari ${d} ${topic} ${type} ${vs.map(x=>x.join(" ")).join(" ")}`.toLowerCase();
            if(q&&!hay.includes(q))continue;
            
            const key = window.currentTabKitab === 'vocab' ? `v_d${d}` : `t_d${d}`;
            const done = !!window.stateKitab[key+"_done"];
            const read = !!window.stateKitab[key+"_read"];
            const quizScore = window.stateKitab[key+"_quizScore"];
            
            let el=document.createElement("div"); el.className="day";
            let contentHTML = "";

            if(window.currentTabKitab === 'vocab') {
                contentHTML = `
                <label class="task ${done?"done":""}"><input type="checkbox" ${done?"checked":""} onchange="window.toggleKitab('${key}_done',this)"><span class="text-content"><b>Hafalan Vocab:</b><br> ${vs.map(x=>`
                    <span class="vocab-item" style="white-space:nowrap;display:inline-block;margin-right:15px;margin-top:5px">
                        <span class="arabic-word" style="font-size:1.5em">${x[0]}</span> 
                        <button class="btn-audio" onclick="window.playTextKitab('${x[0]}')" title="Dengarkan Suara">🔊</button>
                        <span class="latin" title="Sembunyikan/Tampilkan" onclick="window.toggleSecretKitab(this)">(${x[1]})</span> = <span class="arti" onclick="window.toggleSecretKitab(this)" style="cursor:pointer;transition:.2s">${x[2]}</span>
                    </span>`).join("")}</span>
                </label>
                <label class="task ${read?"done":""}"><input type="checkbox" ${read?"checked":""} onchange="window.toggleKitab('${key}_read',this)"><span class="text-content"><b>Uji Mandiri:</b> Aktifkan Ghost Mode, baca teks Arab-nya dan sebutkan artinya tanpa melihat.</span></label>
                <div class="quizbox">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <h4>🧠 Kuis Harian</h4>
                            <div class="feedback" style="margin-top:0">${quizScore !== undefined ? `Skor Terbaik: <b style="color:var(--green)">${quizScore}%</b>` : `Uji ${vs.length} vocab Hukum`}</div>
                        </div>
                        <button class="btn-kitab" style="font-size:12px;padding:8px 12px" onclick="window.openQuizModalKitab(${d})">${quizScore !== undefined ? '↻ Ulangi Kuis' : '▶ Mulai Kuis'}</button>
                    </div>
                </div>`;
            } else {
                let s = vs[0]; 
                contentHTML = `
                <div style="padding:15px;text-align:center">
                    <div class="arabic-word" style="font-size:2.4em;margin-bottom:15px;line-height:1.6">${s[1]}</div>
                    <div style="margin-bottom:10px; display:flex; justify-content:center; align-items:center; gap:10px">
                        <button class="btn-audio" style="font-size:1.5em; padding:8px" onclick="window.playTextKitab('${s[0]}')" title="Dengarkan Suara">🔊</button>
                        <div class="arabic-word arabic-harokat" style="font-size:1.6em;color:var(--green);cursor:pointer;transition:.2s" onclick="window.toggleSecretKitab(this)">${s[0]}</div> 
                    </div>
                    <div class="latin" style="font-size:14px;margin-bottom:5px" onclick="window.toggleSecretKitab(this)">${s[2]}</div>
                    <div class="arti" style="font-size:15px;font-weight:600;color:var(--gold);cursor:pointer;transition:.2s" onclick="window.toggleSecretKitab(this)">"${s[3]}"</div>
                </div>
                <div class="shorof-box"><b>🔍 Bedah Shorof/Nahwu:</b><br>${s[4]}</div>
                <label class="task ${done?"done":""}" style="border-top:none"><input type="checkbox" ${done?"checked":""} onchange="window.toggleKitab('${key}_done',this)"><span class="text-content">Saya sudah bisa membaca teks gundulnya dengan lancar.</span></label>
                <label class="task ${read?"done":""}"><input type="checkbox" ${read?"checked":""} onchange="window.toggleKitab('${key}_read',this)"><span class="text-content">Saya memahami posisi i'rab/shorof pada kalimat di atas.</span></label>`;
            }

            el.innerHTML=`<div class="dayhead">
                <div>
                    <span class="daynum">HARI ${d}</span> <span class="badge">${type}</span><br>
                    <b style="font-size:14px">${topic}</b>
                </div>
                <div style="text-align:right">
                    <div style="font-size:12px;color:#087f5b;font-weight:800;margin-bottom:8px">${done&&read?"✓ SELESAI":"BELUM"}</div>
                    <button class="btn-kitab" style="font-size:10px;padding:5px 8px;border:1px solid var(--line);box-shadow:none" onclick="window.toggleLocalGhostKitab(this)">👻 Ghost</button>
                </div>
            </div>` + contentHTML;
            box.appendChild(el);
        }
        window.updateKitab();
    };

    window.toggleKitab = (k,el) => { window.stateKitab[k]=el.checked; localStorage.setItem("kitab60_v7",JSON.stringify(window.stateKitab)); window.renderKitab(); };

    window.updateKitab = () => {
        let done=0, total=120;
        for(let d=1;d<=60;d++){
            const key = window.currentTabKitab === 'vocab' ? `v_d${d}` : `t_d${d}`;
            if(window.stateKitab[`${key}_done`]) done++;
            if(window.stateKitab[`${key}_read`]) done++;
        }
        let pct=Math.round((done/total)*100) || 0;
        document.getElementById("kitab-bar").style.width=pct+"%";
        document.getElementById("kitab-pct").textContent=pct+"%";
        document.getElementById("kitab-count").textContent=done+" / "+total+" tugas selesai";
        document.getElementById("kitab-done").textContent=done;
        
        let fullDaysDone = 0;
        for(let d=1;d<=60;d++){
            const key = window.currentTabKitab === 'vocab' ? `v_d${d}` : `t_d${d}`;
            if(window.stateKitab[`${key}_done`] && window.stateKitab[`${key}_read`]) fullDaysDone++;
        }
        document.getElementById("kitab-remain").textContent=60 - fullDaysDone;
    };

    window.filterDaysKitab = (f,b) => {
        window.filterKitab=f;
        document.querySelectorAll("#filter-controls-kitab .btn-kitab").forEach(x=>{if(x.id!=='btn-ghost-kitab' && !x.innerText.includes('Drill') && !x.innerText.includes('Reset'))x.classList.remove("active")});
        b.classList.add("active");
        window.renderKitab();
    };

    window.resetAllKitab = () => {
        if(confirm("Hapus semua progress 60 hari Kitab Kuning?")){
            window.stateKitab={}; localStorage.removeItem("kitab60_v7"); window.renderKitab();
        }
    };

    // --- KUIS HARIAN ---
    window.activeDayKitab = 0; window.quizQuestionsKitab = []; window.currentQIndexKitab = 0; window.correctCountKitab = 0; window.isAnsweredKitab = false;
    
    window.openQuizModalKitab = (day) => {
        window.activeDayKitab = day; 
        document.getElementById("quiz-title-kitab").innerText = `Kuis Harian - Hari ${day}`;
        document.getElementById("quiz-modal-kitab").classList.add("active");
        document.getElementById("quiz-setup-kitab").classList.remove("hidden");
        document.getElementById("quiz-engine-kitab").classList.add("hidden"); 
        document.getElementById("quiz-result-kitab").classList.add("hidden");
    };

    window.closeQuizKitab = (save = false) => {
        document.getElementById("quiz-modal-kitab").classList.remove("active");
        if(save && window.correctCountKitab > 0) {
            let pct = Math.round((window.correctCountKitab / window.quizQuestionsKitab.length) * 100), key = `v_d${window.activeDayKitab}_quizScore`;
            if(pct > (window.stateKitab[key] || 0)) window.stateKitab[key] = pct; 
            localStorage.setItem("kitab60_v7", JSON.stringify(window.stateKitab)); 
            window.renderKitab();
        }
    };

    window.startQuizKitab = () => {
        let mode = document.getElementById("quiz-mode-kitab").value, vocabs = window.stageForKitab(window.activeDayKitab)[2];
        window.quizQuestionsKitab = vocabs.map(v => {
            let isA = mode === 'arab-arti' || (mode === 'mix' && Math.random() > 0.5);
            let qText = isA ? `Apa arti dari <span class="arabic-word" style="font-size:1.8em;color:var(--navy);display:block;margin:15px 0">${v[0]}</span>` : `Sebutkan bahasa Arab dari:<br><b style="font-size:1.3em;color:var(--green);display:block;margin:15px 0">"${v[2]}"</b>`;
            let corr = isA ? v[2] : v[0], wp = window.allVocabsKitab.filter(x => isA ? x[2] !== corr : x[0] !== corr).map(x => isA ? x[2] : x[0]);
            return { qText, opts: [corr, ...wp.sort(() => .5 - Math.random()).slice(0, 3)].sort(() => .5 - Math.random()), correctAnswer: corr, isArab: !isA };
        }).sort(() => .5 - Math.random());
        window.currentQIndexKitab = 0; window.correctCountKitab = 0;
        document.getElementById("quiz-setup-kitab").classList.add("hidden"); document.getElementById("quiz-engine-kitab").classList.remove("hidden");
        window.showQuestionKitab();
    };

    window.showQuestionKitab = () => {
        window.isAnsweredKitab = false; let q = window.quizQuestionsKitab[window.currentQIndexKitab];
        document.getElementById("quiz-progress-kitab").innerText = `Soal ${window.currentQIndexKitab + 1} dari ${window.quizQuestionsKitab.length}`;
        document.getElementById("quiz-score-live-kitab").innerText = `Benar: ${window.correctCountKitab}`;
        document.getElementById("quiz-question-kitab").innerHTML = q.qText;
        document.getElementById("quiz-options-kitab").innerHTML = q.opts.map(opt => `<button class="opt" style="${q.isArab ? "font-size:1.5em;text-align:center" : ""}" onclick="window.checkAnswerKitab('${opt.replace(/'/g,"\\'")}', this)"><span class="${q.isArab ? "arabic-word" : ""}">${opt}</span></button>`).join("");
    };

    window.checkAnswerKitab = (sel, btnEl) => {
        if (window.isAnsweredKitab) return; window.isAnsweredKitab = true; let q = window.quizQuestionsKitab[window.currentQIndexKitab];
        if (sel === q.correctAnswer) { btnEl.classList.add("correct"); window.correctCountKitab++; } 
        else { btnEl.classList.add("wrong"); Array.from(document.getElementById("quiz-options-kitab").children).forEach(b => { if (b.innerText.trim() === q.correctAnswer || b.innerHTML.includes(q.correctAnswer)) b.classList.add("correct"); }); }
        setTimeout(() => { window.currentQIndexKitab++; window.currentQIndexKitab < window.quizQuestionsKitab.length ? window.showQuestionKitab() : window.showResultKitab(); }, 1200);
    };

    window.showResultKitab = () => {
        document.getElementById("quiz-engine-kitab").classList.add("hidden"); document.getElementById("quiz-result-kitab").classList.remove("hidden");
        let pct = Math.round((window.correctCountKitab / window.quizQuestionsKitab.length) * 100);
        document.getElementById("quiz-final-score-kitab").innerText = `${pct}%`; document.getElementById("quiz-final-score-kitab").style.color = pct >= 70 ? "var(--green)" : "var(--red)";
        document.getElementById("quiz-feedback-text-kitab").innerText = `Antum menjawab benar ${window.correctCountKitab} dari ${window.quizQuestionsKitab.length} soal.\n${pct === 100 ? "Sempurna!" : pct >= 70 ? "Mantap, silakan lanjut." : "Coba ulangi hafalan hari ini."}`;
    };

    // --- DRILL SHOROF TENSES ---
    window.shorofQuestionsKitab = []; window.shorofIndexKitab = 0; window.shorofScoreKitab = 0; window.shorofAnsweredKitab = false;
    
    window.openShorofModalKitab = () => {
        document.getElementById("shorof-modal-kitab").classList.add("active");
        document.getElementById("shorof-setup-kitab").classList.remove("hidden");
        document.getElementById("shorof-engine-kitab").classList.add("hidden");
        document.getElementById("shorof-result-kitab").classList.add("hidden");
    };

    window.closeShorofModalKitab = () => { document.getElementById("shorof-modal-kitab").classList.remove("active"); };

    window.startShorofKitab = () => {
        window.shorofQuestionsKitab = [...window.fiilData].sort(() => 0.5 - Math.random());
        window.shorofIndexKitab = 0; window.shorofScoreKitab = 0;
        document.getElementById("shorof-setup-kitab").classList.add("hidden");
        document.getElementById("shorof-engine-kitab").classList.remove("hidden");
        window.showShorofQuestionKitab();
    };

    window.showShorofQuestionKitab = () => {
        window.shorofAnsweredKitab = false;
        let q = window.shorofQuestionsKitab[window.shorofIndexKitab];
        
        document.getElementById("shorof-progress-kitab").innerText = `Fi'il ${window.shorofIndexKitab + 1} / ${window.shorofQuestionsKitab.length}`;
        document.getElementById("shorof-score-live-kitab").innerText = `Benar: ${window.shorofScoreKitab}`;
        document.getElementById("shorof-konteks-kitab").classList.add("hidden");
        document.getElementById("shorof-next-btn-kitab").classList.add("hidden");
        
        document.getElementById("shorof-question-kitab").innerHTML = `
            <div style="font-size:12px;color:var(--muted);margin-bottom:5px">Identifikasi Tenses fi'il ini:</div>
            <div class="arabic-word" style="font-size:3em;color:var(--navy);margin:15px 0">${q.arab}</div>
            <div style="font-size:15px;font-style:italic;color:var(--green);font-weight:600">"${q.arti}"</div>
        `;
        
        let optionsHTML = ["Madhi (Lampau)", "Mudhari' (Sekarang/Akan Datang)", "Amr (Perintah)"].map(opt => `
            <button class="opt" style="font-size:14px;text-align:center;padding:12px" onclick="window.checkShorofKitab('${opt}', this)">${opt}</button>
        `).join("");
        
        document.getElementById("shorof-options-kitab").innerHTML = optionsHTML;
    };

    window.checkShorofKitab = (selected, btn) => {
        if (window.shorofAnsweredKitab) return; window.shorofAnsweredKitab = true;
        let q = window.shorofQuestionsKitab[window.shorofIndexKitab];
        let isCorrect = selected === q.jenis;
        
        if(isCorrect) { btn.classList.add("correct"); window.shorofScoreKitab++; } 
        else { btn.classList.add("wrong"); Array.from(document.getElementById("shorof-options-kitab").children).forEach(b => { if(b.innerText === q.jenis) b.classList.add("correct"); }); }
        
        let boxKonteks = document.getElementById("shorof-konteks-kitab");
        boxKonteks.innerHTML = `<b>Penerapan Yurisprudensi PA:</b><br>${q.konteks}`;
        boxKonteks.classList.remove("hidden");
        document.getElementById("shorof-next-btn-kitab").classList.remove("hidden");
    };

    window.nextShorofKitab = () => {
        window.shorofIndexKitab++;
        if(window.shorofIndexKitab < window.shorofQuestionsKitab.length) { window.showShorofQuestionKitab(); } 
        else {
            document.getElementById("shorof-engine-kitab").classList.add("hidden");
            document.getElementById("shorof-result-kitab").classList.remove("hidden");
            let pct = Math.round((window.shorofScoreKitab / window.shorofQuestionsKitab.length) * 100);
            document.getElementById("shorof-final-score-kitab").innerText = `${pct}%`;
            document.getElementById("shorof-feedback-text-kitab").innerText = `Antum berhasil mengidentifikasi tenses ${window.shorofScoreKitab} dari ${window.shorofQuestionsKitab.length} fi'il krusial PA dengan tepat.`;
        }
    };

    window.switchTabKitab('vocab');
};
window.bukaPusatStudi = () => {
    const overlay = document.getElementById('pusatStudiOverlay');
    if (!overlay) return;
    
    // Tampilkan layar penuh Pusat Studi
    overlay.style.display = "flex";
    if (window.updateUserStatus) window.updateUserStatus(true, "Pusat Studi: Menu Utama");

    const isSuper = typeof ADMIN_EMAILS !== 'undefined' && currentUser && ADMIN_EMAILS.includes(currentUser.email);
    let menuRahasia = document.querySelectorAll('.menu-rahasia-admin');
    
    // KUNCI HAK AKSES PUSAT STUDI CAKIM:
    // 1. Super Admin (ilhamnp22@gmail.com & inurprtma22@gmail.com): Buka SEMUA 8 modul!
    // 2. VIP & Editor: Memiliki 2 fitur (60 Hari Kitab Kuning & Himpunan Ayat Hukum). 6 modul lainnya disembunyikan.
    if (isSuper) {
        menuRahasia.forEach(menu => { menu.style.display = "block"; });
    } else {
        menuRahasia.forEach(menu => { menu.style.display = "none"; });
    }
};
// ==========================================
// 📖 FITUR BUKU II MA 
// ==========================================
window.bukaBukuDua = () => {
    if (window.updateUserStatus) window.updateUserStatus(true, 'Pusat Studi: Bedah Buku II PA');
    const overlay = document.getElementById('bukuDuaOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        // Hanya diinisialisasi sekali saat pertama kali dibuka
        if(typeof window.initBukuDua === 'function') {
            window.initBukuDua();
        }
    } else {
        alert("HTML Overlay Buku II MA belum dipasang!");
    }
};

window.initBukuDua = async () => {
    if (window.bukuDuaSudahRender) return;

    PROTAMA.loading("Memuat Khazanah Buku II MA...");
    let bankMateri = [];

    try {
        // Tarik data dari Firebase, urutkan berdasarkan field 'urutan'
        const qRef = query(collection(window.db, "buku_dua_ma"), orderBy("urutan", "asc"));
        const snapshot = await getDocs(qRef);

        if (snapshot.empty) {
            PROTAMA.close();
            return PROTAMA.alert("Data Kosong", "Materi Buku II MA belum tersedia di server!", "warning");
        }

        snapshot.forEach(doc => {
            bankMateri.push(doc.data());
        });

        window.bukuDuaSudahRender = true;
        PROTAMA.close();
    } catch (error) {
        PROTAMA.close();
        return PROTAMA.alert("Gagal Memuat", "Koneksi ke server bermasalah: " + error.message, "error");
    }

    // --- SISA DOM LOGIC SAMA PERSIS KAYA SEBELUMNYA ---
    const navContainer = document.getElementById('buku2-nav-container');
    const cardsContainer = document.getElementById('buku2-cards-container');
    const categoryTitle = document.getElementById('buku2-category-title');
    const hafalanToggle = document.getElementById('buku2-hafalanToggle');
    const overlayContainer = document.getElementById('bukuDuaOverlay');
    
    let activeKategoriIndex = 0; 

    function renderNav() {
        navContainer.innerHTML = '';
        bankMateri.forEach((item, index) => {
            const navItem = document.createElement('div');
            navItem.className = `nav-item ${index === activeKategoriIndex ? 'active' : ''}`;
            navItem.textContent = item.kategori;
            navItem.onclick = () => {
                activeKategoriIndex = index;
                renderNav();
                renderCards();
            };
            navContainer.appendChild(navItem);
        });
    }

    function renderCards() {
        cardsContainer.innerHTML = '';
        const data = bankMateri[activeKategoriIndex];
        categoryTitle.textContent = data.kategori;

        data.materi.forEach((cardData, cardIndex) => {
            const card = document.createElement('div');
            card.className = 'card';
            
            if(!hafalanToggle.checked) {
                card.classList.add('open');
            }

            const header = document.createElement('div');
            header.className = 'card-header';
            header.innerHTML = `
                <span>${cardData.judul}</span>
                <span class="study-hint">(Klik untuk melihat rincian & kuis) ▾</span>
            `;
            
            const body = document.createElement('div');
            body.className = 'card-body';
            
            let contentHTML = cardData.isi;

            // Handle Multiple Quizzes
            if(cardData.kuis && Array.isArray(cardData.kuis)) {
                let allQuizzesHTML = '';
                cardData.kuis.forEach((q, qIndex) => {
                    let optionsHTML = '';
                    q.pilihan.forEach((pilihanText, optIndex) => {
                        optionsHTML += `<div class="quiz-option" data-opt="${optIndex}">${pilihanText}</div>`;
                    });

                    allQuizzesHTML += `
                        <div class="quiz-container" id="buku2-quiz-${cardIndex}-${qIndex}">
                            <div class="quiz-title">📝 Kuis Evaluasi ${qIndex + 1} (HOTS)</div>
                            <div class="quiz-question">${q.soal}</div>
                            <div class="quiz-options">
                                ${optionsHTML}
                            </div>
                            <div class="quiz-explanation">
                                <strong>💡 Pembahasan:</strong> ${q.pembahasan}
                            </div>
                        </div>
                    `;
                });
                contentHTML += allQuizzesHTML;
            }

            body.innerHTML = contentHTML;

            header.onclick = () => {
                card.classList.toggle('open');
            };

            card.appendChild(header);
            card.appendChild(body);
            cardsContainer.appendChild(card);

            // Setup Listeners for Multiple Quizzes
            if(cardData.kuis && Array.isArray(cardData.kuis)) {
                cardData.kuis.forEach((q, qIndex) => {
                    const quizContainer = card.querySelector(`#buku2-quiz-${cardIndex}-${qIndex}`);
                    const options = quizContainer.querySelectorAll('.quiz-option');
                    const explanation = quizContainer.querySelector('.quiz-explanation');

                    options.forEach(opt => {
                        opt.addEventListener('click', function() {
                            if(this.classList.contains('disabled')) return;

                            const selectedIndex = parseInt(this.getAttribute('data-opt'));
                            const correctIndex = q.jawaban;

                            options.forEach(o => o.classList.add('disabled'));

                            if(selectedIndex === correctIndex) {
                                this.classList.add('correct');
                            } else {
                                this.classList.add('wrong');
                                options[correctIndex].classList.add('correct');
                            }

                            explanation.style.display = 'block';
                        });
                    });
                });
            }
        });
    }

    hafalanToggle.addEventListener('change', (e) => {
        if(e.target.checked) {
            overlayContainer.classList.add('mode-hafalan-active');
        } else {
            overlayContainer.classList.remove('mode-hafalan-active');
        }
        renderCards();
    });

    // Initialize
    renderNav();
    renderCards();
};
// SCRIPT MENGUNGGAH BUKU II KE FIREBASE (JALANKAN SEKALI SAJA)
window.uploadBukuDuaToFirebase = async () => {
    // Paste seluruh array bankMateri lu yang panjang itu di sini
    const bankMateri = [
        {
            kategori: "1. Pelayanan Terpadu Satu Pintu (PTSP)",
            materi: [ /* ... isi materi 1 ... */ ]
        },
        // ... (masukkan sisa data bankMateri lu secara utuh di sini) ...
        {
            kategori: "8. Ekonomi Syariah, Jinayat & Aturan Khusus",
            materi: [ /* ... isi materi 8 ... */ ]
        }
    ];

    try {
        PROTAMA.loading("Ngedorong data Buku II ke Firebase...");
        const batch = writeBatch(window.db);

        bankMateri.forEach((item, index) => {
            // Kita kasih nama dokumen bab_1, bab_2, dst biar rapi di database
            const docId = `bab_${index + 1}`;
            const docRef = doc(window.db, "buku_dua_ma", docId);
            
            // Simpan data beserta urutannya biar gampang di-sort pas ditarik
            batch.set(docRef, {
                urutan: index + 1,
                kategori: item.kategori,
                materi: item.materi
            });
        });

        await batch.commit();
        PROTAMA.close();
        PROTAMA.alert("SUKSES!", "Seluruh materi Buku II berhasil migrasi ke Firebase!", "success");
    } catch (e) {
        PROTAMA.close();
        alert("Error ngedorong data: " + e.message);
    }
};
// ==========================================
// ⚖️ FITUR UU MAHKAMAH AGUNG (FIREBASE)
// ==========================================
window.bukaUUMA = () => {
    if (window.updateUserStatus) window.updateUserStatus(true, 'Pusat Studi: UU Mahkamah Agung');
    const overlay = document.getElementById('uumaOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        if(typeof window.initUUMA === 'function') window.initUUMA();
    } else {
        alert("HTML Overlay UU MA belum dipasang!");
    }
};

window.initUUMA = async () => {
    if (window.uumaSudahRender) return;

    PROTAMA.loading("Memuat Modul UU Mahkamah Agung dari Server...");
    let bankMateri = [];

    try {
        const qRef = query(collection(window.db, "uu_ma"));
        const snapshot = await getDocs(qRef);

        if (snapshot.empty) {
            PROTAMA.close();
            return PROTAMA.alert("Data Kosong", "Materi UU MA belum tersedia di server!", "warning");
        }

        snapshot.forEach(doc => bankMateri.push(doc.data()));
        
        // Pastikan urut dari bab1 sampai bab6
        bankMateri.sort((a, b) => {
            const numA = parseInt(a.idBab.replace(/\D/g, ''));
            const numB = parseInt(b.idBab.replace(/\D/g, ''));
            return numA - numB;
        });

        window.uumaSudahRender = true;
        PROTAMA.close();
    } catch (error) {
        PROTAMA.close();
        return PROTAMA.alert("Gagal Memuat", "Koneksi ke server bermasalah: " + error.message, "error");
    }

    const navContainer = document.getElementById('uuma-nav-list');
    const contentArea = document.getElementById('uuma-content-area');
    let activeKategoriIndex = 0; 

    function renderUUMA() {
        navContainer.innerHTML = '';
        contentArea.innerHTML = '';

        bankMateri.forEach((bab, index) => {
            // 1. Render Navigasi Kiri
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = index === activeKategoriIndex ? 'active' : '';
            a.textContent = bab.judulBab;
            a.onclick = () => {
                activeKategoriIndex = index;
                renderUUMA();
            };
            li.appendChild(a);
            navContainer.appendChild(li);

            // 2. Render Konten Utama
            if (index === activeKategoriIndex) {
                const titleEl = document.createElement('h2');
                titleEl.className = 'uuma-bab-title';
                titleEl.textContent = bab.judulBab;
                contentArea.appendChild(titleEl);

                bab.materi.forEach((m, mIndex) => {
                    const details = document.createElement('details');
                    details.className = 'uuma-materi-details';
                    details.innerHTML = `<summary>${m.subJudul}</summary>`;

                    const body = document.createElement('div');
                    body.className = 'uuma-materi-content';
                    
                    let htmlKonten = m.isi;
                    
                    // Render Soal HOTS
                    htmlKonten += `
                        <div class="uuma-soal-poin" id="uuma-soal-${index}-${mIndex}">
                            <div class="uuma-soal-badge">📝 Uji Pemahaman</div>
                            <p style="font-weight: 500;">${m.soal}</p>
                            <ul class="uuma-opsi-list">
                                ${m.opsi.map((opsiText, optIdx) => `<li data-opt="${optIdx}">${opsiText}</li>`).join('')}
                            </ul>
                            <div class="uuma-pembahasan">
                                <strong>💡 Pembahasan:</strong><br>${m.pembahasan}
                            </div>
                        </div>
                    `;

                    body.innerHTML = htmlKonten;
                    details.appendChild(body);
                    contentArea.appendChild(details);

                    // Pasang Interaksi Kuis
                    const quizContainer = details.querySelector(`#uuma-soal-${index}-${mIndex}`);
                    const opsiElements = quizContainer.querySelectorAll('.uuma-opsi-list li');
                    const pembahasanBox = quizContainer.querySelector('.uuma-pembahasan');

                    opsiElements.forEach(optEl => {
                        optEl.addEventListener('click', function() {
                            if (this.classList.contains('disabled')) return;
                            
                            opsiElements.forEach(o => o.classList.add('disabled'));
                            
                            const selected = parseInt(this.getAttribute('data-opt'));
                            if (selected === m.kunci) {
                                this.classList.add('correct');
                            } else {
                                this.classList.add('wrong');
                                opsiElements[m.kunci].classList.add('correct');
                            }
                            pembahasanBox.style.display = 'block';
                        });
                    });
                });
            }
        });
    }

    renderUUMA();
};

// ==========================================
// ⚖️ FITUR UU KEKUASAAN KEHAKIMAN (FIREBASE)
// ==========================================
window.bukaUUKK = () => {
    if (window.updateUserStatus) window.updateUserStatus(true, 'Pusat Studi: UU Kekuasaan Kehakiman');
    const overlay = document.getElementById('uukkOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        if(typeof window.initUUKK === 'function') window.initUUKK();
    } else {
        alert("HTML Overlay UU KK belum dipasang!");
    }
};

window.initUUKK = async () => {
    if (window.uukkSudahRender) return;

    PROTAMA.loading("Memuat Modul UU Kekuasaan Kehakiman...");
    let databaseMateri = [];

    try {
        const qRef = query(collection(window.db, "uu_kk"), orderBy("urutan", "asc"));
        const snapshot = await getDocs(qRef);

        if (snapshot.empty) {
            PROTAMA.close();
            return PROTAMA.alert("Data Kosong", "Materi UU KK belum tersedia di server!", "warning");
        }

        snapshot.forEach(doc => databaseMateri.push(doc.data()));
        window.uukkSudahRender = true;
        PROTAMA.close();
    } catch (error) {
        PROTAMA.close();
        return PROTAMA.alert("Gagal Memuat", "Koneksi ke server bermasalah: " + error.message, "error");
    }

    const navList = document.getElementById('uukkNavList');
    const contentArea = document.getElementById('uukkContentArea');
    const sidebar = document.getElementById('uukkSidebar');
    const sidebarToggle = document.getElementById('uukkSidebarToggle');
    const focusToggle = document.getElementById('uukkFocusToggle');
    const overlay = document.getElementById('uukkOverlay');

    function renderSidebar() {
        navList.innerHTML = '';
        databaseMateri.forEach((babData, indexBab) => {
            const babTitle = document.createElement('li');
            babTitle.className = 'uukk-nav-bab';
            babTitle.textContent = babData.bab;
            navList.appendChild(babTitle);

            babData.subBabList.forEach((sub, indexSub) => {
                const subItem = document.createElement('li');
                subItem.className = 'uukk-nav-sub';
                subItem.textContent = sub.title;
                subItem.onclick = (e) => renderContent(indexBab, indexSub, e.target);
                navList.appendChild(subItem);
            });
        });
    }

    function renderContent(indexBab, indexSub, elementClicked) {
        document.querySelectorAll('.uukk-nav-sub').forEach(el => el.classList.remove('active'));
        if(elementClicked) elementClicked.classList.add('active');
        
        if (window.innerWidth < 768) {
            sidebar.classList.add('minimized');
            sidebarToggle.innerHTML = '&#10095;';
        }

        const data = databaseMateri[indexBab].subBabList[indexSub];
        
        let html = `
            <div class="uukk-card">
                <h2>${data.title}</h2>
                ${data.materi}
        `;

        const hurufAbjad = ['A', 'B', 'C', 'D'];
        
        if (data.soalList && Array.isArray(data.soalList)) {
            data.soalList.forEach((soal, idSoal) => {
                let opsiHtml = '';
                soal.opsi.forEach((opt, idx) => {
                    opsiHtml += `
                        <li class="uukk-opsi-item" data-benar="${opt.benar}">
                            <div class="uukk-opsi-huruf">${hurufAbjad[idx]}</div>
                            <div class="uukk-opsi-teks">${opt.teks}</div>
                        </li>
                    `;
                });

                html += `
                    <div class="uukk-soal-container">
                        <h3><span style="font-size: 1.3rem;">⚖️</span> ${soal.label}</h3>
                        <p class="uukk-soal-text">${soal.tanya}</p>
                        <ul class="uukk-opsi-list">
                            ${opsiHtml}
                        </ul>
                        <div class="uukk-pembahasan-box">
                            <div class="uukk-status-jawaban"></div>
                            <div class="uukk-pembahasan-teks"><b>Pembahasan:</b> ${soal.bahas}</div>
                        </div>
                    </div>
                `;
            });
        }

        html += `</div>`; 
        contentArea.innerHTML = html;

        // Pasang Event Listener Kuis
        const soalContainers = contentArea.querySelectorAll('.uukk-soal-container');
        soalContainers.forEach(container => {
            const opsiItems = container.querySelectorAll('.uukk-opsi-item');
            const pembahasanBox = container.querySelector('.uukk-pembahasan-box');
            const statusJawaban = container.querySelector('.uukk-status-jawaban');

            opsiItems.forEach(opsi => {
                opsi.addEventListener('click', function() {
                    if (this.classList.contains('disabled')) return;

                    const isBenar = this.getAttribute('data-benar') === 'true';

                    opsiItems.forEach(o => {
                        o.classList.add('disabled');
                        if (o.getAttribute('data-benar') === 'true') {
                            o.classList.add('correct');
                        }
                    });

                    if (!isBenar) {
                        this.classList.add('wrong');
                        statusJawaban.className = 'uukk-status-jawaban uukk-status-salah';
                        statusJawaban.innerHTML = '❌ Jawaban Anda Kurang Tepat';
                    } else {
                        statusJawaban.className = 'uukk-status-jawaban uukk-status-benar';
                        statusJawaban.innerHTML = '✅ Luar Biasa! Jawaban Anda Benar';
                    }

                    pembahasanBox.style.display = 'block';
                    pembahasanBox.classList.add('show');
                });
            });
        });
    }

    // Toggle Sidebar
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('minimized');
        sidebarToggle.innerHTML = sidebar.classList.contains('minimized') ? '&#10095;' : '&#10094;';
    });

    // Toggle Focus Mode
    focusToggle.addEventListener('click', () => {
        overlay.classList.toggle('uukk-focus-mode');
        if (overlay.classList.contains('uukk-focus-mode')) {
            sidebar.classList.add('minimized');
            sidebarToggle.innerHTML = '&#10095;';
            focusToggle.textContent = "☀️ Matikan Mode Samar";
        } else {
            sidebar.classList.remove('minimized');
            sidebarToggle.innerHTML = '&#10094;';
            focusToggle.textContent = "🌙 Mode Samar";
        }
    });

    renderSidebar();
};
// ==========================================
// 📖 FITUR AYAT HUKUM & TAJWID (QARI API)
// ==========================================

window.bukaAyatHukum = () => {
    if (window.updateUserStatus) window.updateUserStatus(true, 'Pusat Studi: Himpunan Ayat Hukum');
    // 1. Cek Jabatan (Gatekeeper)
    let roleAsli = window.userRoleCakim || "PESERTA";
    let role = roleAsli.toLowerCase().trim(); 

    let isVipAtauAdmin = (
        role === "super_admin" || 
        role === "editor" || 
        role === "vip"
    );

    // Kalau bukan VIP/Admin, tolak mentah-mentah! (Layar menu utama JANGAN ditutup)
    if (!isVipAtauAdmin) {
        console.log("Akses Ditolak. Role Kamu:", roleAsli);
        return alert("Mohon maaf Calon Yang Mulia! 🙏\nFitur Drilling Tajwid Ayat Hukum ini eksklusif untuk member VIP.");
    }

    // ========================================================
    // 2. KUNCI FIX-NYA DI SINI: TUTUP DULU LAYAR MENU UTAMA
    // ========================================================
    const pusatStudi = document.getElementById('pusatStudiOverlay');
    if (pusatStudi) {
        pusatStudi.style.display = 'none';
    }

    // 3. BARU BUKA LAYAR AYAT HUKUM
    const overlay = document.getElementById('aykumOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        if(typeof window.initAykum === 'function') {
            window.initAykum();
        }
    } else {
        alert("HTML Overlay Ayat Hukum belum dipasang!");
    }
};

window.initAykum = async () => {
    if (window.aykumSudahRender) return;

    if(typeof PROTAMA !== 'undefined') PROTAMA.loading("Memuat Ayat Hukum...");
    let dbAykum = [];

    try {
        const qRef = query(collection(window.db, "ayat_hukum"));
        const snapshot = await getDocs(qRef);

        if (snapshot.empty) {
            if(typeof PROTAMA !== 'undefined') PROTAMA.close();
            return alert("Data Ayat Hukum belum ada di server!");
        }

        // Simpan sementara buat di-sort biar urutan kategori nggak ngacak
        let rawData = [];
        snapshot.forEach(doc => rawData.push({ id: doc.id, data: doc.data() }));
        rawData.sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true}));
        dbAykum = rawData.map(d => d.data);

        window.aykumSudahRender = true;
        if(typeof PROTAMA !== 'undefined') PROTAMA.close();
    } catch (error) {
        if(typeof PROTAMA !== 'undefined') PROTAMA.close();
        return alert("Koneksi Firebase gagal: " + error.message);
    }

    const navList = document.getElementById('aykumNavList');
    const contentArea = document.getElementById('aykumContentArea');

    function renderSidebar() {
        navList.innerHTML = '';
        dbAykum.forEach((kategoriData, katIndex) => {
            const lbl = document.createElement('li');
            lbl.className = 'aykum-nav-kategori';
            lbl.textContent = kategoriData.kategori;
            navList.appendChild(lbl);

            kategoriData.ayatList.forEach((ayat, ayatIndex) => {
                const item = document.createElement('li');
                item.className = 'aykum-nav-item';
                item.textContent = ayat.surat;
                item.onclick = (e) => loadAyat(katIndex, ayatIndex, e.target);
                navList.appendChild(item);
            });
        });
    }

    function loadAyat(katIndex, ayatIndex, elClicked) {
        document.querySelectorAll('.aykum-nav-item').forEach(el => el.classList.remove('active'));
        elClicked.classList.add('active');

        const ayatData = dbAykum[katIndex].ayatList[ayatIndex];
        
        contentArea.innerHTML = `
            <div class="aykum-card">
                <div style="display:inline-block; background:#ccfbf1; color:#0f766e; padding:5px 15px; border-radius:20px; font-weight:600; font-size:0.85rem; margin-bottom:15px;">📌 ${dbAykum[katIndex].kategori}</div>
                <h2 class="aykum-ayat-title">${ayatData.surat}</h2>
                
                <!-- KOTAK LEGENDA KITA KASIH ID BIAR GAK NGILANG -->
                <div class="aykum-legend-container" id="aykumLegendBox">
                    <div class="aykum-legend-item"><div class="aykum-color-box" style="background:#ef4444;"></div> Idgam Bigunnah / Mutaqaribain</div>
                    <div class="aykum-legend-item"><div class="aykum-color-box" style="background:#d946ef;"></div> Gunnah / Mimi / Madd Lazim</div>
                    <div class="aykum-legend-item"><div class="aykum-color-box" style="background:#06b6d4;"></div> Iqlab / Madd Wajib Muttasil</div>
                    <div class="aykum-legend-item"><div class="aykum-color-box" style="background:#22c55e;"></div> Ikhfa' / Madd Ja'iz Munfasil</div>
                    <div class="aykum-legend-item"><div class="aykum-color-box" style="background:#3b82f6;"></div> Qalqalah</div>
                    <div class="aykum-legend-item"><div class="aykum-color-box" style="background:#94a3b8;"></div> Huruf Tidak Dilafalkan</div>
                </div>

                <div class="aykum-quran-box">
                    <div style="display:flex; justify-content:center; gap:15px; margin-bottom: 20px;">
                        <button class="aykum-btn-audio" onclick="window.playQari(this, '${ayatData.surat}')"><i class="fas fa-volume-up"></i> Dengarkan Qari</button>
                        
                        <!-- Toggle Mode Ujian -->
                        <label class="aykum-toggle-container">
                            <input type="checkbox" id="toggleUjian" onchange="toggleModeUjian(this)">
                            <span class="aykum-toggle-slider"></span>
                            <span class="aykum-toggle-label">Mode Ujian Tajwid</span>
                        </label>
                    </div>
                    
                    <!-- Container Arab -->
                    <div id="aykumArabicWrapper" class="aykum-arabic-text">${ayatData.arab}</div>
                    <div class="aykum-latin-text">${ayatData.latin}</div>
                    <div class="aykum-arti-text">${ayatData.arti}</div>
                </div>
                
                <!-- Area Kuis -->
                <div id="aykumKuisArea" style="display:none; margin-top:20px; background:#f8fafc; padding:20px; border-radius:12px; border:2px dashed #94a3b8; text-align:left;">
                    <h3 style="margin-top:0; color:#0f766e;"><i class="fas fa-brain"></i> Tebak Tajwid!</h3>
                    <p style="font-size:0.95rem; color:#475569; margin-bottom:15px;">Hukum tajwid apa saja yang ada pada ayat di atas? Pilih semua yang menurut Anda benar.</p>
                    
                    <div id="aykumKuisOptions" style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:20px;"></div>
                    
                    <button onclick="submitKuisTajwid()" style="background:#0f766e; color:white; border:none; padding:10px 25px; border-radius:8px; cursor:pointer; font-weight:bold; width:100%;">Cek Jawaban</button>
                    
                    <div id="aykumKuisHasil" style="display:none; margin-top:15px; padding:15px; border-radius:8px; font-weight:bold; line-height:1.6;"></div>

                    <!-- Area Kunci Jawaban -->
                    <div id="aykumKunciJawaban" style="display:none; margin-top:20px; padding-top:20px; border-top:2px dashed #cbd5e1;">
                        <h4 style="color:#0f766e; margin-top:0; margin-bottom:15px;">Kunci Jawaban Warna Tajwid:</h4>
                        <div class="aykum-arabic-text">${ayatData.arab}</div>
                        <div class="aykum-latin-text">${ayatData.latin}</div>
                        <div class="aykum-arti-text">${ayatData.arti}</div>
                    </div>
                </div>

                <div class="aykum-penjelasan-box" id="aykumPenjelasanBox">
                    <h3 id="aykumPHukum" style="margin: 0 0 10px 0; color: #0284c7;"></h3>
                    <p id="aykumPCara" style="margin: 0; line-height: 1.5; color: #0f172a;"></p>
                </div>
            </div>
        `;

        // Interaksi Klik Tajwid
        const tajwidElements = contentArea.querySelectorAll('.aykum-tajwid');
        tajwidElements.forEach(el => {
            el.addEventListener('click', function() {
                // Blokir klik jika sedang mode ujian
                if(document.getElementById('aykumArabicWrapper').classList.contains('aykum-mode-ujian-aktif')) return;

                tajwidElements.forEach(t => t.style.backgroundColor = 'transparent');
                this.style.backgroundColor = '#fef08a';
                
                document.getElementById('aykumPHukum').innerText = `🔍 Analisis Tajwid: ${this.getAttribute('data-hukum')}`;
                document.getElementById('aykumPCara').innerHTML = `<strong>Cara Membaca:</strong> ${this.getAttribute('data-cara')}`;
                document.getElementById('aykumPenjelasanBox').style.display = 'block';
            });
        });
    }

    window.playQari = async (btnEl, suratStr) => {
        if(window.currentQariAudio && !window.currentQariAudio.paused) {
            window.currentQariAudio.pause();
        }

        const surahMap = {
            "al-baqarah": 2, "al-maidah": 5, "al-maa'idah": 5, "an-nuur": 24, "an-nur": 24,
            "an-nisaa": 4, "an-nisa": 4, "an-nisaa'": 4, "an-nisa'": 4, "al-an'aam": 6, 
            "al-ahzaab": 33, "al-ahzab": 33, "at-talaq": 65, "at-taubah": 9, 
            "al-a'raaf": 7, "al-anbiyaa": 21, "al-bayyinah": 98, "al-muzzammil": 73
        };

        // Parse format "1. Al-Baqarah: 275"
        let cleanStr = suratStr.replace(/^[0-9]+\.\s*/, ''); 
        let parts = cleanStr.split(':');
        let namaSurat = parts[0].trim().toLowerCase();
        let noAyat = parts[1].trim();
        let noSurat = surahMap[namaSurat] || surahMap[namaSurat.replace(/['’]/g, '')];

        if(!noSurat) return alert("Sistem belum mengenali surat: " + namaSurat);

        let origText = btnEl.innerHTML;
        btnEl.innerHTML = "<i class='fas fa-spinner fa-spin'></i> Menghubungi Server...";
        btnEl.disabled = true;

        try {
            let response = await fetch(`https://api.alquran.cloud/v1/ayah/${noSurat}:${noAyat}/ar.husary`);
            let data = await response.json();
            
            if(data.code === 200) {
                window.currentQariAudio = new Audio(data.data.audio);
                window.currentQariAudio.onended = () => {
                    btnEl.innerHTML = origText;
                    btnEl.disabled = false;
                };
                window.currentQariAudio.play();
                btnEl.innerHTML = "<i class='fas fa-volume-up'></i> Sedang Memutar...";
            } else throw new Error("Gagal mengambil audio");
        } catch(e) {
            alert("Gagal memuat audio Qari. Pastikan koneksi internet stabil.");
            btnEl.innerHTML = origText;
            btnEl.disabled = false;
        }
    };

    renderSidebar();
};
// ==========================================
// LOGIKA MODE UJIAN TAJWID
// ==========================================

// Variabel global untuk menyimpan jawaban yang benar pada ayat yang sedang aktif
window.kunciJawabanTajwidAktif = [];

window.toggleModeUjian = function(checkbox) {
    const arabWrapper = document.getElementById('aykumArabicWrapper');
    const kuisArea = document.getElementById('aykumKuisArea');
    const legendContainer = document.getElementById('aykumLegendBox');
    const penjelasanBox = document.getElementById('aykumPenjelasanBox');
    const kunciJawaban = document.getElementById('aykumKunciJawaban');

    if (checkbox.checked) {
        // Aktifkan Mode Ujian
        arabWrapper.classList.add('aykum-mode-ujian-aktif');
        kuisArea.style.display = 'block';
        if(legendContainer) legendContainer.style.display = 'none'; // Sembunyikan legenda warna
        if(penjelasanBox) penjelasanBox.style.display = 'none';
        if(kunciJawaban) kunciJawaban.style.display = 'none'; 
        
        generateKuisTajwid();
    } else {
        // Matikan Mode Ujian
        arabWrapper.classList.remove('aykum-mode-ujian-aktif');
        kuisArea.style.display = 'none';
        if(legendContainer) legendContainer.style.display = 'flex'; // Munculkan kembali legenda
        if(kunciJawaban) kunciJawaban.style.display = 'none';
        
        // Reset Hasil
        const hasilDiv = document.getElementById('aykumKuisHasil');
        if(hasilDiv) {
            hasilDiv.style.display = 'none';
            hasilDiv.innerHTML = '';
        }
    }
};
window.generateKuisTajwid = function() {
    const arabWrapper = document.getElementById('aykumArabicWrapper');
    const opsiContainer = document.getElementById('aykumKuisOptions');
    
    // 1. Ekstrak Kunci Jawaban dari span di dalam arabWrapper
    const elemenTajwid = arabWrapper.querySelectorAll('.aykum-tajwid');
    const setKunci = new Set();
    
    elemenTajwid.forEach(span => {
        let hukum = span.getAttribute('data-hukum');
        if(hukum) setKunci.add(hukum.trim());
    });
    
    window.kunciJawabanTajwidAktif = Array.from(setKunci);

    // 2. Siapkan Master Pilihan (Semua kemungkinan tajwid)
    const masterTajwid = [
        "Idgam Bigunnah", "Idgam Bilagunnah", "Idgam Mimi", "Idgam Mutajanisain", "Idgam Mutaqaribain", "Idgam Mutamasilain",
        "Gunnah Musyaddadah", "Iqlab", 
        "Ikhfa Haqiqi", "Ikhfa Syafawi", "Idzhar Halqi", "Idzhar Syafawi",
        "Madd Wajib Muttasil", "Madd Jaiz Munfasil", "Madd Lazim Mutsaqqal Kilmi", "Madd Lazim Mukhaffaf Kilmi", "Madd Silah Tawilah",
        "Qalqalah Sugra", "Qalqalah Kubra", 
        "Alif Lam Syamsiyah", "Alif Lam Qamariyah", "Hamzah Washal", "Huruf tidak dilafalkan"
    ];

    // 3. Gabungkan kunci jawaban dengan beberapa pengecoh acak
    let opsiKuis = [...window.kunciJawabanTajwidAktif];
    
    // Ambil pengecoh yang bukan bagian dari kunci jawaban
    let pengecohTersedia = masterTajwid.filter(t => !window.kunciJawabanTajwidAktif.includes(t));
    
    // Acak pengecoh dan ambil maksimal 5
    pengecohTersedia.sort(() => 0.5 - Math.random());
    opsiKuis.push(...pengecohTersedia.slice(0, 5));

    // Acak ulang susunan opsi yang sudah digabung
    opsiKuis.sort(() => 0.5 - Math.random());

    // 4. Render ke HTML
    opsiContainer.innerHTML = '';
    opsiKuis.forEach(opsi => {
        const idUnik = 'cb_' + Math.random().toString(36).substr(2, 9);
        opsiContainer.innerHTML += `
            <label class="aykum-kuis-cb-wrapper" for="${idUnik}">
                <input type="checkbox" id="${idUnik}" value="${opsi}" class="aykum-cb-jawaban">
                <span>${opsi}</span>
            </label>
        `;
    });
    
    // Sembunyikan hasil sebelumnya jika ada
    document.getElementById('aykumKuisHasil').style.display = 'none';
};

window.submitKuisTajwid = function() {
    const checkboxes = document.querySelectorAll('.aykum-cb-jawaban');
    const kunci = window.kunciJawabanTajwidAktif;
    
    let jawabanUser = [];
    checkboxes.forEach(cb => {
        if(cb.checked) jawabanUser.push(cb.value);
    });

    if(jawabanUser.length === 0) {
        return alert("Pilih minimal satu hukum tajwid!");
    }

    // Evaluasi Jawaban
    let tebakanBenar = jawabanUser.filter(j => kunci.includes(j));
    let tebakanSalah = jawabanUser.filter(j => !kunci.includes(j));
    let terlewatkan = kunci.filter(k => !jawabanUser.includes(k));

    // Render Hasil
    const hasilDiv = document.getElementById('aykumKuisHasil');
    hasilDiv.style.display = 'block';

    let htmlHasil = `Skor Anda: Ditemukan ${tebakanBenar.length} dari ${kunci.length} Tajwid yang ada.<br><br>`;

    if(tebakanSalah.length === 0 && terlewatkan.length === 0) {
        hasilDiv.className = 'aykum-hasil-benar';
        htmlHasil += `🎉 <strong>SEMPURNA!</strong> Anda berhasil menebak seluruh hukum tajwid pada ayat ini tanpa ada yang salah.`;
    } else {
        hasilDiv.className = 'aykum-hasil-salah';
        htmlHasil += `<strong>Tebakan Benar:</strong><br> <span style="color:#166534;">${tebakanBenar.join(', ') || '-'}</span><br><br>`;
        if(tebakanSalah.length > 0) {
             htmlHasil += `<strong>Tebakan Salah (Tidak ada di ayat ini):</strong><br> <span style="color:#991b1b;">${tebakanSalah.join(', ')}</span><br><br>`;
        }
        if(terlewatkan.length > 0) {
             htmlHasil += `<strong>Tajwid yang Terlewat (Ada, tapi tidak Anda pilih):</strong><br> <span style="color:#b45309;">${terlewatkan.join(', ')}</span>`;
        }
    }
    
    hasilDiv.innerHTML = htmlHasil;

    // 1. Munculkan kembali Kunci Jawaban di bagian bawah
    const kunciJawaban = document.getElementById('aykumKunciJawaban');
    if(kunciJawaban) kunciJawaban.style.display = 'block';

    // 2. Munculkan kembali Legend Warna di Atas
    const legendContainer = document.getElementById('aykumLegendBox');
    if(legendContainer) legendContainer.style.display = 'flex';

    // 3. Uncheck tombol switchnya (Biar statusnya ikut mati)
    const toggleBtn = document.getElementById('toggleUjian');
    if(toggleBtn) toggleBtn.checked = false;

    // 4. Matikan mode samar pada bacaan utama agar warnanya kembali terlihat 
    document.getElementById('aykumArabicWrapper').classList.remove('aykum-mode-ujian-aktif');
};
// =========================================================
// 🕌 FITUR UU PERADILAN AGAMA (UUPA) - FULL ORIGINAL ENGINE
// =========================================================
let stateUUPA = {
    currentIndex: 0,
    viewMode: "single", // 'single' | 'all' | 'quiz'
    samarMode: false,
    revealAllExp: false,
    theme: localStorage.getItem("cakim_pa_theme") || "light",
    fontSize: parseInt(localStorage.getItem("cakim_pa_fontsize") || "16", 10),
    completedChapters: JSON.parse(localStorage.getItem("cakim_pa_completed") || "{}"),
    userAnswers: JSON.parse(localStorage.getItem("cakim_pa_answers") || "{}"),
    searchQuery: "",
    dbMateri: []
};

window.bukaUUPA = async () => {
    if (window.updateUserStatus) window.updateUserStatus(true, 'Pusat Studi: UU Peradilan Agama');
    const overlay = document.getElementById('uupaOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    window.applyThemeUUPA(stateUUPA.theme);
    document.getElementById('uupaContentContainer').style.fontSize = stateUUPA.fontSize + "px";

    if (stateUUPA.dbMateri.length === 0) {
        if (typeof PROTAMA !== 'undefined') PROTAMA.loading("Memuat Modul UU PA dari Server...");
        try {
            const { query, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const qRef = query(collection(window.db, "uu_pa"));
            const snapshot = await getDocs(qRef);

            let dataTemp = [];
            snapshot.forEach(doc => dataTemp.push(doc.data()));
            dataTemp.sort((a, b) => a.urutan - b.urutan);
            stateUUPA.dbMateri = dataTemp;

            if (typeof PROTAMA !== 'undefined') PROTAMA.close();
            window.renderSidebarUUPA();
            window.renderContentUUPA();
            window.updateProgressUUPA();
            window.updateToolbarUUPA();
        } catch (err) {
            if (typeof PROTAMA !== 'undefined') PROTAMA.close();
            alert("Gagal memuat Firebase UU PA: " + err.message);
        }
    }
};

window.renderSidebarUUPA = () => {
    const navList = document.getElementById("uupaNavList");
    if (!navList) return;
    navList.innerHTML = "";
    let currentGroup = "";

    stateUUPA.dbMateri.forEach((mod, idx) => {
        if (mod.group !== currentGroup) {
            currentGroup = mod.group;
            const groupLi = document.createElement("li");
            groupLi.className = "uupa-nav-group";
            groupLi.textContent = currentGroup;
            navList.appendChild(groupLi);
        }

        const li = document.createElement("li");
        li.className = "uupa-nav-item" + (stateUUPA.viewMode === "single" && stateUUPA.currentIndex === idx ? " active" : "");
        li.onclick = (e) => {
            if (e.target.classList.contains("uupa-nav-check")) return;
            stateUUPA.currentIndex = idx;
            if (stateUUPA.viewMode === "quiz") stateUUPA.viewMode = "single";
            window.updateToolbarUUPA();
            window.renderSidebarUUPA();
            window.renderContentUUPA();
            if (window.innerWidth <= 860) {
                document.getElementById("uupaOverlay").classList.add("uupa-sidebar-collapsed");
            }
            document.getElementById("uupaMainScroll").scrollTo({ top: 0, behavior: "smooth" });
        };

        const isChecked = !!stateUUPA.completedChapters[mod.id];
        const qCount = mod.questions ? mod.questions.length : 0;
        li.innerHTML = `
            <input type="checkbox" class="uupa-nav-check" ${isChecked ? "checked" : ""} onchange="window.toggleChapterDoneUUPA('${mod.id}')" title="Tandai sudah dikuasai" />
            <span class="uupa-nav-title">${mod.title}</span>
            <span class="uupa-nav-badge">${qCount} Soal</span>
        `;
        navList.appendChild(li);
    });
};

window.renderContentUUPA = () => {
    const container = document.getElementById("uupaContentRenderArea");
    const footerNav = document.getElementById("uupaFooterNav");
    if (!container) return;
    container.innerHTML = "";

    let modulesToShow = [];
    if (stateUUPA.searchQuery.trim() !== "") {
        const q = stateUUPA.searchQuery.toLowerCase();
        modulesToShow = stateUUPA.dbMateri.filter(m =>
            m.title.toLowerCase().includes(q) ||
            m.materiHTML.toLowerCase().includes(q) ||
            (m.questions && m.questions.some(ques => ques.stem.toLowerCase().includes(q) || ques.analysis.toLowerCase().includes(q)))
        );
        footerNav.style.display = "none";
    } else if (stateUUPA.viewMode === "single") {
        modulesToShow = [stateUUPA.dbMateri[stateUUPA.currentIndex]];
        footerNav.style.display = "flex";
        document.getElementById("btnUUPAPrev").disabled = stateUUPA.currentIndex === 0;
        document.getElementById("btnUUPANext").disabled = stateUUPA.currentIndex === stateUUPA.dbMateri.length - 1;
    } else {
        modulesToShow = stateUUPA.dbMateri;
        footerNav.style.display = "none";
    }

    if (!modulesToShow || modulesToShow.length === 0 || !modulesToShow[0]) {
        container.innerHTML = `<div class="uupa-module-section"><p>Tidak ditemukan materi atau soal dengan kata kunci "<strong>${stateUUPA.searchQuery}</strong>".</p></div>`;
        return;
    }

    modulesToShow.forEach((mod) => {
        const isDone = !!stateUUPA.completedChapters[mod.id];
        const sectionEl = document.createElement("section");
        sectionEl.className = "uupa-module-section";

        let questionsHTML = "";
        if (mod.questions) {
            mod.questions.forEach((q) => {
                const userAns = stateUUPA.userAnswers[q.no];
                const isAnswered = !!userAns;
                const isCorrect = userAns === q.answer;
                const showExp = isAnswered || stateUUPA.revealAllExp;

                let statusBadge = "";
                if (isAnswered) {
                    statusBadge = isCorrect
                        ? `<span style="font-size:0.8rem; font-weight:700; color:#059669;">✓ Jawaban Tepat</span>`
                        : `<span style="font-size:0.8rem; font-weight:700; color:#dc2626;">✗ Kurang Tepat (Kunci: ${q.answer})</span>`;
                }

                let optsHTML = "";
                ["A", "B", "C", "D"].forEach((letter) => {
                    let btnClass = "uupa-option-btn";
                    if (isAnswered) {
                        if (letter === q.answer) btnClass += " correct-choice";
                        else if (letter === userAns && userAns !== q.answer) btnClass += " wrong-choice";
                    }
                    optsHTML += `
                        <button class="${btnClass}" onclick="window.selectAnswerUUPA(${q.no}, '${letter}')">
                            <span class="uupa-opt-letter">${letter}</span>
                            <span>${q.options[letter]}</span>
                        </button>
                    `;
                });

                questionsHTML += `
                    <div class="uupa-question-card" id="uupa-q-card-${q.no}">
                        <div class="uupa-q-meta">
                            <span class="uupa-q-num">SOAL HOTS #${q.no}</span>
                            ${statusBadge}
                        </div>
                        <div class="uupa-q-stem">${q.stem}</div>
                        <div class="uupa-options-list">${optsHTML}</div>
                        <div class="uupa-explanation-box ${showExp ? "visible" : ""}">
                            <div class="uupa-exp-row"><strong>Kunci Jawaban:</strong> Opsi ${q.answer}</div>
                            <div class="uupa-exp-row"><strong>⚠️ Jebakan Soal:</strong> ${q.trap || "-"}</div>
                            <div class="uupa-exp-row"><strong>✅ Analisis Benar:</strong> ${q.analysis}</div>
                            <div class="uupa-exp-source">📌 Sumber Hukum: ${q.source || "-"}</div>
                        </div>
                    </div>
                `;
            });
        }

        if (stateUUPA.viewMode === "quiz") {
            sectionEl.innerHTML = `
                <div class="uupa-section-header" style="margin-bottom:0.75rem; padding-bottom:0.5rem;">
                    <div>
                        <span class="uupa-section-badge">${mod.badge}</span>
                        <h2 class="uupa-section-title" style="font-size:1.1rem;">${mod.title}</h2>
                    </div>
                </div>
                <div>${questionsHTML}</div>
            `;
        } else {
            sectionEl.innerHTML = `
                <div class="uupa-section-header">
                    <div>
                        <span class="uupa-section-badge">${mod.badge}</span>
                        <h2 class="uupa-section-title">${mod.title}</h2>
                    </div>
                    <button class="uupa-mastered-btn ${isDone ? "done" : ""}" onclick="window.toggleChapterDoneUUPA('${mod.id}')">
                        ${isDone ? "✓ Sudah Dikuasai" : "○ Tandai Selesai"}
                    </button>
                </div>
                <div class="uupa-materi-body">${mod.materiHTML}</div>
                <div class="uupa-quiz-wrapper">
                    <div class="uupa-quiz-title">🔥 Latihan Soal HOTS Sub-Bab Ini</div>
                    ${questionsHTML}
                </div>
            `;
        }

        container.appendChild(sectionEl);
    });

    window.bindSamarUUPA();
};

window.selectAnswerUUPA = (qNo, letter) => {
    stateUUPA.userAnswers[qNo] = letter;
    localStorage.setItem("cakim_pa_answers", JSON.stringify(stateUUPA.userAnswers));
    window.renderContentUUPA();
    window.updateProgressUUPA();
};

window.toggleChapterDoneUUPA = (modId) => {
    if (stateUUPA.completedChapters[modId]) {
        delete stateUUPA.completedChapters[modId];
    } else {
        stateUUPA.completedChapters[modId] = true;
    }
    localStorage.setItem("cakim_pa_completed", JSON.stringify(stateUUPA.completedChapters));
    window.renderSidebarUUPA();
    window.renderContentUUPA();
    window.updateProgressUUPA();
};

window.updateProgressUUPA = () => {
    const doneCount = Object.keys(stateUUPA.completedChapters).length;
    const totalChap = stateUUPA.dbMateri.length || 11;
    const chapText = document.getElementById("uupaChapProgressText");
    const chapBar = document.getElementById("uupaChapProgressBar");
    if (chapText) chapText.textContent = `${doneCount} / ${totalChap}`;
    if (chapBar) chapBar.style.width = `${(doneCount / totalChap) * 100}%`;

    let correctCount = 0;
    let totalQ = 0;
    stateUUPA.dbMateri.forEach(m => {
        if (m.questions) {
            m.questions.forEach(q => {
                totalQ++;
                if (stateUUPA.userAnswers[q.no] === q.answer) correctCount++;
            });
        }
    });
    const scoreText = document.getElementById("uupaScoreProgressText");
    const scoreBar = document.getElementById("uupaScoreProgressBar");
    if (scoreText) scoreText.textContent = `${correctCount} / ${totalQ || 25} Benar`;
    if (scoreBar) scoreBar.style.width = `${totalQ ? (correctCount / totalQ) * 100 : 0}%`;
};

window.setViewModeUUPA = (mode) => {
    stateUUPA.viewMode = mode;
    stateUUPA.searchQuery = "";
    const sInput = document.getElementById("uupaSearchInput");
    if (sInput) sInput.value = "";
    window.updateToolbarUUPA();
    window.renderSidebarUUPA();
    window.renderContentUUPA();
    document.getElementById("uupaMainScroll").scrollTo({ top: 0, behavior: "smooth" });
};

window.updateToolbarUUPA = () => {
    document.getElementById("btnUUPASingle")?.classList.toggle("active-mode", stateUUPA.viewMode === "single");
    document.getElementById("btnUUPAAll")?.classList.toggle("active-mode", stateUUPA.viewMode === "all");
    document.getElementById("btnUUPAQuiz")?.classList.toggle("active-mode", stateUUPA.viewMode === "quiz");
};

window.navigateChapterUUPA = (dir) => {
    const nextIdx = stateUUPA.currentIndex + dir;
    if (nextIdx >= 0 && nextIdx < stateUUPA.dbMateri.length) {
        stateUUPA.currentIndex = nextIdx;
        window.renderSidebarUUPA();
        window.renderContentUUPA();
        document.getElementById("uupaMainScroll").scrollTo({ top: 0, behavior: "smooth" });
    }
};

window.toggleSidebarUUPA = () => {
    document.getElementById("uupaOverlay")?.classList.toggle("uupa-sidebar-collapsed");
};

window.handleSearchUUPA = (val) => {
    stateUUPA.searchQuery = val;
    window.renderContentUUPA();
};

window.toggleSamarUUPA = () => {
    stateUUPA.samarMode = !stateUUPA.samarMode;
    const overlay = document.getElementById("uupaOverlay");
    const btn = document.getElementById("btnUUPASamar");
    overlay?.classList.toggle("uupa-mode-samar", stateUUPA.samarMode);
    btn?.classList.toggle("samar-active", stateUUPA.samarMode);
    if (btn) btn.innerHTML = stateUUPA.samarMode ? "🙈 <span>Mode Samar: ON</span>" : "👁️ <span>Mode Samar: OFF</span>";
    if (!stateUUPA.samarMode) {
        document.querySelectorAll("#uupaOverlay .samar.revealed").forEach(el => el.classList.remove("revealed"));
    }
};

window.revealAllSamarUUPA = () => {
    document.querySelectorAll("#uupaOverlay .samar").forEach(el => el.classList.add("revealed"));
};

window.bindSamarUUPA = () => {
    document.querySelectorAll("#uupaOverlay .samar").forEach(el => {
        el.onclick = () => {
            if (stateUUPA.samarMode) el.classList.toggle("revealed");
        };
    });
};

window.toggleAllExpUUPA = () => {
    stateUUPA.revealAllExp = !stateUUPA.revealAllExp;
    const btn = document.getElementById("btnUUPARevealExp");
    btn?.classList.toggle("active-mode", stateUUPA.revealAllExp);
    if (btn) btn.innerHTML = stateUUPA.revealAllExp ? "🙈 <span>Tutup Pembahasan</span>" : "💡 <span>Buka Semua Pembahasan</span>";
    window.renderContentUUPA();
};

window.changeFontUUPA = (delta) => {
    stateUUPA.fontSize = Math.min(22, Math.max(13, stateUUPA.fontSize + delta));
    document.getElementById("uupaContentContainer").style.fontSize = stateUUPA.fontSize + "px";
    localStorage.setItem("cakim_pa_fontsize", stateUUPA.fontSize);
};

window.cycleThemeUUPA = () => {
    const order = ["light", "sepia", "dark"];
    const nextTheme = order[(order.indexOf(stateUUPA.theme) + 1) % order.length];
    window.applyThemeUUPA(nextTheme);
};

window.applyThemeUUPA = (themeName) => {
    stateUUPA.theme = themeName;
    document.getElementById("uupaOverlay")?.setAttribute("data-theme", themeName);
    localStorage.setItem("cakim_pa_theme", themeName);
    const labelMap = { light: "Terang", sepia: "Sepia", dark: "Gelap" };
    const iconMap = { light: "☀️", sepia: "📜", dark: "🌙" };
    const btn = document.getElementById("btnUUPATheme");
    if (btn) btn.innerHTML = `${iconMap[themeName]} <span>${labelMap[themeName]}</span>`;
};

window.resetQuizUUPA = () => {
    if (confirm("Yakin ingin mereset seluruh jawaban latihan soal HOTS UU PA?")) {
        stateUUPA.userAnswers = {};
        localStorage.removeItem("cakim_pa_answers");
        window.renderContentUUPA();
        window.updateProgressUUPA();
    }
};
// =========================================================
// 🕌 FITUR KOMPILASI HUKUM ISLAM (KHI)
// =========================================================
let stateKHI = {
    currentIndex: 0, displayMode: "single", samarActive: false,
    theme: localStorage.getItem("khi_modern_theme") || "light",
    fontSize: parseInt(localStorage.getItem("khi_modern_font") || "16", 10),
    doneMap: JSON.parse(localStorage.getItem("khi_modern_done") || "{}"),
    answersMap: JSON.parse(localStorage.getItem("khi_modern_ans") || "{}"),
    searchFilter: "", dbMateri: []
};

window.bukaKHI = async () => {
    if (window.updateUserStatus) window.updateUserStatus(true, 'Pusat Studi: Kompilasi Hukum Islam (KHI)');
    const overlay = document.getElementById('khiOverlay');
    if (!overlay) return alert("HTML KHI belum terpasang!");
    overlay.style.display = 'flex';
    window.applyThemeKHI(stateKHI.theme);
    const wrap = document.getElementById('khiContentWrap');
    if (wrap) wrap.style.fontSize = stateKHI.fontSize + "px";

    if (stateKHI.dbMateri.length === 0) {
        if (typeof PROTAMA !== 'undefined') PROTAMA.loading("Memuat Modul KHI dari Server...");
        try {
            const { query, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const qRef = query(collection(window.db, "khi"));
            const snapshot = await getDocs(qRef);

            if (snapshot.empty) {
                if (typeof PROTAMA !== 'undefined') PROTAMA.close();
                return alert("Data KHI di Firebase masih kosong. Jalankan eksekusiUploadKHI() di Console.");
            }

            let dataTemp = [];
            snapshot.forEach(docSnap => dataTemp.push(docSnap.data()));
            dataTemp.sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
            stateKHI.dbMateri = dataTemp;
            if (typeof PROTAMA !== 'undefined') PROTAMA.close();
        } catch (err) {
            if (typeof PROTAMA !== 'undefined') PROTAMA.close();
            return alert("Gagal memuat KHI: " + err.message);
        }
    }
    window.renderSidebarKHI();
    window.renderStageKHI();
    window.updateStatsKHI();
};

window.renderSidebarKHI = () => {
    const nav = document.getElementById("khiSidebarNav");
    if (!nav) return;
    nav.innerHTML = "";
    let currentGroup = "";
    const q = stateKHI.searchFilter.toLowerCase().trim();

    stateKHI.dbMateri.forEach((mod, idx) => {
        if (q && !mod.title.toLowerCase().includes(q) && !mod.materi.toLowerCase().includes(q)) return;

        if (mod.group && mod.group !== currentGroup) {
            currentGroup = mod.group;
            const secTitle = document.createElement("li");
            secTitle.className = "khi-nav-group";
            secTitle.textContent = currentGroup;
            nav.appendChild(secTitle);
        }

        const item = document.createElement("li");
        const isActive = stateKHI.displayMode === "single" && stateKHI.currentIndex === idx;
        const isDone = !!stateKHI.doneMap[mod.id];
        item.className = `khi-nav-item ${isActive ? "active" : ""} ${isDone ? "done" : ""}`;
        item.onclick = (e) => {
            if (e.target.classList.contains("khi-nav-check")) return;
            window.selectChapterKHI(idx);
        };

        const qLen = mod.questions ? mod.questions.length : 0;
        item.innerHTML = `
            <input type="checkbox" class="khi-nav-check" ${isDone ? "checked" : ""} onchange="window.toggleDoneKHI('${mod.id}')" title="Tandai dikuasai" />
            <span class="khi-nav-title">${mod.title}</span>
            <span class="khi-nav-pill">${qLen} Soal</span>
        `;
        nav.appendChild(item);
    });
};

window.renderStageKHI = () => {
    const stage = document.getElementById("khiStageArea");
    const pager = document.getElementById("khiPagerNav");
    if (!stage) return;
    stage.innerHTML = "";

    const list = stateKHI.displayMode === "single" ? [stateKHI.dbMateri[stateKHI.currentIndex]] : stateKHI.dbMateri;

    list.forEach((mod) => {
        if(!mod) return;
        const isDone = !!stateKHI.doneMap[mod.id];
        const card = document.createElement("article");
        card.className = "chapter-card";

        let qHTML = "";
        if (mod.questions) {
            mod.questions.forEach((q) => {
                const userPick = stateKHI.answersMap[q.no];
                const answered = !!userPick;
                const isCorrect = userPick === q.correct;

                let fb = "";
                if (answered) {
                    fb = isCorrect ? `<span style="color:var(--accent); font-size:0.8rem; font-weight:bold;">✓ Tepat</span>` 
                                   : `<span style="color:var(--danger); font-size:0.8rem; font-weight:bold;">✗ Kunci: ${q.correct}</span>`;
                }

                let optsHTML = "";
                ["A", "B", "C", "D"].forEach((letter) => {
                    let cls = "opt-btn";
                    if (answered) {
                        if (letter === q.correct) cls += " correct";
                        else if (letter === userPick && userPick !== q.correct) cls += " wrong";
                    }
                    optsHTML += `
                        <button class="${cls}" onclick="window.answerQuestionKHI(${q.no}, '${letter}')">
                            <span class="opt-key">${letter}</span> <span>${q.options[letter]}</span>
                        </button>`;
                });

                qHTML += `
                    <div class="q-card">
                        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                            <span class="q-badge">Soal HOTS #${q.no}</span> ${fb}
                        </div>
                        <div style="font-weight:600; margin-bottom:15px; color:var(--text-primary);">${q.stem}</div>
                        <div>${optsHTML}</div>
                        <div class="exp-panel ${answered ? "show" : ""}">
                            <div style="margin-bottom:6px;"><strong>Kunci:</strong> ${q.correct}</div>
                            <div style="margin-bottom:6px;"><strong>Jebakan:</strong> ${q.trap || '-'}</div>
                            <div style="margin-bottom:6px;"><strong>Analisis:</strong> ${q.analysis}</div>
                            <div class="exp-ref">📌 Sumber: ${q.source}</div>
                        </div>
                    </div>`;
            });
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; padding-bottom:1rem; border-bottom:1px solid var(--border-color);">
                <div>
                    <span style="font-size:0.7rem; font-weight:800; background:var(--accent-soft); color:var(--accent); padding:2px 10px; border-radius:99px;">${mod.bookBadge}</span>
                    <h2 style="font-size:1.4rem; font-weight:800; color:var(--text-primary); margin-top:8px;">${mod.title}</h2>
                </div>
                <button class="btn-action ${isDone ? "done" : ""}" onclick="window.toggleDoneKHI('${mod.id}')" style="${isDone ? 'background:var(--accent-soft); color:var(--accent);' : ''}">
                    ${isDone ? "✓ Dikuasai" : "○ Tandai Selesai"}
                </button>
            </div>
            <div class="materi-box">${mod.materi}</div>
            <div class="quiz-container">
                <h3 style="color:var(--amber); font-weight:800; margin-bottom:15px;">🔥 Uji Pemahaman HOTS</h3>
                ${qHTML}
            </div>
        `;
        stage.appendChild(card);
    });

    if (stateKHI.displayMode === "single" && pager) {
        pager.style.display = "grid";
        const btnPrev = document.getElementById("btnKhiPrev");
        const btnNext = document.getElementById("btnKhiNext");
        btnPrev.disabled = stateKHI.currentIndex === 0;
        btnNext.disabled = stateKHI.currentIndex === stateKHI.dbMateri.length - 1;
    } else if (pager) {
        pager.style.display = "none";
    }
    window.bindSamarKHI();
};

window.answerQuestionKHI = (qNo, letter) => {
    if(!stateKHI.answersMap[qNo]) {
        stateKHI.answersMap[qNo] = letter;
        localStorage.setItem("khi_modern_ans", JSON.stringify(stateKHI.answersMap));
        window.renderStageKHI();
        window.updateStatsKHI();
    }
};

window.toggleDoneKHI = (modId) => {
    if (stateKHI.doneMap[modId]) delete stateKHI.doneMap[modId];
    else stateKHI.doneMap[modId] = true;
    localStorage.setItem("khi_modern_done", JSON.stringify(stateKHI.doneMap));
    window.renderSidebarKHI();
    window.renderStageKHI();
    window.updateStatsKHI();
};

window.updateStatsKHI = () => {
    const doneCount = Object.keys(stateKHI.doneMap).length;
    const tC = document.getElementById("khiStatDone");
    if(tC) tC.textContent = `${doneCount} / ${stateKHI.dbMateri.length || 8}`;

    let correct = 0, total = 0;
    stateKHI.dbMateri.forEach(m => {
        if(m.questions) m.questions.forEach(q => { total++; if (stateKHI.answersMap[q.no] === q.correct) correct++; });
    });
    const sC = document.getElementById("khiStatScore");
    if(sC) sC.textContent = `${correct} / ${total || 28}`;
};

window.selectChapterKHI = (idx) => {
    stateKHI.currentIndex = idx;
    window.setDisplayModeKHI("single");
    if (window.innerWidth <= 860) document.getElementById("khiOverlay").classList.add("sidebar-minimized");
};

window.stepChapterKHI = (dir) => {
    const t = stateKHI.currentIndex + dir;
    if (t >= 0 && t < stateKHI.dbMateri.length) window.selectChapterKHI(t);
};

window.setDisplayModeKHI = (mode) => {
    stateKHI.displayMode = mode;
    const btnS = document.getElementById("btnKhiModeSingle");
    const btnA = document.getElementById("btnKhiModeAll");
    if(btnS) btnS.classList.toggle("primary-toggle", mode === "single");
    if(btnA) btnA.classList.toggle("primary-toggle", mode === "all");
    window.renderSidebarKHI();
    window.renderStageKHI();
    document.getElementById("khiWorkspaceScroll")?.scrollTo({ top: 0, behavior: "smooth" });
};

window.toggleSidebarKHI = () => {
    document.getElementById("khiOverlay")?.classList.toggle("sidebar-minimized");
};

window.filterSidebarKHI = (val) => {
    stateKHI.searchFilter = val;
    window.renderSidebarKHI();
};

window.toggleSamarKHI = () => {
    stateKHI.samarActive = !stateKHI.samarActive;
    document.getElementById("khiOverlay")?.classList.toggle("samar-active", stateKHI.samarActive);
    const btn = document.getElementById("btnKhiSamar");
    if(btn) btn.innerHTML = stateKHI.samarActive ? "🙈 Mode Samar: ON" : "👁️ Mode Samar: OFF";
};

window.revealCurrentSamarKHI = () => { document.querySelectorAll("#khiOverlay .samar").forEach(el => el.classList.add("revealed")); };
window.bindSamarKHI = () => { document.querySelectorAll("#khiOverlay .samar").forEach(el => { el.onclick = () => { if (stateKHI.samarActive) el.classList.toggle("revealed"); }; }); };

window.adjustFontKHI = (delta) => {
    stateKHI.fontSize = Math.min(21, Math.max(13, stateKHI.fontSize + delta));
    document.getElementById("khiContentWrap").style.fontSize = stateKHI.fontSize + "px";
    localStorage.setItem("khi_modern_font", stateKHI.fontSize);
};

window.toggleThemeKHI = () => {
    const next = stateKHI.theme === "light" ? "dark" : "light";
    window.applyThemeKHI(next);
};

window.applyThemeKHI = (t) => {
    stateKHI.theme = t;
    document.getElementById("khiOverlay")?.setAttribute("data-theme", t);
    localStorage.setItem("khi_modern_theme", t);
    const btn = document.getElementById("btnKhiTheme");
    if(btn) btn.innerHTML = t === "dark" ? "☀️ Mode Terang" : "🌙 Mode Gelap";
};

window.resetAnswersKHI = () => {
    if (confirm("Reset semua jawaban kuis KHI?")) {
        stateKHI.answersMap = {};
        localStorage.removeItem("khi_modern_ans");
        window.renderStageKHI();
        window.updateStatsKHI();
    }
};
