/* Học phí EIU — mốc thời gian tuyệt đối theo GMT+7, không phụ thuộc timezone máy. */
(function (global) {
  'use strict';
  const EARLY_BIRD_CUTOFF_MS = Date.parse('2026-10-26T00:00:00+07:00');
  const FULL_TUITION = 2000000;
  const EARLY_BIRD_TUITION = 1000000;

  function isEarlyBirdActive(now) {
    return (now === undefined ? Date.now() : Number(now)) < EARLY_BIRD_CUTOFF_MS;
  }

  function isEiuEmail(email) {
    return /@eiu\.edu\.vn$/i.test(String(email || '').trim());
  }

  function calculate(email, now) {
    const earlyBird = isEarlyBirdActive(now);
    const eiu = isEiuEmail(email);
    const baseTuition = earlyBird ? EARLY_BIRD_TUITION : FULL_TUITION;
    return {
      earlyBird: earlyBird,
      eiu: eiu,
      baseTuition: baseTuition,
      tuition: eiu ? baseTuition * 0.5 : baseTuition
    };
  }

  function format(amount) {
    return Number(amount).toLocaleString('vi-VN') + ' đồng';
  }

  global.EiuCoursePricing = Object.freeze({
    calculate: calculate,
    format: format,
    isEarlyBirdActive: isEarlyBirdActive,
    isEiuEmail: isEiuEmail
  });
})(window);
