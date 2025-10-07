document.getElementById("processBtn").addEventListener("click", () => {
  const scryfallFile = document.getElementById("scryfallFile").files[0];
  const moxfieldFile = document.getElementById("moxfieldFile").files[0];
  const status = document.getElementById("status");

  if (!scryfallFile || !moxfieldFile) {
    status.textContent = "Please upload both CSV files.";
    return;
  }

  status.textContent = "Processing...";

  // Parse both CSVs
  Papa.parse(scryfallFile, {
    header: true,
    complete: (scryfallResults) => {
      Papa.parse(moxfieldFile, {
        header: true,
        complete: (moxfieldResults) => {
          const scryfall = scryfallResults.data;
          const moxfield = moxfieldResults.data;

          // Build quick lookup set
          const owned = new Set(
            moxfield.map(m => `${m["Name"]?.trim()?.toLowerCase()}|${m["Collector Number"]?.trim()}`)
          );

          // Filter
          const filtered = scryfall.filter(s => 
            owned.has(`${s["name"]?.trim()?.toLowerCase()}|${s["collector_number"]?.trim()}`)
          );

          // Convert back to CSV
          const csv = Papa.unparse(filtered);

          // Download link
          const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "scryfall_filtered.csv";
          a.click();
          URL.revokeObjectURL(url);

          status.textContent = `Done! ${filtered.length} cards matched.`;
        }
      });
    }
  });
});
