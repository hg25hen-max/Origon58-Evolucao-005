/* =========================================================
   ORIGON58 EVOLUÇÃO #005
   Cofre pessoal criptografado com suporte a fotos

   - 3 senhas de acesso
   - Cofre criptografado no localStorage
   - AES-GCM + PBKDF2 / SHA-256
   - Texto, foto ou texto + foto
   - Senha individual para cada dado
   - Exportação de arquivos .enc
   - Importação e descriptografia de .enc
   - Compatibilidade com itens de texto da versão 5
   - Limpeza do cofre e dos dados temporários
   - Funcionamento offline com Service Worker
   - Sem servidor ou banco de dados remoto
   ========================================================= */


/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

const CONFIG_KEY = "origon58_config_v6";
const VAULT_KEY = "origon58_vault_v6";

const CONFIG_VERSION = 6;
const VAULT_VERSION = 6;
const ITEM_VERSION = 5;

const PBKDF2_ITERATIONS = 250000;
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();


/* =========================================================
   ESTADO
   ========================================================= */

let currentVaultKey = null;
let currentVaultSalt = null;
let currentVaultData = [];

let temporaryBackupData = null;
let photoPreviewUrl = null;
let resultPhotoUrl = null;


/* =========================================================
   ELEMENTOS HTML
   ========================================================= */

const setupScreen = document.getElementById("setupScreen");
const loginScreen = document.getElementById("loginScreen");
const vaultScreen = document.getElementById("vaultScreen");

const setupForm = document.getElementById("setupForm");
const loginForm = document.getElementById("loginForm");

const setupPassword1 = document.getElementById("setupPassword1");
const setupPassword1Confirm = document.getElementById("setupPassword1Confirm");
const setupPassword2 = document.getElementById("setupPassword2");
const setupPassword2Confirm = document.getElementById("setupPassword2Confirm");
const setupPassword3 = document.getElementById("setupPassword3");
const setupPassword3Confirm = document.getElementById("setupPassword3Confirm");

const loginPassword1 = document.getElementById("loginPassword1");
const loginPassword2 = document.getElementById("loginPassword2");
const loginPassword3 = document.getElementById("loginPassword3");

const setupMessage = document.getElementById("setupMessage");
const loginMessage = document.getElementById("loginMessage");

const lockButton = document.getElementById("lockButton");
const logoutButton = document.getElementById("logoutButton");

const addDataButton = document.getElementById("addDataButton");
const dataList = document.getElementById("dataList");
const dataCount = document.getElementById("dataCount");

const clearVaultButton = document.getElementById("clearVaultButton");
const clearTemporaryButton = document.getElementById("clearTemporaryButton");
const decryptSavedButton = document.getElementById("decryptSavedButton");


/* =========================================================
   MODAL: ADICIONAR DADO
   ========================================================= */

const addDataModal = document.getElementById("addDataModal");

const newDataText = document.getElementById("newDataText");
const newDataPassword = document.getElementById("newDataPassword");
const newDataPasswordConfirm =
    document.getElementById("newDataPasswordConfirm");

const cancelAddDataButton =
    document.getElementById("cancelAddDataButton");

const encryptDataButton =
    document.getElementById("encryptDataButton");

const addDataMessage =
    document.getElementById("addDataMessage");


/* =========================================================
   CONTROLES DE FOTO
   ========================================================= */

const choosePhotoButton = document.getElementById("choosePhotoButton");
const newDataPhoto = document.getElementById("newDataPhoto");
const newDataPhotoName = document.getElementById("newDataPhotoName");
const newDataPhotoPreviewContainer =
    document.getElementById("newDataPhotoPreviewContainer");
const newDataPhotoPreview =
    document.getElementById("newDataPhotoPreview");
const removePhotoButton = document.getElementById("removePhotoButton");


/* =========================================================
   MODAL: LIMPAR COFRE
   ========================================================= */

const clearVaultModal = document.getElementById("clearVaultModal");
const clearVaultPassword = document.getElementById("clearVaultPassword");
const clearVaultPasswordConfirm =
    document.getElementById("clearVaultPasswordConfirm");

