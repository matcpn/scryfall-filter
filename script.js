let allCards = [];
let filteredCards = [];
let moxfieldNames = new Set();

let currentSort = { field: null, asc: true };

$(document).ready(function () {
  $("#searchForm").on("submit", function (e) {
    e.preventDefault();
    const query = $("#query").val().trim();
    if (!query) return;

    $("#loading").show();
    $("#resultsTable tbody").empty();
    allCards = [];
    filteredCards = [];

  const encoded = encodeURIComponent(query);
  const url = `https://api.scryfall.com/cards/search?q=${encoded}&order=edhrec&as=checklist&unique=cards`;

  scryfallPageCount = 0;
  scryfallPagesFetched = 0;
  currentSort = { field: "edhrec_rank", asc: true };
  fetchScryfall(url);
  });

  // Sorting handlers
  $(document).on("click", "#sort-edhrec", function () {
    sortByField("edhrec_rank");
  });
  $(document).on("click", "#sort-usd", function () {
    sortByField("usd");
  });

  $("#csvFile").on("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: function (results) {
        moxfieldNames = new Set(
          results.data
            .map((row) => row.Name?.trim().toLowerCase())
            .filter((n) => !!n)
        );
        $("#applyFilter").prop("disabled", false);
        alert(`Loaded ${moxfieldNames.size} cards from CSV.`);
      },
    });
  });

  $("#applyFilter").on("click", function () {
    if (moxfieldNames.size === 0) {
      alert("Upload a Moxfield CSV first.");
      return;
    }
    // Instead of filtering, just highlight owned cards
    renderTable(allCards);
  });
});

// Sort and re-render table
function sortByField(field) {
  let arr = allCards.slice();
  let asc = true;
  if (currentSort.field === field) {
    asc = !currentSort.asc;
  }
  currentSort = { field, asc };

  arr.sort((a, b) => {
    let aVal, bVal;
    if (field === "edhrec_rank") {
      aVal = a.edhrec_rank || Infinity;
      bVal = b.edhrec_rank || Infinity;
    } else if (field === "usd") {
      aVal = parseFloat(a.prices?.usd) || 0;
      bVal = parseFloat(b.prices?.usd) || 0;
    } else {
      aVal = a[field];
      bVal = b[field];
    }
    if (aVal === bVal) return 0;
    return asc ? aVal - bVal : bVal - aVal;
  });
  updateSortArrows();
  renderTable(arr);
}

function updateSortArrows() {
  // Clear all arrows
  $("#arrow-edhrec").text("");
  $("#arrow-usd").text("");
  // Set arrow for current sort
  if (currentSort.field === "edhrec_rank") {
    $("#arrow-edhrec").text(currentSort.asc ? "▲" : "▼");
  } else if (currentSort.field === "usd") {
    $("#arrow-usd").text(currentSort.asc ? "▲" : "▼");
  }
}


let scryfallPageCount = 0;
let scryfallPagesFetched = 0;

function fetchScryfall(url) {
  $.getJSON(url, function (data) {
    if (scryfallPageCount === 0 && data.total_cards) {
      // Estimate total pages from first response
      scryfallPageCount = Math.ceil(data.total_cards / data.data.length);
    }
    allCards = allCards.concat(data.data);
    scryfallPagesFetched++;
    // Show progress
    if (scryfallPageCount > 1) {
      $("#loading").text(`Loading... (${scryfallPagesFetched}/${scryfallPageCount} pages)`);
    }
    // Render as we go
    sortByField(currentSort.field || "edhrec_rank");

    if (data.has_more) {
      fetchScryfall(data.next_page);
    } else {
      $("#loading").hide();
      scryfallPageCount = 0;
      scryfallPagesFetched = 0;
    }
  }).fail(() => {
    $("#loading").hide();
    scryfallPageCount = 0;
    scryfallPagesFetched = 0;
    alert("Failed to fetch results. Check your query syntax.");
  });
}

function renderTable(cards) {
  const tbody = $("#resultsTable tbody");
  tbody.empty();

  if (cards.length === 0) {
    tbody.append(`<tr><td colspan="10">No results found.</td></tr>`);
    return;
  }

  cards.forEach((card) => {
    if (!card.edhrec_rank) return; // skip cards with blank edhrec_rank
    const prices = card.prices || {};
    const manaHTML = parseManaCost(card.mana_cost);
    const owned = moxfieldNames.has(card.name.toLowerCase());
    const edhrec = card.edhrec_rank ? card.edhrec_rank : "";
    const usd = prices.usd ? "$" + prices.usd : "";
    const row = `
      <tr${owned ? ' class="owned-row"' : ''}>
        <td>${card.set.toUpperCase()}</td>
        <td>${card.collector_number}</td>
        <td><a href="${card.scryfall_uri}" target="_blank">${card.name}</a></td>
        <td>${manaHTML}</td>
        <td>${card.type_line || ""}</td>
        <td>${card.rarity ? card.rarity[0].toUpperCase() : ""}</td>
        <td>${edhrec}</td>
        <td>${usd}</td>
        <td>${prices.eur ? "€" + prices.eur : ""}</td>
      </tr>`;
    tbody.append(row);
  });
}

// Convert {U}{B}{R} → images
function parseManaCost(cost) {
  if (!cost) return "";
  return cost.replace(/\{(.*?)\}/g, (_, symbol) => {
    symbol = symbol.toLowerCase().replace("/", "");
    return `<img class="mana-symbol" src="https://svgs.scryfall.io/card-symbols/${symbol.toUpperCase()}.svg" alt="${symbol.toUpperCase()}">`;
  });
}
