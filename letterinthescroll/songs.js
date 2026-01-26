// songs.js - render the Songs of Faith page from songs.json

const SONGS_URL = "songs.json";
let allSongs = [];

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value = "") {
  return String(value).toLowerCase();
}

function buildSearchText(song) {
  const lyricText = Array.isArray(song.lyrics)
    ? song.lyrics
        .map(line => [line.hebrew, line.transliteration, line.english].filter(Boolean).join(" "))
        .join(" ")
    : "";

  return normalizeText(
    [song.title_hebrew, song.title_english, song.artist, song.overview, lyricText]
      .filter(Boolean)
      .join(" ")
  );
}

function getYouTubeEmbedUrl(url = "") {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    let videoId = "";

    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "");
    } else if (parsed.pathname.includes("/embed/")) {
      videoId = parsed.pathname.split("/embed/")[1];
    } else {
      videoId = parsed.searchParams.get("v") || "";
    }

    if (!videoId) return "";
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch (error) {
    return "";
  }
}

function buildLyrics(lyrics = []) {
  if (!Array.isArray(lyrics) || !lyrics.length) {
    return '<p class="lyrics-empty">Lyrics coming soon.</p>';
  }

  const rows = lyrics
    .map(line => {
      const hebrew = (line.hebrew || "").trim();
      const transliteration = (line.transliteration || "").trim();
      const english = (line.english || "").trim();

      if (!hebrew && !transliteration && !english) {
        return '<div class="lyrics-row lyrics-spacer" aria-hidden="true"></div>';
      }

      const hebrewCell = hebrew ? escapeHtml(hebrew) : "&nbsp;";
      const transliterationCell = transliteration ? escapeHtml(transliteration) : "&nbsp;";
      const englishCell = english ? escapeHtml(english) : "&nbsp;";

      return `
        <div class="lyrics-row">
          <div class="lyrics-cell lyrics-hebrew" lang="he">${hebrewCell}</div>
          <div class="lyrics-cell lyrics-transliteration">${transliterationCell}</div>
          <div class="lyrics-cell lyrics-english">${englishCell}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="lyrics-title">Lyrics</div>
    <div class="lyrics-grid">
      <div class="lyrics-row lyrics-labels">
        <div>Hebrew</div>
        <div>Transliteration</div>
        <div>English</div>
      </div>
      ${rows}
    </div>
  `;
}

function buildSongCard(song, index) {
  const titleEnglish = song.title_english ? escapeHtml(song.title_english) : "";
  const titleHebrew = song.title_hebrew ? escapeHtml(song.title_hebrew) : "";
  const artist = song.artist ? escapeHtml(song.artist) : "";
  const overview = song.overview ? escapeHtml(song.overview) : "";

  const titleBlocks = [
    titleEnglish ? `<span>${titleEnglish}</span>` : "",
    titleHebrew ? `<span class="song-title-hebrew" lang="he">${titleHebrew}</span>` : ""
  ].filter(Boolean);

  const titleHtml = titleBlocks.length ? titleBlocks.join("") : "<span>Untitled Song</span>";

  return `
    <article class="song-card" data-song-index="${index}">
      <a href="song-detail.html?song=${index}" class="song-card-link">
        <header class="song-header">
          <h3 class="song-title">${titleHtml}</h3>
          ${artist ? `<p class="song-artist">Artist: ${artist}</p>` : ""}
        </header>
        ${overview ? `<p class="song-overview">${overview}</p>` : ""}
        <div class="song-card-cta">
          <span class="song-card-cta-text">View Song Details</span>
          <svg class="song-card-cta-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </div>
      </a>
    </article>
  `;
}

function renderSongs(songs) {
  const container = document.getElementById("songs-container");
  if (!container) return;

  if (!songs.length) {
    container.innerHTML = '<div class="songs-empty">No songs match this search yet.</div>';
    return;
  }

  container.innerHTML = songs.map(buildSongCard).join("\n");
}

function updateCounts(filteredCount, totalCount, query) {
  const countLabel = document.getElementById("songs-count");
  const filterPill = document.getElementById("songs-filter-pill");
  if (countLabel) {
    if (totalCount === 0) {
      countLabel.textContent = "No songs yet";
    } else if (query) {
      countLabel.textContent = `Showing ${filteredCount} of ${totalCount} songs`;
    } else {
      countLabel.textContent = `Showing ${totalCount} ${totalCount === 1 ? "song" : "songs"}`;
    }
  }

  if (filterPill) {
    filterPill.textContent = query ? `Matches: ${filteredCount}` : "All songs";
  }
}

function filterSongs(query) {
  if (!query) return allSongs;
  return allSongs.filter(song => song.searchText.includes(query));
}


function setupSearch() {
  const searchInput = document.getElementById("song-search");
  const clearButton = document.getElementById("clear-song-search");

  if (!searchInput) return;

  const updateSearch = () => {
    const query = normalizeText(searchInput.value.trim());
    const filteredSongs = filterSongs(query);
    renderSongs(filteredSongs);
    updateCounts(filteredSongs.length, allSongs.length, query);
  };

  searchInput.addEventListener("input", updateSearch);

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      searchInput.value = "";
      updateSearch();
      searchInput.focus();
    });
  }
}

async function loadSongs() {
  try {
    const response = await fetch(SONGS_URL);
    if (!response.ok) {
      throw new Error("Failed to load songs");
    }
    const data = await response.json();
    allSongs = Array.isArray(data)
      ? data.map(song => ({
          ...song,
          searchText: buildSearchText(song)
        }))
      : [];

    renderSongs(allSongs);
    updateCounts(allSongs.length, allSongs.length, "");
    setupSearch();
  } catch (error) {
    const container = document.getElementById("songs-container");
    if (container) {
      container.innerHTML = '<div class="songs-empty">Songs are unavailable right now.</div>';
    }
    updateCounts(0, 0, "");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadSongs();
});
