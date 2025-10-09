document.getElementById("extension-form").addEventListener("submit", e => {
  e.preventDefault();

  const size = document.getElementById("board-size").value;
  const mods = Array.from(document.querySelectorAll('input[name="mods"]:checked'))
                    .map(cb => cb.value);

  const params = new URLSearchParams({
    size: size,
    mods: mods.join(",")
  });

  window.location.href = `/extensions/game?${params.toString()}`;
});