const cancelClearVaultButton =
    document.getElementById("cancelClearVaultButton");

const confirmClearVaultButton =
    document.getElementById("confirmClearVaultButton");

const clearVaultMessage = document.getElementById("clearVaultMessage");


/* =========================================================
   MODAL: DESCRIPTOGRAFAR ARQUIVO
   ========================================================= */

const decryptSavedModal = document.getElementById("decryptSavedModal");
const savedDataFile = document.getElementById("savedDataFile");
const savedDataPassword = document.getElementById("savedDataPassword");

const cancelDecryptSavedButton =
    document.getElementById("cancelDecryptSavedButton");

const confirmDecryptSavedButton =
    document.getElementById("confirmDecryptSavedButton");

const decryptSavedMessage =
    document.getElementById("decryptSavedMessage");

const savedDataResult = document.getElementById("savedDataResult");
const savedDataResultText = document.getElementById("savedDataResultText");


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
    try {
        registerEvents();
        registerServiceWorker();
        hideAllScreens();

        const config = loadConfig();

        if (!config) {
            showScreen(setupScreen);
        } else {
            showScreen(loginScreen);
        }
    } catch (error) {
        console.error("Erro na inicialização:", error);
        showScreen(loginScreen);
        setMessage(loginMessage, "Não foi possível iniciar o cofre.", "error");
    }
}


/* =========================================================
   EVENTOS
   ========================================================= */

function registerEvents() {
    setupForm.addEventListener("submit", handleSetup);
    loginForm.addEventListener("submit", handleLogin);

    lockButton.addEventListener("click", lockVault);
    logoutButton.addEventListener("click", lockVault);

    addDataButton.addEventListener("click", openAddDataModal);
    cancelAddDataButton.addEventListener("click", closeAddDataModal);
    encryptDataButton.addEventListener("click", handleEncryptNewData);

    choosePhotoButton.addEventListener("click", () => newDataPhoto.click());
    newDataPhoto.addEventListener("change", handlePhotoSelection);
    removePhotoButton.addEventListener("click", removeSelectedPhoto);

    clearVaultButton.addEventListener("click", openClearVaultModal);
    cancelClearVaultButton.addEventListener("click", closeClearVaultModal);
    confirmClearVaultButton.addEventListener("click", handleClearVault);

    clearTemporaryButton.addEventListener("click", clearTemporaryState);

    decryptSavedButton.addEventListener("click", openDecryptSavedModal);
    cancelDecryptSavedButton.addEventListener("click", closeDecryptSavedModal);
    confirmDecryptSavedButton.addEventListener("click", handleDecryptSaved);
}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("sw.js")
            .catch(error => console.warn("Service Worker:", error));
    });
}


/* =========================================================
   TELAS
   ========================================================= */

function hideAllScreens() {
    setupScreen.classList.add("hidden");
    loginScreen.classList.add("hidden");
    vaultScreen.classList.add("hidden");
}

function showScreen(screen) {
    hideAllScreens();
    screen.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "auto" });
}


/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

function loadConfig() {
    try {
        const raw = localStorage.getItem(CONFIG_KEY);
        if (!raw) return null;

        const config = JSON.parse(raw);

        if (
            !config ||
            config.version !== CONFIG_VERSION ||
            !Array.isArray(config.passwordVerifiers) ||
            config.passwordVerifiers.length !== 3 ||
            !config.vaultSalt
        ) {
            return null;
        }

        return config;
    } catch (error) {
        console.error("Erro ao carregar configuração:", error);
        return null;
    }
}


/* =========================================================
   CRIAR ACESSO
   ========================================================= */

