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

// Fonction utilitaire pour récupérer la valeur canonique d'une entité
function getCanonicalValue(outputContexts, entityName) {
  if (!outputContexts || !outputContexts[0] || !outputContexts[0].parameters[`${entityName}.original`]) {
    return null; // Aucune valeur canonique trouvée
  }
  return outputContexts[0].parameters[`${entityName}.original`];
}

// Endpoint pour le webhook de Dialogflow
app.post('/webhook', async (req, res) => {
  const intentName = req.body.queryResult.intent.displayName;
  const outputContexts = req.body.queryResult.outputContexts;

  try {
    let responseText = '';

    // Gérer les différentes intentions
    switch (intentName) {
      case 'RechercheParType':
        const typePropriete = getCanonicalValue(outputContexts, 'type-propriete') || req.body.queryResult.parameters['type-propriete'];
        if (!typePropriete) {
          return res.json({
            fulfillmentText: "Désolé, je n'ai pas pu comprendre le type de propriété. Veuillez réessayer.",
          });
        }

        const queryType = `SELECT * FROM proprietes WHERE type_propriete_id = (SELECT id FROM types_propriete WHERE nom = ?)`;
        db.all(queryType, [typePropriete], (err, rows) => {
          if (err) {
            console.error('Erreur SQL :', err);
            return res.status(500).json({
              fulfillmentText: "Désolé, une erreur s'est produite lors de la recherche. Veuillez réessayer plus tard.",
            });
          }

          if (rows.length > 0) {
            responseText = `Voici les propriétés de type "${typePropriete}":\n`;
            rows.forEach((row) => {
              responseText += `- Caractéristiques: ${row.caracteristiques}\n`;
              responseText += `  Budget: ${row.budget} €\n`;
              responseText += `  Surface: ${row.surface} m²\n`;
              responseText += `  Pièces: ${row.pieces}\n`;
              responseText += `  Type de marché: ${row.type_marche}\n\n`;
            });
          } else {
            responseText = `Aucune propriété trouvée pour le type "${typePropriete}".`;
          }

          res.json({ fulfillmentText: responseText });
        });
        return; // Important : retourner ici pour éviter d'envoyer une réponse deux fois

      case 'RechercheParVille':
        const ville = getCanonicalValue(outputContexts, 'ville') || req.body.queryResult.parameters['ville'];
        if (!ville) {
          return res.json({
            fulfillmentText: "Désolé, je n'ai pas pu comprendre la ville demandée. Veuillez réessayer.",
          });
        }

        const queryVille = `SELECT * FROM proprietes WHERE ville_id = (SELECT id FROM villes WHERE nom = ?)`;
        db.all(queryVille, [ville], (err, rows) => {
          if (err) {
            console.error('Erreur SQL :', err);
            return res.status(500).json({
              fulfillmentText: "Désolé, une erreur s'est produite lors de la recherche. Veuillez réessayer plus tard.",
            });
          }

          if (rows.length > 0) {
            responseText = `Voici les propriétés disponibles à "${ville}":\n`;
            rows.forEach((row) => {
              responseText += `- Caractéristiques: ${row.caracteristiques}\n`;
              responseText += `  Budget: ${row.budget} €\n`;
              responseText += `  Surface: ${row.surface} m²\n`;
              responseText += `  Pièces: ${row.pieces}\n`;
              responseText += `  Type de marché: ${row.type_marche}\n\n`;
            });
          } else {
            responseText = `Aucune propriété trouvée à "${ville}".`;
          }

          res.json({ fulfillmentText: responseText });
        });
        return;

      case 'RechercheParEquipement':
        const equipement = getCanonicalValue(outputContexts, 'equipement') || req.body.queryResult.parameters['equipement'];
        if (!equipement) {
          return res.json({
            fulfillmentText: "Désolé, je n'ai pas pu comprendre l'équipement demandé. Veuillez réessayer.",
          });
        }

        const queryEquipement = `SELECT * FROM proprietes WHERE equipement_id = (SELECT id FROM equipements WHERE nom = ?)`;
        db.all(queryEquipement, [equipement], (err, rows) => {
          if (err) {
            console.error('Erreur SQL :', err);
            return res.status(500).json({
              fulfillmentText: "Désolé, une erreur s'est produite lors de la recherche. Veuillez réessayer plus tard.",
            });
          }

          if (rows.length > 0) {
            responseText = `Voici les propriétés avec l'équipement "${equipement}":\n`;
            rows.forEach((row) => {
              responseText += `- Caractéristiques: ${row.caracteristiques}\n`;
              responseText += `  Budget: ${row.budget} €\n`;
              responseText += `  Surface: ${row.surface} m²\n`;
              responseText += `  Pièces: ${row.pieces}\n`;
              responseText += `  Type de marché: ${row.type_marche}\n\n`;
            });
          } else {
            responseText = `Aucune propriété trouvée avec l'équipement "${equipement}".`;
          }

          res.json({ fulfillmentText: responseText });
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
