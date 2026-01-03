const childForm = document.getElementById('child-form');
const choreForm = document.getElementById('chore-form');
const parentsChildren = document.getElementById('parents-children');

const formatCurrency = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} kr`;

const sparkle = (target) => {
  const sparkleDot = document.createElement('span');
  sparkleDot.className = 'sparkle';
  sparkleDot.style.left = `${Math.random() * 80 + 10}%`;
  sparkleDot.style.top = '10px';
  target.appendChild(sparkleDot);
  setTimeout(() => sparkleDot.remove(), 700);
};

const loadChildren = async () => {
  const response = await fetch('/api/children');
  const children = await response.json();
  parentsChildren.innerHTML = '';

  children.forEach((child) => {
    const card = document.createElement('div');
    card.className = 'card kid-card';

    card.innerHTML = `
      <img src="${child.profileUrl}" alt="${child.name}">
      <div class="kid-name">${child.name}</div>
      <div class="total-value">${formatCurrency(child.totalCents)}</div>
      <button type="button" data-id="${child.id}">Utbetal nå</button>
    `;

    const button = card.querySelector('button');
    button.addEventListener('click', async () => {
      button.disabled = true;
      const payoutResponse = await fetch(`/api/children/${child.id}/payout`, {
        method: 'POST'
      });
      const payoutData = await payoutResponse.json();
      alert(`Utbetaling klar! Beløp: ${formatCurrency(payoutData.paidCents)} (gi kontant fysisk).`);
      sparkle(card);
      await loadChildren();
    });

    parentsChildren.appendChild(card);
  });
};

childForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('child-name').value.trim();
  const profileUrl = document.getElementById('child-photo').value.trim();

  const response = await fetch('/api/children', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, profileUrl })
  });

  if (response.ok) {
    childForm.reset();
    await loadChildren();
  } else {
    const data = await response.json();
    alert(data.message || 'Kunne ikke legge til barn.');
  }
});

choreForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const title = document.getElementById('chore-title').value.trim();
  const value = Number(document.getElementById('chore-value').value);
  const frequency = document.getElementById('chore-frequency').value;

  const response = await fetch('/api/chores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, valueCents: value * 100, frequency })
  });

  if (response.ok) {
    choreForm.reset();
    alert('Oppgaven er lagt til for alle barn!');
  } else {
    const data = await response.json();
    alert(data.message || 'Kunne ikke legge til oppgave.');
  }
});

loadChildren();