async function handleSetup(event) {
    event.preventDefault();
    clearMessage(setupMessage);

    const passwords = [
        [setupPassword1.value, setupPassword1Confirm.value],
        [setupPassword2.value, setupPassword2Confirm.value],
        [setupPassword3.value, setupPassword3Confirm.value]
    ];

    if (passwords.some(pair => !pair[0] || !pair[1])) {
        setMessage(setupMessage, "Preencha e confirme as três senhas.", "error");
        return;
    }

    if (passwords.some(pair => pair[0] !== pair[1])) {
        setMessage(setupMessage, "As senhas não conferem com as confirmações.", "error");
        return;
    }

    if (passwords.some(pair => pair[0].length < 4)) {
        setMessage(setupMessage, "Cada senha precisa ter pelo menos 4 caracteres.", "error");
        return;
    }

    const button = setupForm.querySelector("button[type='submit']");
    if (button) button.disabled = true;

    try {
        const verifiers = [];

        for (const [password] of passwords) {
            verifiers.push(await createPasswordVerifier(password));
        }

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const vaultSalt = bytesToBase64(salt);

        const config = {
            version: CONFIG_VERSION,
            createdAt: new Date().toISOString(),
            passwordVerifiers: verifiers,
            vaultSalt
        };

        const key = await deriveVaultKey(
            passwords[0][0],
            passwords[1][0],
            passwords[2][0],
            vaultSalt
        );

        currentVaultKey = key;
        currentVaultSalt = vaultSalt;
        currentVaultData = [];

        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        await saveEncryptedVault();

        setupForm.reset();
        setMessage(setupMessage, "Acesso criado com sucesso.", "success");

        setTimeout(() => {
            clearMessage(setupMessage);
            loginForm.reset();
            showScreen(loginScreen);
        }, 700);
    } catch (error) {
        console.error("Erro ao criar acesso:", error);
        setMessage(setupMessage, "Não foi possível criar o acesso.", "error");
    } finally {
        if (button) button.disabled = false;
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(event) {
    event.preventDefault();
    clearMessage(loginMessage);

    const passwords = [
        loginPassword1.value,
        loginPassword2.value,
        loginPassword3.value
    ];

    if (passwords.some(password => !password)) {
        setMessage(loginMessage, "por que quer entrar aqui 🤨", "error");
        return;
    }

    try {
        const config = loadConfig();

        if (!config) {
            showScreen(setupScreen);
            return;
        }

        for (let i = 0; i < 3; i++) {
            const valid = await verifyPassword(
                passwords[i],
                config.passwordVerifiers[i]
            );

            if (!valid) {
                setMessage(loginMessage, "por que quer entrar aqui 🤨", "error");
                loginForm.reset();
                return;
            }
        }

        currentVaultKey = await deriveVaultKey(
            passwords[0],
            passwords[1],
            passwords[2],
            config.vaultSalt
        );

        currentVaultSalt = config.vaultSalt;

        await loadEncryptedVault();

        loginForm.reset();
        clearMessage(loginMessage);
        renderVault();
        showScreen(vaultScreen);
    } catch (error) {
        console.error("Erro no login:", error);
        currentVaultKey = null;
        currentVaultSalt = null;
        currentVaultData = [];

        setMessage(loginMessage, "por que quer entrar aqui 🤨", "error");
        loginForm.reset();
    }
}


/* =========================================================
   VERIFICADORES DE SENHA
   ========================================================= */

async function createPasswordVerifier(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));

    const hash = await derivePBKDF2Bytes(
        password,
        salt,
        PBKDF2_ITERATIONS,
        32
    );

    return {
        algorithm: "PBKDF2",
        hash: "SHA-256",
        iterations: PBKDF2_ITERATIONS,
        salt: bytesToBase64(salt),
        verifier: bytesToBase64(hash)
    };
}

async function verifyPassword(password, verifier) {
    if (!verifier) return false;

    const derived = await derivePBKDF2Bytes(
        password,
        base64ToBytes(verifier.salt),
        verifier.iterations,
        32
    );

    return constantTimeEqual(
        derived,
        base64ToBytes(verifier.verifier)
    );
}


/* =========================================================
   CHAVE DO COFRE
   ========================================================= */

async function deriveVaultKey(password1, password2, password3, vaultSalt) {
    const combined = password1 + "\u0000" + password2 + "\u0000" + password3;

    const material = await crypto.subtle.importKey(
        "raw",
        TEXT_ENCODER.encode(combined),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: base64ToBytes(vaultSalt),
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256"
        },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}


