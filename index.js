const express = require('express');
const bodyParser = require('body-parser');

// Configuration de la base de données
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});

// Afficher les informations de connexion à la base de données
console.log('Database Credentials:');
console.log('User:', process.env.PGUSER);
console.log('Host:', process.env.PGHOST);
console.log('Database:', process.env.PGDATABASE);
console.log('Password:', process.env.PGPASSWORD ? '*****' : 'Not set'); // Masquer le mot de passe pour des raisons de sécurité
console.log('Port:', process.env.PGPORT);

// Créer une application Express
const app = express();
app.use(bodyParser.json());

// Fonction pour tester la connexion à la base de données
async function testDbConnection() {
  try {
    const client = await pool.connect(); // Tente de se connecter à la base de données
    console.log('Connexion à la base de données réussie !');
    client.release(); // Libère le client
  } catch (err) {
    console.error('Erreur de connexion à la base de données :', err);
    process.exit(1); // Quitte l'application en cas d'erreur
  }
}

// Endpoint pour le webhook de Dialogflow
app.post('/webhook', async (req, res) => {
  const intentName = req.body.queryResult.intent.displayName;

  try {
    let responseText = '';

    // Gérer les différentes intentions
    switch (intentName) {
      case 'RechercheParType':
        const typePropriete = req.body.queryResult.parameters['type-propriete'];
        const resultType = await pool.query(
          'SELECT * FROM proprietes WHERE type_propriete_id = (SELECT id FROM types_propriete WHERE nom = $1)',
          [typePropriete]
        );
        responseText = resultType.rows.length > 0
          ? `Voici les propriétés de type ${typePropriete}: ${JSON.stringify(resultType.rows)}`
          : `Aucune propriété trouvée pour le type ${typePropriete}.`;
        break;

      case 'RechercheParVille':
        const ville = req.body.queryResult.parameters['ville'];
        const resultVille = await pool.query(
          'SELECT * FROM proprietes WHERE ville_id = (SELECT id FROM villes WHERE nom = $1)',
          [ville]
        );
        responseText = resultVille.rows.length > 0
          ? `Voici les propriétés à ${ville}: ${JSON.stringify(resultVille.rows)}`
          : `Aucune propriété trouvée à ${ville}.`;
        break;

      // Ajoutez d'autres intentions ici...

      default:
        responseText = 'Je ne comprends pas cette requête.';
        break;
    }

    // Envoyer la réponse à Dialogflow
    res.json({
      fulfillmentText: responseText,
    });
  } catch (err) {
    console.error('Erreur lors de la requête à la base de données :', err);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;

// Vérifier la connexion à la base de données uniquement en production (sur Render)
if (process.env.NODE_ENV === 'production') {
  testDbConnection().then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur webhook en écoute sur le port ${PORT}`);
    });
  });
} else {
  // En local, démarrer le serveur sans vérifier la connexion à la base de données
  app.listen(PORT, () => {
    console.log(`Serveur webhook en écoute sur le port ${PORT}`);
  });
}
