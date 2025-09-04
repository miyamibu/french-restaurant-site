// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('#nav');
if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
}

// Footer year
const y = document.getElementById('y');
if (y) y.textContent = String(new Date().getFullYear());

// Reservation form
const form = document.getElementById('reservation-form');
if (form) {
  const result = document.getElementById('form-result');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Basic validation helpers
    const fd = new FormData(form);
    const date = fd.get('date');
    const time = fd.get('time');
    const size = Number(fd.get('size'));
    const name = (fd.get('name') || '').toString().trim();
    const tel = (fd.get('tel') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const policy = document.getElementById('policy');

    let error = '';
    // Date not in the past
    if (date) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const chosen = new Date(date + 'T00:00:00');
      if (chosen < today) error = '過去の日付は選択できません。';
    } else {
      error = '日付を選択してください。';
    }

    // Time window check (11:30 - 21:00)
    if (!error && time) {
      const [h, m] = time.split(':').map(Number);
      const minutes = h * 60 + m;
      if (minutes < 11 * 60 + 30 || minutes > 21 * 60) {
        error = 'ご予約時間は11:30〜21:00の間でご指定ください。';
      }
    } else if (!error) {
      error = '時間を入力してください。';
    }

    if (!error && (!Number.isFinite(size) || size < 1 || size > 8)) {
      error = '人数は1〜8名でご指定ください。';
    }
    if (!error && name.length < 1) error = 'お名前を入力してください。';
    if (!error && !/^[0-9\-\+ ]{9,}$/.test(tel)) error = '電話番号の形式をご確認ください。';
    if (!error && !/^\S+@\S+\.\S+$/.test(email)) error = 'メールアドレスの形式をご確認ください。';
    if (!error && policy && !policy.checked) error = '利用規約への同意が必要です。';

    if (result) {
      result.hidden = false;
      if (error) {
        result.textContent = '送信できません: ' + error;
        result.classList.add('error');
      } else {
        result.classList.remove('error');
        result.textContent = '予約リクエストを受け付けました。スタッフより確認のご連絡を差し上げます（この時点では確定ではありません）。お急ぎの場合は 03-1234-5678 までお電話ください。';
        form.reset();
      }
    }
  });
}