/* =========================================================
   PBKDF2
   ========================================================= */

async function derivePBKDF2Bytes(password, salt, iterations, length) {
    const material = await crypto.subtle.importKey(
        "raw",
        TEXT_ENCODER.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt,
            iterations,
            hash: "SHA-256"
        },
        material,
        length * 8
    );

    return new Uint8Array(bits);
}


/* =========================================================
   SALVAR COFRE CRIPTOGRAFADO
   ========================================================= */

async function saveEncryptedVault() {
    if (!currentVaultKey) {
        throw new Error("Chave do cofre indisponível.");
    }

    const payload = {
        version: VAULT_VERSION,
        updatedAt: new Date().toISOString(),
        items: currentVaultData
    };

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        currentVaultKey,
        TEXT_ENCODER.encode(JSON.stringify(payload))
    );

    const vaultPackage = {
        format: "Origon58 Encrypted Vault",
        version: VAULT_VERSION,
        cipher: {
            name: "AES-GCM",
            iv: bytesToBase64(iv),
            ciphertext: bytesToBase64(new Uint8Array(ciphertext))
        }
    };

    localStorage.setItem(VAULT_KEY, JSON.stringify(vaultPackage));
}


/* =========================================================
   CARREGAR COFRE CRIPTOGRAFADO
   ========================================================= */

async function loadEncryptedVault() {
    if (!currentVaultKey) {
        throw new Error("Chave do cofre indisponível.");
    }

    const raw = localStorage.getItem(VAULT_KEY);

    if (!raw) {
        currentVaultData = [];
        await saveEncryptedVault();
        return;
    }

    const pack = JSON.parse(raw);

    if (
        pack.format !== "Origon58 Encrypted Vault" ||
        pack.version !== VAULT_VERSION
    ) {
        throw new Error("Formato do cofre inválido.");
    }

    const plaintext = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: base64ToBytes(pack.cipher.iv)
        },
        currentVaultKey,
        base64ToBytes(pack.cipher.ciphertext)
    );

    const payload = JSON.parse(TEXT_DECODER.decode(plaintext));

    if (
        !payload ||
        payload.version !== VAULT_VERSION ||
        !Array.isArray(payload.items)
    ) {
        throw new Error("Dados do cofre inválidos.");
    }

    currentVaultData = payload.items;
}


/* =========================================================
   MOSTRAR COFRE
   ========================================================= */

function renderVault() {
    dataList.innerHTML = "";
    dataCount.textContent = String(currentVaultData.length);

    if (currentVaultData.length === 0) {
        const empty = document.createElement("p");
        empty.className = "panel-description";
        empty.textContent = "Nenhum dado criptografado no cofre.";
        dataList.appendChild(empty);
        return;
    }

    currentVaultData.forEach((item, index) => {
        dataList.appendChild(createDataCard(item, index));
    });
}


/* =========================================================
   CARTÃO DE DADO
   ========================================================= */

function createDataCard(item, index) {
    const card = document.createElement("article");
    card.className = "data-card";

    const title = document.createElement("h3");
    title.textContent = item.title || `Dado ${index + 1}`;

    const status = document.createElement("p");
    status.className = "panel-description";
    status.textContent = "🔐 Informação criptografada";

    const actions = document.createElement("div");
    actions.className = "data-actions";

    const decryptButton = createButton(
        "🔓 DESCRIPTOGRAFAR",
        "secondary-button",
        () => decryptVaultItem(index)
    );

    const saveButton = createButton(
        "💾 SALVAR .ENC",
        "secondary-button",
        () => saveVaultItemAsEnc(index)
    );

    const deleteButton = createButton(
        "🗑️ EXCLUIR",
        "danger-button",
        () => deleteVaultItem(index)
    );

    actions.append(decryptButton, saveButton, deleteButton);
    card.append(title, status, actions);

    return card;
}

function createButton(text, className, callback) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", callback);
    return button;
}


/* =========================================================
   MODAL DE ADIÇÃO
   ========================================================= */

function openAddDataModal() {
    resetAddDataForm();
    addDataModal.classList.remove("hidden");
}

