// app.js

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const clientList = document.getElementById('client-list');
    const prefixInput = document.getElementById('settings-cert-prefix');
    const nextNumberInput = document.getElementById('settings-next-number');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    
    const modalOverlay = document.getElementById('modal-overlay');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancel');
    const btnGenerate = document.getElementById('btn-generate');

    // New Add Client Elements
    const btnAddClientModal = document.getElementById('btn-add-client-modal');
    const modalAddClientOverlay = document.getElementById('modal-add-client-overlay');
    const btnCloseAddModal = document.getElementById('btn-close-add-modal');
    const btnCancelAdd = document.getElementById('btn-cancel-add');
    const btnSaveNewClient = document.getElementById('btn-save-new-client');
    const formNewClientName = document.getElementById('form-new-client-name');
    const formNewClientLocation = document.getElementById('form-new-client-location');
    const formNewClientLegend = document.getElementById('form-new-client-legend');

    // Form Elements
    const modalClientName = document.getElementById('modal-client-name');
    const formUbicacion = document.getElementById('form-ubicacion');
    const formLeyenda = document.getElementById('form-leyenda');
    const formFechaServicio = document.getElementById('form-fecha-servicio');
    const formFechaVencimiento = document.getElementById('form-fecha-vencimiento');
    const formCertPrefix = document.getElementById('form-cert-prefix');
    const formCertNumber = document.getElementById('form-cert-number');

    // Print Template Elements
    const certLeyenda = document.getElementById('cert-leyenda');
    const certFechaServicio = document.getElementById('cert-fecha-servicio');
    const certFechaVencimiento = document.getElementById('cert-fecha-vencimiento');
    const certNumberDisplay = document.getElementById('cert-number-display');
    const btnDownload = document.getElementById('btn-download');
    const btnSaveClient = document.getElementById('btn-save-client');



    // Spell checker - basic dictionary for common errors in certificates
    const spellCheckerDictionary = {
        'descripcion': 'descripción',
        'vencimiento': 'vencimiento',
        'desinsectacion': 'desinsectación',
        'desratizacion': 'desratización',
        'desinfeccion': 'desinfección',
        'ubicacion': 'ubicación',
        'habil': 'Habil.',
        'moron': 'Morón',
        'agrarios': 'Agrarios',
        'telefono': 'teléfono',
        'emergencia': 'emergencia',
        'intoxicaciones': 'intoxicaciones',
        'posadas': 'Posadas',
        'niños': 'niños',
        'director': 'Director',
        'tecnico': 'técnico',
        'especialista': 'especialista',
        'seguridad': 'seguridad',
        'higiene': 'higiene',
        'producto': 'Producto',
        'fabricante': 'Fabricante',
        'ingrediente': 'Ingrediente',
        'activo': 'activo',
        'habilitado': 'habilitado'
    };

    const checkSpelling = (text) => {
        if (!text) return text;
        let corrected = text;
        Object.keys(spellCheckerDictionary).forEach(word => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            corrected = corrected.replace(regex, spellCheckerDictionary[word]);
        });
        return corrected;
    };


    // State
    let clients = [];
    let customClients = JSON.parse(localStorage.getItem('customClients') || '[]');
    let deletedClients = JSON.parse(localStorage.getItem('deletedClients') || '[]');
    let clientEdits = JSON.parse(localStorage.getItem('clientEdits') || '{}');
    let currentClient = null;

    const fixEncoding = (str) => {
        if (!str) return str;
        try {
            if (str.includes('Ã') || str.includes('Â')) {
                return decodeURIComponent(escape(str));
            }
            return str;
        } catch (e) {
            return str;
        }
    };

    if (typeof windowClientesData !== 'undefined') {
        const baseClients = windowClientesData.map(c => ({
            ...c,
            Cliente: fixEncoding(c.Cliente),
            Ubicacion: fixEncoding(c.Ubicacion),
            LeyendaCertificado: fixEncoding(c.LeyendaCertificado)
        }));
        clients = [...baseClients, ...customClients];
    } else {
        clients = [...customClients];
        console.warn('datos.js no cargado. Usando solo clientes locales.');
    }

    clients = clients.map(client => ({
        ...client,
        ...(clientEdits[client.Cliente] || {})
    }));

    const persistClientEdits = () => {
        localStorage.setItem('clientEdits', JSON.stringify(clientEdits));
    };

    // Init Config
    let nextCertNumber = localStorage.getItem('nextCertNumber');
    if (!nextCertNumber) {
        nextCertNumber = 812;
        localStorage.setItem('nextCertNumber', nextCertNumber);
    }
    nextNumberInput.value = nextCertNumber;

    let certPrefix = localStorage.getItem('certPrefix');
    if (!certPrefix) {
        certPrefix = "6";
        localStorage.setItem('certPrefix', certPrefix);
    }
    if (prefixInput) {
        prefixInput.value = certPrefix;
    }

    btnSaveSettings.addEventListener('click', () => {
        localStorage.setItem('nextCertNumber', nextNumberInput.value);
        if (prefixInput) {
            localStorage.setItem('certPrefix', prefixInput.value);
        }
        alert('Configuración guardada.');
    });

    // Format Date for Input yyyy-mm-dd
    const formatDateForInput = (date) => {
        return date.toISOString().split('T')[0];
    };

    // Format Date for Print dd/mm/yyyy
    const formatDateForPrint = (dateString) => {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        const [year, month, day] = parts;
        return `${day}/${month}/${year}`;
    };

    const monthAbbreviation = (dateString) => {
        const monthNames = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
        if (!dateString) return '';
        const monthIndex = parseInt(dateString.split('-')[1], 10) - 1;
        return monthNames[monthIndex] || '';
    };

    const sanitizeFileName = (text) => {
        return text
            .replace(/[\\/:*?"<>|]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    };

    const createCertificateFileName = () => {
        const certNumber = formCertNumber.value || nextNumberInput.value;
        const certPrefix = formCertPrefix.value || '6';
        const clientName = sanitizeFileName(modalClientName.textContent || 'CLIENTE');
        if (!formFechaServicio.value) {
            return `CERT${certPrefix}-${certNumber}-${clientName}`;
        }
        const parts = formFechaServicio.value.split('-');
        const year = parts[0];
        const month = monthAbbreviation(formFechaServicio.value);
        const datePart = `${month}${year.slice(-2)}`;
        return `CERT${certPrefix}-${certNumber}-${clientName}-${datePart}`;
    };

    const saveClientChanges = (silent = false) => {
        if (!currentClient) return;

        const originalName = currentClient.Cliente;
        const updatedValues = {
            Ubicacion: formUbicacion.value.trim(),
            LeyendaCertificado: formLeyenda.value.trim()
        };

        currentClient = {
            ...currentClient,
            ...updatedValues
        };

        const index = clients.findIndex(c => c.Cliente === originalName);
        if (index !== -1) {
            clients[index] = {
                ...clients[index],
                ...updatedValues
            };
        }

        const customIndex = customClients.findIndex(c => c.Cliente === originalName);
        if (customIndex !== -1) {
            customClients[customIndex] = {
                ...customClients[customIndex],
                ...updatedValues
            };
            localStorage.setItem('customClients', JSON.stringify(customClients));
        } else {
            clientEdits[originalName] = {
                ...clientEdits[originalName],
                ...updatedValues
            };
            persistClientEdits();
        }

        renderClients(searchInput.value);
        if (!silent) alert('Cambios guardados en el cliente.');
    };

    const updatePrintTemplate = () => {
        let text = formLeyenda.value;
        
        // Procesar palabra por palabra
        const words = text.match(/\S+|\s+/g) || [];
        const processedWords = words.map(word => {
            // Si es solo espacios en blanco, devolverlo tal cual
            if (/^\s+$/.test(word)) {
                return word;
            }
            
            // Extraer letras y números para comparación
            const letters = word.match(/[a-záéíóúñA-ZÁÉÍÓÚÑ]/g) || [];
            const upperLetters = word.match(/[A-ZÁÉÍÓÚÑ]/g) || [];
            const numbers = word.match(/[0-9]/g) || [];
            
            // Aplicar negrita si no tiene minúsculas y (tiene 2+ mayúsculas o tiene números)
            if (letters.length === upperLetters.length && (upperLetters.length >= 2 || numbers.length > 0)) {
                return `<b>${word}</b>`;
            }
            
            return word;
        }).join('');
        
        // Aplicar negrita a palabras clave específicas
        const keywordPatterns = [
            /desinsectación/gi,
            /desratización/gi,
            /desinfección/gi,
            /desinsectacion/gi,
            /desratizacion/gi,
            /desinfeccion/gi
        ];
        
        let html = processedWords;
        keywordPatterns.forEach(pattern => {
            html = html.replace(pattern, '<b>$&</b>');
        });
        
        // Aplicar negrita al nombre del cliente
        if (modalClientName.textContent && modalClientName.textContent.trim()) {
            const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const clientRegex = new RegExp(`(${escapeRegExp(modalClientName.textContent)})`, 'gi');
            html = html.replace(clientRegex, '<b>$1</b>');
        }
        
        // Aplicar negrita a la ubicación
        if (formUbicacion.value && formUbicacion.value.trim()) {
            const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const addressRegex = new RegExp(`(${escapeRegExp(formUbicacion.value)})`, 'gi');
            html = html.replace(addressRegex, '<b>$1</b>');
        }
        
        certLeyenda.innerHTML = html;
        certFechaServicio.textContent = formatDateForPrint(formFechaServicio.value);
        certFechaVencimiento.textContent = formatDateForPrint(formFechaVencimiento.value);
        certNumberDisplay.textContent = `${formCertPrefix.value}-${formCertNumber.value}`;
    };

    // Real-time update listeners
    formLeyenda.addEventListener('input', updatePrintTemplate);
    formUbicacion.addEventListener('input', updatePrintTemplate);
    formFechaServicio.addEventListener('change', updatePrintTemplate);
    formFechaVencimiento.addEventListener('change', updatePrintTemplate);
    formCertPrefix.addEventListener('input', updatePrintTemplate);
    formCertNumber.addEventListener('input', updatePrintTemplate);

    const incrementCertificateNumber = () => {
        const currentNumber = parseInt(formCertNumber.value, 10);
        const newNumber = currentNumber + 1;
        localStorage.setItem('nextCertNumber', newNumber);
        nextNumberInput.value = newNumber;
    };

    const loadImageAsDataURL = (src) => {
        return new Promise((resolve, reject) => {
            if (!src) {
                reject(new Error('Ruta de imagen vacía'));
                return;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
            img.src = src;
        });
    };

    const embedPrintImages = async () => {
        const imageElements = [
            document.getElementById('cert-logo'),
            document.getElementById('cert-qr')
        ];

        for (const imageEl of imageElements) {
            if (!imageEl || !imageEl.src || imageEl.src.startsWith('data:')) continue;
            try {
                imageEl.src = await loadImageAsDataURL(imageEl.src);
            } catch (error) {
                console.warn('No se pudo incrustar la imagen para el PDF:', error.message);
            }
        }
    };

    const downloadCertificate = async () => {
        try {
            updatePrintTemplate();
            const fileName = `${createCertificateFileName()}.pdf`;
            const printContainer = document.getElementById('print-container');

            if (!printContainer) {
                alert('No se encontró el contenedor de impresión.');
                return;
            }

            await embedPrintImages();
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(printContainer, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false
            });

            const doc = new window.jspdf.jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pdfMargin = 10;
            const availableWidth = pageWidth - pdfMargin * 2;
            const ratio = canvas.height / canvas.width;
            const scaledHeight = availableWidth * ratio;

            try {
                doc.addImage(canvas, 'PNG', pdfMargin, pdfMargin, availableWidth, scaledHeight);
            } catch (imageError) {
                const imgData = canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', pdfMargin, pdfMargin, availableWidth, scaledHeight);
            }
            doc.save(fileName);

            incrementCertificateNumber();
            closeModal();
            alert('Certificado descargado exitosamente.');
        } catch (error) {
            console.error('Error al generar el PDF:', error);
            alert('Error al generar el PDF: ' + error.message);
        }
    };

    // Render Client List
    const renderClients = (filterText = '') => {
        clientList.innerHTML = '';
        
        const filtered = clients.filter(c => {
            if (deletedClients.includes(c.Cliente)) return false;

            const search = filterText.toLowerCase();
            return (c.Cliente && c.Cliente.toLowerCase().includes(search)) || 
                   (c.Ubicacion && c.Ubicacion.toLowerCase().includes(search));
        });

        filtered.forEach(client => {
            const card = document.createElement('div');
            card.className = 'client-card';
            
            // Format Last Date
            let lastDate = client.UltimaFechaCertificado || 'Sin Fecha';

            card.innerHTML = `
                <div>
                    <h3>${client.Cliente}</h3>
                    <p>${client.Ubicacion || 'Ubicación no disponible'}</p>
                </div>
                <div>
                    <span style="color: var(--text-muted); font-size: 0.9rem;">${lastDate}</span>
                </div>
                <div class="card-actions">
                    <button class="btn-danger" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    <button class="btn-action">Emitir</button>
                </div>
            `;

            // Card click
            card.addEventListener('click', () => openModal(client));

            // Prevent card click when clicking action buttons
            const btnAction = card.querySelector('.btn-action');
            btnAction.addEventListener('click', (e) => {
                e.stopPropagation();
                openModal(client);
            });

            const btnDanger = card.querySelector('.btn-danger');
            btnDanger.addEventListener('click', (e) => {
                e.stopPropagation();
                if(confirm(`¿Estás seguro de eliminar a ${client.Cliente}?`)) {
                    deletedClients.push(client.Cliente);
                    localStorage.setItem('deletedClients', JSON.stringify(deletedClients));
                    renderClients(searchInput.value); // Re-render
                }
            });

            clientList.appendChild(card);
        });
    };

    // Search
    searchInput.addEventListener('input', (e) => {
        renderClients(e.target.value);
    });

    // Modal Logic
    const openModal = (client) => {
        currentClient = client;
        modalClientName.textContent = client.Cliente;
        formUbicacion.value = checkSpelling(client.Ubicacion || '');
        formLeyenda.value = checkSpelling(client.LeyendaCertificado || `Se comunica que se ha realizado el servicio de DESINSECTACIÓN Y DESRATIZACIÓN en ${client.Cliente}, ubicado en el domicilio ${client.Ubicacion}.`);
        
        // Dates
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + 1);

        formFechaServicio.value = formatDateForInput(today);
        formFechaVencimiento.value = formatDateForInput(nextMonth);

        // Cert Number & Prefix
        formCertNumber.value = localStorage.getItem('nextCertNumber');
        formCertPrefix.value = localStorage.getItem('certPrefix') || '6';

        // Update template preview
        updatePrintTemplate();

        modalOverlay.classList.add('active');
    };

    const closeModal = () => {
        modalOverlay.classList.remove('active');
    };

    btnCloseModal.addEventListener('click', closeModal);
    btnCancel.addEventListener('click', closeModal);
    btnSaveClient.addEventListener('click', (e) => {
        e.preventDefault();
        saveClientChanges();
    });
    btnDownload.addEventListener('click', async (e) => {
        e.preventDefault();
        saveClientChanges(true);
        await downloadCertificate();
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Add Client Logic
    const closeAddModal = () => modalAddClientOverlay.classList.remove('active');
    
    btnAddClientModal.addEventListener('click', () => {
        formNewClientName.value = '';
        formNewClientLocation.value = '';
        formNewClientLegend.value = '';
        modalAddClientOverlay.classList.add('active');
    });

    btnCloseAddModal.addEventListener('click', closeAddModal);
    btnCancelAdd.addEventListener('click', closeAddModal);
    modalAddClientOverlay.addEventListener('click', (e) => {
        if (e.target === modalAddClientOverlay) closeAddModal();
    });

    btnSaveNewClient.addEventListener('click', () => {
        const name = formNewClientName.value.trim();
        if (!name) {
            alert('El nombre del cliente es obligatorio');
            return;
        }

        const newClient = {
            Cliente: name,
            Ubicacion: formNewClientLocation.value.trim(),
            LeyendaCertificado: formNewClientLegend.value.trim(),
            UltimaFechaCertificado: ''
        };

        customClients.push(newClient);
        localStorage.setItem('customClients', JSON.stringify(customClients));
        
        // Remove from deleted array if it was there
        deletedClients = deletedClients.filter(c => c !== name);
        localStorage.setItem('deletedClients', JSON.stringify(deletedClients));

        // Update working array
        clients.push(newClient);
        renderClients(searchInput.value);
        closeAddModal();
    });

    // Generate & Print
    btnGenerate.addEventListener('click', () => {
        saveClientChanges(true);
        // Update Print Layout
        // Replace dynamic values in the legend if needed, but here we just use the text area directly
        let leyendaText = formLeyenda.value;
        
        // Resaltar con negrita palabras clave y datos dinámicos
        let formattedLeyenda = leyendaText;
        
        // Procesar palabra por palabra para negrita automática
        const words = formattedLeyenda.match(/\S+|\s+/g) || [];
        const processedWords = words.map(word => {
            // Si es solo espacios en blanco, devolverlo tal cual
            if (/^\s+$/.test(word)) {
                return word;
            }
            
            // Extraer letras y números para comparación
            const letters = word.match(/[a-záéíóúñA-ZÁÉÍÓÚÑ]/g) || [];
            const upperLetters = word.match(/[A-ZÁÉÍÓÚÑ]/g) || [];
            const numbers = word.match(/[0-9]/g) || [];
            
            // Aplicar negrita si no tiene minúsculas y (tiene 2+ mayúsculas o tiene números)
            if (letters.length === upperLetters.length && (upperLetters.length >= 2 || numbers.length > 0)) {
                return `<b>${word}</b>`;
            }
            
            return word;
        }).join('');
        
        formattedLeyenda = processedWords;
        
        // 1. Palabras clave (servicios) usando Unicode para evitar errores de codificación
        const regexKeywords = /(desinsectaci\u00f3n|desratizaci\u00f3n|desinfecci\u00f3n|desinsectacion|desratizacion|desinfeccion)/gi;
        formattedLeyenda = formattedLeyenda.replace(regexKeywords, '<b>$1</b>');
        
        const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // 2. Nombre del cliente
        if (modalClientName.textContent) {
            const clientRegex = new RegExp(`(${escapeRegExp(modalClientName.textContent)})`, 'gi');
            formattedLeyenda = formattedLeyenda.replace(clientRegex, '<b>$1</b>');
        }
        
        // 3. Dirección y localidad (Ubicación)
        if (formUbicacion.value) {
            const addressRegex = new RegExp(`(${escapeRegExp(formUbicacion.value)})`, 'gi');
            formattedLeyenda = formattedLeyenda.replace(addressRegex, '<b>$1</b>');
        }

        certLeyenda.innerHTML = formattedLeyenda;

        certFechaServicio.textContent = formatDateForPrint(formFechaServicio.value);
        certFechaVencimiento.textContent = formatDateForPrint(formFechaVencimiento.value);
        
        // Display prefix and number
        certNumberDisplay.textContent = `${formCertPrefix.value}-${formCertNumber.value}`;

        // Print
        const originalTitle = document.title;
        document.title = createCertificateFileName();
        window.print();
        document.title = originalTitle;

        // Increment number automatically after generating
        const currentNumber = parseInt(formCertNumber.value, 10);
        const newNumber = currentNumber + 1;
        localStorage.setItem('nextCertNumber', newNumber);
        nextNumberInput.value = newNumber;

        closeModal();
    });

    // Initial render
    renderClients();
});
