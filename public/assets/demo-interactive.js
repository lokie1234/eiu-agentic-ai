(function () {
  'use strict';

  const TYPE_CONFIG = {
    leave: {
      prefix: 'LV',
      successTitle: 'Đã gửi đơn nghỉ phép',
      status: 'Chờ duyệt',
      calculate: function (values) {
        const days = countDays(values.startDate, values.endDate);
        return {
          days: days > 0 ? String(days) + ' ngày' : '—',
          remaining: days > 0 ? String(Math.max(0, 8 - days)) + ' ngày' : '08 ngày'
        };
      },
      validate: function (values, computed) {
        if (values.startDate && values.endDate && values.endDate < values.startDate) {
          return 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.';
        }
        if (Number.parseInt(computed.days, 10) > 8) {
          return 'Số ngày nghỉ mô phỏng không được vượt quá 08 ngày phép còn lại.';
        }
        return '';
      },
      historyTitle: function (values) {
        return values.fullName || 'Đơn nghỉ phép';
      },
      historyDetail: function (values, computed) {
        return displaySelectValue('leaveType') + ' · ' + computed.days;
      },
      summary: function (values, computed) {
        return [
          'Người gửi: ' + values.fullName,
          'Thời gian: ' + formatDate(values.startDate) + ' – ' + formatDate(values.endDate),
          'Tổng thời gian nghỉ: ' + computed.days
        ];
      }
    },
    time: {
      prefix: 'TM',
      successTitle: 'Đã ghi nhận ngày làm việc',
      status: 'Đã ghi nhận',
      calculate: function (values) {
        const hours = calculateHours(values.startTime, values.endTime, false);
        return {
          hours: hours > 0 ? formatHours(hours) : '—',
          progress: String(values.progress || 0) + '%'
        };
      },
      validate: function (values, computed) {
        if (values.startTime && values.endTime && computed.hours === '—') {
          return 'Giờ kết thúc phải sau giờ bắt đầu.';
        }
        return '';
      },
      historyTitle: function (values) {
        return values.fullName || 'Ngày làm việc';
      },
      historyDetail: function (values, computed) {
        return formatDate(values.workDate) + ' · ' + computed.hours;
      },
      summary: function (values, computed) {
        return [
          'Nhân sự: ' + values.fullName,
          'Ngày làm việc: ' + formatDate(values.workDate),
          'Thời gian ghi nhận: ' + computed.hours + ' · Tiến độ ' + computed.progress
        ];
      }
    },
    meeting: {
      prefix: 'MT',
      successTitle: 'Đã tạo lịch họp',
      status: 'Đã lên lịch',
      calculate: function (values) {
        const minutes = calculateMinutes(values.startTime, values.endTime, false);
        const participants = String(values.participants || '')
          .split(/[,;\n]+/)
          .map(function (item) { return item.trim(); })
          .filter(Boolean).length;
        return {
          duration: minutes > 0 ? formatMinutes(minutes) : '—',
          participants: participants > 0 ? String(participants) + ' người' : '—'
        };
      },
      validate: function (values, computed) {
        if (values.startTime && values.endTime && computed.duration === '—') {
          return 'Giờ kết thúc cuộc họp phải sau giờ bắt đầu.';
        }
        return '';
      },
      historyTitle: function (values) {
        return values.meetingTitle || 'Cuộc họp';
      },
      historyDetail: function (values) {
        return formatDate(values.meetingDate) + ' · ' + values.startTime;
      },
      summary: function (values, computed) {
        return [
          'Cuộc họp: ' + values.meetingTitle,
          'Thời gian: ' + formatDate(values.meetingDate) + ', ' + values.startTime + ' – ' + values.endTime,
          'Hình thức: ' + displaySelectValue('meetingMode') + ' · ' + computed.participants
        ];
      }
    },
    overtime: {
      prefix: 'OT',
      successTitle: 'Đã gửi đề nghị tăng ca',
      status: 'Chờ duyệt',
      calculate: function (values) {
        const hours = calculateHours(values.startTime, values.endTime, true);
        return {
          hours: hours > 0 ? formatHours(hours) : '—',
          coefficient: values.overtimeType === 'holiday' ? '300%' : values.overtimeType === 'weekend' ? '200%' : '150%'
        };
      },
      validate: function (values, computed) {
        const hours = Number.parseFloat(computed.hours);
        if (values.startTime && values.endTime && computed.hours === '—') {
          return 'Khoảng thời gian tăng ca chưa hợp lệ.';
        }
        if (hours > 12) {
          return 'Thời gian tăng ca mô phỏng không được vượt quá 12 giờ.';
        }
        return '';
      },
      historyTitle: function (values) {
        return values.fullName || 'Đề nghị tăng ca';
      },
      historyDetail: function (values, computed) {
        return formatDate(values.overtimeDate) + ' · ' + computed.hours;
      },
      summary: function (values, computed) {
        return [
          'Nhân sự: ' + values.fullName,
          'Thời gian: ' + formatDate(values.overtimeDate) + ', ' + values.startTime + ' – ' + values.endTime,
          'Tổng tăng ca: ' + computed.hours + ' · Hệ số mô phỏng ' + computed.coefficient
        ];
      }
    }
  };

  let toastTimer = 0;
  let activeForm = null;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function todayValue() {
    const now = new Date();
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }

  function currentTimeValue() {
    const now = new Date();
    return pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  function formatDate(value) {
    if (!value) {
      return '—';
    }
    const parts = value.split('-');
    if (parts.length !== 3) {
      return value;
    }
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function countDays(start, end) {
    if (!start || !end) {
      return 0;
    }
    const from = new Date(start + 'T00:00:00');
    const to = new Date(end + 'T00:00:00');
    const difference = Math.round((to - from) / 86400000);
    return difference >= 0 ? difference + 1 : 0;
  }

  function calculateMinutes(start, end, allowOvernight) {
    if (!start || !end) {
      return 0;
    }
    const startParts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);
    let difference = endParts[0] * 60 + endParts[1] - (startParts[0] * 60 + startParts[1]);
    if (allowOvernight && difference <= 0) {
      difference += 1440;
    }
    return difference > 0 ? difference : 0;
  }

  function calculateHours(start, end, allowOvernight) {
    return calculateMinutes(start, end, allowOvernight) / 60;
  }

  function formatHours(hours) {
    return String(Math.round(hours * 10) / 10) + ' giờ';
  }

  function formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) {
      return String(remainder) + ' phút';
    }
    return remainder ? String(hours) + ' giờ ' + String(remainder) + ' phút' : String(hours) + ' giờ';
  }

  function getValues(form) {
    const values = {};
    new FormData(form).forEach(function (value, key) {
      values[key] = String(value).trim();
    });
    return values;
  }

  function displayFieldValue(form, name) {
    const field = form.elements.namedItem(name);
    if (!field) {
      return '';
    }
    if (field.tagName === 'SELECT') {
      return field.selectedOptions.length ? field.selectedOptions[0].textContent.trim() : '';
    }
    if (field.type === 'date') {
      return formatDate(field.value);
    }
    return field.value.trim();
  }

  function displaySelectValue(name) {
    return activeForm ? displayFieldValue(activeForm, name) : '';
  }

  function updatePreview(form) {
    const type = form.dataset.demoType;
    const config = TYPE_CONFIG[type];
    const values = getValues(form);
    const computed = config.calculate(values);
    const scope = form.closest('.main');

    scope.querySelectorAll('[data-preview]').forEach(function (node) {
      const value = displayFieldValue(form, node.dataset.preview);
      node.textContent = value || node.dataset.empty || '—';
    });

    scope.querySelectorAll('[data-computed]').forEach(function (node) {
      node.textContent = computed[node.dataset.computed] || node.dataset.empty || '—';
    });

    form.querySelectorAll('input[type="range"]').forEach(function (range) {
      const output = form.querySelector('[data-range-output="' + range.name + '"]');
      if (output) {
        output.textContent = range.value + '%';
      }
    });

    return computed;
  }

  function makeCode(prefix) {
    const now = new Date();
    const date = String(now.getFullYear()).slice(-2) + pad(now.getMonth() + 1) + pad(now.getDate());
    const random = String(Math.floor(100 + Math.random() * 900));
    return prefix + '-' + date + '-' + random;
  }

  function storageKey(type) {
    return 'eiu-interactive-demo-' + type;
  }

  function readRecords(type) {
    try {
      const records = JSON.parse(localStorage.getItem(storageKey(type)) || '[]');
      return Array.isArray(records) ? records : [];
    } catch (error) {
      return [];
    }
  }

  function writeRecords(type, records) {
    try {
      localStorage.setItem(storageKey(type), JSON.stringify(records.slice(0, 5)));
    } catch (error) {
      /* The demo still works if private browsing blocks storage. */
    }
  }

  function renderHistory(form) {
    const type = form.dataset.demoType;
    const list = form.closest('.main').querySelector('[data-history-list]');
    const records = readRecords(type);

    if (!list) {
      return;
    }

    list.textContent = '';

    if (!records.length) {
      const empty = document.createElement('div');
      empty.className = 'demo-history-empty';
      empty.textContent = 'Chưa có thao tác mô phỏng nào trên thiết bị này.';
      list.appendChild(empty);
      return;
    }

    records.forEach(function (record) {
      const item = document.createElement('div');
      const copy = document.createElement('div');
      const title = document.createElement('strong');
      const detail = document.createElement('span');
      const status = document.createElement('span');

      item.className = 'demo-history-item';
      copy.className = 'demo-history-copy';
      status.className = 'demo-history-status';
      title.textContent = record.title;
      detail.textContent = record.detail + ' · ' + record.code;
      status.textContent = record.status;

      copy.appendChild(title);
      copy.appendChild(detail);
      item.appendChild(copy);
      item.appendChild(status);
      list.appendChild(item);
    });
  }

  function showError(form, message) {
    const box = form.querySelector('[data-form-error]');
    if (!box) {
      return;
    }
    box.textContent = message;
    box.classList.toggle('is-visible', Boolean(message));
    if (message) {
      box.focus();
    }
  }

  function ensureFeedbackElements() {
    if (!document.querySelector('.demo-toast')) {
      const toast = document.createElement('div');
      toast.className = 'demo-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');

      const icon = document.createElement('div');
      icon.className = 'demo-toast-icon';
      icon.textContent = '✓';

      const copy = document.createElement('div');
      const title = document.createElement('strong');
      const message = document.createElement('span');
      title.dataset.toastTitle = '';
      message.dataset.toastMessage = '';

      copy.appendChild(title);
      copy.appendChild(message);
      toast.appendChild(icon);
      toast.appendChild(copy);
      document.body.appendChild(toast);
    }

    if (!document.querySelector('.demo-confirmation')) {
      const modal = document.createElement('div');
      modal.className = 'demo-confirmation';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'demoConfirmationTitle');

      const card = document.createElement('div');
      card.className = 'demo-confirmation-card';

      const icon = document.createElement('div');
      icon.className = 'demo-success-icon';
      icon.textContent = '✓';

      const title = document.createElement('h2');
      title.id = 'demoConfirmationTitle';

      const message = document.createElement('p');
      message.textContent = 'Thao tác mô phỏng đã hoàn tất. Không có dữ liệu nào được gửi ra ngoài.';

      const code = document.createElement('div');
      code.className = 'demo-confirmation-code';

      const summary = document.createElement('div');
      summary.className = 'demo-confirmation-summary';

      const button = document.createElement('button');
      button.className = 'demo-modal-button';
      button.type = 'button';
      button.textContent = 'Tiếp tục sử dụng';
      button.addEventListener('click', closeModal);

      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(message);
      card.appendChild(code);
      card.appendChild(summary);
      card.appendChild(button);
      modal.appendChild(card);
      modal.addEventListener('click', function (event) {
        if (event.target === modal) {
          closeModal();
        }
      });
      document.body.appendChild(modal);
    }
  }

  function showToast(title, message) {
    const toast = document.querySelector('.demo-toast');
    toast.querySelector('[data-toast-title]').textContent = title;
    toast.querySelector('[data-toast-message]').textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 4200);
  }

  function openModal(record, config, values, computed, trigger) {
    const modal = document.querySelector('.demo-confirmation');
    const summary = modal.querySelector('.demo-confirmation-summary');
    modal.querySelector('h2').textContent = config.successTitle;
    modal.querySelector('.demo-confirmation-code').textContent = record.code;
    summary.textContent = '';
    config.summary(values, computed).forEach(function (line) {
      const row = document.createElement('span');
      row.textContent = line;
      summary.appendChild(row);
    });
    modal.dataset.returnFocus = trigger.id || '';
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.demo-modal-button').focus();
  }

  function closeModal() {
    const modal = document.querySelector('.demo-confirmation');
    if (!modal) {
      return;
    }
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    const triggerId = modal.dataset.returnFocus;
    if (triggerId) {
      const trigger = document.getElementById(triggerId);
      if (trigger) {
        trigger.focus();
      }
    }
  }

  function initializeForm(form) {
    const type = form.dataset.demoType;
    const config = TYPE_CONFIG[type];
    const submit = form.querySelector('[type="submit"]');

    if (!config || !submit) {
      return;
    }

    activeForm = form;
    form.querySelectorAll('[data-default-today]').forEach(function (field) {
      if (!field.value) {
        field.value = todayValue();
      }
    });

    form.addEventListener('input', function () {
      activeForm = form;
      showError(form, '');
      updatePreview(form);
    });

    form.addEventListener('change', function () {
      activeForm = form;
      showError(form, '');
      updatePreview(form);
    });

    form.querySelectorAll('[data-fill-now]').forEach(function (button) {
      button.addEventListener('click', function () {
        const target = form.elements.namedItem(button.dataset.fillNow);
        if (target) {
          target.value = currentTimeValue();
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });

    const clearButton = form.closest('.main').querySelector('[data-clear-history]');
    if (clearButton) {
      clearButton.addEventListener('click', function () {
        if (window.confirm('Xóa lịch sử mô phỏng trên thiết bị này?')) {
          try {
            localStorage.removeItem(storageKey(type));
          } catch (error) {
            /* Ignore storage restrictions. */
          }
          renderHistory(form);
        }
      });
    }

    form.addEventListener('reset', function () {
      window.setTimeout(function () {
        form.querySelectorAll('[data-default-today]').forEach(function (field) {
          field.value = todayValue();
        });
        showError(form, '');
        updatePreview(form);
      }, 0);
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      activeForm = form;
      showError(form, '');

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const values = getValues(form);
      const computed = config.calculate(values);
      const validationMessage = config.validate(values, computed);

      if (validationMessage) {
        showError(form, validationMessage);
        return;
      }

      submit.disabled = true;
      submit.classList.add('is-loading');

      window.setTimeout(function () {
        const record = {
          code: makeCode(config.prefix),
          title: config.historyTitle(values),
          detail: config.historyDetail(values, computed),
          status: config.status,
          createdAt: new Date().toISOString()
        };
        const records = readRecords(type);
        records.unshift(record);
        writeRecords(type, records);
        renderHistory(form);
        document.dispatchEvent(new CustomEvent('eiu-demo:submitted', {
          detail: {
            type: type,
            record: record,
            values: values,
            computed: computed
          }
        }));
        submit.disabled = false;
        submit.classList.remove('is-loading');
        showToast(config.successTitle, 'Mã mô phỏng: ' + record.code);
        openModal(record, config, values, computed, submit);
      }, 900);
    });

    updatePreview(form);
    renderHistory(form);
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  });

  function start() {
    ensureFeedbackElements();
    document.querySelectorAll('.demo-form[data-demo-type]').forEach(initializeForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