function closeAddDataModal() {
    addDataModal.classList.add("hidden");
    resetAddDataForm();
}

function resetAddDataForm() {
    newDataText.value = "";
    newDataPassword.value = "";
    newDataPasswordConfirm.value = "";

    removeSelectedPhoto();
    clearMessage(addDataMessage);
}


/* =========================================================
   SELECIONAR FOTO
   ========================================================= */

function handlePhotoSelection() {
    clearMessage(addDataMessage);

    const file = newDataPhoto.files[0];

    if (!file) {
        removeSelectedPhoto();
        return;
    }

    if (!file.type.startsWith("image/")) {
        removeSelectedPhoto();
        setMessage(addDataMessage, "Selecione um arquivo de imagem.", "error");
        return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
        removeSelectedPhoto();
        setMessage(
            addDataMessage,
            "A foto ultrapassa o limite de 2 MB. Escolha uma imagem menor.",
            "error"
        );
        return;
    }

    if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
    }

    photoPreviewUrl = URL.createObjectURL(file);

    newDataPhotoName.textContent = file.name;
    newDataPhotoPreview.src = photoPreviewUrl;
    newDataPhotoPreviewContainer.classList.remove("hidden");
}

function removeSelectedPhoto() {
    if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
        photoPreviewUrl = null;
    }

    newDataPhoto.value = "";
    newDataPhotoName.textContent = "";
    newDataPhotoPreview.removeAttribute("src");
    newDataPhotoPreviewContainer.classList.add("hidden");
}


/* =========================================================
   CRIPTOGRAFAR NOVO DADO
   ========================================================= */

async function handleEncryptNewData() {
    clearMessage(addDataMessage);

    const text = newDataText.value;
    const password = newDataPassword.value;
    const confirmation = newDataPasswordConfirm.value;
    const photoFile = newDataPhoto.files[0];

    if (!text.trim() && !photoFile) {
        setMessage(addDataMessage, "Digite um texto ou selecione uma foto.", "error");
        return;
    }

    if (!password) {
        setMessage(addDataMessage, "Crie uma senha para este dado.", "error");
        return;
    }

    if (password !== confirmation) {
        setMessage(addDataMessage, "As senhas deste dado não conferem.", "error");
        return;
    }

    if (photoFile && photoFile.size > MAX_PHOTO_SIZE) {
        setMessage(addDataMessage, "A foto ultrapassa o limite de 2 MB.", "error");
        return;
    }

    if (photoFile && !photoFile.type.startsWith("image/")) {
        setMessage(addDataMessage, "O arquivo selecionado não é uma imagem.", "error");
        return;
    }

    encryptDataButton.disabled = true;

    try {
        let photo = null;

        if (photoFile) {
            const bytes = new Uint8Array(await photoFile.arrayBuffer());

            photo = {
                name: photoFile.name,
                mimeType: photoFile.type || "image/jpeg",
                dataBase64: bytesToBase64(bytes)
            };
        }

        const cleanText = text.trim();

        const payload = {
            marker: "Origon58Payload",
            version: 1,
            kind: photo && cleanText ? "photo+text" : photo ? "photo" : "text",
            text: cleanText,
            photo
        };

        const encryptedItem = await encryptIndividualItem(
            JSON.stringify(payload),
            password
        );

        encryptedItem.title = photo
            ? (cleanText ? "Foto + texto" : "Foto protegida")
            : "Texto protegido";

        currentVaultData.push(encryptedItem);

        try {
            await saveEncryptedVault();
        } catch (saveError) {
            currentVaultData.pop();
            throw saveError;
        }

        closeAddDataModal();
        renderVault();
    } catch (error) {
        console.error("Erro ao criptografar dado:", error);

        const message = error && error.name === "QuotaExceededError"
            ? "O armazenamento do navegador está cheio. Exporte e exclua dados antigos."
            : "Não foi possível criptografar o dado.";

        setMessage(addDataMessage, message, "error");
    } finally {
        encryptDataButton.disabled = false;
    }
}


