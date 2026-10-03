document.addEventListener("DOMContentLoaded", function () {
    const gamesContainer = document.getElementById('games-container');

    fetch('/games.json')
        .then(response => response.json())
        .then(gamesData => {
            const createGameCard = (game) => `
                <div class="bg-white p-4 mb-6 rounded-lg shadow-md">
                    <h3>${game.title}</h3>
                    <p>Category: ${game.category}</p>
                    <img src="$...