/* ===========================
   QR Forge — App Logic
   =========================== */

let currentType = 'url';
let ecLevel = 'L';
let qrSize = 300;

// ─── Tab Switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.type-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const type = tab.dataset.type;
    currentType = type;

    // Update active tab
    document.querySelectorAll('.type-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Show correct form
    document.querySelectorAll('.input-group').forEach(g => g.classList.remove('active'));
    const form = document.getElementById(`form-${type}`);
    if (form) form.classList.add('active');
  });
});

// ─── Use Case Cards → Auto-Switch Tab ──────────────────────────────────────────
document.querySelectorAll('.use-case-card').forEach(card => {
  card.addEventListener('click', () => {
    const type = card.dataset.type;
    const tab = document.getElementById(`tab-${type}`);
    if (tab) { tab.click(); card.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
  });
});

// ─── Customize Toggle ──────────────────────────────────────────────────────────
const customizeToggle = document.getElementById('customize-toggle');
const customizeBody = document.getElementById('customize-body');
const chevron = document.getElementById('chevron');

customizeToggle.addEventListener('click', () => {
  const isOpen = customizeBody.classList.toggle('open');
  chevron.classList.toggle('open', isOpen);
});

// ─── Color Pickers ─────────────────────────────────────────────────────────────
const colorFg = document.getElementById('color-fg');
const colorBg = document.getElementById('color-bg');
const colorFgHex = document.getElementById('color-fg-hex');
const colorBgHex = document.getElementById('color-bg-hex');

colorFg.addEventListener('input', () => { colorFgHex.textContent = colorFg.value; });
colorBg.addEventListener('input', () => { colorBgHex.textContent = colorBg.value; });

// ─── Preset Buttons ────────────────────────────────────────────────────────────
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    colorFg.value = btn.dataset.fg;
    colorBg.value = btn.dataset.bg;
    colorFgHex.textContent = btn.dataset.fg;
    colorBgHex.textContent = btn.dataset.bg;
  });
});

// ─── Size Slider ───────────────────────────────────────────────────────────────
const sizeSlider = document.getElementById('qr-size');
const sizeLabel = document.getElementById('size-label');
sizeSlider.addEventListener('input', () => {
  qrSize = parseInt(sizeSlider.value);
  sizeLabel.textContent = `${qrSize}px`;
});

// ─── EC Level ──────────────────────────────────────────────────────────────────
document.querySelectorAll('.ec-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ec-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ecLevel = btn.dataset.level;
  });
});

// ─── Build QR Data String ──────────────────────────────────────────────────────
function buildQRData() {
  switch (currentType) {
    case 'url':
      return document.getElementById('input-url').value.trim() || 'https://example.com';

    case 'video':
      return document.getElementById('input-video').value.trim() || 'https://youtube.com';

    case 'payment': {
      const upi = document.getElementById('input-payment-upi').value.trim();
      const amount = document.getElementById('input-payment-amount').value.trim();
      const note = document.getElementById('input-payment-note').value.trim();
      if (!upi) return 'upi://pay?pa=yourname@upi';
      let str = `upi://pay?pa=${encodeURIComponent(upi)}`;
      if (amount) str += `&am=${amount}`;
      if (note) str += `&tn=${encodeURIComponent(note)}`;
      str += `&cu=INR`;
      return str;
    }

    case 'text':
      return document.getElementById('input-text').value.trim() || 'Hello from QR Forge!';

    case 'email': {
      const to = document.getElementById('input-email-to').value.trim();
      const subj = document.getElementById('input-email-subject').value.trim();
      const body = document.getElementById('input-email-body').value.trim();
      if (!to) return 'mailto:recipient@example.com';
      let str = `mailto:${to}`;
      const params = [];
      if (subj) params.push(`subject=${encodeURIComponent(subj)}`);
      if (body) params.push(`body=${encodeURIComponent(body)}`);
      if (params.length) str += `?${params.join('&')}`;
      return str;
    }

    case 'phone': {
      const num = document.getElementById('input-phone').value.trim().replace(/\s+/g, '');
      return `tel:${num || '+919876543210'}`;
    }

    case 'wifi': {
      const ssid = document.getElementById('input-wifi-ssid').value.trim();
      const pass = document.getElementById('input-wifi-pass').value.trim();
      const enc = document.getElementById('input-wifi-enc').value;
      return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
    }

    case 'vcard': {
      const name = document.getElementById('input-vcard-name').value.trim();
      const phone = document.getElementById('input-vcard-phone').value.trim();
      const email = document.getElementById('input-vcard-email').value.trim();
      const org = document.getElementById('input-vcard-org').value.trim();
      const url = document.getElementById('input-vcard-url').value.trim();
      const parts = ['BEGIN:VCARD', 'VERSION:3.0'];
      if (name) parts.push(`FN:${name}`, `N:${name};;;`);
      if (phone) parts.push(`TEL;TYPE=CELL:${phone}`);
      if (email) parts.push(`EMAIL:${email}`);
      if (org) parts.push(`ORG:${org}`);
      if (url) parts.push(`URL:${url}`);
      parts.push('END:VCARD');
      return parts.join('\n');
    }

    default:
      return 'https://example.com';
  }
}

