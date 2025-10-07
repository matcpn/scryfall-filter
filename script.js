async function fetchAllPages(url) {
  let allCards = [];
  while (url) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.object !== "list") throw new Error("Invalid response from Scryfall");
    allCards = allCards.concat(data.data);
    url = data.has_more ? data.next_page : null;
  }
  return allCards;
}

document.getElementById("fetchBtn").addEventListener("click", async () => {
  const query = document.getElementById("queryInput").value.trim();
  const moxfieldFile = document.getElementById("moxfieldFile").files[0];
  const status = document.getElementById("status");
  const table = document.getElementById("cardsTable");

  if (!query) {
    status.textContent = "Please enter a Scryfall query.";
    return;
  }
  if (!moxfieldFile) {
    status.textContent = "Please upload your Moxfield CSV.";
    return;
  }

  status.textContent = "Fetching Scryfall data...";
  const encoded = encodeURIComponent(query);
  const baseUrl = `https://api.scryfall.com/cards/search?q=${encoded}&order=name&as=checklist&unique=cards`;

  try {
    const cards = await fetchAllPages(baseUrl);
    status.textContent = `Fetched ${cards.length} cards. Parsing Moxfield...`;

    Papa.parse(moxfieldFile, {
      header: true,
      complete: (moxfieldResults) => {
        const moxfield = moxfieldResults.data;
        const owned = new Set(
          moxfield.map(m => `${m["Name"]?.trim()?.toLowerCase()}|${m["Collector Number"]?.trim()}`)
        );

        const filtered = cards.filter(c =>
          owned.has(`${c.name?.trim()?.toLowerCase()}|${c.collector_number?.trim()}`)
        );

        status.textContent = `Found ${filtered.length} matching owned cards.`;
        const tableBody = document.querySelector("#cardsTable tbody");
        tableBody.innerHTML = "";

        filtered.forEach(card => {
          const price = card.prices || {};
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${card.set.toUpperCase()}</td>
            <td>${card.collector_number}</td>
            <td><a href="${card.scryfall_uri}" target="_blank">${card.name}</a></td>
            <td>${card.mana_cost || ""}</td>
            <td>${card.type_line || ""}</td>
            <td>${card.rarity?.toUpperCase() || ""}</td>
            <td>${card.artist || ""}</td>
            <td>${price.usd ? "$" + price.usd : ""}</td>
            <td>${price.eur ? "€" + price.eur : ""}</td>
            <td>${price.tix || ""}</td>
          `;
          tableBody.appendChild(row);
        });

        table.style.display = "table";
        if ($.fn.dataTable.isDataTable("#cardsTable")) {
          $("#cardsTable").DataTable().clear().destroy();
        }
        new DataTable("#cardsTable");
      }
    });
  } catch (err) {
    console.error(err);
    status.textContent = "Error fetching data. Check console for details.";
  }
});