/* =========================================================
   CRIPTOGRAFIA INDIVIDUAL
   ========================================================= */

async function encryptIndividualItem(text, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const key = await deriveItemKey(password, salt);

    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        TEXT_ENCODER.encode(text)
    );

    const id = createRandomId();

    return {
        format: "Origon58 Secure Item",
        version: ITEM_VERSION,
        id,
        title: `Dado ${id}`,
        createdAt: new Date().toISOString(),
        kdf: {
            name: "PBKDF2",
            hash: "SHA-256",
            iterations: PBKDF2_ITERATIONS,
            salt: bytesToBase64(salt)
        },
        cipher: {
            name: "AES-GCM",
            iv: bytesToBase64(iv)
        },
        ciphertext: bytesToBase64(new Uint8Array(ciphertext))
    };
}

async function deriveItemKey(password, salt) {
    const material = await crypto.subtle.importKey(
        "raw",
        TEXT_ENCODER.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256"
        },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}


/* =========================================================
   DESCRIPTOGRAFAR DADO DO COFRE
   ========================================================= */

async function decryptVaultItem(index) {
    const item = currentVaultData[index];
    if (!item) return;

    const password = window.prompt("Digite a senha deste dado:");
    if (password === null) return;

    if (!password) {
        window.alert("Senha não informada.");
        return;
    }

    try {
        const plaintext = await decryptIndividualItem(item, password);
        showDecryptedData(item, plaintext);
    } catch (error) {
        console.error("Erro ao descriptografar:", error);
        window.alert("Senha incorreta ou dado inválido.");
    }
}

async function decryptIndividualItem(item, password) {
    if (
        !item ||
        item.format !== "Origon58 Secure Item" ||
        item.version !== ITEM_VERSION ||
        !item.kdf ||
        !item.cipher ||
        !item.ciphertext
    ) {
        throw new Error("Formato de dado inválido.");
    }

    const salt = base64ToBytes(item.kdf.salt);
    const iv = base64ToBytes(item.cipher.iv);
    const ciphertext = base64ToBytes(item.ciphertext);

    const key = await deriveItemKey(password, salt);

    const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        ciphertext
    );

    return TEXT_DECODER.decode(plaintext);
}


/* =========================================================
   LER CONTEÚDO DESCRIPTOGRAFADO

   Itens antigos continham texto simples. Se o texto
   descriptografado não for nosso envelope, ele é exibido
   como texto antigo.
   ========================================================= */

function parseDecryptedPayload(plaintext) {
    try {
        const parsed = JSON.parse(plaintext);

        if (
            parsed &&
            parsed.marker === "Origon58Payload" &&
            parsed.version === 1
        ) {
            return parsed;
        }
    } catch (_) {
        // Texto antigo, sem envelope JSON.
    }

    return {
        marker: "Origon58Payload",
        version: 1,
        kind: "text",
        text: plaintext,
        photo: null
    };
}


/* =========================================================
   MOSTRAR TEXTO E/OU FOTO
   ========================================================= */

function showDecryptedData(item, plaintext) {
    const payload = parseDecryptedPayload(plaintext);

    const modal = document.createElement("div");
    modal.className = "modal";

    const box = document.createElement("div");
    box.className = "modal-box";

    const eyebrow = document.createElement("span");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "CONTEÚDO DESCRIPTOGRAFADO";

    const title = document.createElement("h2");
    title.textContent = item.title || "Dado";

    const content = document.createElement("div");
    content.className = "result-text";

    appendPayloadContent(content, payload);

    const close = createButton("FECHAR", "secondary-button", () => {
        if (resultPhotoUrl) {
            URL.revokeObjectURL(resultPhotoUrl);
            resultPhotoUrl = null;
        }

        modal.remove();
    });

    box.append(eyebrow, title, content, close);
    modal.appendChild(box);
    document.body.appendChild(modal);
}

