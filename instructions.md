# Ukelønn – oppsett på Ubuntu

Disse stegene setter opp webappen, database, og konfigurasjon på en Ubuntu-server.

## 1. Installer avhengigheter

```bash
sudo apt update
sudo apt install -y nodejs npm mysql-server
```

## 2. Opprett database og bruker

Logg inn i MySQL og kjør:

```bash
sudo mysql
```

```sql
CREATE USER IF NOT EXISTS 'ukelonn_user'@'localhost' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON ukelonn.* TO 'ukelonn_user'@'localhost';
FLUSH PRIVILEGES;
```

Importer skjemaet:

```bash
mysql -u ukelonn_user -p < /path/to/ukelonn/schema.sql
```

## 3. Konfigurer appen

Oppdater `config.json` med riktig MySQL-tilkobling og port:

```json
{
  "mysql": {
    "host": "localhost",
    "user": "ukelonn_user",
    "password": "change_me",
    "database": "ukelonn"
  },
  "port": 3000
}
```

## 4. Installer Node-avhengigheter

```bash
cd /path/to/ukelonn
npm install
```

## 5. Start appen

```bash
npm start
```

Appen er nå tilgjengelig på `http://<server-ip>:3000`.

## 6. iPad-visning

Åpne `http://<server-ip>:3000/kid.html` på iPad for barnemodus.

## 7. Foreldremodus

Åpne `http://<server-ip>:3000/parent.html` for å legge til barn og oppgaver, og trigge ukelønn.
