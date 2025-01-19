const express = require('express');
const bodyParser = require('body-parser');

// Créer une application Express
const app = express();
app.use(bodyParser.json());

// Endpoint pour le webhook de Dialogflow
app.post('/webhook', async (req, res) => {
  const intentName = req.body.queryResult.intent.displayName;

  try {
    let responseText = '';

    // Gérer les différentes intentions
    switch (intentName) {
      case 'RechercheParType':
        const typePropriete = req.body.queryResult.parameters['type-propriete'];
        responseText = `SQL Query: SELECT * FROM proprietes WHERE type_propriete_id = (SELECT id FROM types_propriete WHERE nom = '${typePropriete}')`;
        break;

      case 'RechercheParVille':
        const ville = req.body.queryResult.parameters['ville'];
        responseText = `SQL Query: SELECT * FROM proprietes WHERE ville_id = (SELECT id FROM villes WHERE nom = '${ville}')`;
        break;

      case 'RechercheParEquipement':
        const equipement = req.body.queryResult.parameters['equipement'];
        responseText = `SQL Query: SELECT * FROM proprietes WHERE equipement_id = (SELECT id FROM equipements WHERE nom = '${equipement}')`;
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
    console.error('Erreur lors de la requête :', err);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur webhook en écoute sur le port ${PORT}`);
});
