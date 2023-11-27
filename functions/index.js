const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cron = require("node-cron");

const serviceAccount = require("../service-account-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://f1-ranks-default-rtdb.europe-west1.firebasedatabase.app",
});

const db = admin.database();

const currentYear = new Date().getFullYear() + 1;
let year = 1950;
let round = 1;

async function fetchDataAndOrganize(year, round) {
  try {
    const response = await fetch(
      `http://ergast.com/api/f1/${year}/${round}/results.json`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const result = await response.json();

    const season = result.MRData.RaceTable.season;
    const roundNumber = result.MRData.RaceTable.round;

    const raceRef = db.ref(`races/${season}/${roundNumber}`);

    result.MRData.RaceTable.Races[0].Results.forEach((result) => {
      const driverName = `${result.Driver.givenName} ${result.Driver.familyName}`;
      const constructor = result.Constructor.name;
      const position = result.position;

      raceRef.push().set({
        driverName,
        constructor,
        position,
      });
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

// Planifie l'exécution de la fonction fetchDataAndOrganize chaque lundi à 00:00
cron.schedule("0 0 * * 1", () => {
  console.log("Running fetchDataAndOrganize");
  while (year < currentYear) {
    if (round <= 25) {
      fetchDataAndOrganize(year, round);
      round++;
    } else {
      year++;
      round = 1;
    }
  }
});

// Expose la fonction comme une Cloud Function
exports.scheduleFetchData = functions.pubsub
  .schedule("0 0 * * 1")
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("Running fetchDataAndOrganize");
    while (year < currentYear) {
      if (round <= 25) {
        await fetchDataAndOrganize(year, round);
        round++;
      } else {
        year++;
        round = 1;
      }
    }
    return null;
  });
