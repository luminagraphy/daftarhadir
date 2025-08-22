document.addEventListener('DOMContentLoaded', function() {
    // GANTI URL_WEB_APP_ANDA dengan URL yang Anda dapatkan dari Google Apps Script
    const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbxddIBtM1wmY71BON8Qv5zrkOLNmI0_FhhZiHnD_b1CImIZlzejjD8iE5hFZvM1_ho8/exec';

    const canvas = document.getElementById('signaturePad');
    const signaturePad = new SignaturePad(canvas);
    const clearBtn = document.getElementById('clearBtn');
    const form = document.getElementById('attendanceForm');
    const attendanceTableBody = document.querySelector('#attendanceTable tbody');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    // Mengisi Tanggal & Waktu secara Otomatis saat halaman dimuat
    function fillDateAndTimeAutomatically() {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');

        document.getElementById('tanggal_dd').value = dd;
        document.getElementById('tanggal_mm').value = mm;
        document.getElementById('tanggal_yyyy').value = yyyy;
        document.getElementById('waktu_hh').value = hh;
        document.getElementById('waktu_mm').value = min;
        document.getElementById('waktu_ss').value = ss;
    }

    fillDateAndTimeAutomatically();

    // Mengatur ulang ukuran kanvas untuk presisi di berbagai perangkat
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    clearBtn.addEventListener('click', function() {
        signaturePad.clear();
    });

    // Mengirim data ke Google Sheets
    form.addEventListener('submit', function(event) {
        event.preventDefault();
        
        if (signaturePad.isEmpty()) {
            alert("Tanda tangan tidak boleh kosong!");
            return;
        }

        const formData = {
            kelas: document.getElementById('kelas').value,
            tanggal: `${document.getElementById('tanggal_dd').value}/${document.getElementById('tanggal_mm').value}/${document.getElementById('tanggal_yyyy').value}`,
            waktu: `${document.getElementById('waktu_hh').value}:${document.getElementById('waktu_mm').value}:${document.getElementById('waktu_ss').value}`,
            kehadiran: document.querySelector('input[name="kehadiran"]:checked').value,
            kearsipan_angkatan: document.getElementById('kearsipan_angkatan').value,
            unit_kerja: document.getElementById('unit_kerja').value,
            tanda_tangan: signaturePad.toDataURL()
        };
        
        // Mengirim data ke Google Sheets
        fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify(formData),
            mode: 'no-cors'
        })
        .then(() => {
            alert("Daftar hadir berhasil disimpan! Silakan cek Google Sheets Anda.");
            form.reset();
            signaturePad.clear();
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Terjadi kesalahan saat mengirim data. Silakan coba lagi.');
        });
    });

    // Menonaktifkan fitur ekspor PDF di perangkat mobile
    if (/Mobi|Android/i.test(navigator.userAgent)) {
        exportPdfBtn.style.display = 'none';
        console.log("PDF export button is hidden on mobile devices for better performance.");
    }

    // Fungsi untuk ekspor PDF (khusus desktop)
    exportPdfBtn.addEventListener('click', function() {
        const tableContainer = document.getElementById('attendanceTableContainer');
        const { jsPDF } = window.jspdf;

        html2canvas(tableContainer, { scale: 2 }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgWidth = 190;
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgHeight = canvas.height * imgWidth / canvas.width;
            let heightLeft = imgHeight;
            let position = 10;

            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            pdf.save('daftar-hadir.pdf');
        });
    });
});