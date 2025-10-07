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
    tbody.append(`<tr><td colspan="11">No results found.</td></tr>`);
    $("#exportSection").hide();
    return;
  }

  cards.forEach((card, idx) => {
    if (!card.edhrec_rank) return; // skip cards with blank edhrec_rank
    const prices = card.prices || {};
    const manaHTML = parseManaCost(card.mana_cost);
    const owned = moxfieldNames.has(card.name.toLowerCase());
    const edhrec = card.edhrec_rank ? card.edhrec_rank : "";
    const usd = prices.usd ? "$" + prices.usd : "";
    let img = card.image_uris?.large || card.image_uris?.normal || card.image_uris?.small || "";
    const row = `
      <tr${owned ? ' class="owned-row"' : ''} data-card-image="${img}">
        <td><input type="checkbox" class="select-card" data-idx="${idx}"></td>
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
  // Always update button count after rendering
  updateTcgplayerButtonCount();
}

// Update export section label, enable/disable buttons, and show/hide bar
function updateTcgplayerButtonCount() {
  setTimeout(() => {
    const count = $('#resultsTable .select-card:checked').length;
    const label = $('#copyCardsLabel');
    const tcgBtn = $('#tcgplayerExport');
    const moxBtn = $('#moxfieldExport');
    if (count > 0) {
      $('#exportSection').show();
      label.text(`Copied ${count} card${count > 1 ? 's' : ''} to clipboard. Paste them into one of the following:`);
      tcgBtn.prop('disabled', false);
      moxBtn.prop('disabled', false);
    } else {
      $('#exportSection').hide();
      label.text('Copy selected cards to export:');
      tcgBtn.prop('disabled', true);
      moxBtn.prop('disabled', true);
    }
  }, 0);
}

// Select all checkbox
$(document).on('change', '#selectAllCards', function() {
  const checked = $(this).is(':checked');
  $('#resultsTable .select-card').prop('checked', checked);
  updateTcgplayerButtonCount();
});

// Uncheck select all if any are unchecked, and update count
$(document).on('change', '.select-card', function() {
  if (!$(this).is(':checked')) {
    $('#selectAllCards').prop('checked', false);
  }
  updateTcgplayerButtonCount();
});

// Also update button count after sorting (since checkboxes are re-rendered)
$(document).on('click', '#sort-edhrec, #sort-usd', function() {
  setTimeout(updateTcgplayerButtonCount, 0);
});


// TCGplayer export button
$(document).on('click', '#tcgplayerExport', function() {
  const selected = [];
  $('#resultsTable .select-card:checked').each(function() {
    const idx = $(this).data('idx');
    const card = allCards[idx];
    if (card && card.name) {
      selected.push("1 " + card.name);
    }
  });
  if (selected.length === 0) {
    alert('No cards selected!');
    return;
  }
  const cardList = selected.join("\n");
  navigator.clipboard.writeText(cardList).then(() => {
    window.open('https://www.tcgplayer.com/massentry', '_blank');
  }, () => {
    window.open('https://www.tcgplayer.com/massentry', '_blank');
    alert('Selected card names could not be copied automatically. Please copy them manually.\n' + cardList);
  });
});

// Moxfield export button
$(document).on('click', '#moxfieldExport', function() {
  const selected = [];
  $('#resultsTable .select-card:checked').each(function() {
    const idx = $(this).data('idx');
    const card = allCards[idx];
    if (card && card.name) {
      selected.push("1 " + card.name);
    }
  });
  if (selected.length === 0) {
    alert('No cards selected!');
    return;
  }
  const cardList = selected.join("\n");
  navigator.clipboard.writeText(cardList).then(() => {
    window.open('https://www.moxfield.com/decks/personal', '_blank');
  }, () => {
    window.open('https://www.moxfield.com/decks/personal', '_blank');
    alert('Selected card names could not be copied automatically. Please copy them manually.\n' + cardList);
  });
});

// Card image tooltip logic

if (!document.getElementById('card-image-tooltip')) {
  $(document.body).append('<div id="card-image-tooltip" class="card-image-tooltip"><img src="" alt="Card image" /></div>');
}

let tooltipActive = false;
let tooltipImg = '';

$(document).on('mouseenter', '#resultsTable tbody tr', function (e) {
  const img = $(this).data('card-image');
  if (img) {
    tooltipActive = true;
    tooltipImg = img;
    const tooltip = $('#card-image-tooltip');
    tooltip.find('img').attr('src', img);
    tooltip.css('display', 'flex');
  }
});

$(document).on('mouseleave', '#resultsTable tbody tr', function () {
  tooltipActive = false;
  $('#card-image-tooltip').css('display', 'none');
});

$(document).on('mousemove', function (e) {
  if (tooltipActive && tooltipImg) {
    const tooltip = $('#card-image-tooltip');
    // Always anchor to mouse position, no clamping
    tooltip.css({
      display: 'flex',
      left: e.pageX + 24,
      top: e.clientY + 10
    });
  }
});

// Convert {U}{B}{R} → images
function parseManaCost(cost) {
  if (!cost) return "";
  return cost.replace(/\{(.*?)\}/g, (_, symbol) => {
    symbol = symbol.toLowerCase().replace("/", "");
    return `<img class="mana-symbol" src="https://svgs.scryfall.io/card-symbols/${symbol.toUpperCase()}.svg" alt="${symbol.toUpperCase()}">`;
  });
}
