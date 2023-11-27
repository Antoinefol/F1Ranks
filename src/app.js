import { getDatabase, ref, get } from "firebase/database";
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBeNv2m1rJudSi_ErfUIcFaEDEEFZT_i90",
  authDomain: "f1-ranks.firebaseapp.com",
  databaseURL:
    "https://f1-ranks-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "f1-ranks",
  storageBucket: "f1-ranks.appspot.com",
  messagingSenderId: "1054286584254",
  appId: "1:1054286584254:web:94ae96922655346a6681ef",
  measurementId: "G-VQKTQ3J6BE",
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Référence à la base de données
const db = getDatabase();

// Fonction pour récupérer les données des courses
async function retrieveData() {
  try {
    const snapshot = await get(ref(db, "races"));
    return snapshot.val();
  } catch (error) {
    console.error("Error retrieving data:", error);
    throw error;
  }
}

// Fonction pour calculer les classements des pilotes
function calculateDriverStandings(data) {
  const driversStandings = {};

  // Parcourir toutes les saisons
  for (const season in data) {
    // Parcourir tous les tours de chaque saison
    for (const round in data[season]) {
      const processedTeams = new Set(); // Utiliser un ensemble pour stocker les équipes traitées dans chaque course

      for (const resultId in data[season][round]) {
        const result = data[season][round][resultId];
        const constructor = result.constructor;
        const position = result.position;

        // Vérifier si l'équipe a déjà été traitée dans cette course
        if (!processedTeams.has(constructor)) {
          // Si l'équipe n'est pas déjà traitée, comparer les positions des pilotes de cette équipe
          const teamDrivers = Object.values(data[season][round])
            .filter((otherResult) => otherResult.constructor === constructor)
            .sort((a, b) => a.position - b.position);

          // ...

          for (let i = 0; i < teamDrivers.length; i++) {
            const teamDriver = teamDrivers[i];
            const teamDriverName = teamDriver.driverName;
            const driverPosition = teamDriver.position;

            // Vérifier si le pilote a déjà été traité dans cette course
            if (!processedTeams.has(teamDriverName)) {
              // Si le pilote existe dans le tableau, incrémentez son nombre de courses et calculez l'espérance de résultat
              // Sinon, initialisez son nombre de courses à 1 et l'elo à 1000
              if (driversStandings.hasOwnProperty(teamDriverName)) {
                driversStandings[teamDriverName].races++;

                // Calcul de l'espérance de résultat
                const Ra = driversStandings[teamDriverName].elo;
                const Rb = teamDriver.elo;
                const Ea = 1 / (1 + 10 ** ((Rb - Ra) / 400));

                if (driverPosition === "1") {
                  driversStandings[teamDriverName].elo += 25 / 2;
                  driversStandings[teamDriverName].points += 25;
                  driversStandings[teamDriverName].racesWon += 1;
                } else if (driverPosition === "2") {
                  driversStandings[teamDriverName].elo += 18 / 2;
                  driversStandings[teamDriverName].points += 18;
                } else if (driverPosition === "3") {
                  driversStandings[teamDriverName].elo += 15 / 2;
                  driversStandings[teamDriverName].points += 15;
                } else if (driverPosition === "4") {
                  driversStandings[teamDriverName].elo += 12 / 2;
                  driversStandings[teamDriverName].points += 12;
                } else if (driverPosition === "5") {
                  driversStandings[teamDriverName].elo += 10 / 2;
                  driversStandings[teamDriverName].points += 10;
                } else if (driverPosition === "6") {
                  driversStandings[teamDriverName].elo += 8 / 2;
                  driversStandings[teamDriverName].points += 8;
                } else if (driverPosition === "7") {
                  driversStandings[teamDriverName].elo += 6 / 2;
                  driversStandings[teamDriverName].points += 6;
                } else if (driverPosition === "8") {
                  driversStandings[teamDriverName].elo += 4 / 2;
                  driversStandings[teamDriverName].points += 4;
                } else if (driverPosition === "9") {
                  driversStandings[teamDriverName].elo += 2 / 2;
                  driversStandings[teamDriverName].points += 2;
                } else if (driverPosition === "10") {
                  driversStandings[teamDriverName].elo += 1 / 2;
                  driversStandings[teamDriverName].points += 1;
                } else {
                  driversStandings[teamDriverName].elo += 0;
                  driversStandings[teamDriverName].points += 0;
                }

                // Comparer les positions et attribuer des points
                if (i === 0) {
                  // Premier pilote de l'équipe, mise à jour Elo avec K = 32
                  const Sa = 1; // Victoire
                  driversStandings[teamDriverName].elo += 32 * (Sa - Ea);
                } else {
                  // Les autres pilotes, mise à jour Elo avec K = 32
                  const Sa = 0; // Défaite
                  driversStandings[teamDriverName].elo += 32 * (Sa - Ea);
                }
              } else {
                driversStandings[teamDriverName] = {
                  races: 1,
                  elo: 1000, // Définir l'Elo par défaut
                  points: 0,
                  racesWon: 0,
                };
              }

              // Ajouter le pilote à l'ensemble des pilotes traités dans cette course
              processedTeams.add(teamDriverName);
            }
          }

          // ...
        }
      }
    }
  }

  return driversStandings;
}

