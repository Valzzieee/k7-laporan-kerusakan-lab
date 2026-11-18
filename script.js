(function () {
    'use strict';

    var K = window.KIK;
    var page = document.body.getAttribute('data-page');
    var params = new URLSearchParams(window.location.search);

    function $(sel, root) { return (root || document).querySelector(sel); }
    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html != null) e.innerHTML = html;
        return e;
    }

    var ICON = {
        pc: '<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="10" width="38" height="26" rx="3.5"/><path d="M23 36v9M13 46h20"/><rect x="42" y="18" width="16" height="34" rx="3.5"/><rect x="46.5" y="23" width="7" height="7" rx="1.5"/><path d="M50 43h.01"/></svg>',
        chevron: '<svg class="lab-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
        wrench: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6.5a4 4 0 0 0 4.9 4.9L9 21.8a2.4 2.4 0 0 1-3.4-3.4L16 8a4 4 0 0 1-1.5-1.5z"/></svg>',
        cross: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
    };


    /* ===== AUTENTIKASI SIMULASI =====
       Akun demo: adminlab/admin123 dan pelapor/pelapor123.
       Ini hanya simulasi front-end, bukan keamanan produksi. */
    function currentUser() {
        try { return JSON.parse(sessionStorage.getItem('kik_user') || 'null'); }
        catch (e) { return null; }
    }
    function requireLogin() {
        var user = currentUser();
        if (!user && page !== 'login') {
            window.location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search));
            return false;
        }
        if (page === 'admin' && user && user.role !== 'admin') {
            window.location.replace('index.html');
            return false;
        }
        if (page === 'form' && user && user.role !== 'pelapor' && user.role !== 'admin') {
            window.location.replace('index.html');
            return false;
        }
        return true;
    }
    function addAccountNav() {
        var user = currentUser();
        var nav = $('.nav');
        if (!nav || !user) return;
        var logout = el('button', 'nav-logout', 'Keluar');
        logout.type = 'button';
        logout.addEventListener('click', function () {
            sessionStorage.removeItem('kik_user');
            window.location.href = 'login.html';
        });
        if (user.role === 'admin' && !nav.querySelector('[href="admin.html"]')) {
            var a = el('a', '', 'Dashboard');
            a.href = 'admin.html';
            nav.appendChild(a);
        }
        nav.appendChild(logout);
    }

    function initLogin() {
        var form = $('#loginForm');
        var usernameInput = $('#username');
        var passwordInput = $('#password');
        var error = $('#loginError');
        function showLoginError(message) {
            error.textContent = message;
            error.hidden = false;
            error.classList.add('show');
        }
        function clearLoginError() {
            error.textContent = '';
            error.hidden = true;
            error.classList.remove('show');
        }
        if (currentUser()) {
            var existing = currentUser();
            location.replace(existing.role === 'admin' ? 'admin.html' : 'index.html');
            return;
        }
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var username = usernameInput.value.trim().toLowerCase();
            var password = passwordInput.value;
            clearLoginError();
            usernameInput.removeAttribute('aria-invalid');
            passwordInput.removeAttribute('aria-invalid');

            if (!username) {
                usernameInput.setAttribute('aria-invalid', 'true');
                showLoginError('Nama pengguna wajib diisi.');
                usernameInput.focus();
                return;
            }
            if (!password) {
                passwordInput.setAttribute('aria-invalid', 'true');
                showLoginError('Kata sandi wajib diisi.');
                passwordInput.focus();
                return;
            }
            var accounts = {
                adminlab: { password: 'admin123', role: 'admin', nama: 'Administrator Lab' },
                pelapor: { password: 'pelapor123', role: 'pelapor', nama: 'Pengguna Lab' }
            };
            var account = accounts[username];
            if (!account || account.password !== password) {
                usernameInput.setAttribute('aria-invalid', 'true');
                passwordInput.setAttribute('aria-invalid', 'true');
                showLoginError('Nama pengguna atau kata sandi tidak sesuai.');
                return;
            }
            sessionStorage.setItem('kik_user', JSON.stringify({
                username: username, role: account.role, nama: account.nama
            }));
            var next = new URLSearchParams(location.search).get('next');
            if (account.role === 'admin') location.href = 'admin.html';
            else location.href = next && !next.includes('admin.html') ? next : 'index.html';
        });
        usernameInput.addEventListener('input', clearLoginError);
        passwordInput.addEventListener('input', clearLoginError);
    }

    function initAdmin() {
        var user = currentUser();
        if (!user || user.role !== 'admin') return;
        var labSelect = $('#adminLab');
        for (var l = 1; l <= K.LAB_COUNT; l++) {
            var option = document.createElement('option');
            option.value = l; option.textContent = 'Lab ' + l; labSelect.appendChild(option);
        }
        function renderComputers() {
            var lab = Number(labSelect.value);
            var grid = $('#adminComputers');
            grid.innerHTML = '';
            for (var n = 1; n <= K.PC_PER_LAB; n++) {
                var pc = K.getPc(lab, n);
                var item = el('article', 'admin-pc');
                item.innerHTML = '<strong>Komputer ' + n + '</strong><span class="admin-status status-' + pc.status + '">' + pc.label + '</span><button type="button" class="btn btn-ghost">Ubah kondisi</button>';
                item.querySelector('button').addEventListener('click', function (number) {
                    return function () { editComputer(lab, number); };
                }(n));
                grid.appendChild(item);
            }
            var sum = K.labSummary(lab);
            $('#adminLabSummary').textContent = sum.baik + ' baik · ' + sum.diperbaiki + ' diperbaiki · ' + sum.rusak + ' rusak';
        }
        function editComputer(lab, number) {
            var pc = K.getPc(lab, number);
            var status = prompt('Status komputer (baik / diperbaiki / rusak):', pc.status);
            if (status === null) return;
            status = status.trim().toLowerCase();
            if (!['baik', 'diperbaiki', 'rusak'].includes(status)) {
                alert('Status harus baik, diperbaiki, atau rusak.'); return;
            }
            var note = prompt('Keterangan tambahan komputer (opsional):', '') || '';
            K.setPc(lab, number, status, note);
            renderComputers();
        }
        function renderReports() {
            var reports = K.getReports();
            var body = $('#adminReports');
            body.innerHTML = '';
            if (!reports.length) {
                body.innerHTML = '<tr><td colspan="6">Belum ada laporan yang masuk.</td></tr>';
                return;
            }
            reports.slice().reverse().forEach(function (r) {
                var tr = document.createElement('tr');
                var values = [r.id, r.nama + ' (' + r.kelas + ')', r.lab + ' / Komputer ' + r.nomorKomputer, r.kerusakan, r.statusLaporan || 'Menunggu'];
                values.forEach(function (v) {
                    var td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
                });
                var td = document.createElement('td');
                var select = document.createElement('select');
                ['Menunggu', 'Diproses', 'Selesai', 'Ditolak'].forEach(function (v) {
                    var op = document.createElement('option'); op.value = v; op.textContent = v; select.appendChild(op);
                });
                select.value = r.statusLaporan || 'Menunggu';
                select.addEventListener('change', function () { K.updateReport(r.id, select.value); });
                td.appendChild(select); tr.appendChild(td); body.appendChild(tr);
            });
        }
        labSelect.addEventListener('change', renderComputers);
        renderComputers();
        renderReports();
    }

    function pct(n, total) { return (n / total * 100).toFixed(2) + '%'; }

    function bar(s) {
        return '<span class="baik" style="width:' + pct(s.baik, s.total) + '"></span>' +
               '<span class="diperbaiki" style="width:' + pct(s.diperbaiki, s.total) + '"></span>' +
               '<span class="rusak" style="width:' + pct(s.rusak, s.total) + '"></span>';
    }

    function summaryText(s) {
        return s.baik + ' komputer baik, ' + s.diperbaiki + ' sedang diperbaiki, ' + s.rusak + ' rusak';
    }

    /* ==================================================================
       BERANDA
       ================================================================== */
    function initHome() {
        var loader = $('#loading-screen');
        var seen = false;
        try { seen = sessionStorage.getItem('kik_seen') === '1'; } catch (e) {}

        function hideLoader(delay) {
            if (!loader) return;
            setTimeout(function () {
                loader.classList.add('hidden');
                setTimeout(function () { loader.style.display = 'none'; }, 520);
            }, delay);
        }
        if (seen) {
            if (loader) loader.style.display = 'none';
        } else {
            try { sessionStorage.setItem('kik_seen', '1'); } catch (e) {}
            if (document.readyState === 'complete') hideLoader(600);
            else window.addEventListener('load', function () { hideLoader(600); });
        }

        var t = K.totalSummary();
        $('#summaryBar').innerHTML = bar(t);
        $('#summaryBar').setAttribute('aria-label', 'Dari ' + t.total + ' komputer: ' + summaryText(t));
        $('#summaryLegend').innerHTML =
            '<li><span class="swatch baik"></span><strong>' + t.baik + '</strong> baik</li>' +
            '<li><span class="swatch diperbaiki"></span><strong>' + t.diperbaiki + '</strong> sedang diperbaiki</li>' +
            '<li><span class="swatch rusak"></span><strong>' + t.rusak + '</strong> rusak</li>';
    }

    /* ==================================================================
       DAFTAR LAB
       ================================================================== */
    function initList() {
        var ul = $('#labList');
        for (var l = 1; l <= K.LAB_COUNT; l++) {
            var s = K.labSummary(l);
            var flags = '';
            if (s.rusak) flags += '<span class="flag rusak"><i></i>' + s.rusak + ' rusak</span>';
            if (s.diperbaiki) flags += '<span class="flag diperbaiki"><i></i>' + s.diperbaiki + ' diperbaiki</span>';
            if (!flags) flags = '<span class="flag baik"><i></i>Semua baik</span>';

            var li = el('li');
            li.innerHTML =
                '<a class="lab-row" href="lab.html?lab=' + l + '" aria-label="Lab ' + l + ': ' + summaryText(s) + '">' +
                    '<span class="lab-ico">' + ICON.pc + '</span>' +
                    '<span class="lab-name">Lab ' + l + '</span>' +
                    '<span class="lab-meta"><span class="bar" aria-hidden="true">' + bar(s) + '</span>' +
                    '<span class="lab-flags" aria-hidden="true">' + flags + '</span></span>' +
                    ICON.chevron +
                '</a>';
            ul.appendChild(li);
        }
    }

    /* ==================================================================
       HALAMAN LAB (denah + pop up)
       ================================================================== */
    function initLab() {
        var lab = parseInt(params.get('lab'), 10);
        if (!(lab >= 1 && lab <= K.LAB_COUNT)) { window.location.replace('list.html'); return; }

        document.title = 'Lab ' + lab + ' | SMK Brantas Karangkates';
        $('#labTitle').textContent = 'Lab ' + lab;

        var s = K.labSummary(lab);
        $('#labCount').textContent = K.PC_PER_LAB + ' komputer';

        /* --- filter / legenda --- */
        var filters = $('#filters');
        filters.appendChild(el('div', 'filters-title', 'Arti warna (klik untuk menyorot)'));
        var active = null;
        var defs = [
            ['baik', 'Baik'],
            ['diperbaiki', 'Sedang diperbaiki'],
            ['rusak', 'Rusak']
        ];
        var filterBtns = {};
        defs.forEach(function (d) {
            var b = el('button', 'filter',
                '<span class="swatch ' + d[0] + '"></span>' +
                '<span class="f-label">' + d[1] + '</span>' +
                '<span class="f-num">' + s[d[0]] + '</span>');
            b.type = 'button';
            b.setAttribute('aria-pressed', 'false');
            b.addEventListener('click', function () {
                active = (active === d[0]) ? null : d[0];
                applyFilter();
            });
            filterBtns[d[0]] = b;
            filters.appendChild(b);
        });

        function applyFilter() {
            Object.keys(filterBtns).forEach(function (k) {
                filterBtns[k].setAttribute('aria-pressed', String(active === k));
            });
            var seats = document.querySelectorAll('.seat');
            for (var i = 0; i < seats.length; i++) {
                var dim = active && seats[i].getAttribute('data-status') !== active;
                seats[i].classList.toggle('dim', !!dim);
            }
        }

        /* --- pindah antar lab --- */
        var sw = $('#labSwitch');
        function labLink(target, text, prev) {
            var a = el('a', 'btn btn-ghost');
            if (target >= 1 && target <= K.LAB_COUNT) a.href = 'lab.html?lab=' + target;
            else a.setAttribute('aria-disabled', 'true');
            a.textContent = text;
            return a;
        }
        sw.appendChild(labLink(lab - 1, 'Lab ' + (lab - 1)));
        sw.appendChild(labLink(lab + 1, 'Lab ' + (lab + 1)));
        if (lab === 1) sw.firstChild.textContent = 'Lab sebelumnya';
        if (lab === K.LAB_COUNT) sw.lastChild.textContent = 'Lab berikutnya';
        sw.firstChild.insertAdjacentHTML('afterbegin', '←&nbsp;');
        sw.lastChild.insertAdjacentHTML('beforeend', '&nbsp;→');

        /* --- denah: 3 blok sesuai rancangan --- */
        var plan = $('#plan');
        function block(cols, numbers) {
            var b = el('div', 'block');
            b.style.setProperty('--cols', cols);
            numbers.forEach(function (n) { b.appendChild(seat(n)); });
            return b;
        }
        var A = [], B = [], C = [], i;
        for (i = 1; i <= 8; i++) { A.push(i, 17 - i); }          // 1|16, 2|15 ... 8|9
        for (i = 1; i <= 8; i++) { B.push(16 + i, 24 + i); }     // 17|25 ... 24|32
        for (i = 1; i <= 8; i++) { C.push(32 + i); }             // 33 ... 40
        plan.appendChild(block(2, A));
        plan.appendChild(block(2, B));
        plan.appendChild(block(1, C));

        var order = 0;
        function seat(n) {
            var pc = K.getPc(lab, n);
            var b = el('button', 'seat');
            b.type = 'button';
            b.setAttribute('data-n', n);
            b.setAttribute('data-status', pc.status);
            b.setAttribute('aria-haspopup', 'dialog');
            b.setAttribute('aria-label', 'Komputer ' + n + ', ' + pc.label.toLowerCase());
            b.style.setProperty('--i', order++);
            b.innerHTML = '<span>' + n + '</span>' +
                (pc.status === 'diperbaiki' ? '<span class="seat-mark">' + ICON.wrench + '</span>' : '') +
                (pc.status === 'rusak' ? '<span class="seat-mark">' + ICON.cross + '</span>' : '');
            return b;
        }

        /* --- pop up --- */
        var dlg = $('#pcDialog');
        var card = $('#pcCard');
        var current = 1;

        function fill(n) {
            current = n;
            var pc = K.getPc(lab, n);
            card.setAttribute('data-status', pc.status);
            $('#pcTitle').textContent = 'Komputer ' + n;
            $('#pcLab').textContent = 'Lab ' + lab;
            $('#pcStatus').textContent = pc.label;
            $('#pcNote').textContent = pc.note;
            $('#pcPrev').disabled = n <= 1;
            $('#pcNext').disabled = n >= K.PC_PER_LAB;
            $('#pcReport').href = 'form.html?lab=' + lab + '&pc=' + n;
        }

        plan.addEventListener('click', function (e) {
            var b = e.target.closest('.seat');
            if (!b) return;
            fill(parseInt(b.getAttribute('data-n'), 10));
            if (typeof dlg.showModal === 'function') dlg.showModal();
            else dlg.setAttribute('open', '');
        });

        $('#pcClose').addEventListener('click', function () { dlg.close(); });
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        $('#pcPrev').addEventListener('click', function () { if (current > 1) fill(current - 1); });
        $('#pcNext').addEventListener('click', function () { if (current < K.PC_PER_LAB) fill(current + 1); });
        dlg.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowLeft' && current > 1) fill(current - 1);
            if (e.key === 'ArrowRight' && current < K.PC_PER_LAB) fill(current + 1);
        });
    }

    /* ==================================================================
       FORM LAPORAN
       ================================================================== */
    function initForm() {
        var form = $('#laporanForm');
        var main = $('#main-content');
        var success = $('#success-page');
        var selLab = $('#lab');
        var inPc = $('#nomorKomputer');
        var hint = $('#pcHint');
        var errBox = $('#formError');
        var btn = $('#btnSubmit');

        for (var l = 1; l <= K.LAB_COUNT; l++) {
            var o = document.createElement('option');
            o.value = 'Lab ' + l;
            o.textContent = 'Lab ' + l;
            selLab.appendChild(o);
        }

        /* isi otomatis dari pop up: form.html?lab=3&pc=12 */
        var pLab = parseInt(params.get('lab'), 10);
        var pPc = parseInt(params.get('pc'), 10);
        if (pLab >= 1 && pLab <= K.LAB_COUNT) selLab.value = 'Lab ' + pLab;
        if (pPc >= 1 && pPc <= K.PC_PER_LAB) inPc.value = pPc;

        function updateHint() {
            var labNo = parseInt(selLab.value.replace('Lab ', ''), 10);
            var pc = parseInt(inPc.value, 10);
            if (!(labNo >= 1) || !(pc >= 1 && pc <= K.PC_PER_LAB)) { hint.classList.remove('show'); return; }
            var info = K.getPc(labNo, pc);
            hint.setAttribute('data-status', info.status);
            hint.lastChild.textContent = 'Komputer ' + pc + ' di Lab ' + labNo + ' saat ini tercatat: ' + info.label.toLowerCase() + '.';
            hint.classList.add('show');
        }
        selLab.addEventListener('change', updateHint);
        inPc.addEventListener('input', updateHint);
        updateHint();

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            errBox.classList.remove('show');

            var data = {};
            new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
            data.id = 'LK-' + Date.now().toString(36).toUpperCase().slice(-6);
            data.waktu = new Date().toISOString();
            data.statusLaporan = 'Menunggu';

            btn.disabled = true;
            btn.textContent = 'Mengirim...';

            var send = Promise.resolve();
            if (K.FORM_ENDPOINT) {
                send = fetch(K.FORM_ENDPOINT, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(data)
                });
            }

            send.then(function () {
                try {
                    var all = JSON.parse(localStorage.getItem('kik_laporan') || '[]');
                    all.push(data);
                    localStorage.setItem('kik_laporan', JSON.stringify(all));
                } catch (err) {}
                showSuccess(data);
            }).catch(function () {
                errBox.textContent = 'Laporan belum terkirim. Periksa koneksi internet, lalu coba kirim lagi.';
                errBox.classList.add('show');
            }).then(function () {
                btn.disabled = false;
                btn.textContent = 'Kirim laporan';
            });
        });

        function showSuccess(d) {
            var r = $('#receipt');
            r.innerHTML = '';
            [['Nomor laporan', d.id], ['Lokasi', d.lab + ', komputer ' + d.nomorKomputer], ['Kondisi', d.kondisi], ['Pelapor', d.nama + ' (' + d.kelas + ')']]
                .forEach(function (row) {
                    var div = el('div');
                    div.appendChild(el('dt')).textContent = row[0];
                    div.appendChild(el('dd')).textContent = row[1];
                    r.appendChild(div);
                });
            main.hidden = true;
            success.hidden = false;
            form.reset();
            updateHint();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            $('#successCard').focus({ preventScroll: true });
        }

        $('#btnKembali').addEventListener('click', function (e) {
            e.preventDefault();
            success.hidden = true;
            main.hidden = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (page === 'login') initLogin();
    else if (requireLogin()) {
        addAccountNav();
        if (page === 'home') initHome();
        else if (page === 'list') initList();
        else if (page === 'lab') initLab();
        else if (page === 'form') initForm();
        else if (page === 'admin') initAdmin();
    }
})();
