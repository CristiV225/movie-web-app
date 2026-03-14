CREATE DATABASE MovieApp_DB;
GO

USE MovieApp_DB;
GO

CREATE TABLE movies (
    id INT IDENTITY PRIMARY KEY,
    tmdb_id INT UNIQUE,
    title VARCHAR(100) NOT NULL,
    genre VARCHAR(50),
    year INT,
    rating DECIMAL(3,1),
    poster_url VARCHAR(255),
    overview VARCHAR(500),
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE users (
    id INT IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT GETDATE()
);

CREATE TABLE favorites (
    id INT IDENTITY PRIMARY KEY,
    user_id INT FOREIGN KEY REFERENCES users(id),
    movie_id INT FOREIGN KEY REFERENCES movies(id),
    added_at DATETIME DEFAULT GETDATE()
);

-- Added column for descriptions
ALTER TABLE movies ADD overview VARCHAR(500);

-- Added column for filtering
ALTER TABLE movies ADD genre VARCHAR(50);

-- Added constraint for favorites
ALTER TABLE favorites ADD CONSTRAINT FK_favorites_movies 
FOREIGN KEY (movie_id) REFERENCES movies(id);

