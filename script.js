let allCards = [];
let filteredCards = [];
let moxfieldNames = new Set();

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

    fetchScryfall(url);
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
    filteredCards = allCards.filter((card) =>
      moxfieldNames.has(card.name.toLowerCase())
    );
    renderTable(filteredCards);
  });
});

function fetchScryfall(url) {
  $.getJSON(url, function (data) {
    allCards = allCards.concat(data.data);

    if (data.has_more) {
      fetchScryfall(data.next_page);
    } else {
      $("#loading").hide();
      renderTable(allCards);
    }
  }).fail(() => {
    $("#loading").hide();
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
    const prices = card.prices || {};
    const manaHTML = parseManaCost(card.mana_cost);
    const row = `
      <tr>
        <td>${card.set.toUpperCase()}</td>
        <td>${card.collector_number}</td>
        <td><a href="${card.scryfall_uri}" target="_blank">${card.name}</a></td>
        <td>${manaHTML}</td>
        <td>${card.type_line || ""}</td>
        <td>${card.rarity ? card.rarity[0].toUpperCase() : ""}</td>
        <td>${prices.usd ? "$" + prices.usd : ""}</td>
        <td>${prices.eur ? "€" + prices.eur : ""}</td>
        <td>${prices.tix || ""}</td>
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
