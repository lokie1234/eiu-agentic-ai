(function () {
  'use strict';

  const STORAGE_PREFIX = 'eiu-full-function-v2-';
  const VIEW_KEYS = {
    leave: ['dashboard', 'requests', 'approvals', 'history'],
    time: ['dashboard', 'attendance', 'tasks', 'reports'],
    meeting: ['dashboard', 'calendar', 'members', 'minutes'],
    overtime: ['dashboard', 'requests', 'approvals', 'summary']
  };

  const VIEW_COPY = {
    leave: {
      dashboard: ['Quản lý nghỉ phép', 'Tạo và gửi yêu cầu nghỉ phép'],
      requests: ['Đơn nghỉ của tôi', 'Theo dõi, xem chi tiết hoặc hủy yêu cầu'],
      approvals: ['Phê duyệt đơn nghỉ', 'Mô phỏng xử lý các yêu cầu đang chờ'],
      history: ['Lịch sử nghỉ phép', 'Tra cứu toàn bộ thay đổi và xuất dữ liệu']
    },
    time: {
      dashboard: ['Quản lý thời gian làm việc', 'Ghi nhận thời gian và tiến độ trong ngày'],
      attendance: ['Chấm công', 'Ghi nhận giờ vào và giờ ra trên thiết bị này'],
      tasks: ['Tiến độ công việc', 'Thêm, hoàn tất và quản lý danh sách công việc'],
      reports: ['Báo cáo thời gian', 'Tổng hợp dữ liệu mô phỏng theo ngày']
    },
    meeting: {
      dashboard: ['Quản lý cuộc họp', 'Tạo lịch và xác nhận thông tin cuộc họp'],
      calendar: ['Lịch họp', 'Xem lịch, mở chi tiết và thao tác với cuộc họp'],
      members: ['Thành viên', 'Quản lý danh sách người tham dự mô phỏng'],
      minutes: ['Biên bản', 'Ghi nội dung, quyết định và công việc tiếp theo']
    },
    overtime: {
      dashboard: ['Quản lý tăng ca', 'Tạo và gửi đề nghị làm việc ngoài giờ'],
      requests: ['Đề nghị tăng ca', 'Theo dõi các yêu cầu đã tạo'],
      approvals: ['Phê duyệt tăng ca', 'Mô phỏng duyệt hoặc từ chối đề nghị'],
      summary: ['Tổng hợp tăng ca', 'Theo dõi số giờ và xuất báo cáo mô phỏng']
    }
  };

  let controller = null;
  let clockTimer = 0;

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function isoDate(offset) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + (offset || 0));
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function formatDate(value) {
    if (!value) return '—';
    const parts = String(value).split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : String(value);
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function makeId(prefix) {
    return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900);
  }

  function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function seedState(type) {
    const seeds = {
      meeting: {
        meetings: [
          { id: 'MT-DEMO-101', title: 'Họp triển khai học kỳ mới', date: isoDate(1), start: '09:00', end: '10:30', mode: 'Trực tiếp', location: 'Phòng A2.101', participants: ['Nguyễn An', 'Trần Bình', 'Lê Chi'], agenda: 'Phân công nhiệm vụ và thống nhất các mốc triển khai.', status: 'Sắp diễn ra' },
          { id: 'MT-DEMO-102', title: 'Workshop ứng dụng AI trong giáo dục', date: isoDate(2), start: '14:00', end: '15:30', mode: 'Trực tuyến', location: 'https://meet.example/eiu-ai', participants: ['Phạm Minh', 'Hoàng Lan', 'Võ Nam', 'Đỗ Vy'], agenda: 'Thảo luận ví dụ ứng dụng AI hỗ trợ giảng dạy.', status: 'Sắp diễn ra' },
          { id: 'MT-DEMO-099', title: 'Rà soát tiến độ dự án Web App', date: isoDate(-2), start: '10:00', end: '11:00', mode: 'Kết hợp', location: 'Phòng B1.204', participants: ['Nguyễn An', 'Phạm Minh'], agenda: 'Kiểm tra tiến độ và thống nhất công việc tiếp theo.', status: 'Đã hoàn thành' }
        ],
        members: [
          { id: 'MB-01', name: 'Nguyễn An', role: 'Chủ trì', email: 'an.nguyen@example.edu.vn', presence: 'Trực tuyến' },
          { id: 'MB-02', name: 'Trần Bình', role: 'Thư ký', email: 'binh.tran@example.edu.vn', presence: 'Đang bận' },
          { id: 'MB-03', name: 'Lê Chi', role: 'Thành viên', email: 'chi.le@example.edu.vn', presence: 'Trực tuyến' },
          { id: 'MB-04', name: 'Phạm Minh', role: 'Thành viên', email: 'minh.pham@example.edu.vn', presence: 'Ngoại tuyến' }
        ],
        minutes: {}
      },
      leave: {
        requests: [
          { id: 'LV-DEMO-201', person: 'Nguyễn Văn An', type: 'Nghỉ phép năm', start: isoDate(3), end: isoDate(4), days: 2, reason: 'Giải quyết công việc gia đình.', status: 'Chờ duyệt', createdAt: new Date().toISOString() },
          { id: 'LV-DEMO-202', person: 'Trần Ngọc Mai', type: 'Nghỉ ốm', start: isoDate(-5), end: isoDate(-5), days: 1, reason: 'Nghỉ theo chỉ định và đã báo quản lý.', status: 'Đã duyệt', createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
          { id: 'LV-DEMO-203', person: 'Lê Minh Khôi', type: 'Nghỉ không lương', start: isoDate(-10), end: isoDate(-9), days: 2, reason: 'Việc cá nhân.', status: 'Từ chối', createdAt: new Date(Date.now() - 11 * 86400000).toISOString() }
        ]
      },
      time: {
        attendance: [
          { id: 'AT-DEMO-01', date: isoDate(-1), checkIn: '08:03', checkOut: '17:12', status: 'Đủ giờ' },
          { id: 'AT-DEMO-02', date: isoDate(-2), checkIn: '08:15', checkOut: '17:05', status: 'Đủ giờ' }
        ],
        tasks: [
          { id: 'TS-01', title: 'Hoàn thiện nội dung bài giảng', priority: 'Cao', done: true },
          { id: 'TS-02', title: 'Kiểm tra phản hồi của sinh viên', priority: 'Vừa', done: false },
          { id: 'TS-03', title: 'Cập nhật tài liệu AI hỗ trợ học tập', priority: 'Vừa', done: false }
        ],
        worklogs: [
          { id: 'WL-01', person: 'Nguyễn Văn An', date: isoDate(-1), hours: 8, progress: 80, tasks: 'Hoàn thiện báo cáo và cập nhật dữ liệu.' },
          { id: 'WL-02', person: 'Nguyễn Văn An', date: isoDate(-2), hours: 8, progress: 70, tasks: 'Chuẩn bị nội dung workshop.' }
        ]
      },
      overtime: {
        requests: [
          { id: 'OT-DEMO-301', person: 'Nguyễn Văn An', date: isoDate(0), start: '18:00', end: '21:00', hours: 3, coefficient: '150%', content: 'Hoàn thiện báo cáo tổng hợp.', reason: 'Kịp tiến độ bàn giao.', status: 'Chờ duyệt', createdAt: new Date().toISOString() },
          { id: 'OT-DEMO-302', person: 'Trần Ngọc Mai', date: isoDate(-3), start: '18:00', end: '20:00', hours: 2, coefficient: '150%', content: 'Hỗ trợ chuẩn bị hội thảo.', reason: 'Khối lượng công việc phát sinh.', status: 'Đã duyệt', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
          { id: 'OT-DEMO-303', person: 'Lê Minh Khôi', date: isoDate(-7), start: '08:00', end: '12:00', hours: 4, coefficient: '200%', content: 'Bảo trì dữ liệu hệ thống.', reason: 'Thực hiện ngoài giờ vận hành.', status: 'Từ chối', createdAt: new Date(Date.now() - 8 * 86400000).toISOString() }
        ]
      }
    };
    return deepCopy(seeds[type]);
  }

  function readState(type) {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_PREFIX + type) || 'null');
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (error) {
      /* Use sample data if storage is unavailable. */
    }
    const state = seedState(type);
    writeState(type, state);
    return state;
  }

  function writeState(type, state) {
    try {
      localStorage.setItem(STORAGE_PREFIX + type, JSON.stringify(state));
    } catch (error) {
      /* Interactions remain available for the current page. */
    }
  }

  function statusClass(status) {
    if (/duyệt|hoàn thành|đủ giờ|đã lên lịch/i.test(status)) return 'is-success';
    if (/từ chối|đã hủy|đi trễ/i.test(status)) return 'is-danger';
    return 'is-pending';
  }

  function badge(status) {
    return '<span class="ff-status ' + statusClass(status) + '">' + escapeHTML(status) + '</span>';
  }

  function countDays(start, end) {
    const from = new Date(start + 'T00:00:00');
    const to = new Date(end + 'T00:00:00');
    const diff = Math.round((to - from) / 86400000);
    return Number.isFinite(diff) && diff >= 0 ? diff + 1 : 0;
  }

  function calculateHours(start, end, overnight) {
    if (!start || !end) return 0;
    const a = start.split(':').map(Number);
    const b = end.split(':').map(Number);
    let minutes = b[0] * 60 + b[1] - (a[0] * 60 + a[1]);
    if (overnight && minutes <= 0) minutes += 1440;
    return Math.max(0, Math.round((minutes / 60) * 10) / 10);
  }

  function panelHeader(title, description, primary) {
    return '<div class="ff-panel-head">' +
      '<div><span class="ff-eyebrow">ỨNG DỤNG MÔ PHỎNG</span><h2>' + escapeHTML(title) + '</h2><p>' + escapeHTML(description) + '</p></div>' +
      '<div class="ff-head-actions">' + (primary || '') +
      '<button type="button" class="ff-btn ff-btn-ghost" data-action="reset-demo" title="Khôi phục dữ liệu mẫu">↻ Dữ liệu mẫu</button></div>' +
      '</div>';
  }

  function filterBar(placeholder, statuses) {
    return '<div class="ff-filter-bar">' +
      '<label class="ff-search"><span aria-hidden="true">⌕</span><input type="search" data-filter-search placeholder="' + escapeHTML(placeholder) + '"></label>' +
      (statuses ? '<select data-filter-status aria-label="Lọc trạng thái"><option value="">Tất cả trạng thái</option>' + statuses.map(function (status) {
        return '<option value="' + escapeHTML(status) + '">' + escapeHTML(status) + '</option>';
      }).join('') + '</select>' : '') +
      '</div>';
  }

  function emptyState(message) {
    return '<div class="ff-empty"><span>◎</span><strong>Không có dữ liệu phù hợp</strong><p>' + escapeHTML(message) + '</p></div>';
  }

  function renderMeeting(view, state) {
    if (view === 'calendar') {
      const cards = state.meetings.map(function (item) {
        const search = [item.title, item.location, item.mode, item.status].join(' ').toLowerCase();
        return '<article class="ff-item-card" data-filter-card data-search="' + escapeHTML(search) + '" data-status="' + escapeHTML(item.status) + '">' +
          '<div class="ff-date-tile"><strong>' + escapeHTML(String(new Date(item.date + 'T12:00:00').getDate()).padStart(2, '0')) + '</strong><span>TH ' + escapeHTML(String(new Date(item.date + 'T12:00:00').getMonth() + 1)) + '</span></div>' +
          '<div class="ff-item-body"><div class="ff-item-top"><h3>' + escapeHTML(item.title) + '</h3>' + badge(item.status) + '</div>' +
          '<p class="ff-meta">◷ ' + escapeHTML(item.start + ' – ' + item.end) + ' &nbsp;·&nbsp; ' + escapeHTML(item.mode) + '</p>' +
          '<p class="ff-meta">⌖ ' + escapeHTML(item.location) + ' &nbsp;·&nbsp; ♙ ' + escapeHTML(item.participants.length) + ' người</p>' +
          '<div class="ff-card-actions"><button class="ff-btn ff-btn-soft" data-action="view-meeting" data-id="' + escapeHTML(item.id) + '">Xem chi tiết</button>' +
          (item.status === 'Sắp diễn ra' ? '<button class="ff-btn ff-btn-primary" data-action="join-meeting" data-id="' + escapeHTML(item.id) + '">Tham gia</button><button class="ff-icon-btn" data-action="copy-meeting" data-id="' + escapeHTML(item.id) + '" aria-label="Sao chép thông tin">⧉</button>' : '') + '</div></div></article>';
      }).join('');
      return panelHeader('Lịch họp', 'Chọn một cuộc họp để xem thông tin và thực hiện thao tác.', '<button class="ff-btn ff-btn-primary" data-action="go-dashboard">＋ Tạo lịch mới</button>') +
        filterBar('Tìm tên hoặc địa điểm...', ['Sắp diễn ra', 'Đã hoàn thành', 'Đã hủy']) +
        '<div class="ff-list" data-filter-list>' + cards + '</div><div data-filter-empty hidden>' + emptyState('Hãy thay đổi từ khóa hoặc bộ lọc.') + '</div>';
    }

    if (view === 'members') {
      const members = state.members.map(function (member) {
        const initials = member.name.split(/\s+/).slice(-2).map(function (part) { return part.charAt(0); }).join('').toUpperCase();
        return '<article class="ff-member" data-filter-card data-search="' + escapeHTML((member.name + ' ' + member.email + ' ' + member.role).toLowerCase()) + '">' +
          '<div class="ff-avatar">' + escapeHTML(initials) + '</div><div class="ff-member-copy"><strong>' + escapeHTML(member.name) + '</strong><span>' + escapeHTML(member.role) + ' · ' + escapeHTML(member.email) + '</span></div>' +
          '<span class="ff-presence">● ' + escapeHTML(member.presence) + '</span><button class="ff-icon-btn is-danger" data-action="remove-member" data-id="' + escapeHTML(member.id) + '" aria-label="Xóa thành viên">×</button></article>';
      }).join('');
      return panelHeader('Thành viên', 'Danh sách dùng để chọn người tham dự cho các lịch họp mô phỏng.') +
        '<form class="ff-inline-form" data-form="add-member"><input name="name" required maxlength="80" placeholder="Họ và tên"><input name="email" type="email" required maxlength="120" placeholder="Email"><select name="role"><option>Thành viên</option><option>Chủ trì</option><option>Thư ký</option></select><button class="ff-btn ff-btn-primary">Thêm thành viên</button></form>' +
        filterBar('Tìm thành viên...', null) + '<div class="ff-member-list" data-filter-list>' + members + '</div><div data-filter-empty hidden>' + emptyState('Chưa tìm thấy thành viên phù hợp.') + '</div>';
    }

    const options = state.meetings.map(function (meeting) {
      return '<option value="' + escapeHTML(meeting.id) + '">' + escapeHTML(meeting.title + ' · ' + formatDate(meeting.date)) + '</option>';
    }).join('');
    return panelHeader('Biên bản cuộc họp', 'Thông tin được lưu cục bộ để bạn thử lại sau khi tải trang.') +
      '<form class="ff-minutes-form" data-form="minutes"><label>Chọn cuộc họp<select name="meetingId" data-minutes-select required><option value="">— Chọn lịch họp —</option>' + options + '</select></label>' +
      '<div class="ff-two-col"><label>Nội dung đã trao đổi<textarea name="notes" rows="6" maxlength="1200" placeholder="Tóm tắt nội dung cuộc họp..."></textarea></label><label>Quyết định và công việc tiếp theo<textarea name="decisions" rows="6" maxlength="1200" placeholder="Các quyết định, người phụ trách, thời hạn..."></textarea></label></div>' +
      '<div class="ff-form-actions"><button type="button" class="ff-btn ff-btn-soft" data-action="export-minutes">⇩ Xuất TXT</button><button class="ff-btn ff-btn-primary">Lưu biên bản</button></div></form>' +
      '<div class="ff-info-strip"><span>✓</span><p><strong>Mô phỏng an toàn</strong>Dữ liệu biên bản chỉ được lưu trong trình duyệt, không gửi đến máy chủ.</p></div>';
  }

  function requestCard(item, type, approvalMode) {
    const isLeave = type === 'leave';
    const dateText = isLeave ? formatDate(item.start) + ' – ' + formatDate(item.end) : formatDate(item.date) + ', ' + item.start + ' – ' + item.end;
    const detail = isLeave ? item.type + ' · ' + item.days + ' ngày' : item.content + ' · ' + item.hours + ' giờ · hệ số ' + item.coefficient;
    const search = [item.person, item.id, item.status, detail].join(' ').toLowerCase();
    return '<article class="ff-request-card" data-filter-card data-search="' + escapeHTML(search) + '" data-status="' + escapeHTML(item.status) + '">' +
      '<div class="ff-request-main"><div class="ff-item-top"><div><span class="ff-code">' + escapeHTML(item.id) + '</span><h3>' + escapeHTML(item.person) + '</h3></div>' + badge(item.status) + '</div>' +
      '<p class="ff-meta">▣ ' + escapeHTML(dateText) + '</p><p>' + escapeHTML(detail) + '</p><p class="ff-muted">' + escapeHTML(item.reason) + '</p></div>' +
      '<div class="ff-card-actions"><button class="ff-btn ff-btn-soft" data-action="view-request" data-id="' + escapeHTML(item.id) + '">Chi tiết</button>' +
      (approvalMode && item.status === 'Chờ duyệt' ? '<button class="ff-btn ff-btn-danger-soft" data-action="reject-request" data-id="' + escapeHTML(item.id) + '">Từ chối</button><button class="ff-btn ff-btn-primary" data-action="approve-request" data-id="' + escapeHTML(item.id) + '">Duyệt</button>' : '') +
      (!approvalMode && item.status === 'Chờ duyệt' ? '<button class="ff-btn ff-btn-danger-soft" data-action="cancel-request" data-id="' + escapeHTML(item.id) + '">Hủy yêu cầu</button>' : '') + '</div></article>';
  }

  function renderLeave(view, state) {
    if (view === 'requests' || view === 'approvals') {
      const approvalMode = view === 'approvals';
      const records = approvalMode ? state.requests.filter(function (item) { return item.status === 'Chờ duyệt'; }) : state.requests;
      return panelHeader(approvalMode ? 'Phê duyệt đơn nghỉ' : 'Đơn nghỉ của tôi', approvalMode ? 'Dữ liệu giả định để thử quy trình duyệt hoặc từ chối.' : 'Bạn có thể mở chi tiết và hủy các đơn đang chờ.', approvalMode ? '' : '<button class="ff-btn ff-btn-primary" data-action="go-dashboard">＋ Tạo đơn mới</button>') +
        filterBar('Tìm người gửi hoặc mã đơn...', approvalMode ? null : ['Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã hủy']) +
        '<div class="ff-list" data-filter-list>' + (records.map(function (item) { return requestCard(item, 'leave', approvalMode); }).join('') || emptyState('Hiện không còn đơn nghỉ nào đang chờ duyệt.')) + '</div><div data-filter-empty hidden>' + emptyState('Không tìm thấy đơn phù hợp.') + '</div>';
    }

    const approved = state.requests.filter(function (item) { return item.status === 'Đã duyệt'; }).reduce(function (sum, item) { return sum + Number(item.days || 0); }, 0);
    const timeline = state.requests.slice().sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).map(function (item) {
      return '<article class="ff-timeline-item"><span class="ff-timeline-dot ' + statusClass(item.status) + '"></span><div><div class="ff-item-top"><strong>' + escapeHTML(item.person + ' · ' + item.id) + '</strong>' + badge(item.status) + '</div><p>' + escapeHTML(item.type + ', ' + formatDate(item.start) + ' – ' + formatDate(item.end)) + '</p><small>Cập nhật ' + escapeHTML(formatDateTime(item.createdAt)) + '</small></div></article>';
    }).join('');
    return panelHeader('Lịch sử nghỉ phép', 'Theo dõi trạng thái các yêu cầu trên thiết bị này.', '<button class="ff-btn ff-btn-soft" data-action="export-requests">⇩ Xuất CSV</button>') +
      '<div class="ff-stats"><div><span>Tổng yêu cầu</span><strong>' + state.requests.length + '</strong></div><div><span>Ngày đã duyệt</span><strong>' + approved + '</strong></div><div><span>Đang chờ</span><strong>' + state.requests.filter(function (item) { return item.status === 'Chờ duyệt'; }).length + '</strong></div></div>' +
      '<div class="ff-timeline">' + timeline + '</div>';
  }

  function renderTime(view, state) {
    if (view === 'attendance') {
      const openRecord = state.attendance.find(function (item) { return !item.checkOut; });
      const rows = state.attendance.map(function (item) {
        return '<tr><td>' + escapeHTML(formatDate(item.date)) + '</td><td>' + escapeHTML(item.checkIn || '—') + '</td><td>' + escapeHTML(item.checkOut || '—') + '</td><td>' + badge(item.status || (item.checkOut ? 'Đủ giờ' : 'Đang làm việc')) + '</td></tr>';
      }).join('');
      return panelHeader('Chấm công', 'Nhấn nút để mô phỏng ghi nhận thời gian thực trên thiết bị.') +
        '<div class="ff-attendance-hero"><div><span>Thời gian hiện tại</span><strong class="ff-live-time">--:--:--</strong><small>' + escapeHTML(new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })) + '</small></div><div class="ff-attendance-actions">' +
        '<button class="ff-btn ff-btn-primary ff-btn-large" data-action="check-in" ' + (openRecord ? 'disabled' : '') + '>▶ Check-in</button><button class="ff-btn ff-btn-soft ff-btn-large" data-action="check-out" ' + (!openRecord ? 'disabled' : '') + '>■ Check-out</button></div></div>' +
        '<div class="ff-table-wrap"><table class="ff-table"><thead><tr><th>Ngày</th><th>Giờ vào</th><th>Giờ ra</th><th>Trạng thái</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    if (view === 'tasks') {
      const done = state.tasks.filter(function (task) { return task.done; }).length;
      const percent = state.tasks.length ? Math.round(done / state.tasks.length * 100) : 0;
      const tasks = state.tasks.map(function (task) {
        return '<article class="ff-task ' + (task.done ? 'is-done' : '') + '"><label><input type="checkbox" data-action="toggle-task" data-id="' + escapeHTML(task.id) + '" ' + (task.done ? 'checked' : '') + '><span></span></label><div><strong>' + escapeHTML(task.title) + '</strong><small>Ưu tiên: ' + escapeHTML(task.priority) + '</small></div><button class="ff-icon-btn is-danger" data-action="delete-task" data-id="' + escapeHTML(task.id) + '" aria-label="Xóa công việc">×</button></article>';
      }).join('');
      return panelHeader('Tiến độ công việc', 'Thêm và đánh dấu hoàn thành để cập nhật tỷ lệ tức thời.') +
        '<div class="ff-progress-card"><div><strong>' + percent + '%</strong><span>' + done + '/' + state.tasks.length + ' công việc hoàn thành</span></div><div class="ff-progress"><i style="width:' + percent + '%"></i></div></div>' +
        '<form class="ff-inline-form ff-task-form" data-form="add-task"><input name="title" required maxlength="140" placeholder="Nhập công việc mới..."><select name="priority"><option>Vừa</option><option>Cao</option><option>Thấp</option></select><button class="ff-btn ff-btn-primary">Thêm công việc</button></form><div class="ff-task-list">' + (tasks || emptyState('Chưa có công việc nào.')) + '</div>';
    }

    const totalHours = state.worklogs.reduce(function (sum, item) { return sum + Number(item.hours || 0); }, 0);
    const averageProgress = state.worklogs.length ? Math.round(state.worklogs.reduce(function (sum, item) { return sum + Number(item.progress || 0); }, 0) / state.worklogs.length) : 0;
    const bars = state.worklogs.slice(0, 7).reverse().map(function (item) {
      const height = Math.min(100, Math.max(8, Number(item.hours || 0) / 10 * 100));
      return '<div class="ff-bar"><i style="height:' + height + '%"></i><span>' + escapeHTML(formatDate(item.date).slice(0, 5)) + '</span><b>' + escapeHTML(item.hours) + 'h</b></div>';
    }).join('');
    return panelHeader('Báo cáo thời gian', 'Số liệu tổng hợp từ các lần ghi nhận mô phỏng.', '<button class="ff-btn ff-btn-soft" data-action="export-time">⇩ Xuất CSV</button>') +
      '<div class="ff-stats"><div><span>Tổng giờ ghi nhận</span><strong>' + totalHours + 'h</strong></div><div><span>Tiến độ trung bình</span><strong>' + averageProgress + '%</strong></div><div><span>Số ngày làm việc</span><strong>' + state.worklogs.length + '</strong></div></div>' +
      '<section class="ff-chart-card"><div class="ff-section-title"><strong>Giờ làm việc theo ngày</strong><span>Dữ liệu mô phỏng</span></div><div class="ff-bars">' + (bars || emptyState('Hãy ghi nhận ngày làm việc từ Dashboard.')) + '</div></section>';
  }

  function renderOvertime(view, state) {
    if (view === 'requests' || view === 'approvals') {
      const approvalMode = view === 'approvals';
      const records = approvalMode ? state.requests.filter(function (item) { return item.status === 'Chờ duyệt'; }) : state.requests;
      return panelHeader(approvalMode ? 'Phê duyệt tăng ca' : 'Đề nghị tăng ca', approvalMode ? 'Duyệt hoặc từ chối các đề nghị đang chờ.' : 'Theo dõi và quản lý các đề nghị đã gửi.', approvalMode ? '' : '<button class="ff-btn ff-btn-primary" data-action="go-dashboard">＋ Tạo đề nghị</button>') +
        filterBar('Tìm người gửi, nội dung hoặc mã...', approvalMode ? null : ['Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Đã hủy']) +
        '<div class="ff-list" data-filter-list>' + (records.map(function (item) { return requestCard(item, 'overtime', approvalMode); }).join('') || emptyState('Hiện không có đề nghị tăng ca đang chờ duyệt.')) + '</div><div data-filter-empty hidden>' + emptyState('Không tìm thấy đề nghị phù hợp.') + '</div>';
    }

    const approved = state.requests.filter(function (item) { return item.status === 'Đã duyệt'; });
    const total = approved.reduce(function (sum, item) { return sum + Number(item.hours || 0); }, 0);
    const maxHours = Math.max.apply(null, state.requests.map(function (item) { return Number(item.hours || 0); }).concat([1]));
    const bars = state.requests.map(function (item) {
      return '<div class="ff-horizontal-row"><span>' + escapeHTML(item.person) + '</span><div><i style="width:' + Math.round(Number(item.hours || 0) / maxHours * 100) + '%"></i></div><strong>' + escapeHTML(item.hours) + 'h</strong></div>';
    }).join('');
    return panelHeader('Tổng hợp tăng ca', 'Số liệu giả định giúp mô phỏng báo cáo quản trị.', '<button class="ff-btn ff-btn-soft" data-action="export-requests">⇩ Xuất CSV</button>') +
      '<div class="ff-stats"><div><span>Tổng đề nghị</span><strong>' + state.requests.length + '</strong></div><div><span>Giờ đã duyệt</span><strong>' + total + 'h</strong></div><div><span>Đang chờ</span><strong>' + state.requests.filter(function (item) { return item.status === 'Chờ duyệt'; }).length + '</strong></div></div>' +
      '<section class="ff-chart-card"><div class="ff-section-title"><strong>Thời lượng theo đề nghị</strong><span>Đơn vị: giờ</span></div><div class="ff-horizontal-bars">' + bars + '</div></section>';
  }

  function renderCurrent() {
    if (!controller || controller.view === 'dashboard') return;
    controller.state = readState(controller.type);
    const renderers = { meeting: renderMeeting, leave: renderLeave, time: renderTime, overtime: renderOvertime };
    controller.panel.innerHTML = renderers[controller.type](controller.view, controller.state);
    updateClock();
  }

  function showView(view) {
    if (!controller) return;
    const keys = VIEW_KEYS[controller.type];
    if (keys.indexOf(view) === -1) view = 'dashboard';
    controller.view = view;

    controller.menuItems.forEach(function (item, index) {
      const active = keys[index] === view;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const copy = VIEW_COPY[controller.type][view];
    controller.heading.textContent = copy[0];
    controller.subheading.textContent = copy[1];
    const dashboard = view === 'dashboard';
    controller.workspace.hidden = !dashboard;
    controller.panel.hidden = dashboard;
    if (!dashboard) renderCurrent();
    controller.main.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function notify(title, message) {
    let toast = document.querySelector('.demo-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'demo-toast';
      toast.innerHTML = '<div class="demo-toast-icon">✓</div><div><strong data-toast-title></strong><span data-toast-message></span></div>';
      document.body.appendChild(toast);
    }
    const titleNode = toast.querySelector('[data-toast-title]');
    const messageNode = toast.querySelector('[data-toast-message]');
    if (titleNode) titleNode.textContent = title;
    if (messageNode) messageNode.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toast._ffTimer);
    toast._ffTimer = window.setTimeout(function () { toast.classList.remove('is-visible'); }, 3600);
  }

  function ensureModal() {
    if (document.querySelector('.ff-modal')) return;
    const modal = document.createElement('div');
    modal.className = 'ff-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = '<div class="ff-modal-card"><button class="ff-modal-close" type="button" data-modal-close aria-label="Đóng">×</button><div class="ff-modal-icon">✓</div><h2 data-modal-title></h2><div class="ff-modal-content" data-modal-content></div><button class="ff-btn ff-btn-primary ff-modal-done" type="button" data-modal-close>Đóng</button></div>';
    modal.addEventListener('click', function (event) {
      if (event.target === modal || event.target.closest('[data-modal-close]')) closeModal();
    });
    document.body.appendChild(modal);
  }

  function openModal(title, html, icon) {
    ensureModal();
    const modal = document.querySelector('.ff-modal');
    modal.querySelector('[data-modal-title]').textContent = title;
    modal.querySelector('[data-modal-content]').innerHTML = html;
    modal.querySelector('.ff-modal-icon').textContent = icon || '✓';
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    modal.querySelector('[data-modal-close]').focus();
  }

  function closeModal() {
    const modal = document.querySelector('.ff-modal');
    if (modal) modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function findRequest(id) {
    return controller.state.requests.find(function (item) { return item.id === id; });
  }

  function viewRequest(item) {
    const isLeave = controller.type === 'leave';
    const rows = isLeave ? [
      ['Mã đơn', item.id], ['Người gửi', item.person], ['Loại nghỉ', item.type],
      ['Thời gian', formatDate(item.start) + ' – ' + formatDate(item.end)], ['Số ngày', item.days + ' ngày'], ['Lý do', item.reason]
    ] : [
      ['Mã đề nghị', item.id], ['Người gửi', item.person], ['Ngày', formatDate(item.date)],
      ['Thời gian', item.start + ' – ' + item.end], ['Số giờ', item.hours + ' giờ'], ['Nội dung', item.content], ['Lý do', item.reason]
    ];
    openModal(isLeave ? 'Chi tiết đơn nghỉ' : 'Chi tiết đề nghị tăng ca', '<div class="ff-detail-grid">' + rows.map(function (row) {
      return '<div><span>' + escapeHTML(row[0]) + '</span><strong>' + escapeHTML(row[1]) + '</strong></div>';
    }).join('') + '<div><span>Trạng thái</span>' + badge(item.status) + '</div></div>', '▤');
  }

  function updateRequest(id, status) {
    const item = findRequest(id);
    if (!item) return;
    item.status = status;
    item.updatedAt = new Date().toISOString();
    writeState(controller.type, controller.state);
    renderCurrent();
    notify('Đã cập nhật trạng thái', item.id + ' · ' + status);
  }

  function filterCards() {
    const search = (controller.panel.querySelector('[data-filter-search]') || {}).value || '';
    const status = (controller.panel.querySelector('[data-filter-status]') || {}).value || '';
    let visible = 0;
    controller.panel.querySelectorAll('[data-filter-card]').forEach(function (card) {
      const matchSearch = !search || String(card.dataset.search || '').indexOf(search.toLowerCase().trim()) !== -1;
      const matchStatus = !status || card.dataset.status === status;
      const show = matchSearch && matchStatus;
      card.hidden = !show;
      if (show) visible += 1;
    });
    const empty = controller.panel.querySelector('[data-filter-empty]');
    if (empty) empty.hidden = visible !== 0;
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob(['\ufeff' + content], { type: mime || 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function csvValue(value) {
    return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
  }

  function exportRequests() {
    const isLeave = controller.type === 'leave';
    const header = isLeave ? ['Mã', 'Người gửi', 'Loại nghỉ', 'Từ ngày', 'Đến ngày', 'Số ngày', 'Trạng thái'] : ['Mã', 'Người gửi', 'Ngày', 'Bắt đầu', 'Kết thúc', 'Số giờ', 'Hệ số', 'Trạng thái'];
    const rows = controller.state.requests.map(function (item) {
      return isLeave ? [item.id, item.person, item.type, item.start, item.end, item.days, item.status] : [item.id, item.person, item.date, item.start, item.end, item.hours, item.coefficient, item.status];
    });
    downloadFile((isLeave ? 'lich-su-nghi-phep' : 'tong-hop-tang-ca') + '.csv', [header].concat(rows).map(function (row) { return row.map(csvValue).join(','); }).join('\n'), 'text/csv;charset=utf-8');
    notify('Đã tạo báo cáo', 'File CSV mô phỏng đã được tải xuống.');
  }

  function exportTime() {
    const rows = [['Mã', 'Nhân sự', 'Ngày', 'Số giờ', 'Tiến độ', 'Công việc']].concat(controller.state.worklogs.map(function (item) {
      return [item.id, item.person, item.date, item.hours, item.progress + '%', item.tasks];
    }));
    downloadFile('bao-cao-thoi-gian.csv', rows.map(function (row) { return row.map(csvValue).join(','); }).join('\n'), 'text/csv;charset=utf-8');
    notify('Đã tạo báo cáo', 'File CSV mô phỏng đã được tải xuống.');
  }

  function updateClock() {
    const node = document.querySelector('.ff-live-time');
    if (node) node.textContent = new Date().toLocaleTimeString('vi-VN');
  }

  function handleAction(button) {
    const action = button.dataset.action;
    const id = button.dataset.id;
    if (action === 'go-dashboard') return showView('dashboard');
    if (action === 'reset-demo') {
      if (window.confirm('Khôi phục toàn bộ dữ liệu mẫu của demo này?')) {
        controller.state = seedState(controller.type);
        writeState(controller.type, controller.state);
        renderCurrent();
        notify('Đã khôi phục dữ liệu mẫu', 'Bạn có thể tiếp tục thử các chức năng.');
      }
      return;
    }
    if (action === 'view-request') return viewRequest(findRequest(id));
    if (action === 'approve-request') return updateRequest(id, 'Đã duyệt');
    if (action === 'reject-request') return updateRequest(id, 'Từ chối');
    if (action === 'cancel-request') {
      if (window.confirm('Bạn muốn hủy yêu cầu ' + id + '?')) updateRequest(id, 'Đã hủy');
      return;
    }
    if (action === 'export-requests') return exportRequests();
    if (action === 'export-time') return exportTime();

    if (action === 'view-meeting' || action === 'join-meeting' || action === 'copy-meeting') {
      const meeting = controller.state.meetings.find(function (item) { return item.id === id; });
      if (!meeting) return;
      if (action === 'copy-meeting') {
        const text = meeting.title + '\n' + formatDate(meeting.date) + ', ' + meeting.start + ' – ' + meeting.end + '\n' + meeting.location;
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).catch(function () {});
        notify('Đã sao chép thông tin', meeting.title);
        return;
      }
      if (action === 'join-meeting') {
        openModal('Đang kết nối cuộc họp', '<p>Đây là thao tác mô phỏng. Hệ thống đã kiểm tra lịch và sẵn sàng mở phòng:</p><div class="ff-join-room"><strong>' + escapeHTML(meeting.title) + '</strong><span>' + escapeHTML(meeting.location) + '</span></div>', '▶');
        return;
      }
      openModal('Chi tiết lịch họp', '<div class="ff-detail-grid"><div><span>Cuộc họp</span><strong>' + escapeHTML(meeting.title) + '</strong></div><div><span>Thời gian</span><strong>' + escapeHTML(formatDate(meeting.date) + ', ' + meeting.start + ' – ' + meeting.end) + '</strong></div><div><span>Hình thức</span><strong>' + escapeHTML(meeting.mode) + '</strong></div><div><span>Địa điểm</span><strong>' + escapeHTML(meeting.location) + '</strong></div><div><span>Người tham dự</span><strong>' + escapeHTML(meeting.participants.join(', ')) + '</strong></div><div><span>Nội dung</span><strong>' + escapeHTML(meeting.agenda) + '</strong></div><div><span>Trạng thái</span>' + badge(meeting.status) + '</div></div>', '▣');
      return;
    }

    if (action === 'remove-member') {
      controller.state.members = controller.state.members.filter(function (member) { return member.id !== id; });
      writeState(controller.type, controller.state);
      renderCurrent();
      notify('Đã xóa thành viên', 'Danh sách mô phỏng đã được cập nhật.');
      return;
    }

    if (action === 'check-in') {
      const now = new Date();
      controller.state.attendance.unshift({ id: makeId('AT'), date: isoDate(0), checkIn: pad(now.getHours()) + ':' + pad(now.getMinutes()), checkOut: '', status: 'Đang làm việc' });
      writeState(controller.type, controller.state);
      renderCurrent();
      notify('Check-in thành công', 'Thời gian vào đã được ghi nhận.');
      return;
    }

    if (action === 'check-out') {
      const record = controller.state.attendance.find(function (item) { return !item.checkOut; });
      if (record) {
        const now = new Date();
        record.checkOut = pad(now.getHours()) + ':' + pad(now.getMinutes());
        record.status = 'Đủ giờ';
        writeState(controller.type, controller.state);
        renderCurrent();
        notify('Check-out thành công', 'Ngày làm việc đã được hoàn tất.');
      }
      return;
    }

    if (action === 'toggle-task') {
      const task = controller.state.tasks.find(function (item) { return item.id === id; });
      if (task) task.done = button.checked;
      writeState(controller.type, controller.state);
      renderCurrent();
      return;
    }

    if (action === 'delete-task') {
      controller.state.tasks = controller.state.tasks.filter(function (item) { return item.id !== id; });
      writeState(controller.type, controller.state);
      renderCurrent();
      notify('Đã xóa công việc', 'Tiến độ đã được tính lại.');
      return;
    }

    if (action === 'export-minutes') {
      const form = controller.panel.querySelector('[data-form="minutes"]');
      const meeting = controller.state.meetings.find(function (item) { return item.id === form.meetingId.value; });
      if (!meeting) return notify('Chưa chọn cuộc họp', 'Hãy chọn một lịch họp trước khi xuất.');
      const content = 'BIÊN BẢN CUỘC HỌP\n\n' + meeting.title + '\nThời gian: ' + formatDate(meeting.date) + ', ' + meeting.start + ' – ' + meeting.end + '\nĐịa điểm: ' + meeting.location + '\n\nNỘI DUNG\n' + form.notes.value + '\n\nQUYẾT ĐỊNH VÀ CÔNG VIỆC TIẾP THEO\n' + form.decisions.value;
      downloadFile('bien-ban-' + meeting.id.toLowerCase() + '.txt', content);
      notify('Đã xuất biên bản', 'File TXT mô phỏng đã được tải xuống.');
    }
  }

  function handleForm(form) {
    const kind = form.dataset.form;
    const data = new FormData(form);
    if (kind === 'add-member') {
      controller.state.members.unshift({ id: makeId('MB'), name: String(data.get('name')).trim(), email: String(data.get('email')).trim(), role: String(data.get('role')), presence: 'Ngoại tuyến' });
      writeState(controller.type, controller.state);
      renderCurrent();
      notify('Đã thêm thành viên', String(data.get('name')).trim());
      return;
    }
    if (kind === 'add-task') {
      controller.state.tasks.unshift({ id: makeId('TS'), title: String(data.get('title')).trim(), priority: String(data.get('priority')), done: false });
      writeState(controller.type, controller.state);
      renderCurrent();
      notify('Đã thêm công việc', String(data.get('title')).trim());
      return;
    }
    if (kind === 'minutes') {
      const meetingId = String(data.get('meetingId'));
      if (!meetingId) return;
      controller.state.minutes[meetingId] = { notes: String(data.get('notes') || '').trim(), decisions: String(data.get('decisions') || '').trim(), updatedAt: new Date().toISOString() };
      writeState(controller.type, controller.state);
      notify('Đã lưu biên bản', 'Nội dung được lưu trên trình duyệt này.');
      openModal('Lưu biên bản thành công', '<p>Nội dung cuộc họp đã được ghi nhận. Bạn có thể mở lại, chỉnh sửa hoặc xuất thành file TXT.</p>', '✓');
    }
  }

  function populateMinutes(select) {
    const form = select.closest('form');
    const saved = controller.state.minutes[select.value] || { notes: '', decisions: '' };
    form.notes.value = saved.notes;
    form.decisions.value = saved.decisions;
  }

  function handleSubmitted(event) {
    if (!controller || !event.detail || event.detail.type !== controller.type) return;
    const detail = event.detail;
    const values = detail.values;
    const record = detail.record;
    if (controller.type === 'meeting') {
      controller.state.meetings.unshift({ id: record.code, title: values.meetingTitle, date: values.meetingDate, start: values.startTime, end: values.endTime, mode: values.meetingMode === 'online' ? 'Trực tuyến' : values.meetingMode === 'hybrid' ? 'Kết hợp' : 'Trực tiếp', location: values.location, participants: String(values.participants).split(/[,;\n]+/).map(function (item) { return item.trim(); }).filter(Boolean), agenda: values.agenda, status: 'Sắp diễn ra' });
    } else if (controller.type === 'leave') {
      const leaveLabels = { annual: 'Nghỉ phép năm', personal: 'Nghỉ việc riêng', sick: 'Nghỉ ốm', other: 'Loại nghỉ khác' };
      controller.state.requests.unshift({ id: record.code, person: values.fullName, type: leaveLabels[values.leaveType] || values.leaveType, start: values.startDate, end: values.endDate, days: countDays(values.startDate, values.endDate), reason: values.reason, status: 'Chờ duyệt', createdAt: new Date().toISOString() });
    } else if (controller.type === 'time') {
      controller.state.worklogs.unshift({ id: record.code, person: values.fullName, date: values.workDate, hours: calculateHours(values.startTime, values.endTime, false), progress: Number(values.progress || 0), tasks: values.tasks });
    } else if (controller.type === 'overtime') {
      const hours = calculateHours(values.startTime, values.endTime, true);
      controller.state.requests.unshift({ id: record.code, person: values.fullName, date: values.overtimeDate, start: values.startTime, end: values.endTime, hours: hours, coefficient: detail.computed.coefficient, content: values.workContent, reason: values.reason, status: 'Chờ duyệt', createdAt: new Date().toISOString() });
    }
    writeState(controller.type, controller.state);
  }

  function initialize() {
    const form = document.querySelector('.demo-form[data-demo-type]');
    if (!form || !VIEW_KEYS[form.dataset.demoType]) return;
    const main = form.closest('.main');
    const workspace = main.querySelector('.interactive-workspace');
    const panel = document.createElement('section');
    panel.className = 'ff-panel';
    panel.hidden = true;
    panel.setAttribute('aria-live', 'polite');
    workspace.insertAdjacentElement('afterend', panel);

    controller = {
      type: form.dataset.demoType,
      state: readState(form.dataset.demoType),
      view: 'dashboard',
      main: main,
      workspace: workspace,
      panel: panel,
      menuItems: Array.prototype.slice.call(form.closest('.dashboard').querySelectorAll('.menu-item')),
      heading: main.querySelector('.interactive-heading strong'),
      subheading: main.querySelector('.interactive-heading span')
    };

    controller.menuItems.forEach(function (item, index) {
      const view = VIEW_KEYS[controller.type][index];
      item.dataset.view = view;
      item.setAttribute('role', 'tab');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      item.addEventListener('click', function () { showView(view); });
      item.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          showView(view);
        }
      });
    });

    panel.addEventListener('click', function (event) {
      const button = event.target.closest('[data-action]');
      if (button && !button.matches('input[type="checkbox"]')) handleAction(button);
    });
    panel.addEventListener('input', function (event) {
      if (event.target.matches('[data-filter-search]')) filterCards();
    });
    panel.addEventListener('change', function (event) {
      if (event.target.matches('[data-filter-status]')) filterCards();
      if (event.target.matches('[data-minutes-select]')) populateMinutes(event.target);
      if (event.target.matches('[data-action="toggle-task"]')) handleAction(event.target);
    });
    panel.addEventListener('submit', function (event) {
      const featureForm = event.target.closest('[data-form]');
      if (!featureForm) return;
      event.preventDefault();
      if (!featureForm.checkValidity()) return featureForm.reportValidity();
      handleForm(featureForm);
    });

    document.addEventListener('eiu-demo:submitted', handleSubmitted);
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeModal(); });
    clockTimer = window.setInterval(updateClock, 1000);
    window.addEventListener('pagehide', function () { window.clearInterval(clockTimer); }, { once: true });
    ensureModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
