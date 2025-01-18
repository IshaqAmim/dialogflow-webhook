const express = require('express');
const bodyParser = require('body-parser');

// Configuration de la base de donn�es
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Cr�er une application Express
const app = express();
app.use(bodyParser.json());

// Fonction pour tester la connexion � la base de donn�es
async function testDbConnection() {
  try {
    const client = await pool.connect(); // Tente de se connecter � la base de donn�es
    console.log('Connexion � la base de donn�es r�ussie !');
    client.release(); // Lib�re le client
  } catch (err) {
    console.error('Erreur de connexion � la base de donn�es :', err);
    process.exit(1); // Quitte l'application en cas d'erreur
  }
}

// Endpoint pour le webhook de Dialogflow
app.post('/webhook', async (req, res) => {
  const intentName = req.body.queryResult.intent.displayName;

  try {
    let responseText = '';

    // G�rer les diff�rentes intentions
    switch (intentName) {
      case 'RechercheParType':
        const typePropriete = req.body.queryResult.parameters['type-propriete'];
        const resultType = await pool.query(
          'SELECT * FROM proprietes WHERE type_propriete_id = (SELECT id FROM types_propriete WHERE nom = $1)',
          [typePropriete]
        );
        responseText = resultType.rows.length > 0
          ? `Voici les propri�t�s de type ${typePropriete}: ${JSON.stringify(resultType.rows)}`
          : `Aucune propri�t� trouv�e pour le type ${typePropriete}.`;
        break;

      case 'RechercheParVille':
        const ville = req.body.queryResult.parameters['ville'];
        const resultVille = await pool.query(
          'SELECT * FROM proprietes WHERE ville_id = (SELECT id FROM villes WHERE nom = $1)',
          [ville]
        );
        responseText = resultVille.rows.length > 0
          ? `Voici les propri�t�s � ${ville}: ${JSON.stringify(resultVille.rows)}`
          : `Aucune propri�t� trouv�e � ${ville}.`;
        break;

      // Ajoutez d'autres intentions ici...

      default:
        responseText = 'Je ne comprends pas cette requ�te.';
        break;
    }

    // Envoyer la r�ponse � Dialogflow
    res.json({
      fulfillmentText: responseText,
    });
  } catch (err) {
    console.error('Erreur lors de la requ�te � la base de donn�es :', err);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// D�marrer le serveur
const PORT = process.env.PORT || 3000;

// V�rifier la connexion � la base de donn�es uniquement en production (sur Render)
if (process.env.NODE_ENV === 'production') {
  testDbConnection().then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur webhook en �coute sur le port ${PORT}`);
    });
  });
} else {
  // En local, d�marrer le serveur sans v�rifier la connexion � la base de donn�es
  app.listen(PORT, () => {
    console.log(`Serveur webhook en �coute sur le port ${PORT}`);
  });
}