// Fonction pour log les classements des pilotes

function sortAndFormatStandings(driversStandings) {
  // Trier le tableau des classements des pilotes
  const sortedStandings = Object.entries(driversStandings)
    .sort((a, b) => b[1].elo - a[1].elo) // Trier par Elo décroissant
    .filter(([name, info]) => info.races >= 5) // Filtrer les pilotes ayant strictement moins de 5 courses
    .map(([name, info]) => ({
      name,
      elo: Math.round(info.elo),
      races: info.races,
      points: info.points,
      racesWon: info.racesWon,
    }));

  console.log("sorted");

  return sortedStandings;
}

// Appeler les fonctions au chargement de la page
function displayStandingsTable(sortedStandings, itemsPerPage, currentPage) {
  const tableContainer = document.getElementById("driversTable");
  const table = document.createElement("table");
  table.classList.add("standings-table");

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const headers = [
    "Position",
    "Pilote",
    "Elo",
    "Courses",
    "Points",
    "Victoires",
  ];

  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const start = (currentPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const driversToShow = sortedStandings.slice(start, end);

  const tbody = document.createElement("tbody");

  driversToShow.forEach((driver, index) => {
    const row = document.createElement("tr");
    const positionCell = document.createElement("td");
    positionCell.textContent = start + index + 1;
    const nameCell = document.createElement("td");
    nameCell.textContent = driver.name;
    const eloCell = document.createElement("td");
    eloCell.textContent = driver.elo;
    const racesCell = document.createElement("td");
    racesCell.textContent = driver.races;
    const pointsCell = document.createElement("td");
    pointsCell.textContent = driver.points;
    const racesWonCell = document.createElement("td");
    racesWonCell.textContent = driver.racesWon;

    row.appendChild(positionCell);
    row.appendChild(nameCell);
    row.appendChild(eloCell);
    row.appendChild(racesCell);
    row.appendChild(pointsCell);
    row.appendChild(racesWonCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  tableContainer.innerHTML = "";
  tableContainer.appendChild(table);

  // Créer les liens de pagination
  const totalPages = Math.ceil(sortedStandings.length / itemsPerPage);
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const pageLink = document.createElement("a");
    pageLink.href = "#";
    pageLink.textContent = i;
    pageLink.addEventListener("click", () =>
      displayStandingsTable(sortedStandings, itemsPerPage, i)
    );
    paginationContainer.appendChild(pageLink);
  }
}

// Utiliser la fonction après avoir calculé les classements
window.addEventListener("load", async () => {
  try {
    const data = await retrieveData();
    console.log(data[1950]);

    const driversStandings = calculateDriverStandings(data);
    const sortedStandings = sortAndFormatStandings(driversStandings);

    // Définir le nombre d'entrées par page
    const itemsPerPage = 20;

    // Afficher la première page par défaut
    displayStandingsTable(sortedStandings, itemsPerPage, 1);
  } catch (error) {
    console.error("Error:", error);
  }
});
