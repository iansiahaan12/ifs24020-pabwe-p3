/**
 * 1. INTEGRASI TAB & PROYEK
 * Mengelola navigasi tab menggunakan Query Parameter (?tab=...) agar aman dari 404 di Netlify.
 */
document.addEventListener("DOMContentLoaded", () => {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabPanels = document.querySelectorAll(".tab-panel");
    
    // Pemetaan ID panel yang lebih bersih untuk URL (opsional, agar URL lebih rapi)
    const tabMap = {
        "expense": "expense-panel",
        "bookmark": "bookmark-panel",
        "quiz": "quiz-panel"
    };
    // Balikan map untuk mendapatkan nama param dari ID panel
    const reverseTabMap = {
        "expense-panel": "expense",
        "bookmark-panel": "bookmark",
        "quiz-panel": "quiz"
    };

    function activateTab(targetId, updateHistory = true) {
        // Update Panel
        tabPanels.forEach(panel => {
            if(panel.id === targetId) {
                panel.classList.remove("hidden-panel");
            } else {
                panel.classList.add("hidden-panel");
            }
        });

        // Update Button Styling
        tabBtns.forEach(btn => {
            if(btn.dataset.target === targetId) {
                btn.classList.add("border-blue-600", "text-blue-600", "active-tab");
                btn.classList.remove("border-transparent", "text-gray-500");
            } else {
                btn.classList.remove("border-blue-600", "text-blue-600", "active-tab");
                btn.classList.add("border-transparent", "text-gray-500");
            }
        });

        // Simpan state ke localStorage
        localStorage.setItem("activeTab", targetId);

        // Ubah URL menggunakan Query Parameter (?tab=nama-tab)
        if (updateHistory) {
            const tabParam = reverseTabMap[targetId] || "expense";
            const url = new URL(window.location.href);
            url.searchParams.set("tab", tabParam);
            
            // Cek apakah parameter sudah sama agar tidak duplikat di history
            if (window.location.search !== `?tab=${tabParam}`) {
                window.history.pushState({ tab: targetId }, "", url);
            }
        }
    }

    tabBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            activateTab(e.target.dataset.target);
        });
    });

    // Handle tombol Back/Forward pada browser
    window.addEventListener("popstate", (e) => {
        if (e.state && e.state.tab) {
            activateTab(e.state.tab, false);
        } else {
            // Fallback jika tidak ada state, baca dari URL
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get("tab");
            activateTab(tabMap[tabParam] || "expense-panel", false);
        }
    });

    // Inisialisasi tab aktif saat muat halaman
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    
    // Prioritas: URL Parameter > LocalStorage > Default (Expense)
    let initialTab = "expense-panel";
    if (tabParam && tabMap[tabParam]) {
        initialTab = tabMap[tabParam];
    } else {
        initialTab = localStorage.getItem("activeTab") || "expense-panel";
        // Perbarui URL agar sesuai dengan localStorage jika belum ada parameter
        const initialParam = reverseTabMap[initialTab];
        const url = new URL(window.location.href);
        url.searchParams.set("tab", initialParam);
        window.history.replaceState({ tab: initialTab }, "", url);
    }
    
    activateTab(initialTab, false);
    
    // Inisialisasi semua fitur
    initExpenseTracker();
    initBookmarkManager();
    initQuizApp();
});


/**
 * 2. FITUR PENCATATAN PENGELUARAN HARIAN
 * CRUD, filter, kalkulasi, localStorage (Key: expensesData)
 */
