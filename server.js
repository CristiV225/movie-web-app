const express = require('express');
const axios = require('axios');
const sql = require('mssql');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
    server: 'localhost',
    port: 1433,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

// Fetch movies from TMDB and save to DB
async function fetchAndSaveMovies() {
    try {
        const response = await axios.get(
            `https://api.themoviedb.org/3/movie/now_playing?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`,
            { 
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Accept': 'application/json'
                }
            }
        );

        const movies = response.data.results;
        const pool = await sql.connect(dbConfig);

        for (const movie of movies) {
            await pool.request()
                .input('tmdb_id', sql.Int, movie.id)
                .input('title', sql.VarChar, movie.title)
                .input('year', sql.Int, new Date(movie.release_date).getFullYear())
                .input('rating', sql.Decimal(3,1), movie.vote_average)
                .input('poster_url', sql.VarChar, `https://image.tmdb.org/t/p/w500${movie.poster_path}`)
                .input('overview', sql.VarChar, movie.overview)
                .input('genre', sql.VarChar, (() => {
                    const genreMap = {
                        28: 'Action', 12: 'Adventure', 16: 'Animation',
                        35: 'Comedy', 80: 'Crime', 18: 'Drama',
                        14: 'Fantasy', 27: 'Horror', 9648: 'Mystery',
                        10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller',
                        10751: 'Family', 37: 'Western'
                    };
                    return movie.genre_ids.length > 0 ? (genreMap[movie.genre_ids[0]] || 'Other') : 'Other';
                })())
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM movies WHERE tmdb_id = @tmdb_id)
                    INSERT INTO movies (tmdb_id, title, year, rating, poster_url, overview, genre)
                    VALUES (@tmdb_id, @title, @year, @rating, @poster_url, @overview, @genre)
                `);
        }

        console.log('Movies saved to database!');
        sql.close();
    } catch (err) {
        console.error('Error fetching movies:', err.message);
    }
}

// Return all movies
app.get('/movies', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM movies');
        res.json(result.recordset);
        sql.close();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add to favorites
app.post('/favorites', async (req, res) => {
    try {
        const { username, movie_id } = req.body;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('username', sql.VarChar, username)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM users WHERE username = @username)
                INSERT INTO users (username, password) VALUES (@username, 'guest')
            `);
        const userResult = await pool.request()
            .input('username', sql.VarChar, username)
            .query('SELECT id FROM users WHERE username = @username');
        const user_id = userResult.recordset[0].id;
        await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('movie_id', sql.Int, movie_id)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM favorites WHERE user_id = @user_id AND movie_id = @movie_id)
                INSERT INTO favorites (user_id, movie_id) VALUES (@user_id, @movie_id)
            `);
        res.json({ success: true });
        sql.close();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get favorites for user
app.get('/favorites/:username', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('username', sql.VarChar, req.params.username)
            .query(`
                SELECT m.* FROM movies m
                JOIN favorites f ON m.id = f.movie_id
                JOIN users u ON f.user_id = u.id
                WHERE u.username = @username
            `);
        res.json(result.recordset);
        sql.close();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remove from favorites
app.delete('/favorites', async (req, res) => {
    try {
        const { username, movie_id } = req.body;
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('username', sql.VarChar, username)
            .input('movie_id', sql.Int, movie_id)
            .query(`
                DELETE f FROM favorites f
                JOIN users u ON f.user_id = u.id
                WHERE u.username = @username AND f.movie_id = @movie_id
            `);
        res.json({ success: true });
        sql.close();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static('public'));

// Start server
app.listen(process.env.PORT, async () => {
    console.log(`Server running on http://localhost:${process.env.PORT}`);
    await fetchAndSaveMovies();
});
