/**
 * Helper Keamanan: Cegah serangan XSS saat merender innerHTML dengan user data
 */
function escapeHTML(str) {
  if (!str) return "";
  return str.toString().replace(
    /[&<>'"]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[tag],
  );
}

/**
 * 1. INTEGRASI TAB & PROYEK (Murni URL Query Parameter)
 */
document.addEventListener("DOMContentLoaded", () => {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  const tabMap = {
    expense: "expense-panel",
    bookmark: "bookmark-panel",
    quiz: "quiz-panel",
  };
  const reverseTabMap = {
    "expense-panel": "expense",
    "bookmark-panel": "bookmark",
    "quiz-panel": "quiz",
  };

  function activateTab(targetId, pushState = true) {
    tabPanels.forEach((panel) => {
      if (panel.id === targetId) {
        panel.classList.remove("hidden-panel");
      } else {
        panel.classList.add("hidden-panel");
      }
    });

    tabBtns.forEach((btn) => {
      const isSelected = btn.dataset.target === targetId;
      btn.classList.toggle("active-tab", isSelected);
      btn.classList.toggle("border-blue-600", isSelected);
      btn.classList.toggle("text-blue-600", isSelected);
      btn.classList.toggle("border-transparent", !isSelected);
      btn.classList.toggle("text-gray-500", !isSelected);
      btn.setAttribute("aria-selected", isSelected ? "true" : "false");
    });

    if (pushState) {
      const tabParam = reverseTabMap[targetId] || "expense";
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tabParam);

      if (window.location.search !== `?tab=${tabParam}`) {
        window.history.pushState({ tab: targetId }, "", url);
      }
    }
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => activateTab(e.target.dataset.target));
  });

  window.addEventListener("popstate", (e) => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab") || "expense";
    const targetPanel = (e.state && e.state.tab) ? e.state.tab : (tabMap[tabParam] || "expense-panel");
    activateTab(targetPanel, false);
  });

  const params = new URLSearchParams(window.location.search);
  let tabParam = params.get("tab");
  if (!tabParam || !tabMap[tabParam]) {
    tabParam = "expense";
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabParam);
    window.history.replaceState({ tab: tabMap[tabParam] }, "", url);
  }
  activateTab(tabMap[tabParam], false);

  initGlobalModals();
  initExpenseTracker();
  initBookmarkManager();
  initQuizApp();
});

/**
 * GLOBAL MODAL HANDLER (Hapus Data)
 */
let confirmDeleteCallback = null;
function initGlobalModals() {
  const deleteModal = document.getElementById("delete-modal");
  document.getElementById("cancel-delete-btn").addEventListener("click", () => {
    deleteModal.classList.add("hidden");
    deleteModal.classList.remove("flex");
    confirmDeleteCallback = null;
  });
  document.getElementById("confirm-delete-btn").addEventListener("click", () => {
    if (confirmDeleteCallback) confirmDeleteCallback();
    deleteModal.classList.add("hidden");
    deleteModal.classList.remove("flex");
  });
}

function requestDelete(callback) {
  confirmDeleteCallback = callback;
  const deleteModal = document.getElementById("delete-modal");
  deleteModal.classList.remove("hidden");
  deleteModal.classList.add("flex");
}

/**
 * REFACTOR: Helper Generik untuk Modal agar tidak ada duplikasi kode
 */
