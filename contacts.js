// =============================================================
// contacts.js
// =============================================================

window.initContacts = function() {
    // Load from localStorage first
    plixoraContacts = JSON.parse(localStorage.getItem('plixora_contacts')) || [];
    renderContactSelect();

    // Setup contact selector change listener
    const contactSelect = document.getElementById('sale-contact');
    if (contactSelect) {
        contactSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (!val) {
                // "Nuevo cliente" selected — clear fields
                document.getElementById('sale-customer-name').value = '';
                document.getElementById('sale-customer').value = '';
                document.getElementById('sale-customer-name').readOnly = false;
                document.getElementById('sale-customer').readOnly = false;
                return;
            }
            const contact = plixoraContacts.find(c => c.id === val);
            if (contact) {
                document.getElementById('sale-customer-name').value = contact.name;
                document.getElementById('sale-customer').value = contact.phone;
                document.getElementById('sale-customer-name').readOnly = false;
                document.getElementById('sale-customer').readOnly = false;
            }
        });
    }

    // Manage contacts button
    const manageBtn = document.getElementById('btn-manage-contacts');
    if (manageBtn) {
        manageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openContactsModal();
        });
    }

    // Netflix assign contact selector
    const nfContactSelect = document.getElementById('nf-a-contact');
    if (nfContactSelect) {
        nfContactSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (!val) {
                document.getElementById('nf-a-cliente').value = '';
                document.getElementById('nf-a-wa').value = '';
                return;
            }
            const contact = plixoraContacts.find(c => c.id === val);
            if (contact) {
                document.getElementById('nf-a-cliente').value = contact.name;
                document.getElementById('nf-a-wa').value = contact.phone;
            }
        });
    }
}

window.initContactsFirebase = function() {
    if (!db) return;
    contactsUnsubscribe = db.collection('plixora_contacts')
        .orderBy('name')
        .onSnapshot(snap => {
            plixoraContacts = snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            localStorage.setItem('plixora_contacts', JSON.stringify(plixoraContacts));
            renderContactSelect();
            renderContactsList();
        }, err => {
            console.error('Error contacts snapshot:', err);
        });
}

window.renderContactSelect = function() {
    const sel = document.getElementById('sale-contact');
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="" selected>✍️ Nuevo cliente (escribir datos)</option>';
    plixoraContacts.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} — ${c.phone}`;
        sel.appendChild(opt);
    });
    // Restore selection if still exists
    if (currentVal && [...sel.options].some(o => o.value === currentVal)) {
        sel.value = currentVal;
    }
    // Also populate Netflix assign contact selector
    const nfSel = document.getElementById('nf-a-contact');
    if (nfSel) {
        const nfVal = nfSel.value;
        nfSel.innerHTML = '<option value="">Escribir datos manualmente</option>';
        plixoraContacts.forEach(c => {
            const o = document.createElement('option');
            o.value = c.id;
            o.textContent = c.name + ' - ' + c.phone;
            nfSel.appendChild(o);
        });
        if (nfVal && [...nfSel.options].some(o => o.value === nfVal)) nfSel.value = nfVal;
    }
}

window.autoSaveContact = async function(name, phone) {
    if (!name || !phone || phone === 'Anónimo') return;
    phone = sanitizeBoliviaPhone(phone);
    if (!phone) return;

    // Check if already exists
    const exists = plixoraContacts.some(c => c.phone === phone);
    if (exists) return;

    const newContact = { name, phone, createdAt: nowBolivia().toISOString() };

    if (db) {
        try {
            await db.collection('plixora_contacts').add(newContact);
        } catch(e) { console.error('Error auto-saving contact:', e); }
    } else {
        newContact.id = 'c_' + Date.now();
        plixoraContacts.push(newContact);
        localStorage.setItem('plixora_contacts', JSON.stringify(plixoraContacts));
        renderContactSelect();
    }
}

window.renderContactsList = function() {
    const list = document.getElementById('contacts-list');
    const empty = document.getElementById('contacts-empty');
    if (!list || !empty) return;

    list.innerHTML = '';
    if (plixoraContacts.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    plixoraContacts.forEach(c => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0.8rem;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;';
        row.innerHTML = `
            <div style="display:flex;flex-direction:column;">
                <span style="font-weight:600;font-size:0.9rem;color:var(--text-main)">${c.name}</span>
                <span style="font-size:0.8rem;color:var(--text-muted)">${c.phone}</span>
            </div>
            <button onclick="deleteContact('${c.id}')" style="background:none;border:1px solid rgba(239,68,68,0.3);color:#ef4444;padding:0.3rem 0.6rem;border-radius:6px;cursor:pointer;font-size:0.75rem;transition:var(--ease);">🗑️</button>
        `;
        list.appendChild(row);
    });
}

window.addContactManual = async function() {
    const nameInput = document.getElementById('contact-name-input');
    const waInput = document.getElementById('contact-wa-input');
    const name = nameInput.value.trim();
    let phone = sanitizeBoliviaPhone(waInput.value.trim());

    if (!name || !phone) { showToast('❌ Ingresa nombre y número'); return; }

    const exists = plixoraContacts.some(c => c.phone === phone);
    if (exists) { showToast('⚠️ Ese número ya existe en tus contactos'); return; }

    const newContact = { name, phone, createdAt: nowBolivia().toISOString() };

    if (db) {
        try {
            await db.collection('plixora_contacts').add(newContact);
            showToast('✅ Contacto guardado');
        } catch(e) { showToast('❌ Error guardando contacto'); }
    } else {
        newContact.id = 'c_' + Date.now();
        plixoraContacts.push(newContact);
        localStorage.setItem('plixora_contacts', JSON.stringify(plixoraContacts));
        renderContactSelect();
        renderContactsList();
        showToast('✅ Contacto guardado (local)');
    }

    nameInput.value = '';
    waInput.value = '';
};

window.deleteContact = async function(id) {
    if (!confirm('¿Eliminar este contacto?')) return;
    if (db) {
        try {
            await db.collection('plixora_contacts').doc(id).delete();
            showToast('🗑️ Contacto eliminado');
        } catch(e) { showToast('❌ Error eliminando contacto'); }
    } else {
        plixoraContacts = plixoraContacts.filter(c => c.id !== id);
        localStorage.setItem('plixora_contacts', JSON.stringify(plixoraContacts));
        renderContactSelect();
        renderContactsList();
        showToast('🗑️ Contacto eliminado (local)');
    }
};

window.openContactsModal = function() {
    renderContactsList();
    document.getElementById('contacts-modal').style.display = 'flex';
}

