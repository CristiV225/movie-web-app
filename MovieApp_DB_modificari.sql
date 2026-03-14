ALTER TABLE movies ADD overview VARCHAR(500);

DELETE FROM movies;

ALTER TABLE movies ADD genre VARCHAR(50);
SELECT COUNT(*) FROM movies;

ALTER TABLE favorites ADD CONSTRAINT FK_favorites_movies 
FOREIGN KEY (movie_id) REFERENCES movies(id);