function setupModalController(modalId, openBtnId, cancelBtnId, formId, titleId, defaultTitle) {
  const modal = document.getElementById(modalId);
  const form = document.getElementById(formId);
  const titleEl = document.getElementById(titleId);

  function open(isEdit = false) {
    titleEl.innerText = isEdit ? `Ubah ${defaultTitle}` : `Tambah ${defaultTitle}`;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  function close() {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    form.reset();
  }

  document.getElementById(openBtnId).addEventListener("click", () => open(false));
  document.getElementById(cancelBtnId).addEventListener("click", close);

  return { open, close };
}

/**
 * 2. FITUR PENCATATAN PENGELUARAN HARIAN (Expense Tracker)
 */
function initExpenseTracker() {
  let expenses = JSON.parse(localStorage.getItem("expensesData")) || [];
  let editModeId = null;

  const modalCtrl = setupModalController("expense-modal", "btn-add-expense", "expense-cancel-btn", "expense-form", "expense-form-title", "Transaksi");
  const listContainer = document.getElementById("expense-list");
  const emptyState = document.getElementById("expense-empty");
  const searchInput = document.getElementById("expense-search");
  const filterSelect = document.getElementById("expense-filter");
  const sortSelect = document.getElementById("expense-sort");
  const form = document.getElementById("expense-form");

  function renderExpenses() {
    listContainer.innerHTML = "";
    const searchText = searchInput.value.toLowerCase();
    const filterType = filterSelect.value;
    const sortType = sortSelect.value;

    let filtered = expenses.filter((e) => {
      const matchSearch = e.title.toLowerCase().includes(searchText) || e.category.toLowerCase().includes(searchText);
      const matchType = filterType === "all" || e.type === filterType;
      return matchSearch && matchType;
    });

    filtered.sort((a, b) => {
      if (sortType === "newest") return new Date(b.date) - new Date(a.date);
      if (sortType === "oldest") return new Date(a.date) - new Date(b.date);
      if (sortType === "highest") return Number(b.amount) - Number(a.amount);
      if (sortType === "lowest") return Number(a.amount) - Number(b.amount);
      return 0;
    });

    if (filtered.length === 0) {
      emptyState.classList.remove("hidden");
    } else {
      emptyState.classList.add("hidden");
      filtered.forEach((exp) => {
        const isIncome = exp.type === "Pemasukan";
        const div = document.createElement("div");
        div.className = "flex justify-between items-center p-4 border rounded-lg bg-gray-50 hover:bg-gray-100";
        div.innerHTML = `
          <div>
            <h3 class="font-bold text-gray-800 text-base m-0">${escapeHTML(exp.title)}</h3>
            <p class="text-xs text-gray-500 mt-1">${escapeHTML(exp.date)} &bull; ${escapeHTML(exp.category)}</p>
          </div>
          <div class="flex items-center gap-4">
            <span class="font-bold ${isIncome ? "text-green-600" : "text-red-600"}">
              ${isIncome ? "+" : "-"} Rp ${parseInt(exp.amount).toLocaleString("id-ID")}
            </span>
            <div class="flex gap-2">
              <button class="text-blue-500 hover:text-blue-700 edit-btn bg-blue-100 p-2 rounded" data-id="${escapeHTML(exp.id)}" aria-label="Ubah transaksi"><i class="ti ti-pencil" aria-hidden="true"></i></button>
              <button class="text-red-500 hover:text-red-700 del-btn bg-red-100 p-2 rounded" data-id="${escapeHTML(exp.id)}" aria-label="Hapus transaksi"><i class="ti ti-trash" aria-hidden="true"></i></button>
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
    const income = expenses.filter((e) => e.type === "Pemasukan").reduce((acc, curr) => acc + Number(curr.amount), 0);
    const expense = expenses.filter((e) => e.type === "Pengeluaran").reduce((acc, curr) => acc + Number(curr.amount), 0);
    document.getElementById("total-income").innerText = `Rp ${income.toLocaleString("id-ID")}`;
    document.getElementById("total-expense").innerText = `Rp ${expense.toLocaleString("id-ID")}`;
    document.getElementById("total-balance").innerText = `Rp ${(income - expense).toLocaleString("id-ID")}`;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("expense-title").value.trim();
    const amount = Number(document.getElementById("expense-amount").value);
    const date = document.getElementById("expense-date").value;

    if (!title) return alert("Judul tidak boleh kosong!");
    if (isNaN(amount) || amount <= 0) return alert("Jumlah harus berupa angka lebih dari 0!");
    // Validasi Tanggal Eksplisit JS
    if (!date) return alert("Tanggal transaksi wajib diisi!");

    const expenseData = {
      id: editModeId || Date.now().toString(),
      title,
      category: document.getElementById("expense-category").value.trim(),
      amount,
      type: document.getElementById("expense-type").value,
      date,
    };

    if (editModeId) {
      expenses = expenses.map((ex) => (ex.id === editModeId ? expenseData : ex));
      editModeId = null;
    } else {
      expenses.push(expenseData);
    }
    localStorage.setItem("expensesData", JSON.stringify(expenses));
    renderExpenses();
    modalCtrl.close();
  });

  function attachExpenseListeners() {
    listContainer.querySelectorAll(".del-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        requestDelete(() => {
          expenses = expenses.filter((ex) => ex.id !== id);
          localStorage.setItem("expensesData", JSON.stringify(expenses));
          renderExpenses();
        });
      });
    });

    listContainer.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        const exp = expenses.find((ex) => ex.id === id);
        if (exp) {
          editModeId = id;
          document.getElementById("expense-title").value = exp.title;
          document.getElementById("expense-category").value = exp.category;
          document.getElementById("expense-amount").value = exp.amount;
          document.getElementById("expense-type").value = exp.type;
          document.getElementById("expense-date").value = exp.date;
          modalCtrl.open(true);
        }
      });
    });
  }

  document.getElementById("btn-add-expense").addEventListener("click", () => { editModeId = null; });
  searchInput.addEventListener("input", renderExpenses);
  filterSelect.addEventListener("change", renderExpenses);
  sortSelect.addEventListener("change", renderExpenses);

  renderExpenses();
}

/**
 * 3. FITUR BOOKMARK MANAGER
 */
function initBookmarkManager() {
  let bookmarks = JSON.parse(localStorage.getItem("bookmarksData")) || [];
  let editBookmarkId = null;

  const modalCtrl = setupModalController("bookmark-modal", "btn-add-bookmark", "bookmark-cancel-btn", "bookmark-form", "bookmark-form-title", "Bookmark");
  const listContainer = document.getElementById("bookmark-list");
  const emptyState = document.getElementById("bookmark-empty");
  const searchInput = document.getElementById("bookmark-search");
  const filterSelect = document.getElementById("bookmark-filter");
  const sortSelect = document.getElementById("bookmark-sort");
  const form = document.getElementById("bookmark-form");

  function updateCategoryFilter() {
    const currentVal = filterSelect.value;
    const categories = [...new Set(bookmarks.map((b) => b.category))];

    filterSelect.innerHTML = '<option value="all">Semua Kategori</option>';
    categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      filterSelect.appendChild(opt);
    });

    if (categories.includes(currentVal)) {
      filterSelect.value = currentVal;
    }
  }

  function renderBookmarks() {
    updateCategoryFilter();
    listContainer.innerHTML = "";

    const searchText = searchInput.value.toLowerCase();
    const filterCategory = filterSelect.value;
    const sortType = sortSelect.value;

    let filtered = bookmarks.filter((b) => {
      const matchSearch = b.title.toLowerCase().includes(searchText) || b.url.toLowerCase().includes(searchText);
      const matchCategory = filterCategory === "all" || b.category === filterCategory;
      return matchSearch && matchCategory;
    });

    filtered.sort((a, b) => {
      if (sortType === "az") return a.title.localeCompare(b.title);
      if (sortType === "za") return b.title.localeCompare(a.title);
      if (sortType === "newest") return Number(b.id) - Number(a.id);
      if (sortType === "oldest") return Number(a.id) - Number(b.id);
      return 0;
    });

    if (filtered.length === 0) {
      emptyState.classList.remove("hidden");
    } else {
      emptyState.classList.add("hidden");
      filtered.forEach((bm) => {
        const div = document.createElement("div");
        div.className = "border rounded-xl p-4 bg-gray-50 shadow-sm flex flex-col justify-between";
        div.innerHTML = `
          <div>
            <div class="flex justify-between items-start mb-2">
              <a href="${escapeHTML(bm.url)}" target="_blank" rel="noopener noreferrer" class="font-bold text-indigo-700 hover:underline text-lg line-clamp-1">${escapeHTML(bm.title)}</a>
              <span class="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full whitespace-nowrap ml-2">${escapeHTML(bm.category)}</span>
            </div>
            <p class="text-xs text-gray-500 truncate">${escapeHTML(bm.url)}</p>
            <p class="text-sm text-gray-700 mt-2 line-clamp-2">${escapeHTML(bm.note) || "-"}</p>
          </div>
          <div class="flex justify-end gap-3 mt-4 border-t pt-3">
            <button class="text-sm text-blue-600 font-medium hover:text-blue-800 edit-bm-btn" data-id="${escapeHTML(bm.id)}">Ubah</button>
            <button class="text-sm text-red-600 font-medium hover:text-red-800 del-bm-btn" data-id="${escapeHTML(bm.id)}">Hapus</button>
          </div>
        `;
        listContainer.appendChild(div);
      });
    }
    attachBookmarkListeners();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = document.getElementById("bookmark-title").value.trim();
    const urlInput = document.getElementById("bookmark-url").value.trim();

    if (!title) return alert("Judul tidak boleh kosong!");
    const urlRegex = /^(https?:\/\/)/i;
    if (!urlRegex.test(urlInput)) return alert("URL harus diawali dengan http:// atau https://");

    const data = {
      id: editBookmarkId || Date.now().toString(),
      title,
      url: urlInput,
      category: document.getElementById("bookmark-category-input").value.trim(),
      note: document.getElementById("bookmark-note").value.trim(),
    };

    if (editBookmarkId) {
      bookmarks = bookmarks.map((b) => (b.id === editBookmarkId ? data : b));
      editBookmarkId = null;
    } else {
      bookmarks.push(data);
    }
    localStorage.setItem("bookmarksData", JSON.stringify(bookmarks));
    renderBookmarks();
    modalCtrl.close();
  });

  function attachBookmarkListeners() {
    listContainer.querySelectorAll(".del-bm-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
        requestDelete(() => {
          bookmarks = bookmarks.filter((b) => b.id !== id);
          localStorage.setItem("bookmarksData", JSON.stringify(bookmarks));
          renderBookmarks();
        });
      });
    });

    listContainer.querySelectorAll(".edit-bm-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const bm = bookmarks.find((b) => b.id === e.target.dataset.id);
        if (bm) {
          editBookmarkId = bm.id;
          document.getElementById("bookmark-title").value = bm.title;
          document.getElementById("bookmark-url").value = bm.url;
          document.getElementById("bookmark-category-input").value = bm.category;
          document.getElementById("bookmark-note").value = bm.note;
          modalCtrl.open(true);
        }
      });
    });
  }

  document.getElementById("btn-add-bookmark").addEventListener("click", () => { editBookmarkId = null; });
  searchInput.addEventListener("input", renderBookmarks);
  filterSelect.addEventListener("change", renderBookmarks);
  sortSelect.addEventListener("change", renderBookmarks);

  renderBookmarks();
}

/**
 * 4. FITUR KUIS INTERAKTIF (Dengan Pengacakan Soal & Opsi - Fisher-Yates Shuffle)
 */
function initQuizApp() {
  const originalQuestions = [
    { q: "Apa kepanjangan dari HTML?", options: ["Hypertext Machine Language", "Hypertext Markup Language", "Hyperloop Markup Language", "Helicopter Terminal Motor Language"], ansStr: "Hypertext Markup Language" },
    { q: "Simbol apa yang digunakan untuk selector id di CSS?", options: [".", "#", "*", "@"], ansStr: "#" },
    { q: "Manakah yang bukan merupakan tipe data di JavaScript?", options: ["String", "Boolean", "Float", "Undefined"], ansStr: "Float" },
    { q: "Fungsi DOM untuk mendapatkan elemen HTML berdasarkan ID-nya adalah:", options: ["getElementByID()", "querySelector()", "getElementById()", "getElementsById()"], ansStr: "getElementById()" },
    { q: "Atribut HTML untuk menentukan tautan tujuan pada tag <a> adalah:", options: ["href", "src", "link", "target"], ansStr: "href" },
  ];

  let questions = [];
  let currentQ = 0;
  let score = 0;
  let highScore = parseInt(localStorage.getItem("quizHighScoreData")) || 0;

  const startScreen = document.getElementById("quiz-start-screen");
  const qScreen = document.getElementById("quiz-question-screen");
  const resScreen = document.getElementById("quiz-result-screen");
  const elHighScore = document.getElementById("quiz-high-score");
  const elQuestion = document.getElementById("quiz-question-text");
  const elOptions = document.getElementById("quiz-options");
  const elProgress = document.getElementById("quiz-progress");
  const elCurrScore = document.getElementById("current-score");
  const btnNext = document.getElementById("next-question-btn");

  elHighScore.innerText = highScore;

  // Algoritma Fisher-Yates untuk mengacak array
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  document.getElementById("start-quiz-btn").addEventListener("click", () => {
    currentQ = 0;
    score = 0;
    // Acak urutan soal dan acak pilihan opsi jawaban di setiap soal
    questions = shuffleArray(originalQuestions).map((item) => {
      const shuffledOptions = shuffleArray(item.options);
      return {
        q: item.q,
        options: shuffledOptions,
        ans: shuffledOptions.indexOf(item.ansStr),
      };
    });

    startScreen.classList.add("hidden-panel");
    resScreen.classList.add("hidden-panel");
    qScreen.classList.remove("hidden-panel");
    loadQuestion();
  });

  function loadQuestion() {
    btnNext.classList.add("hidden");
    elOptions.innerHTML = "";
    elProgress.innerText = `Soal ${currentQ + 1} dari ${questions.length}`;
    elCurrScore.innerText = score;

    const qData = questions[currentQ];
    elQuestion.innerText = qData.q;

    qData.options.forEach((opt, index) => {
      const btn = document.createElement("button");
      btn.className = "w-full text-left p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition font-medium border-gray-200 outline-none focus:ring-2 focus:ring-blue-400";
      btn.innerText = opt;
      btn.addEventListener("click", () => selectAnswer(btn, index, qData.ans));
      elOptions.appendChild(btn);
    });
  }

  function selectAnswer(selectedBtn, selectedIdx, correctIdx) {
    const buttons = elOptions.querySelectorAll("button");
    buttons.forEach((btn) => (btn.disabled = true));

    if (selectedIdx === correctIdx) {
      selectedBtn.classList.add("bg-green-100", "border-green-500", "text-green-800");
      score++;
      elCurrScore.innerText = score;
    } else {
      selectedBtn.classList.add("bg-red-100", "border-red-500", "text-red-800");
      buttons[correctIdx].classList.add("bg-green-100", "border-green-500");
    }
    btnNext.classList.remove("hidden");
  }

  btnNext.addEventListener("click", () => {
    currentQ++;
    if (currentQ < questions.length) {
      loadQuestion();
    } else {
      finishQuiz();
    }
  });

  function finishQuiz() {
    qScreen.classList.add("hidden-panel");
    resScreen.classList.remove("hidden-panel");
    document.getElementById("final-score").innerText = `${score} / ${questions.length}`;

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("quizHighScoreData", highScore);
      elHighScore.innerText = highScore;
    }
  }

  document.getElementById("retry-quiz-btn").addEventListener("click", () => {
    resScreen.classList.add("hidden-panel");
    startScreen.classList.remove("hidden-panel");
  });
}