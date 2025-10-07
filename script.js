document.getElementById("processBtn").addEventListener("click", () => {
  const scryfallFile = document.getElementById("scryfallFile").files[0];
  const moxfieldFile = document.getElementById("moxfieldFile").files[0];
  const status = document.getElementById("status");

  if (!scryfallFile || !moxfieldFile) {
    status.textContent = "Please upload both CSV files.";
    return;
  }

  status.textContent = "Processing...";

  Papa.parse(scryfallFile, {
    header: true,
    complete: (scryfallResults) => {
      Papa.parse(moxfieldFile, {
        header: true,
        complete: (moxfieldResults) => {
          const scryfall = scryfallResults.data;
          const moxfield = moxfieldResults.data;

          const owned = new Set(
            moxfield.map(m => `${m["Name"]?.trim()?.toLowerCase()}|${m["Collector Number"]?.trim()}`)
          );

          const filtered = scryfall.filter(s => 
            owned.has(`${s["name"]?.trim()?.toLowerCase()}|${s["collector_number"]?.trim()}`)
          );

          if (filtered.length === 0) {
            status.textContent = "No matches found.";
            return;
          }

          status.textContent = `Found ${filtered.length} owned cards.`;

          const tableBody = document.querySelector("#cardsTable tbody");
          tableBody.innerHTML = "";

          filtered.forEach(card => {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${card.set || ""}</td>
              <td>${card.collector_number || ""}</td>
              <td><a href="${card.scryfall_uri}" target="_blank">${card.name || ""}</a></td>
              <td>${card.mana_cost || ""}</td>
              <td>${card.type_line || ""}</td>
              <td>${card.rarity?.toUpperCase() || ""}</td>
              <td>${card.lang?.toUpperCase() || ""}</td>
              <td>${card.artist || ""}</td>
              <td>${card.usd_price ? "$" + card.usd_price : ""}</td>
              <td>${card.eur_price ? "€" + card.eur_price : ""}</td>
              <td>${card.tix_price || ""}</td>
            `;
            tableBody.appendChild(row);
          });

          document.getElementById("cardsTable").style.display = "table";

          // Initialize DataTable (sortable/searchable)
          if ($.fn.dataTable.isDataTable("#cardsTable")) {
            $("#cardsTable").DataTable().clear().destroy();
          }
          new DataTable("#cardsTable");
        }
      });
    }
  });
});