// ─── Generate Button ───────────────────────────────────────────────────────────
let lastQRCanvas = null;

document.getElementById('generate-btn').addEventListener('click', generateQR);

// Also generate on Enter press in text inputs
document.querySelectorAll('.input-field').forEach(field => {
  field.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) generateQR();
  });
});

function generateQR() {
  const data = buildQRData();
  const fg = colorFg.value;
  const bg = colorBg.value;

  const wrapper = document.getElementById('qr-canvas-wrapper');
  wrapper.innerHTML = '';

  const ecMap = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };

  // Animate card
  const previewCard = document.getElementById('preview-card');
  previewCard.style.transform = 'scale(0.97)';
  setTimeout(() => { previewCard.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)'; previewCard.style.transform = 'scale(1)'; }, 50);

  try {
    new QRCode(wrapper, {
      text: data,
      width: qrSize,
      height: qrSize,
      colorDark: fg,
      colorLight: bg,
      correctLevel: ecMap[ecLevel] || QRCode.CorrectLevel.L
    });

    // Store canvas reference
    lastQRCanvas = wrapper.querySelector('canvas');

    // Show result panel
    document.getElementById('qr-placeholder').style.display = 'none';
    const result = document.getElementById('qr-result');
    result.style.display = 'flex';

    // Set data label
    const label = document.getElementById('qr-data-label');
    label.textContent = data.length > 60 ? data.substring(0, 57) + '…' : data;

    showToast('✦ QR Code generated!');
  } catch (err) {
    showToast('⚠ Error: ' + (err.message || 'Could not generate') );
  }
}

// ─── Download PNG ──────────────────────────────────────────────────────────────
document.getElementById('download-png').addEventListener('click', () => {
  if (!lastQRCanvas) return;
  const link = document.createElement('a');
  link.download = `qr-${currentType}-${Date.now()}.png`;
  link.href = lastQRCanvas.toDataURL('image/png');
  link.click();
  showToast('⬇ PNG downloaded!');
});

// ─── Download SVG ──────────────────────────────────────────────────────────────
document.getElementById('download-svg').addEventListener('click', () => {
  if (!lastQRCanvas) return;
  const imgData = lastQRCanvas.toDataURL('image/png');
  const w = lastQRCanvas.width;
  const h = lastQRCanvas.height;
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image href="${imgData}" width="${w}" height="${h}"/>
</svg>`;
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `qr-${currentType}-${Date.now()}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  showToast('⬇ SVG downloaded!');
});

// ─── Copy to Clipboard ─────────────────────────────────────────────────────────
document.getElementById('copy-btn').addEventListener('click', async () => {
  if (!lastQRCanvas) return;
  try {
    lastQRCanvas.toBlob(async (blob) => {
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      showToast('📋 Copied to clipboard!');
    });
  } catch {
    showToast('⚠ Copy not supported in this browser');
  }
});

// ─── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Smooth scroll for use-case cards ─────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth' });
  });
});

// ─── Preview card transition ───────────────────────────────────────────────────
document.getElementById('preview-card').style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