function initExpenseTracker() {
    let expenses = JSON.parse(localStorage.getItem('expensesData')) || []; 
    let editModeId = null;

    const form = document.getElementById('expense-form');
    const listContainer = document.getElementById('expense-list');
    const emptyState = document.getElementById('expense-empty');
    const searchInput = document.getElementById('expense-search');
    const cancelBtn = document.getElementById('expense-cancel-btn');

    // Element Summary
    const elIncome = document.getElementById('total-income');
    const elExpense = document.getElementById('total-expense');
    const elBalance = document.getElementById('total-balance');

    function renderExpenses(filterText = "") {
        listContainer.innerHTML = '';
        const filtered = expenses.filter(e => e.title.toLowerCase().includes(filterText.toLowerCase()));

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filtered.forEach(exp => {
                const isIncome = exp.type === 'Pemasukan';
                const div = document.createElement('div');
                div.className = "flex justify-between items-center p-3 border rounded-lg bg-gray-50 hover:bg-gray-100";
                div.innerHTML = `
                    <div>
                        <h4 class="font-bold text-gray-800">${exp.title}</h4>
                        <p class="text-xs text-gray-500">${exp.date} &bull; ${exp.category}</p>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}">
                            ${isIncome ? '+' : '-'} Rp ${parseInt(exp.amount).toLocaleString('id-ID')}
                        </span>
                        <div class="flex gap-2">
                            <button class="text-blue-500 hover:text-blue-700 edit-btn" data-id="${exp.id}"><i class="ti ti-pencil"></i></button>
                            <button class="text-red-500 hover:text-red-700 del-btn" data-id="${exp.id}"><i class="ti ti-trash"></i></button>
                        </div>
                    </div>
                `;
                listContainer.appendChild(div);
            });
        }
        updateSummary();
        attachExpenseListeners();
    }

    function updateSummary() {
        const income = expenses.filter(e => e.type === 'Pemasukan').reduce((acc, curr) => acc + Number(curr.amount), 0);
        const expense = expenses.filter(e => e.type === 'Pengeluaran').reduce((acc, curr) => acc + Number(curr.amount), 0);
        const balance = income - expense;

        elIncome.innerText = `Rp ${income.toLocaleString('id-ID')}`;
        elExpense.innerText = `Rp ${expense.toLocaleString('id-ID')}`;
        elBalance.innerText = `Rp ${balance.toLocaleString('id-ID')}`;
    }

    function saveToLocal() {
        localStorage.setItem('expensesData', JSON.stringify(expenses)); 
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const expenseData = {
            id: editModeId || Date.now().toString(),
            title: document.getElementById('expense-title').value,
            category: document.getElementById('expense-category').value,
            amount: document.getElementById('expense-amount').value,
            type: document.getElementById('expense-type').value,
            date: document.getElementById('expense-date').value
        };

        if (editModeId) {
            expenses = expenses.map(ex => ex.id === editModeId ? expenseData : ex);
            resetForm();
        } else {
            expenses.push(expenseData);
        }

        saveToLocal();
        renderExpenses();
        form.reset();
    });

    function attachExpenseListeners() {
        document.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Yakin ingin menghapus transaksi ini?')) {
                    expenses = expenses.filter(ex => ex.id !== id);
                    saveToLocal();
                    renderExpenses(searchInput.value);
                }
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const exp = expenses.find(ex => ex.id === id);
                if (exp) {
                    editModeId = id;
                    document.getElementById('expense-title').value = exp.title;
                    document.getElementById('expense-category').value = exp.category;
                    document.getElementById('expense-amount').value = exp.amount;
                    document.getElementById('expense-type').value = exp.type;
                    document.getElementById('expense-date').value = exp.date;
                    document.getElementById('expense-form-title').innerText = "Ubah Transaksi";
                    cancelBtn.classList.remove('hidden');
                }
            });
        });
    }

    cancelBtn.addEventListener('click', resetForm);
    searchInput.addEventListener('input', (e) => renderExpenses(e.target.value));

    function resetForm() {
        editModeId = null;
        form.reset();
        document.getElementById('expense-form-title').innerText = "Tambah Transaksi";
        cancelBtn.classList.add('hidden');
    }

    renderExpenses();
}

/**
 * 3. FITUR BOOKMARK MANAGER
 * CRUD link, validasi Regex, localStorage (Key: bookmarksData)
 */