function appendPayloadContent(container, payload) {
    container.replaceChildren();

    if (payload.text) {
        const text = document.createElement("p");
        text.textContent = payload.text;
        container.appendChild(text);
    }

    if (payload.photo && payload.photo.dataBase64) {
        const image = document.createElement("img");
        image.alt = payload.photo.name || "Foto descriptografada";
        image.className = "decrypted-photo";

        const bytes = base64ToBytes(payload.photo.dataBase64);
        const blob = new Blob([bytes], {
            type: payload.photo.mimeType || "image/jpeg"
        });

        if (resultPhotoUrl) {
            URL.revokeObjectURL(resultPhotoUrl);
        }

        resultPhotoUrl = URL.createObjectURL(blob);
        image.src = resultPhotoUrl;

        container.appendChild(image);

        if (payload.photo.name) {
            const name = document.createElement("p");
            name.className = "panel-description";
            name.textContent = payload.photo.name;
            container.appendChild(name);
        }
    }
}


/* =========================================================
   EXPORTAR ARQUIVO .ENC
   ========================================================= */

async function saveVaultItemAsEnc(index) {
    const item = currentVaultData[index];
    if (!item) return;

    try {
        const content = JSON.stringify(item, null, 2);

        const blob = new Blob([content], {
            type: "application/octet-stream"
        });

        const fileName = `origon58-${item.id}.enc`;

        if ("showSaveFilePicker" in window) {
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: "Arquivo criptografado Origon58",
                    accept: {
                        "application/octet-stream": [".enc"]
                    }
                }]
            });

            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();

            window.alert("Arquivo .enc salvo com sucesso! 💾");
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1500);

        window.alert("Arquivo .enc criado com sucesso! 💾");
    } catch (error) {
        if (error && error.name === "AbortError") return;

        console.error("Erro ao salvar .enc:", error);
        window.alert("Não foi possível salvar o arquivo .enc.");
    }
}


/* =========================================================
   EXCLUIR DADO
   ========================================================= */

async function deleteVaultItem(index) {
    const item = currentVaultData[index];
    if (!item) return;

    if (!window.confirm("Excluir este dado do cofre?")) return;

    const removed = currentVaultData.splice(index, 1)[0];

    try {
        await saveEncryptedVault();
        renderVault();
    } catch (error) {
        currentVaultData.splice(index, 0, removed);

        console.error("Erro ao excluir dado:", error);
        window.alert("Não foi possível atualizar o cofre.");
    }
}


/* =========================================================
   LIMPAR COFRE
   ========================================================= */

function openClearVaultModal() {
    clearVaultPassword.value = "";
    clearVaultPasswordConfirm.value = "";
    clearMessage(clearVaultMessage);
    clearVaultModal.classList.remove("hidden");
}

function closeClearVaultModal() {
    clearVaultModal.classList.add("hidden");
    clearVaultPassword.value = "";
    clearVaultPasswordConfirm.value = "";
    clearMessage(clearVaultMessage);
}

async function handleClearVault() {
    clearMessage(clearVaultMessage);

    const password = clearVaultPassword.value;
    const confirmation = clearVaultPasswordConfirm.value;

    if (!password) {
        setMessage(clearVaultMessage, "Informe uma senha.", "error");
        return;
    }

    if (password !== confirmation) {
        setMessage(clearVaultMessage, "As senhas não conferem.", "error");
        return;
    }

    const config = loadConfig();

    if (!config) {
        setMessage(clearVaultMessage, "Configuração não encontrada.", "error");
        return;
    }

    try {
        const valid = await verifyAnyAccessPassword(password, config);

        if (!valid) {
            setMessage(clearVaultMessage, "Senha de limpeza incorreta.", "error");
            return;
        }

        if (!window.confirm("Tem certeza? Todos os dados do cofre serão apagados.")) {
            return;
        }

        const previousData = currentVaultData;
        currentVaultData = [];

        try {
            await saveEncryptedVault();
        } catch (error) {
            currentVaultData = previousData;
            throw error;
        }

        closeClearVaultModal();
        renderVault();
        window.alert("Cofre limpo com sucesso.");
    } catch (error) {
        console.error("Erro ao limpar cofre:", error);
        setMessage(clearVaultMessage, "Não foi possível limpar o cofre.", "error");
    }
}

