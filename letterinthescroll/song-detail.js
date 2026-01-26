// song-detail.js - Display individual song details

const SONGS_URL = "songs.json";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function getSongIndexFromURL() {
  const params = new URLSearchParams(window.location.search);
  const index = params.get("song");
  return index !== null ? parseInt(index, 10) : null;
}

function buildLyricsHTML(lyrics = []) {
  if (!Array.isArray(lyrics) || !lyrics.length) {
    return '<p class="lyrics-empty">Lyrics coming soon.</p>';
  }

  const rows = lyrics
    .map(line => {
      const hebrew = (line.hebrew || "").trim();
      const transliteration = (line.transliteration || "").trim();
      const english = (line.english || "").trim();

      // Empty line spacer
      if (!hebrew && !transliteration && !english) {
        return `
          <div class="lyrics-detail-row lyrics-detail-spacer" aria-hidden="true">
            <div class="lyrics-detail-cell">&nbsp;</div>
            <div class="lyrics-detail-cell">&nbsp;</div>
            <div class="lyrics-detail-cell">&nbsp;</div>
          </div>
        `;
      }

      const hebrewCell = hebrew ? escapeHtml(hebrew) : "&nbsp;";
      const transliterationCell = transliteration ? escapeHtml(transliteration) : "&nbsp;";
      const englishCell = english ? escapeHtml(english) : "&nbsp;";

      return `
        <div class="lyrics-detail-row">
          <div class="lyrics-detail-cell lyrics-detail-hebrew" lang="he">${hebrewCell}</div>
          <div class="lyrics-detail-cell lyrics-detail-transliteration">${transliterationCell}</div>
          <div class="lyrics-detail-cell lyrics-detail-english">${englishCell}</div>
        </div>
      `;
    })
    .join("");

  return `
    <div class="lyrics-detail-grid">
      <div class="lyrics-detail-row lyrics-detail-labels">
        <div class="lyrics-detail-cell">Hebrew</div>
        <div class="lyrics-detail-cell">Transliteration</div>
        <div class="lyrics-detail-cell">English</div>
      </div>
      ${rows}
    </div>
  `;
}

function displaySong(song) {
  // Update page title
  const titleEnglish = song.title_english || "";
  const titleHebrew = song.title_hebrew || "";
  document.title = `${titleEnglish || titleHebrew} - Songs of Faith - A Letter in the Scroll`;

  // Display song title
  const songTitleEl = document.getElementById("song-title");
  if (songTitleEl) {
    const titleParts = [];
    if (titleEnglish) {
      titleParts.push(`<span>${escapeHtml(titleEnglish)}</span>`);
    }
    if (titleHebrew) {
      titleParts.push(`<span class="song-title-hebrew" lang="he">${escapeHtml(titleHebrew)}</span>`);
    }
    songTitleEl.innerHTML = titleParts.length ? titleParts.join("") : "Untitled Song";
  }

  // Display artist
  const songArtistEl = document.getElementById("song-artist");
  if (songArtistEl && song.artist) {
    songArtistEl.textContent = song.artist;
    songArtistEl.style.display = "block";
  } else if (songArtistEl) {
    songArtistEl.style.display = "none";
  }

  // Display overview
  const songOverviewEl = document.getElementById("song-overview");
  if (songOverviewEl && song.overview) {
    songOverviewEl.textContent = song.overview;
    songOverviewEl.style.display = "block";
  } else if (songOverviewEl) {
    songOverviewEl.style.display = "none";
  }

  // Display video
  const videoContainer = document.getElementById("video-container");
  const youtubeLink = document.getElementById("youtube-link");
  const embedUrl = getYouTubeEmbedUrl(song.youtube_url || "");

  if (videoContainer && embedUrl) {
    videoContainer.innerHTML = `
      <iframe
        title="${escapeHtml(titleEnglish || titleHebrew || "Song")}"
        src="${escapeHtml(embedUrl)}"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
    `;
  }

  if (youtubeLink && song.youtube_url) {
    youtubeLink.href = song.youtube_url;
    youtubeLink.style.display = "inline-flex";
  } else if (youtubeLink) {
    youtubeLink.style.display = "none";
  }

  // Display lyrics
  const lyricsContainer = document.getElementById("lyrics-container");
  if (lyricsContainer) {
    lyricsContainer.innerHTML = buildLyricsHTML(song.lyrics || []);
  }

  // Show content, hide loading
  document.getElementById("loading-state").classList.add("hidden");
  document.getElementById("song-content").classList.remove("hidden");
}

function showError() {
  document.getElementById("loading-state").classList.add("hidden");
  document.getElementById("error-state").classList.remove("hidden");
}

async function loadAndDisplaySong() {
  const songIndex = getSongIndexFromURL();

  if (songIndex === null || songIndex < 0) {
    showError();
    return;
  }

  try {
    const response = await fetch(SONGS_URL);
    if (!response.ok) {
      throw new Error("Failed to load songs");
    }

    const songs = await response.json();

    if (!Array.isArray(songs) || songIndex >= songs.length) {
      showError();
      return;
    }

    const song = songs[songIndex];
    displaySong(song);
  } catch (error) {
    console.error("Error loading song:", error);
    showError();
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  loadAndDisplaySong();
});
