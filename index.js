const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose(); // Importer sqlite3

// Créer une application Express
const app = express();
app.use(bodyParser.json());

// Connexion à la base de données SQLite
const db = new sqlite3.Database('./biens_immobilier.db', (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données :', err.message);
  } else {
    console.log('Connecté à la base de données SQLite.');
  }
});

// Endpoint pour le webhook de Dialogflow
app.post('/webhook', async (req, res) => {
  const intentName = req.body.queryResult.intent.displayName;

  try {
    let responseText = '';

    // Gérer les différentes intentions
    switch (intentName) {
      case 'RechercheParType':
        const typePropriete = req.body.queryResult.parameters['type-propriete'];
        const queryType = `SELECT * FROM proprietes WHERE type_propriete_id = (SELECT id FROM types_propriete WHERE nom = ?)`;
        db.all(queryType, [typePropriete], (err, rows) => {
          if (err) {
            console.error('Erreur SQL :', err);
            res.status(500).json({ error: 'Erreur lors de la recherche par type.' });
          } else {
            if (rows.length > 0) {
              responseText = `Voici les propriétés de type "${typePropriete}":\n`;
              rows.forEach((row) => {
                responseText += `- ${row.caracteristiques} (${row.budget} €)\n`;
              });
            } else {
              responseText = `Aucune propriété trouvée pour le type "${typePropriete}".`;
            }
            res.json({ fulfillmentText: responseText });
          }
        });
        return; // Important : retourner ici pour éviter d'envoyer une réponse deux fois

      case 'RechercheParVille':
        const ville = req.body.queryResult.parameters['ville'];
        const queryVille = `SELECT * FROM proprietes WHERE ville_id = (SELECT id FROM villes WHERE nom = ?)`;
        db.all(queryVille, [ville], (err, rows) => {
          if (err) {
            console.error('Erreur SQL :', err);
            res.status(500).json({ error: 'Erreur lors de la recherche par ville.' });
          } else {
            if (rows.length > 0) {
              responseText = `Voici les propriétés disponibles à "${ville}":\n`;
              rows.forEach((row) => {
                responseText += `- ${row.caracteristiques} (${row.budget} €)\n`;
              });
            } else {
              responseText = `Aucune propriété trouvée à "${ville}".`;
            }
            res.json({ fulfillmentText: responseText });
          }
        });
        return;

      case 'RechercheParEquipement':
        const equipement = req.body.queryResult.parameters['equipement'];
        const queryEquipement = `SELECT * FROM proprietes WHERE equipement_id = (SELECT id FROM equipements WHERE nom = ?)`;
        db.all(queryEquipement, [equipement], (err, rows) => {
          if (err) {
            console.error('Erreur SQL :', err);
            res.status(500).json({ error: 'Erreur lors de la recherche par équipement.' });
          } else {
            if (rows.length > 0) {
              responseText = `Voici les propriétés avec l'équipement "${equipement}":\n`;
              rows.forEach((row) => {
                responseText += `- ${row.caracteristiques} (${row.budget} €)\n`;
              });
            } else {
              responseText = `Aucune propriété trouvée avec l'équipement "${equipement}".`;
            }
            res.json({ fulfillmentText: responseText });
          }
        });
        return;

      // Ajoutez d'autres intentions ici...

      default:
        responseText = 'Je ne comprends pas cette requête.';
        res.json({ fulfillmentText: responseText });
        break;
    }
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
