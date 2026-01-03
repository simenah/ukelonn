import express from 'express';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

const __dirname = path.resolve();
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const pool = mysql.createPool({
  host: config.mysql.host,
  user: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database,
  waitForConnections: true,
  connectionLimit: 10
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/children', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, profile_url AS profileUrl, total_cents AS totalCents FROM children ORDER BY created_at DESC'
  );
  res.json(rows);
});

app.post('/api/children', async (req, res) => {
  const { name, profileUrl } = req.body;
  if (!name || !profileUrl) {
    return res.status(400).json({ message: 'Navn og bilde er påkrevd.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO children (name, profile_url) VALUES (?, ?)',
      [name, profileUrl]
    );
    const childId = result.insertId;
    await connection.query(
      'INSERT INTO child_chores (child_id, chore_id) SELECT ?, id FROM chores',
      [childId]
    );
    await connection.commit();
    res.json({ id: childId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Kunne ikke legge til barn.' });
  } finally {
    connection.release();
  }
});

app.get('/api/chores', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, title, value_cents AS valueCents, frequency FROM chores ORDER BY created_at DESC'
  );
  res.json(rows);
});

app.post('/api/chores', async (req, res) => {
  const { title, valueCents, frequency } = req.body;
  if (!title || !valueCents || !frequency) {
    return res.status(400).json({ message: 'Tittel, verdi og frekvens er påkrevd.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      'INSERT INTO chores (title, value_cents, frequency) VALUES (?, ?, ?)',
      [title, valueCents, frequency]
    );
    const choreId = result.insertId;
    await connection.query(
      'INSERT INTO child_chores (child_id, chore_id) SELECT id, ? FROM children',
      [choreId]
    );
    await connection.commit();
    res.json({ id: choreId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Kunne ikke legge til oppgave.' });
  } finally {
    connection.release();
  }
});

app.get('/api/children/:id/chores', async (req, res) => {
  const childId = req.params.id;
  const [rows] = await pool.query(
    `SELECT child_chores.id AS childChoreId, chores.title, chores.value_cents AS valueCents, chores.frequency
     FROM child_chores
     JOIN chores ON chores.id = child_chores.chore_id
     WHERE child_chores.child_id = ? AND child_chores.active = 1
     ORDER BY chores.created_at DESC`,
    [childId]
  );
  res.json(rows);
});

app.post('/api/children/:id/complete', async (req, res) => {
  const childId = Number(req.params.id);
  const { childChoreId } = req.body;
  if (!childChoreId) {
    return res.status(400).json({ message: 'Oppgave mangler.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT child_chores.id, chores.value_cents AS valueCents
       FROM child_chores
       JOIN chores ON chores.id = child_chores.chore_id
       WHERE child_chores.id = ? AND child_chores.child_id = ? AND child_chores.active = 1
       FOR UPDATE`,
      [childChoreId, childId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Oppgaven ble ikke funnet.' });
    }

    const valueCents = rows[0].valueCents;

    await connection.query(
      'UPDATE child_chores SET active = 0, completed_at = NOW() WHERE id = ?',
      [childChoreId]
    );
    await connection.query(
      'UPDATE children SET total_cents = total_cents + ? WHERE id = ?',
      [valueCents, childId]
    );
    await connection.commit();
    res.json({ addedCents: valueCents });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Kunne ikke fullføre oppgaven.' });
  } finally {
    connection.release();
  }
});

app.post('/api/children/:id/payout', async (req, res) => {
  const childId = Number(req.params.id);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT total_cents AS totalCents FROM children WHERE id = ? FOR UPDATE',
      [childId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Barnet ble ikke funnet.' });
    }

    const totalCents = rows[0].totalCents;
    if (totalCents > 0) {
      await connection.query(
        'INSERT INTO payouts (child_id, amount_cents) VALUES (?, ?)',
        [childId, totalCents]
      );
    }
    await connection.query('UPDATE children SET total_cents = 0 WHERE id = ?', [childId]);
    await connection.commit();
    res.json({ paidCents: totalCents });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Kunne ikke utbetale.' });
  } finally {
    connection.release();
  }
});

app.listen(config.port, () => {
  console.log(`Ukelønn kjører på http://localhost:${config.port}`);
});
