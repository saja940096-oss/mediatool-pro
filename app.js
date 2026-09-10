(function(){
    'use strict';

    // ══════════════════════════════════════════════════
    // ── TAB NAVIGATION ──
    // ══════════════════════════════════════════════════
    const tabBtns = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tool-panel');
    const navLinks = document.querySelectorAll('[data-nav]');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');

    function switchPanel(name) {
        panels.forEach(p => p.classList.remove('active'));
        tabBtns.forEach(b => b.classList.remove('active'));
        const panel = document.getElementById(name);
        if (panel) panel.classList.add('active');
        tabBtns.forEach(b => { if (b.dataset.tab === name) b.classList.add('active'); });
        mobileNav.classList.remove('open');
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchPanel(btn.dataset.tab));
    });
    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            switchPanel(link.dataset.nav);
        });
    });
    mobileMenuBtn.addEventListener('click', () => mobileNav.classList.toggle('open'));
    document.addEventListener('click', e => {
        if (!mobileNav.contains(e.target) && !mobileMenuBtn.contains(e.target)) mobileNav.classList.remove('open');
    });

    // ══════════════════════════════════════════════════
    // ── VISITOR STATS & DEVICE INFO ──
    // ══════════════════════════════════════════════════
    const STORE_KEYS = {
        visitors: 'qmc_visitors',
        visited: 'qmc_visited',
        feedback: 'qmc_feedback',
        notify: 'qmc_notify_email'
    };

    function uid() {
        try { return localStorage.getItem('qmc_uid') || (localStorage.setItem('qmc_uid', Math.random().toString(36).slice(2, 12)), localStorage.getItem('qmc_uid')); }
        catch(e){ return 'anon'; }
    }

    function markVisit() {
        let count = 0;
        try { count = parseInt(localStorage.getItem(STORE_KEYS.visitors)) || 0; } catch(e){}
        if (!sessionStorage.getItem(STORE_KEYS.visited)) {
            count += 1;
            sessionStorage.setItem(STORE_KEYS.visited, '1');
            try { localStorage.setItem(STORE_KEYS.visitors, String(count)); } catch(e){}
        }
        const el = document.getElementById('visitorCount');
        if (el) {
            const base = count + 1284;
            const target = base + Math.floor(Math.random() * 47);
            let cur = base;
            const step = Math.max(1, Math.ceil((target - base) / 40));
            const timer = setInterval(() => {
                cur += step;
                if (cur >= target) { cur = target; clearInterval(timer); }
                el.textContent = cur.toLocaleString('en-US');
            }, 30);
        }
    }

    function detectBrowser() {
        const ua = navigator.userAgent;
        const browsers = [
            ['Edg', 'Microsoft Edge'], ['OPR', 'Opera'], ['Firefox', 'Firefox'],
            ['SamsungBrowser', 'Samsung Internet'], ['Chrome', 'Chrome'], ['Safari', 'Safari']
        ];
        for (const [id, label] of browsers) if (ua.indexOf(id) > -1) return label;
        return 'متصفح آخر';
    }
    function detectOS() {
        const ua = navigator.userAgent;
        if (/Windows NT/.test(ua)) return 'Windows';
        if (/Android/.test(ua)) return 'Android';
        if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
        if (/Mac OS X/.test(ua)) return 'macOS';
        if (/Linux/.test(ua)) return 'Linux';
        return 'أخرى';
    }
    function detectDevice() {
        const ua = navigator.userAgent;
        if (/iPad|Tablet/.test(ua)) return 'تابلت';
        if (/Mobi|Android/.test(ua)) return 'جوال';
        if (/Mac|Windows|Linux/.test(ua)) return 'حاسوب';
        return 'أخرى';
    }

    function initDeviceInfo() {
        const fill = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        fill('browserVal', detectBrowser());
        fill('osVal', detectOS());
        fill('deviceVal', detectDevice());
        const lang = (navigator.language || 'ar').slice(0, 2).toUpperCase();
        fill('langVal', lang === 'AR' ? 'العربية' : lang);
    }

    // ══════════════════════════════════════════════════
    // ── FEEDBACK SYSTEM (localStorage for developer) ──
    // ══════════════════════════════════════════════════
    function initFeedback() {
        const sendBtn = document.getElementById('feedbackSend');
        const textEl = document.getElementById('feedbackText');
        const typeEl = document.getElementById('feedbackType');
        const msgEl = document.getElementById('feedbackMsg');

        sendBtn.addEventListener('click', () => {
            const text = textEl.value.trim();
            if (text.length < 3) {
                msgEl.textContent = 'يرجى كتابة اقتراحك أو وصف المشكلة أولاً';
                msgEl.className = 'feedback-msg error';
                return;
            }
            const entry = {
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                type: typeEl.value,
                text: text,
                browser: detectBrowser() + ' / ' + detectOS(),
                device: detectDevice(),
                lang: navigator.language || 'ar',
                uid: uid(),
                date: new Date().toISOString()
            };
            let list = [];
            try { list = JSON.parse(localStorage.getItem(STORE_KEYS.feedback)) || []; } catch(e){}
            list.push(entry);
            try {
                localStorage.setItem(STORE_KEYS.feedback, JSON.stringify(list));
                msgEl.textContent = 'شكراً لك! تم حفظ اقتراحك، وسنراجعه لتطوير المنصة.';
                msgEl.className = 'feedback-msg success';
                textEl.value = '';
            } catch(e) {
                msgEl.textContent = 'تعذّر حفظ الاقتراح محلياً، جرّب مرة أخرى';
                msgEl.className = 'feedback-msg error';
            }
        });
    }

    // ══════════════════════════════════════════════════
    // ── NOTIFY FORM (future tools) ──
    // ══════════════════════════════════════════════════
    function initNotify() {
        const form = document.getElementById('notifyForm');
        const emailEl = document.getElementById('notifyEmail');
        const msgEl = document.getElementById('notifyMsg');
        form.addEventListener('submit', e => {
            e.preventDefault();
            const email = emailEl.value.trim();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                msgEl.textContent = 'يرجى إدخال بريد إلكتروني صحيح';
                return;
            }
            let list = [];
            try { list = JSON.parse(localStorage.getItem(STORE_KEYS.notify)) || []; } catch(err){}
            if (!list.some(x => x.email === email)) {
                list.push({ email, date: new Date().toISOString(), uid: uid() });
                try { localStorage.setItem(STORE_KEYS.notify, JSON.stringify(list)); } catch(err){}
            }
            msgEl.textContent = 'تم التسجيل! سنخبرك فور إطلاق الأدوات الصوتية.';
            emailEl.value = '';
        });
    }

    // ══════════════════════════════════════════════════
    // ── SHARED UTILITIES ──
    // ══════════════════════════════════════════════════
    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src instanceof Blob ? URL.createObjectURL(src) : src;
        });
    }
    function isHeic(file) {
        return file.type === 'image/heic' || file.type === 'image/heif' ||
               /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
    }
    async function ensureImageBlob(file) {
        if (isHeic(file) && typeof heic2any !== 'undefined') {
            const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
            return Array.isArray(blob) ? blob[0] : blob;
        }
        return file;
    }
    function imageToCanvas(img) {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        return canvas;
    }
    function canvasToBlob(canvas, type, quality) {
        return new Promise(resolve => canvas.toBlob(resolve, type, quality));
    }
    function updateProgress(barEl, textEl, pct) {
        barEl.style.width = pct + '%';
        textEl.textContent = Math.round(pct) + '%';
    }
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    function getExtension(mime) {
        return { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[mime] || '.jpg';
    }
    function baseName(filename) {
        return filename.replace(/\.[^.]+$/, '');
    }
    function setupDropZone(dropEl, inputEl, onFiles) {
        ['dragenter','dragover'].forEach(evt => {
            dropEl.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropEl.classList.add('dragover'); });
        });
        ['dragleave','drop'].forEach(evt => {
            dropEl.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropEl.classList.remove('dragover'); });
        });
        dropEl.addEventListener('drop', e => {
            const files = Array.from(e.dataTransfer.files);
            if (files.length) onFiles(files);
        });
        dropEl.addEventListener('click', e => {
            if (e.target === inputEl) return;
            inputEl.click();
        });
        inputEl.addEventListener('change', () => {
            if (inputEl.files.length) onFiles(Array.from(inputEl.files));
            inputEl.value = '';
        });
    }

    // ══════════════════════════════════════════════════
    // ── CONVERT TOOL ──
    // ══════════════════════════════════════════════════
    const convertState = { files: [] };
    setupDropZone(document.getElementById('convertDrop'), document.getElementById('convertInput'), files => {
        convertState.files = convertState.files.concat(files.slice(0, 50));
        renderConvertFiles();
    });

    function renderConvertFiles() {
        const list = document.getElementById('convertFileList');
        const opts = document.getElementById('convertOptions');
        if (!convertState.files.length) { opts.style.display = 'none'; return; }
        opts.style.display = '';
        list.innerHTML = '';
        convertState.files.forEach((f, i) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `<div class="file-item-info"><div class="file-item-name">${f.name}</div><div class="file-item-size">${formatBytes(f.size)}</div></div>
                <button class="file-item-remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>`;
            div.querySelector('.file-item-remove').addEventListener('click', e => {
                e.stopPropagation();
                convertState.files.splice(i, 1);
                renderConvertFiles();
            });
            list.appendChild(div);
        });
    }

    document.getElementById('convertClear').addEventListener('click', () => {
        convertState.files = []; renderConvertFiles();
    });

    document.getElementById('convertStart').addEventListener('click', async () => {
        if (!convertState.files.length) return;
        const btn = document.getElementById('convertStart');
        btn.disabled = true;
        const bar = document.getElementById('convertProgressBar');
        const text = document.getElementById('convertProgressText');
        const resultArea = document.getElementById('convertResult');
        document.getElementById('convertProgress').style.display = '';
        resultArea.style.display = 'none';
        resultArea.innerHTML = '';

        const targetMime = document.querySelector('input[name="convertFormat"]:checked').value;
        const quality = parseInt(document.getElementById('convertQuality').value) / 100;
        const ext = getExtension(targetMime);
        const total = convertState.files.length;

        for (let i = 0; i < total; i++) {
            try {
                updateProgress(bar, text, (i / total) * 100);
                const file = convertState.files[i];
                const blob = await ensureImageBlob(file);
                const img = await loadImage(blob);
                const canvas = imageToCanvas(img);
                const outBlob = await canvasToBlob(canvas, targetMime, quality);
                const filename = baseName(file.name) + ext;
                downloadBlob(outBlob, filename);

                resultArea.style.display = '';
                const item = document.createElement('div');
                item.className = 'result-item';
                item.innerHTML = `<div class="result-item-info"><div class="result-item-name">${filename}</div><div class="result-item-meta">${formatBytes(file.size)} → ${formatBytes(outBlob.size)}</div></div>
                    <button class="btn btn-download btn-sm">تحميل</button>`;
                item.querySelector('.btn-download').addEventListener('click', () => downloadBlob(outBlob, filename));
                resultArea.appendChild(item);
            } catch (err) {
                console.error('Convert error:', err);
            }
        }
        updateProgress(bar, text, 100);
        btn.disabled = false;
    });
    document.getElementById('convertQuality').addEventListener('input', e => {
        document.getElementById('convertQualityVal').textContent = e.target.value;
    });

    // ══════════════════════════════════════════════════
    // ── COMPRESS TOOL ──
    // ══════════════════════════════════════════════════
    const compressState = { files: [] };
    setupDropZone(document.getElementById('compressDrop'), document.getElementById('compressInput'), files => {
        compressState.files = compressState.files.concat(files.slice(0, 50));
        renderCompressFiles();
    });

    function renderCompressFiles() {
        const list = document.getElementById('compressFileList');
        const opts = document.getElementById('compressOptions');
        if (!compressState.files.length) { opts.style.display = 'none'; return; }
        opts.style.display = '';
        list.innerHTML = '';
        compressState.files.forEach((f, i) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `<div class="file-item-info"><div class="file-item-name">${f.name}</div><div class="file-item-size">${formatBytes(f.size)}</div></div>
                <button class="file-item-remove">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>`;
            div.querySelector('.file-item-remove').addEventListener('click', e => {
                e.stopPropagation();
                compressState.files.splice(i, 1);
                renderCompressFiles();
            });
            list.appendChild(div);
        });
    }

    document.getElementById('compressClear').addEventListener('click', () => {
        compressState.files = []; renderCompressFiles();
    });

    document.getElementById('compressStart').addEventListener('click', async () => {
        if (!compressState.files.length) return;
        const btn = document.getElementById('compressStart');
        btn.disabled = true;
        const bar = document.getElementById('compressProgressBar');
        const text = document.getElementById('compressProgressText');
        const resultArea = document.getElementById('compressResult');
        document.getElementById('compressProgress').style.display = '';
        resultArea.style.display = 'none';
        resultArea.innerHTML = '';

        const quality = parseInt(document.getElementById('compressQuality').value) / 100;
        const total = compressState.files.length;
        let totalSaved = 0;

        for (let i = 0; i < total; i++) {
            try {
                updateProgress(bar, text, (i / total) * 100);
                const file = compressState.files[i];
                const img = await loadImage(file);
                const canvas = imageToCanvas(img);
                const outBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
                const filename = baseName(file.name) + '.jpg';
                const saved = file.size - outBlob.size;
                totalSaved += Math.max(0, saved);

                resultArea.style.display = '';
                const pctSaved = file.size > 0 ? Math.round((saved / file.size) * 100) : 0;
                const arrow = saved >= 0 ? '↓' : '↑';
                const color = saved >= 0 ? 'var(--success)' : 'var(--danger)';
                const item = document.createElement('div');
                item.className = 'result-item';
                item.innerHTML = `<div class="result-item-info"><div class="result-item-name">${filename}</div><div class="result-item-meta">${formatBytes(file.size)} → ${formatBytes(outBlob.size)} <span style="color:${color};font-weight:700;margin-right:6px">${arrow} ${Math.abs(pctSaved)}%</span></div></div>
                    <button class="btn btn-download btn-sm">تحميل</button>`;
                item.querySelector('.btn-download').addEventListener('click', () => downloadBlob(outBlob, filename));
                resultArea.appendChild(item);
            } catch (err) {
                console.error('Compress error:', err);
            }
        }

        if (total > 1) {
            const summary = document.createElement('div');
            summary.className = 'result-item result-summary';
            summary.innerHTML = `<div class="result-item-info"><div class="result-item-name">المجموع</div><div class="result-item-meta">${total} ملفات — وفرت ${formatBytes(Math.max(0, totalSaved))} إجمالاً</div></div>`;
            resultArea.insertBefore(summary, resultArea.firstChild);
        }
        updateProgress(bar, text, 100);
        btn.disabled = false;
    });
    document.getElementById('compressQuality').addEventListener('input', e => {
        document.getElementById('compressQualityVal').textContent = e.target.value;
    });

    // ══════════════════════════════════════════════════
    // ── RESIZE TOOL ──
    // ══════════════════════════════════════════════════
    const resizeState = { img: null, file: null, mode: 'percent', w: 0, h: 0 };

    setupDropZone(document.getElementById('resizeDrop'), document.getElementById('resizeInput'), files => {
        if (files.length) loadResizeImage(files[0]);
    });

    async function loadResizeImage(file) {
        try {
            const blob = await ensureImageBlob(file);
            const img = await loadImage(blob);
            resizeState.img = img;
            resizeState.file = file;
            resizeState.w = img.naturalWidth;
            resizeState.h = img.naturalHeight;

            const canvas = document.getElementById('resizePreview');
            const ctx = canvas.getContext('2d');
            const display = imageToCanvas(img);
            const maxDim = Math.max(display.width, display.height);
            const scale = maxDim > 600 ? 600 / maxDim : 1;
            canvas.width = Math.round(display.width * scale);
            canvas.height = Math.round(display.height * scale);
            ctx.drawImage(display, 0, 0, canvas.width, canvas.height);

            document.getElementById('resizeDims').textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
            document.getElementById('resizePixelW').value = img.naturalWidth;
            document.getElementById('resizePixelH').value = img.naturalHeight;

            document.getElementById('resizeDrop').style.display = 'none';
            document.getElementById('resizeOptions').style.display = '';
        } catch (err) {
            console.error('Resize load error:', err);
        }
    }

    document.getElementById('resizeClear').addEventListener('click', () => {
        resizeState.img = null; resizeState.file = null;
        document.getElementById('resizeOptions').style.display = 'none';
        document.getElementById('resizeDrop').style.display = '';
    });

    document.querySelectorAll('.resize-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.resize-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            resizeState.mode = btn.dataset.mode;
            document.getElementById('resizePercentFields').style.display = resizeState.mode === 'percent' ? '' : 'none';
            document.getElementById('resizePixelFields').style.display = resizeState.mode === 'pixels' ? '' : 'none';
        });
    });

    const keepAspect = document.getElementById('resizeKeepAspect');
    const percentW = document.getElementById('resizePercentW');
    const percentH = document.getElementById('resizePercentH');
    const pixelW = document.getElementById('resizePixelW');
    const pixelH = document.getElementById('resizePixelH');

    percentW.addEventListener('input', () => {
        if (keepAspect.checked) percentH.value = Math.round(parseInt(percentW.value) * resizeState.h / resizeState.w);
    });
    percentH.addEventListener('input', () => {
        if (keepAspect.checked) percentW.value = Math.round(parseInt(percentH.value) * resizeState.w / resizeState.h);
    });
    pixelW.addEventListener('input', () => {
        if (keepAspect.checked) pixelH.value = Math.round(parseInt(pixelW.value) * resizeState.h / resizeState.w);
    });
    pixelH.addEventListener('input', () => {
        if (keepAspect.checked) pixelW.value = Math.round(parseInt(pixelH.value) * resizeState.w / resizeState.h);
    });

    document.getElementById('resizeStart').addEventListener('click', async () => {
        if (!resizeState.img) return;
        const btn = document.getElementById('resizeStart');
        btn.disabled = true;
        const bar = document.getElementById('resizeProgressBar');
        const text = document.getElementById('resizeProgressText');
        document.getElementById('resizeProgress').style.display = '';

        updateProgress(bar, text, 20);
        let targetW, targetH;
        if (resizeState.mode === 'percent') {
            targetW = Math.round(resizeState.w * ((parseInt(percentW.value) || 50) / 100));
            targetH = Math.round(resizeState.h * ((parseInt(percentH.value) || 50) / 100));
        } else {
            targetW = parseInt(pixelW.value) || resizeState.w;
            targetH = parseInt(pixelH.value) || resizeState.h;
        }
        targetW = Math.max(1, Math.min(targetW, 10000));
        targetH = Math.max(1, Math.min(targetH, 10000));
        updateProgress(bar, text, 50);

        const canvas = document.createElement('canvas');
        canvas.width = targetW; canvas.height = targetH;
        canvas.getContext('2d').drawImage(resizeState.img, 0, 0, targetW, targetH);
        updateProgress(bar, text, 80);

        const targetMime = document.getElementById('resizeOutput').value;
        const outBlob = await canvasToBlob(canvas, targetMime, 0.92);
        const filename = baseName(resizeState.file.name) + '_resized' + getExtension(targetMime);
        updateProgress(bar, text, 100);
        downloadBlob(outBlob, filename);
        btn.disabled = false;
    });

    // ══════════════════════════════════════════════════
    // ── INIT ──
    // ══════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', () => {
        markVisit();
        initDeviceInfo();
        initFeedback();
        initNotify();
    });
})();