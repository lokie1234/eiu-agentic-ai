(function () {
  'use strict';

  const APP_META = {
    leave: { accent: '#44b988', title: 'Quản lý nghỉ phép' },
    time: { accent: '#4588d6', title: 'Quản lý thời gian làm việc' },
    meeting: { accent: '#7a68d8', title: 'Quản lý cuộc họp' },
    overtime: { accent: '#d58a43', title: 'Quản lý tăng ca' }
  };

  const PAYMENT_BANK_ID = '970418';
  const PAYMENT_BANK_NAME = 'BIDV';
  const PAYMENT_ACCOUNT = '65010000556422';
  const PAYMENT_REFERENCE_PREFIX = 'EIUAA';
  const USED_PAYMENT_CODES_STORAGE_KEY = 'eiuAgenticAiUsedPaymentCodesV2';
  const MAX_TRANSFER_CONTENT_LENGTH = 50;
  const EARLY_BIRD_CUTOFF_MS = Date.parse('2026-10-26T00:00:00+07:00');
  function currentTuition(email) {
    const base = Date.now() < EARLY_BIRD_CUTOFF_MS ? 1000000 : 2000000;
    return { earlyBird: base === 1000000, base: base, tuition: isEiuEmail(email) ? base / 2 : base };
  }

  let activeApp = 'leave';
  let draggedApp = '';
  let isSubmitting = false;
  let discountPopupShown = false;
  let popupTimer = 0;
  let progressTimer = 0;
  let currentQrUrl = '';
  let currentQrFileName = 'VietQR-Agentic-AI.png';

  function selectApp(app, options) {
    const selected = APP_META[app] ? app : 'leave';
    const shouldFocus = options && options.focus === true;
    activeApp = selected;

    document.body.dataset.activeApp = selected;
    document.documentElement.style.setProperty('--accent', APP_META[selected].accent);

    document.querySelectorAll('[data-app-picker]').forEach(function (picker) {
      const isActive = picker.dataset.appPicker === selected;
      picker.classList.toggle('is-active', isActive);
      picker.setAttribute('aria-pressed', String(isActive));
    });

    document.querySelectorAll('[data-app-panel]').forEach(function (panel) {
      const isActive = panel.dataset.appPanel === selected;
      panel.hidden = !isActive;
      panel.setAttribute('aria-hidden', String(!isActive));
      if (isActive && shouldFocus) {
        panel.setAttribute('tabindex', '-1');
        panel.focus({ preventScroll: true });
      }
    });

    const selectedName = document.querySelector('[data-selected-app-name]');
    if (selectedName) {
      selectedName.textContent = APP_META[selected].title;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('app', selected);
    if (options && options.updateHash) {
      url.hash = 'demo';
    }
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }

  function initializeAppPicker() {
    const workspace = document.querySelector('[data-drop-workspace]');
    const initial = new URL(window.location.href).searchParams.get('app');

    document.querySelectorAll('[data-app-picker]').forEach(function (picker) {
      picker.addEventListener('click', function () {
        selectApp(picker.dataset.appPicker, { focus: false, updateHash: true });
      });

      picker.addEventListener('dragstart', function (event) {
        draggedApp = picker.dataset.appPicker;
        picker.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggedApp);
      });

      picker.addEventListener('dragend', function () {
        draggedApp = '';
        picker.classList.remove('is-dragging');
        if (workspace) {
          workspace.classList.remove('is-drag-over');
        }
      });
    });

    if (workspace) {
      workspace.addEventListener('dragover', function (event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        workspace.classList.add('is-drag-over');
      });

      workspace.addEventListener('dragleave', function (event) {
        if (!workspace.contains(event.relatedTarget)) {
          workspace.classList.remove('is-drag-over');
        }
      });

      workspace.addEventListener('drop', function (event) {
        event.preventDefault();
        const dropped = event.dataTransfer.getData('text/plain') || draggedApp;
        workspace.classList.remove('is-drag-over');
        selectApp(dropped, { focus: true, updateHash: true });
      });
    }

    selectApp(initial, { focus: false, updateHash: false });
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function initializeRegistration() {
    const form = byId('registrationForm');
    if (!form) {
      return;
    }

    const fullName = byId('registrationFullName');
    const phone = byId('registrationPhone');
    const email = byId('registrationEmail');
    const website = byId('registrationWebsite');
    const fullNameHelp = byId('registrationFullNameHelp');
    const phoneHelp = byId('registrationPhoneHelp');
    const emailHelp = byId('registrationEmailHelp');
    const submit = byId('registrationSubmit');
    const submitText = byId('registrationSubmitText');
    const processing = byId('registrationProcessing');
    const message = byId('registrationMessage');
    const formArea = byId('registrationFormArea');
    const successPanel = byId('registrationSuccess');
    const successMessage = byId('registrationSuccessMessage');
    const successEmail = byId('registrationSuccessEmail');
    const successDiscount = byId('registrationSuccessDiscount');
    const registerAgain = byId('registrationAgain');
    const priceBox = byId('priceBox');
    const priceAudience = byId('priceAudience');
    const currentPrice = byId('currentPrice');
    const priceDescription = byId('priceDescription');
    const discountOverlay = byId('discountOverlay');
    const paymentCard = byId('paymentCard');
    const paymentQr = byId('paymentQr');
    const paymentTitle = byId('paymentTitle');
    const paymentDescription = byId('paymentDescription');
    const paymentDetails = byId('paymentDetails');
    const paymentTuition = byId('paymentTuition');
    const paymentBank = byId('paymentBank');
    const paymentAccount = byId('paymentAccount');
    const paymentContent = byId('paymentContent');
    const saveQrButton = byId('saveQrButton');
    const manualTransferButton = byId('manualTransferButton');
    const manualTransferText = byId('manualTransferText');
    const qrStatus = byId('qrStatus');

    fullName.addEventListener('input', function () {
      fullName.value = fullName.value.replace(/\s{2,}/g, ' ');
      clearFieldState(fullName, fullNameHelp, 'Nhập đầy đủ họ và tên của bạn.');
    });
    fullName.addEventListener('blur', validateFullName);

    phone.addEventListener('input', function () {
      phone.value = phone.value.replace(/[^\d+\s().-]/g, '').slice(0, 18);
      clearFieldState(phone, phoneHelp, 'Chấp nhận đầu số 03, 05, 07, 08 hoặc 09.');
    });
    phone.addEventListener('blur', function () { validatePhone(true); });

    email.addEventListener('input', function () {
      clearFieldState(email, emailHelp, 'Sinh viên dùng email @eiu.edu.vn để nhận ưu đãi 50%.');
      updateDiscount(false);
    });
    email.addEventListener('blur', function () {
      validateEmail();
      updateDiscount(true);
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (isSubmitting) {
        return;
      }

      hideMessage();
      const nameIsValid = validateFullName();
      const phoneIsValid = validatePhone(true);
      const emailIsValid = validateEmail();
      if (!nameIsValid || !phoneIsValid || !emailIsValid) {
        showMessage('Thông tin chưa hợp lệ', 'Vui lòng kiểm tra lại các trường được đánh dấu.', 'error');
        const firstInvalid = form.querySelector('.invalid');
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      const submittedName = fullName.value.replace(/\s+/g, ' ').trim();
      const transferContent = buildTransferContent(submittedName);
      const data = {
        fullName: submittedName,
        phone: normalizePhone(phone.value),
        email: email.value.trim().toLowerCase(),
        website: website.value.trim(),
        transferContent: transferContent
      };

      setLoading(true);
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify(data)
        });
        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch (error) {
          throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
        }
        if (!response.ok) {
          throw new Error(result && result.message ? result.message : 'Không thể kết nối máy chủ đăng ký.');
        }
        handleRegistrationResponse(result, submittedName, transferContent);
      } catch (error) {
        showMessage('Không thể gửi đăng ký', error && error.message ? error.message : 'Đã xảy ra lỗi kết nối. Vui lòng thử lại.', 'error');
      } finally {
        setLoading(false);
      }
    });

    discountOverlay.addEventListener('click', function (event) {
      if (event.target === discountOverlay) {
        hideDiscountPopup();
      }
    });

    manualTransferButton.addEventListener('click', function () {
      const visible = paymentDetails.classList.toggle('visible');
      manualTransferButton.setAttribute('aria-expanded', String(visible));
      manualTransferText.textContent = visible ? 'Ẩn thông tin' : 'Chuyển khoản thủ công';
    });

    saveQrButton.addEventListener('click', saveQrImage);

    registerAgain.addEventListener('click', function () {
      successPanel.hidden = true;
      formArea.hidden = false;
      form.reset();
      [fullName, phone, email].forEach(function (input) {
        input.classList.remove('valid', 'invalid');
        input.removeAttribute('aria-invalid');
      });
      clearFieldState(fullName, fullNameHelp, 'Nhập đầy đủ họ và tên của bạn.');
      clearFieldState(phone, phoneHelp, 'Chấp nhận đầu số 03, 05, 07, 08 hoặc 09.');
      clearFieldState(email, emailHelp, 'Sinh viên dùng email @eiu.edu.vn để nhận ưu đãi 50%.');
      discountPopupShown = false;
      updateDiscount(false);
      hideMessage();
      fullName.focus();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && discountOverlay.classList.contains('visible')) {
        hideDiscountPopup();
      }
    });

    function validateFullName() {
      const value = fullName.value.replace(/\s+/g, ' ').trim();
      fullName.value = value;
      const valid = value.length >= 2 && value.length <= 100 && /[A-Za-zÀ-ỹ]/.test(value);
      if (!valid) {
        setFieldError(fullName, fullNameHelp, 'Vui lòng nhập họ và tên hợp lệ.');
        return false;
      }
      setFieldSuccess(fullName, fullNameHelp, 'Thông tin họ tên hợp lệ.');
      return true;
    }

    function validatePhone(formatWhenValid) {
      const normalized = normalizePhone(phone.value);
      const valid = /^0(?:3|5|7|8|9)\d{8}$/.test(normalized);
      if (!valid) {
        setFieldError(phone, phoneHelp, 'Số điện thoại phải có 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.');
        return false;
      }
      if (formatWhenValid) {
        phone.value = normalized.slice(0, 4) + ' ' + normalized.slice(4, 7) + ' ' + normalized.slice(7);
      }
      setFieldSuccess(phone, phoneHelp, 'Số điện thoại hợp lệ.');
      return true;
    }

    function validateEmail() {
      const value = email.value.trim().toLowerCase();
      email.value = value;
      const valid = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(value);
      if (!valid) {
        setFieldError(email, emailHelp, 'Vui lòng nhập địa chỉ email hợp lệ.');
        updateDiscount(false);
        return false;
      }
      setFieldSuccess(email, emailHelp, isEiuEmail(value) ? '🎉 Email EIU hợp lệ — bạn được giảm 50% học phí.' : 'Địa chỉ email hợp lệ.');
      return true;
    }

    function updateDiscount(allowPopup) {
      const value = email.value.trim().toLowerCase();
      const valid = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(value);
      const eiu = valid && isEiuEmail(value);
      priceBox.classList.toggle('eiu-active', eiu);
      const offer = currentTuition(eiu ? value : '');
      priceAudience.textContent = eiu ? 'Ưu đãi email EIU' : (offer.earlyBird ? 'Học phí Early Bird' : 'Học phí tiêu chuẩn');
      currentPrice.textContent = offer.tuition.toLocaleString('vi-VN') + ' đồng';
      priceDescription.textContent = eiu
        ? 'Đã áp dụng giảm thêm 50% trên mức học phí đang áp dụng'
        : (offer.earlyBird ? 'Early Bird trước 26/10/2026 · Email EIU giảm thêm 50%' : 'Email EIU giảm thêm 50%');
      if (eiu && allowPopup && !discountPopupShown) {
        discountPopupShown = true;
        showDiscountPopup();
      }
    }

    function showDiscountPopup() {
      window.clearTimeout(popupTimer);
      discountOverlay.classList.add('visible');
      document.body.style.overflow = 'hidden';
      popupTimer = window.setTimeout(hideDiscountPopup, 4800);
    }

    function hideDiscountPopup() {
      window.clearTimeout(popupTimer);
      discountOverlay.classList.remove('visible');
      document.body.style.overflow = '';
    }

    function setLoading(loading) {
      isSubmitting = loading;
      submit.disabled = loading;
      submit.classList.toggle('is-loading', loading);
      submitText.textContent = loading ? 'Đang xử lý…' : 'Hoàn tất đăng ký';
      processing.classList.toggle('visible', loading);
      window.clearTimeout(progressTimer);
      if (loading) {
        progressTimer = window.setTimeout(function () {
          processing.textContent = 'Đang lưu dữ liệu và gửi email xác nhận. Vui lòng giữ nguyên trang…';
        }, 3500);
      } else {
        processing.textContent = 'Hệ thống đang lưu thông tin và gửi email xác nhận…';
      }
    }

    function showMessage(title, text, type) {
      message.textContent = '';
      const strong = document.createElement('strong');
      strong.className = 'register-message-title';
      strong.textContent = title;
      message.appendChild(strong);
      message.appendChild(document.createTextNode(text));
      message.className = 'register-message visible ' + type;
    }

    function hideMessage() {
      message.textContent = '';
      message.className = 'register-message';
    }

    function handleRegistrationResponse(response, registeredName, fallbackTransferContent) {
      if (response && response.duplicate === true) {
        showMessage('Thông tin đã được đăng ký', response.message || 'Bạn không cần gửi lại biểu mẫu.', 'warning');
        return;
      }
      if (response && response.busy === true) {
        showMessage('Hệ thống đang bận', response.message || 'Vui lòng thử lại sau vài giây.', 'warning');
        return;
      }
      if (!response || response.success !== true) {
        showMessage('Chưa thể hoàn tất đăng ký', response && response.message ? response.message : 'Vui lòng kiểm tra thông tin và thử lại.', 'error');
        return;
      }

      hideDiscountPopup();
      formArea.hidden = true;
      successPanel.hidden = false;
      successMessage.textContent = response.message || 'Thông tin của bạn đã được ghi nhận. Ban tổ chức sẽ liên hệ trong thời gian sớm nhất.';
      successEmail.classList.toggle('warning', response.emailSent !== true);
      successEmail.textContent = response.emailSent === true
        ? 'Email xác nhận đã được gửi đến địa chỉ bạn cung cấp.'
        : 'Đăng ký đã được lưu, nhưng email xác nhận chưa thể gửi. Ban tổ chức sẽ liên hệ lại với bạn.';
      successDiscount.classList.toggle('visible', response.isEiu === true);
      renderPaymentQr({
        fullName: registeredName,
        tuition: Number(response.tuition || 0),
        transferContent: String(response.transferContent || fallbackTransferContent || '').trim()
      });
      successPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function renderPaymentQr(data) {
      const tuition = Number(data.tuition);
      if (![500000, 1000000, 2000000].includes(tuition)) {
        paymentCard.classList.add('visible');
        paymentTitle.textContent = 'Chưa xác định được học phí';
        paymentDescription.textContent = 'Vui lòng liên hệ Ban tổ chức để xác nhận số tiền.';
        paymentQr.textContent = '';
        return;
      }
      const transfer = data.transferContent || buildTransferContent(data.fullName || 'Học viên');
      paymentTuition.textContent = tuition.toLocaleString('vi-VN') + ' VNĐ';
      paymentBank.textContent = PAYMENT_BANK_NAME;
      paymentAccount.textContent = PAYMENT_ACCOUNT;
      paymentContent.textContent = transfer;
      paymentCard.classList.add('visible');
      paymentDetails.classList.remove('visible');
      paymentQr.classList.remove('failed');
      paymentTitle.textContent = 'Quét mã VietQR để chuyển khoản';
      paymentDescription.textContent = 'Ứng dụng ngân hàng sẽ tự điền người nhận, số tiền và nội dung chuyển khoản.';
      paymentQr.innerHTML = '<span class="qr-loading">Đang tạo mã VietQR…</span>';
      qrStatus.textContent = '';
      manualTransferText.textContent = 'Chuyển khoản thủ công';
      manualTransferButton.setAttribute('aria-expanded', 'false');

      currentQrUrl = 'https://img.vietqr.io/image/' + encodeURIComponent(PAYMENT_BANK_ID) + '-' + encodeURIComponent(PAYMENT_ACCOUNT) + '-qr_only.png?amount=' + encodeURIComponent(String(tuition)) + '&addInfo=' + encodeURIComponent(transfer);
      currentQrFileName = buildQrFileName(data.fullName, tuition);

      const image = new Image();
      const timeout = window.setTimeout(showQrFallback, 15000);
      image.onload = function () {
        window.clearTimeout(timeout);
        paymentQr.textContent = '';
        paymentQr.appendChild(image);
      };
      image.onerror = function () {
        window.clearTimeout(timeout);
        showQrFallback();
      };
      image.alt = 'Mã VietQR chuyển khoản học phí đến tài khoản BIDV 65010000556422';
      image.width = 230;
      image.height = 230;
      image.decoding = 'async';
      image.referrerPolicy = 'no-referrer';
      image.src = currentQrUrl;
    }

    function showQrFallback() {
      paymentQr.textContent = '';
      paymentQr.classList.add('failed');
      paymentTitle.textContent = 'Thông tin chuyển khoản';
      paymentDescription.textContent = 'Không thể tải mã VietQR. Vui lòng chuyển khoản theo thông tin bên dưới.';
      paymentDetails.classList.add('visible');
      manualTransferText.textContent = 'Ẩn thông tin';
      manualTransferButton.setAttribute('aria-expanded', 'true');
    }

    async function saveQrImage() {
      if (!currentQrUrl) {
        qrStatus.textContent = 'Chưa có ảnh QR để lưu.';
        return;
      }
      saveQrButton.disabled = true;
      qrStatus.textContent = 'Đang chuẩn bị ảnh QR…';
      try {
        const response = await fetch(currentQrUrl, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Không thể tải ảnh QR.');
        }
        const blob = await response.blob();
        const file = new File([blob], currentQrFileName, { type: blob.type || 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Lưu mã VietQR' });
          qrStatus.textContent = 'Đã mở chức năng lưu/chia sẻ của thiết bị.';
        } else {
          const link = document.createElement('a');
          link.href = currentQrUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.click();
          qrStatus.textContent = 'Ảnh QR đã được mở; hãy lưu ảnh về thiết bị.';
        }
      } catch (error) {
        window.open(currentQrUrl, '_blank', 'noopener,noreferrer');
        qrStatus.textContent = 'Hãy nhấn giữ ảnh QR để lưu vào thiết bị.';
      } finally {
        saveQrButton.disabled = false;
      }
    }
  }

  function normalizePhone(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.indexOf('84') === 0 && digits.length === 11) {
      digits = '0' + digits.substring(2);
    }
    return digits;
  }

  function isEiuEmail(value) {
    return /@eiu\.edu\.vn$/i.test(String(value || '').trim());
  }

  function setFieldError(input, help, text) {
    input.classList.remove('valid');
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    help.className = 'field-help error';
    help.textContent = text;
  }

  function setFieldSuccess(input, help, text) {
    input.classList.remove('invalid');
    input.classList.add('valid');
    input.setAttribute('aria-invalid', 'false');
    help.className = 'field-help success';
    help.textContent = text;
  }

  function clearFieldState(input, help, text) {
    input.classList.remove('invalid', 'valid');
    input.removeAttribute('aria-invalid');
    help.className = 'field-help';
    help.textContent = text;
  }

  function buildTransferContent(name) {
    const normalizedName = removeDiacritics(name)
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'HOC VIEN';
    const reference = PAYMENT_REFERENCE_PREFIX + generatePaymentCode();
    const maxNameLength = Math.max(1, MAX_TRANSFER_CONTENT_LENGTH - reference.length - 1);
    return (normalizedName.substring(0, maxNameLength).trim() + ' ' + reference).replace(/\s+/g, ' ').trim();
  }

  function generatePaymentCode() {
    let used = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(USED_PAYMENT_CODES_STORAGE_KEY) || '[]');
      used = Array.isArray(parsed) ? parsed.filter(function (code) { return /^\d{4}$/.test(String(code)); }) : [];
    } catch (error) {
      used = [];
    }

    let code = '';
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (window.crypto && window.crypto.getRandomValues) {
        const values = new Uint32Array(1);
        window.crypto.getRandomValues(values);
        code = String(values[0] % 10000).padStart(4, '0');
      } else {
        code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
      }
      if (used.indexOf(code) === -1) {
        break;
      }
    }
    try {
      used.push(code);
      window.localStorage.setItem(USED_PAYMENT_CODES_STORAGE_KEY, JSON.stringify(used.slice(-500)));
    } catch (error) {
      /* Registration still works when storage is unavailable. */
    }
    return code;
  }

  function removeDiacritics(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  function buildQrFileName(name, tuition) {
    const safe = removeDiacritics(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 45) || 'hoc-vien';
    return 'VietQR-' + safe + '-' + String(tuition) + '.png';
  }

  function start() {
    initializeAppPicker();
    initializeRegistration();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
