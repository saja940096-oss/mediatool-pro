(function(){
    'use strict';

    // ── NAVIGATION ──
    const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
    const sections = document.querySelectorAll('.tool-section');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');

    function switchTool(toolName) {
        sections.forEach(s => s.classList.remove('active'));
        navLinks.forEach(l => l.classList.remove('active'));
        const target = document.getElementById(toolName);
        if (target) target.classList.add('active');
        navLinks.forEach(l => { if (l.dataset.tool === toolName) l.classList.add('active'); });
        mobileNav.classList.remove('open');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            switchTool(link.dataset.tool);
        });
    });

    mobileMenuBtn.addEventListener('click', () => mobileNav.classList.toggle('open'));

    document.addEventListener('click', e => {
        if (!mobileNav.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mobileNav.classList.remove('open');
        }
    });

    // ── UTILITIES ──
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
            if (src instanceof Blob) {
                img.src = URL.createObjectURL(src);
            } else {
                img.src = src;
            }
        });
    }

    function isHeic(file) {
        return file.type === 'image/heic' || file.type === 'image/heif' ||
               file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    }

    async function ensureImageBlob(file) {
        if (isHeic(file) && typeof heic2any !== 'undefined') {
            const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
            return Array.isArray(blob) ? blob[0] : blob;
        }
        return file;
    }

    function imageToCanvas(img, maxWidth, maxHeight) {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (maxWidth && w > maxWidth) { h *= maxWidth / w; w = maxWidth; }
        if (maxHeight && h > maxHeight) { w *= maxHeight / h; h = maxHeight; }
        w = Math.round(w); h = Math.round(h);
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

    function getExtension(mimeType) {
        const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
        return map[mimeType] || '.jpg';
    }

    function baseName(filename) {
        return filename.replace(/\.[^.]+$/, '');
    }

    // ── DROP ZONE BUILDER ──
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
            if (e.target === inputEl || e.target.closest('input')) return;
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

    setupDropZone(
        document.getElementById('convertDrop'),
        document.getElementById('convertInput'),
        files => {
            convertState.files = convertState.files.concat(files.slice(0, 50));
            renderConvertFiles();
        }
    );

    function renderConvertFiles() {
        const list = document.getElementById('convertFileList');
        const opts = document.getElementById('convertOptions');
        if (!convertState.files.length) { opts.style.display = 'none'; return; }
        opts.style.display = '';
        list.innerHTML = '';
        convertState.files.forEach((f, i) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `
                <div class="file-item-info">
                    <div class="file-item-name">${f.name}</div>
                    <div class="file-item-size">${formatBytes(f.size)}</div>
                </div>
                <button class="file-item-remove" data-idx="${i}">
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
        convertState.files = [];
        renderConvertFiles();
    });

    document.getElementById('convertStart').addEventListener('click', async () => {
        if (!convertState.files.length) return;
        const btn = document.getElementById('convertStart');
        btn.disabled = true;
        const progressArea = document.getElementById('convertProgress');
        const bar = document.getElementById('convertProgressBar');
        const text = document.getElementById('convertProgressText');
        const resultArea = document.getElementById('convertResult');
        progressArea.style.display = '';
        resultArea.style.display = 'none';
        resultArea.innerHTML = '';

        const targetMime = document.querySelector('input[name="convertFormat"]:checked').value;
        const quality = parseInt(document.getElementById('convertQuality').value) / 100;
        const ext = getExtension(targetMime);
        const total = convertState.files.length;

        for (let i = 0; i < total; i++) {
            try {
                updateProgress(bar, text, ((i) / total) * 100);
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
                item.innerHTML = `
                    <div class="result-item-info">
                        <div class="result-item-name">${filename}</div>
                        <div class="result-item-meta">${formatBytes(file.size)} → ${formatBytes(outBlob.size)}</div>
                    </div>
                    <button class="btn btn-download btn-sm" data-filename="${filename}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        تحميل
                    </button>`;
                item.querySelector('.btn-download').addEventListener('click', () => downloadBlob(outBlob, filename));
                resultArea.appendChild(item);
            } catch (err) {
                console.error('Convert error:', err);
            }
        }
        updateProgress(bar, text, 100);
        btn.disabled = false;
    });

    // Quality slider live update
    document.getElementById('convertQuality').addEventListener('input', e => {
        document.getElementById('convertQualityVal').textContent = e.target.value;
    });

    // ══════════════════════════════════════════════════
    // ── COMPRESS TOOL ──
    // ══════════════════════════════════════════════════
    const compressState = { files: [] };

    setupDropZone(
        document.getElementById('compressDrop'),
        document.getElementById('compressInput'),
        files => {
            compressState.files = compressState.files.concat(files.slice(0, 50));
            renderCompressFiles();
        }
    );

    function renderCompressFiles() {
        const list = document.getElementById('compressFileList');
        const opts = document.getElementById('compressOptions');
        if (!compressState.files.length) { opts.style.display = 'none'; return; }
        opts.style.display = '';
        list.innerHTML = '';
        compressState.files.forEach((f, i) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerHTML = `
                <div class="file-item-info">
                    <div class="file-item-name">${f.name}</div>
                    <div class="file-item-size">${formatBytes(f.size)}</div>
                </div>
                <button class="file-item-remove" data-idx="${i}">
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
        compressState.files = [];
        renderCompressFiles();
    });

    document.getElementById('compressStart').addEventListener('click', async () => {
        if (!compressState.files.length) return;
        const btn = document.getElementById('compressStart');
        btn.disabled = true;
        const progressArea = document.getElementById('compressProgress');
        const bar = document.getElementById('compressProgressBar');
        const text = document.getElementById('compressProgressText');
        const resultArea = document.getElementById('compressResult');
        progressArea.style.display = '';
        resultArea.style.display = 'none';
        resultArea.innerHTML = '';

        const quality = parseInt(document.getElementById('compressQuality').value) / 100;
        const total = compressState.files.length;
        let totalSaved = 0;

        for (let i = 0; i < total; i++) {
            try {
                updateProgress(bar, text, ((i) / total) * 100);
                const file = compressState.files[i];
                const img = await loadImage(file);
                const canvas = imageToCanvas(img);
                const outBlob = await canvasToBlob(canvas, 'image/jpeg', quality);
                const filename = baseName(file.name) + '.jpg';
                const saved = file.size - outBlob.size;
                totalSaved += Math.max(0, saved);

                resultArea.style.display = '';
                const item = document.createElement('div');
                item.className = 'result-item';
                const pctSaved = file.size > 0 ? Math.round((saved / file.size) * 100) : 0;
                const arrow = saved > 0 ? '↓' : '↑';
                const color = saved > 0 ? 'var(--accent)' : 'var(--danger)';
                item.innerHTML = `
                    <div class="result-item-info">
                        <div class="result-item-name">${filename}</div>
                        <div class="result-item-meta">
                            ${formatBytes(file.size)} → ${formatBytes(outBlob.size)}
                            <span style="color:${color};font-weight:600;margin-right:6px">${arrow} ${Math.abs(pctSaved)}%</span>
                        </div>
                    </div>
                    <button class="btn btn-download btn-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        تحميل
                    </button>`;
                item.querySelector('.btn-download').addEventListener('click', () => downloadBlob(outBlob, filename));
                resultArea.appendChild(item);
            } catch (err) {
                console.error('Compress error:', err);
            }
        }

        if (total > 1) {
            const summary = document.createElement('div');
            summary.className = 'result-item';
            summary.style.background = 'var(--primary-light)';
            summary.style.borderColor = '#c7d2fe';
            summary.innerHTML = `
                <div class="result-item-info">
                    <div class="result-item-name">الملخص</div>
                    <div class="result-item-meta">${total} ملفات — تم توفير ${formatBytes(Math.max(0, totalSaved))} إجمالاً</div>
                </div>`;
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
    const resizeState = { img: null, file: null, mode: 'percent', originalW: 0, originalH: 0 };

    setupDropZone(
        document.getElementById('resizeDrop'),
        document.getElementById('resizeInput'),
        files => {
            if (files.length) loadResizeImage(files[0]);
        }
    );

    async function loadResizeImage(file) {
        try {
            const blob = await ensureImageBlob(file);
            const img = await loadImage(blob);
            resizeState.img = img;
            resizeState.file = file;
            resizeState.originalW = img.naturalWidth;
            resizeState.originalH = img.naturalHeight;

            const canvas = document.getElementById('resizePreview');
            const ctx = canvas.getContext('2d');
            const display = imageToCanvas(img, 500, 300);
            canvas.width = display.width;
            canvas.height = display.height;
            ctx.drawImage(display, 0, 0);

            document.getElementById('resizeDims').textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
            document.getElementById('resizePixelW').value = img.naturalWidth;
            document.getElementById('resizePixelH').value = img.naturalHeight;
            document.getElementById('resizePercentW').value = 50;
            document.getElementById('resizePercentH').value = 50;

            document.getElementById('resizeDrop').style.display = 'none';
            document.getElementById('resizeOptions').style.display = '';
        } catch (err) {
            console.error('Resize load error:', err);
        }
    }

    document.getElementById('resizeClear').addEventListener('click', () => {
        resizeState.img = null;
        resizeState.file = null;
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
        if (keepAspect.checked) {
            const ratio = resizeState.originalH / resizeState.originalW;
            percentH.value = Math.round(parseInt(percentW.value) * ratio);
        }
    });
    percentH.addEventListener('input', () => {
        if (keepAspect.checked) {
            const ratio = resizeState.originalW / resizeState.originalH;
            percentW.value = Math.round(parseInt(percentH.value) * ratio);
        }
    });
    pixelW.addEventListener('input', () => {
        if (keepAspect.checked) {
            const ratio = resizeState.originalH / resizeState.originalW;
            pixelH.value = Math.round(parseInt(pixelW.value) * ratio);
        }
    });
    pixelH.addEventListener('input', () => {
        if (keepAspect.checked) {
            const ratio = resizeState.originalW / resizeState.originalH;
            pixelW.value = Math.round(parseInt(pixelH.value) * ratio);
        }
    });

    document.getElementById('resizeStart').addEventListener('click', async () => {
        if (!resizeState.img) return;
        const btn = document.getElementById('resizeStart');
        btn.disabled = true;
        const progressArea = document.getElementById('resizeProgress');
        const bar = document.getElementById('resizeProgressBar');
        const text = document.getElementById('resizeProgressText');
        progressArea.style.display = '';

        updateProgress(bar, text, 20);

        let targetW, targetH;
        if (resizeState.mode === 'percent') {
            const pw = parseInt(percentW.value) || 50;
            const ph = parseInt(percentH.value) || 50;
            targetW = Math.round(resizeState.originalW * pw / 100);
            targetH = Math.round(resizeState.originalH * ph / 100);
        } else {
            targetW = parseInt(pixelW.value) || resizeState.originalW;
            targetH = parseInt(pixelH.value) || resizeState.originalH;
        }

        targetW = Math.max(1, Math.min(targetW, 10000));
        targetH = Math.max(1, Math.min(targetH, 10000));

        updateProgress(bar, text, 50);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.getContext('2d').drawImage(resizeState.img, 0, 0, targetW, targetH);

        updateProgress(bar, text, 80);

        const targetMime = document.getElementById('resizeOutput').value;
        const ext = getExtension(targetMime);
        const outBlob = await canvasToBlob(canvas, targetMime, 0.92);
        const filename = baseName(resizeState.file.name) + '_resized' + ext;

        updateProgress(bar, text, 100);
        downloadBlob(outBlob, filename);
        btn.disabled = false;
    });

    // ══════════════════════════════════════════════════
    // ── CROP TOOL ──
    // ══════════════════════════════════════════════════
    const cropState = {
        img: null, file: null,
        canvasW: 0, canvasH: 0,
        imgW: 0, imgH: 0,
        scale: 1,
        box: { x: 0, y: 0, w: 0, h: 0 },
        dragging: null,
        dragStart: { x: 0, y: 0 },
        boxStart: { x: 0, y: 0, w: 0, h: 0 },
        ratio: null
    };

    setupDropZone(
        document.getElementById('cropDrop'),
        document.getElementById('cropInput'),
        files => {
            if (files.length) loadCropImage(files[0]);
        }
    );

    async function loadCropImage(file) {
        try {
            const blob = await ensureImageBlob(file);
            const img = await loadImage(blob);
            cropState.img = img;
            cropState.file = file;
            cropState.imgW = img.naturalWidth;
            cropState.imgH = img.naturalHeight;

            const maxDisplay = 600;
            let dw = img.naturalWidth;
            let dh = img.naturalHeight;
            if (dw > maxDisplay) { dh *= maxDisplay / dw; dw = maxDisplay; }
            cropState.canvasW = Math.round(dw);
            cropState.canvasH = Math.round(dh);
            cropState.scale = img.naturalWidth / dw;

            const canvas = document.getElementById('cropCanvas');
            canvas.width = cropState.canvasW;
            canvas.height = cropState.canvasH;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, cropState.canvasW, cropState.canvasH);

            // Default box: 80% centered
            const bw = Math.round(dw * 0.8);
            const bh = Math.round(dh * 0.8);
            cropState.box = { x: Math.round((dw - bw) / 2), y: Math.round((dh - bh) / 2), w: bw, h: bh };
            cropState.ratio = null;

            const wrap = canvas.parentElement;
            const cropBox = document.getElementById('cropBox');
            cropBox.style.left = cropState.box.x + 'px';
            cropBox.style.top = cropState.box.y + 'px';
            cropBox.style.width = cropState.box.w + 'px';
            cropBox.style.height = cropState.box.h + 'px';
            cropBox.classList.add('active');

            updateCropInfo();
            document.getElementById('cropDrop').style.display = 'none';
            document.getElementById('cropOptions').style.display = '';

            document.querySelectorAll('.crop-preset').forEach(p => p.classList.remove('active'));
            document.querySelector('.crop-preset[data-ratio="free"]').classList.add('active');
        } catch (err) {
            console.error('Crop load error:', err);
        }
    }

    function updateCropInfo() {
        const rw = Math.round(cropState.box.w * cropState.scale);
        const rh = Math.round(cropState.box.h * cropState.scale);
        document.getElementById('cropInfo').textContent = `${rw} × ${rh}`;
    }

    document.getElementById('cropClear').addEventListener('click', () => {
        cropState.img = null;
        cropState.file = null;
        document.getElementById('cropOptions').style.display = 'none';
        document.getElementById('cropDrop').style.display = '';
    });

    document.querySelectorAll('.crop-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.crop-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const ratio = btn.dataset.ratio;
            if (ratio === 'free') {
                cropState.ratio = null;
            } else {
                const [rw, rh] = ratio.split(':').map(Number);
                cropState.ratio = rw / rh;
                // Adjust box to fit ratio
                const { x, y, w, h } = cropState.box;
                let newW = w;
                let newH = w / cropState.ratio;
                if (newH > cropState.canvasH - y) {
                    newH = cropState.canvasH - y;
                    newW = newH * cropState.ratio;
                }
                if (newW > cropState.canvasW - x) {
                    newW = cropState.canvasW - x;
                    newH = newW / cropState.ratio;
                }
                cropState.box.w = Math.round(newW);
                cropState.box.h = Math.round(newH);
                applyCropBox();
            }
        });
    });

    function applyCropBox() {
        const cropBox = document.getElementById('cropBox');
        cropBox.style.left = cropState.box.x + 'px';
        cropBox.style.top = cropState.box.y + 'px';
        cropBox.style.width = cropState.box.w + 'px';
        cropBox.style.height = cropState.box.h + 'px';
        updateCropInfo();
    }

    // Crop drag & resize
    const cropBox = document.getElementById('cropBox');
    const cropCanvasWrap = document.querySelector('.crop-canvas-wrap');

    cropBox.addEventListener('mousedown', startCropDrag);
    cropBox.addEventListener('touchstart', e => { e.preventDefault(); startCropDrag(touchToMouse(e)); }, { passive: false });

    function touchToMouse(e) {
        const t = e.touches[0];
        return { clientX: t.clientX, clientY: t.clientY, target: e.target };
    }

    function startCropDrag(e) {
        e.preventDefault();
        e.stopPropagation();
        const handle = e.target.dataset.handle;
        const rect = cropCanvasWrap.getBoundingClientRect();
        cropState.dragging = { x: e.clientX, y: e.clientY };
        cropState.boxStart = { ...cropState.box };

        if (handle) {
            cropState.dragging = handle;
        } else {
            cropState.dragging = 'move';
        }

        document.addEventListener('mousemove', doCropDrag);
        document.addEventListener('mouseup', stopCropDrag);
        document.addEventListener('touchmove', e => doCropDrag(touchToMouse(e)), { passive: false });
        document.addEventListener('touchend', stopCropDrag);
    }

    function doCropDrag(e) {
        const rect = cropCanvasWrap.getBoundingClientRect();
        const dx = (e.clientX - cropState.dragStart.x);
        const dy = (e.clientY - cropState.dragStart.y);
        const b = cropState.boxStart;
        const handle = cropState.dragging;

        let newX = b.x, newY = b.y, newW = b.w, newH = b.h;

        if (handle === 'move') {
            newX = Math.max(0, Math.min(b.x + dx, cropState.canvasW - b.w));
            newY = Math.max(0, Math.min(b.y + dy, cropState.canvasH - b.h));
            cropState.box = { x: newX, y: newY, w: b.w, h: b.h };
        } else {
            if (handle.includes('e')) newW = Math.max(30, Math.min(b.w + dx, cropState.canvasW - b.x));
            if (handle.includes('w')) { newW = Math.max(30, b.w - dx); newX = b.x + (b.w - newW); }
            if (handle.includes('s')) newH = Math.max(30, Math.min(b.h + dy, cropState.canvasH - b.y));
            if (handle.includes('n')) { newH = Math.max(30, b.h - dy); newY = b.y + (b.h - newH); }

            if (cropState.ratio) {
                if (handle === 'e' || handle === 'w') {
                    newH = newW / cropState.ratio;
                } else {
                    newW = newH * cropState.ratio;
                }
            }

            newX = Math.max(0, newX);
            newY = Math.max(0, newY);
            newW = Math.min(newW, cropState.canvasW - newX);
            newH = Math.min(newH, cropState.canvasH - newY);

            cropState.box = { x: Math.round(newX), y: Math.round(newY), w: Math.round(newW), h: Math.round(newH) };
        }
        applyCropBox();
    }

    function stopCropDrag() {
        document.removeEventListener('mousemove', doCropDrag);
        document.removeEventListener('mouseup', stopCropDrag);
        document.removeEventListener('touchmove', doCropDrag);
        document.removeEventListener('touchend', stopCropDrag);
    }

    document.getElementById('cropStart').addEventListener('click', async () => {
        if (!cropState.img) return;
        const btn = document.getElementById('cropStart');
        btn.disabled = true;
        const progressArea = document.getElementById('cropProgress');
        const bar = document.getElementById('cropProgressBar');
        const text = document.getElementById('cropProgressText');
        progressArea.style.display = '';

        updateProgress(bar, text, 30);

        const s = cropState.scale;
        const sx = cropState.box.x * s;
        const sy = cropState.box.y * s;
        const sw = cropState.box.w * s;
        const sh = cropState.box.h * s;

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(sw);
        canvas.height = Math.round(sh);
        canvas.getContext('2d').drawImage(cropState.img, sx, sy, sw, sh, 0, 0, Math.round(sw), Math.round(sh));

        updateProgress(bar, text, 70);

        const targetMime = document.getElementById('cropOutput').value;
        const ext = getExtension(targetMime);
        const outBlob = await canvasToBlob(canvas, targetMime, 0.92);
        const filename = baseName(cropState.file.name) + '_cropped' + ext;

        updateProgress(bar, text, 100);
        downloadBlob(outBlob, filename);
        btn.disabled = false;
    });

})();