async function verifyAnyAccessPassword(password, config) {
    for (const verifier of config.passwordVerifiers) {
        if (await verifyPassword(password, verifier)) {
            return true;
        }
    }

    return false;
}


/* =========================================================
   LIMPAR TEMPORÁRIOS
   ========================================================= */

function clearTemporaryState() {
    temporaryBackupData = null;

    savedDataFile.value = "";
    savedDataPassword.value = "";

    clearSavedDataResult();
    clearMessage(decryptSavedMessage);

    window.alert("Dados temporários do backup foram excluídos.");
}

function clearSavedDataResult() {
    if (resultPhotoUrl) {
        URL.revokeObjectURL(resultPhotoUrl);
        resultPhotoUrl = null;
    }

    savedDataResultText.replaceChildren();
    savedDataResult.classList.add("hidden");
}


/* =========================================================
   ABRIR / FECHAR DESCRIPTOGRAFIA DE .ENC
   ========================================================= */

function openDecryptSavedModal() {
    savedDataFile.value = "";
    savedDataPassword.value = "";
    clearSavedDataResult();
    clearMessage(decryptSavedMessage);

    decryptSavedModal.classList.remove("hidden");
}

function closeDecryptSavedModal() {
    decryptSavedModal.classList.add("hidden");
    savedDataFile.value = "";
    savedDataPassword.value = "";
    clearSavedDataResult();
    clearMessage(decryptSavedMessage);
}


/* =========================================================
   DESCRIPTOGRAFAR ARQUIVO .ENC
   ========================================================= */

async function handleDecryptSaved() {
    clearMessage(decryptSavedMessage);

    const file = savedDataFile.files[0];
    const password = savedDataPassword.value;

    if (!file || !file.name.toLowerCase().endsWith(".enc")) {
        setMessage(decryptSavedMessage, "Selecione um arquivo .enc.", "error");
        return;
    }

    if (!password) {
        setMessage(decryptSavedMessage, "Informe a senha deste dado.", "error");
        return;
    }

    confirmDecryptSavedButton.disabled = true;

    try {
        const item = JSON.parse(await file.text());

        const plaintext = await decryptIndividualItem(item, password);
        const payload = parseDecryptedPayload(plaintext);

        clearSavedDataResult();
        appendPayloadContent(savedDataResultText, payload);

        savedDataResult.classList.remove("hidden");

        setMessage(
            decryptSavedMessage,
            "Dado descriptografado com sucesso!",
            "success"
        );
    } catch (error) {
        console.error("Erro ao descriptografar .enc:", error);

        clearSavedDataResult();

        setMessage(
            decryptSavedMessage,
            "Senha incorreta ou arquivo .enc inválido.",
            "error"
        );
    } finally {
        confirmDecryptSavedButton.disabled = false;
    }
}


/* =========================================================
   BLOQUEAR / SAIR
   ========================================================= */

function lockVault() {
    currentVaultKey = null;
    currentVaultSalt = null;
    currentVaultData = [];

    resetAddDataForm();
    closeClearVaultModal();
    closeDecryptSavedModal();

    loginForm.reset();
    hideAllScreens();
    showScreen(loginScreen);
}


/* =========================================================
   MENSAGENS
   ========================================================= */

function setMessage(element, text, type) {
    if (!element) return;

    element.textContent = text;
    element.classList.remove("success", "error");

    if (type) {
        element.classList.add(type);
    }
}

function clearMessage(element) {
    if (!element) return;

    element.textContent = "";
    element.classList.remove("success", "error");
}


/* =========================================================
   UTILITÁRIOS
   ========================================================= */

function createRandomId() {
    const bytes = crypto.getRandomValues(new Uint8Array(6));

    return Array.from(
        bytes,
        byte => byte.toString(16).padStart(2, "0")
    ).join("");
}

function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(
            ...bytes.subarray(i, Math.min(i + chunkSize, bytes.length))
        );
    }

    return btoa(binary);
}

function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

function constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;

    let result = 0;

    for (let i = 0; i < a.length; i++) {
        result |= a[i] ^ b[i];
    }

    return result === 0;
}
