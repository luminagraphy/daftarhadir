document.addEventListener('DOMContentLoaded', function() {
    // GANTI URL_WEB_APP_ANDA dengan URL yang Anda dapatkan dari Google Apps Script
    const GOOGLE_SHEETS_URL = 'URL_WEB_APP_ANDA';

    const canvas = document.getElementById('signaturePad');
    const signaturePad = new SignaturePad(canvas);
    const clearBtn = document.getElementById('clearBtn');
    const form = document.getElementById('attendanceForm');
    const attendanceTableBody = document.querySelector('#attendanceTable tbody');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    // **Perbaikan 1: Mengisi Tanggal secara Otomatis**
    function fillDateAutomatically() {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0'); // Januari adalah 0!
        const yyyy = now.getFullYear();

        document.getElementById('tanggal_dd').value = dd;
        document.getElementById('tanggal_mm').value = mm;
        document.getElementById('tanggal_yyyy').value = yyyy;
    }

    // **Perbaikan 2: Mengisi Waktu secara Otomatis**
    function fillTimeAutomatically() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');

        document.getElementById('waktu_hh').value = hh;
        document.getElementById('waktu_mm').value = mm;
        document.getElementById('waktu_ss').value = ss;
    }

    // Panggil fungsi pengisian otomatis saat halaman dimuat
    fillDateAutomatically();
    fillTimeAutomatically();

    // Fit canvas to its container
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Clear signature pad
    clearBtn.addEventListener('click', function() {
        signaturePad.clear();
    });

    // Handle form submission
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
        
        fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify(formData),
            mode: 'no-cors'
        })
        .then(() => {
            alert("Daftar hadir berhasil disimpan!");
            form.reset();
            signaturePad.clear();
            loadAndDisplayData(); // Refresh data table
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Terjadi kesalahan saat mengirim data.');
        });
    });

    // Load and display data from Google Sheets
    function loadAndDisplayData() {
        fetch(GOOGLE_SHEETS_URL)
            .then(response => response.json())
            .then(data => {
                attendanceTableBody.innerHTML = '';
                if (data && data.length > 0) {
                    data.forEach((entry, index) => {
                        const row = `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${entry.kelas}</td>
                                <td>${entry.tanggal}</td>
                                <td>${entry.waktu}</td>
                                <td>${entry.kehadiran}</td>
                                <td>${entry.kearsipan_angkatan}</td>
                                <td>${entry.unit_kerja}</td>
                                <td><img src="${entry.tanda_tangan}" alt="Tanda Tangan" width="100"></td>
                            </tr>
                        `;
                        attendanceTableBody.innerHTML += row;
                    });
                } else {
                    attendanceTableBody.innerHTML = '<tr><td colspan="8">Belum ada data yang tersimpan.</td></tr>';
                }
            })
            .catch(error => {
                console.error('Error loading data:', error);
                attendanceTableBody.innerHTML = '<tr><td colspan="8">Gagal memuat data dari spreadsheet.</td></tr>';
            });
    }

    // Export to PDF
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

    // Initial data load
    loadAndDisplayData();
});