function initBookmarkManager() {
    let bookmarks = JSON.parse(localStorage.getItem('bookmarksData')) || []; 
    let editBookmarkId = null;

    const form = document.getElementById('bookmark-form');
    const listContainer = document.getElementById('bookmark-list');
    const emptyState = document.getElementById('bookmark-empty');
    const searchInput = document.getElementById('bookmark-search');
    const cancelBtn = document.getElementById('bookmark-cancel-btn');

    function renderBookmarks(filterText = "") {
        listContainer.innerHTML = '';
        const filtered = bookmarks.filter(b => b.title.toLowerCase().includes(filterText.toLowerCase()));

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filtered.forEach(bm => {
                const div = document.createElement('div');
                div.className = "border rounded-xl p-4 bg-gray-50 shadow-sm flex flex-col justify-between";
                div.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start">
                            <a href="${bm.url}" target="_blank" rel="noopener noreferrer" class="font-bold text-indigo-700 hover:underline text-lg line-clamp-1">${bm.title}</a>
                            <span class="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">${bm.category}</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-1 truncate">${bm.url}</p>
                        <p class="text-sm text-gray-700 mt-2 line-clamp-2">${bm.note || '-'}</p>
                    </div>
                    <div class="flex justify-end gap-3 mt-4 border-t pt-3">
                        <button class="text-sm text-blue-600 font-medium hover:text-blue-800 edit-bm-btn" data-id="${bm.id}">Ubah</button>
                        <button class="text-sm text-red-600 font-medium hover:text-red-800 del-bm-btn" data-id="${bm.id}">Hapus</button>
                    </div>
                `;
                listContainer.appendChild(div);
            });
        }
        attachBookmarkListeners();
    }

    function saveToLocal() {
        localStorage.setItem('bookmarksData', JSON.stringify(bookmarks));
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const urlInput = document.getElementById('bookmark-url').value;
        const urlRegex = /^(https?:\/\/)/i;
        if (!urlRegex.test(urlInput)) {
            alert("URL harus diawali dengan http:// atau https://");
            return;
        }

        const data = {
            id: editBookmarkId || Date.now().toString(),
            title: document.getElementById('bookmark-title').value,
            url: urlInput,
            category: document.getElementById('bookmark-category').value,
            note: document.getElementById('bookmark-note').value
        };

        if (editBookmarkId) {
            bookmarks = bookmarks.map(b => b.id === editBookmarkId ? data : b);
            resetForm();
        } else {
            bookmarks.push(data);
        }

        saveToLocal();
        renderBookmarks();
        form.reset();
    });

    function attachBookmarkListeners() {
        document.querySelectorAll('.del-bm-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Hapus tautan ini dari koleksi?')) {
                    bookmarks = bookmarks.filter(b => b.id !== e.target.dataset.id);
                    saveToLocal();
                    renderBookmarks(searchInput.value);
                }
            });
        });

        document.querySelectorAll('.edit-bm-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bm = bookmarks.find(b => b.id === e.target.dataset.id);
                if (bm) {
                    editBookmarkId = bm.id;
                    document.getElementById('bookmark-title').value = bm.title;
                    document.getElementById('bookmark-url').value = bm.url;
                    document.getElementById('bookmark-category').value = bm.category;
                    document.getElementById('bookmark-note').value = bm.note;
                    document.getElementById('bookmark-form-title').innerText = "Ubah Bookmark";
                    cancelBtn.classList.remove('hidden');
                }
            });
        });
    }

    cancelBtn.addEventListener('click', resetForm);
    searchInput.addEventListener('input', (e) => renderBookmarks(e.target.value));

    function resetForm() {
        editBookmarkId = null;
        form.reset();
        document.getElementById('bookmark-form-title').innerText = "Tambah Bookmark";
        cancelBtn.classList.add('hidden');
    }

    renderBookmarks();
}

/**
 * 4. FITUR KUIS INTERAKTIF
 * Array of object, state, dan localStorage (Key: quizHighScoreData)
 */
function initQuizApp() {
    const questions = [
        { q: "Apa kepanjangan dari HTML?", options: ["Hypertext Machine Language", "Hypertext Markup Language", "Hyperloop Markup Language", "Helicopter Terminal Motor Language"], ans: 1 },
        { q: "Simbol apa yang digunakan untuk selector id di CSS?", options: [".", "#", "*", "@"], ans: 1 },
        { q: "Manakah yang bukan merupakan tipe data di JavaScript?", options: ["String", "Boolean", "Float", "Undefined"], ans: 2 },
        { q: "Fungsi DOM untuk mendapatkan elemen HTML berdasarkan ID-nya adalah:", options: ["getElementByID()", "querySelector()", "getElementById()", "getElementsById()"], ans: 2 },
        { q: "Atribut HTML untuk menentukan tautan tujuan pada tag <a> adalah:", options: ["href", "src", "link", "target"], ans: 0 }
    ];

    let currentQ = 0;
    let score = 0;
    let highScore = parseInt(localStorage.getItem('quizHighScoreData')) || 0; 

    // Elements
    const startScreen = document.getElementById('quiz-start-screen');
    const qScreen = document.getElementById('quiz-question-screen');
    const resScreen = document.getElementById('quiz-result-screen');
    const elHighScore = document.getElementById('quiz-high-score');
    
    const elQuestion = document.getElementById('quiz-question-text');
    const elOptions = document.getElementById('quiz-options');
    const elProgress = document.getElementById('quiz-progress');
    const elCurrScore = document.getElementById('current-score');
    const btnNext = document.getElementById('next-question-btn');

    elHighScore.innerText = highScore;

    document.getElementById('start-quiz-btn').addEventListener('click', () => {
        currentQ = 0;
        score = 0;
        startScreen.classList.add('hidden-panel');
        resScreen.classList.add('hidden-panel');
        qScreen.classList.remove('hidden-panel');
        loadQuestion();
    });

    function loadQuestion() {
        btnNext.classList.add('hidden');
        elOptions.innerHTML = '';
        elProgress.innerText = `Soal ${currentQ + 1} dari ${questions.length}`;
        elCurrScore.innerText = score;
        
        const qData = questions[currentQ];
        elQuestion.innerText = qData.q;

        qData.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = "w-full text-left p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition font-medium border-gray-200 outline-none focus:ring-2 focus:ring-blue-400";
            btn.innerText = opt;
            btn.addEventListener('click', () => selectAnswer(btn, index, qData.ans));
            elOptions.appendChild(btn);
        });
    }

    function selectAnswer(selectedBtn, selectedIdx, correctIdx) {
        // Disable semua tombol
        const buttons = elOptions.querySelectorAll('button');
        buttons.forEach(btn => btn.disabled = true);

        if (selectedIdx === correctIdx) {
            selectedBtn.classList.add('bg-green-100', 'border-green-500', 'text-green-800');
            score++;
            elCurrScore.innerText = score;
        } else {
            selectedBtn.classList.add('bg-red-100', 'border-red-500', 'text-red-800');
            // Tampilkan yang benar
            buttons[correctIdx].classList.add('bg-green-100', 'border-green-500');
        }

        btnNext.classList.remove('hidden');
    }

    btnNext.addEventListener('click', () => {
        currentQ++;
        if (currentQ < questions.length) {
            loadQuestion();
        } else {
            finishQuiz();
        }
    });

    function finishQuiz() {
        qScreen.classList.add('hidden-panel');
        resScreen.classList.remove('hidden-panel');
        
        document.getElementById('final-score').innerText = `${score} / ${questions.length}`;
        
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('quizHighScoreData', highScore); 
            elHighScore.innerText = highScore;
        }
    }

    document.getElementById('retry-quiz-btn').addEventListener('click', () => {
        resScreen.classList.add('hidden-panel');
        startScreen.classList.remove('hidden-panel');
    });
}