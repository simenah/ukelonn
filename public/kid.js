const kidList = document.getElementById('kid-list');
const kidListSection = document.getElementById('kid-list-section');
const choreSection = document.getElementById('chore-section');
const choreList = document.getElementById('chore-list');
const kidHeader = document.getElementById('kid-header');
const backButton = document.getElementById('back-button');

let activeKid = null;

const formatCurrency = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} kr`;

const launchSparkles = (target) => {
  for (let i = 0; i < 6; i += 1) {
    const sparkle = document.createElement('span');
    sparkle.className = 'sparkle';
    sparkle.style.left = `${Math.random() * 80 + 10}%`;
    sparkle.style.top = `${Math.random() * 20 + 10}px`;
    target.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 700);
  }
};

const loadKids = async () => {
  const response = await fetch('/api/children');
  const kids = await response.json();
  kidList.innerHTML = '';

  kids.forEach((kid) => {
    const card = document.createElement('div');
    card.className = 'card kid-card';

    card.innerHTML = `
      <img src="${kid.profileUrl}" alt="${kid.name}">
      <div class="kid-name">${kid.name}</div>
      <div class="total-value">${formatCurrency(kid.totalCents)}</div>
      <div class="badge">Trykk for oppgaver</div>
    `;

    card.addEventListener('click', () => {
      activeKid = kid;
      showChores();
    });

    kidList.appendChild(card);
  });
};

const showChores = async () => {
  if (!activeKid) return;

  kidListSection.classList.add('hidden');
  choreSection.classList.remove('hidden');
  kidHeader.textContent = `Hei ${activeKid.name}! Velg en oppgave for å tjene ${formatCurrency(activeKid.totalCents)}!`;
  choreList.innerHTML = '';

  const response = await fetch(`/api/children/${activeKid.id}/chores`);
  const chores = await response.json();

  if (chores.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.textContent = 'Ingen oppgaver igjen. Hurra! 🎈';
    choreList.appendChild(empty);
    return;
  }

  chores.forEach((chore) => {
    const button = document.createElement('button');
    button.className = 'chore-button';
    button.innerHTML = `
      ${chore.title}
      <small>${formatCurrency(chore.valueCents)} • ${chore.frequency === 'daily' ? 'Daglig' : 'Ukentlig'}</small>
    `;

    button.addEventListener('click', async () => {
      const completeResponse = await fetch(`/api/children/${activeKid.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childChoreId: chore.childChoreId })
      });

      if (completeResponse.ok) {
        const data = await completeResponse.json();
        activeKid.totalCents += data.addedCents;
        button.remove();
        kidHeader.textContent = `Fantastisk, ${activeKid.name}! Nå har du ${formatCurrency(activeKid.totalCents)}!`;
        launchSparkles(choreList);
      }
    });

    choreList.appendChild(button);
  });
};

backButton.addEventListener('click', () => {
  activeKid = null;
  choreSection.classList.add('hidden');
  kidListSection.classList.remove('hidden');
  loadKids();
});

loadKids();
