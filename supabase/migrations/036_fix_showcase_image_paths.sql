-- Migration 036: Fix showcase image paths — rename Korean filenames to English
-- Fixes: showcase images showing as blue question marks (URL encoding issue)

UPDATE stories
SET
  illustration_urls = ARRAY[
    '/images/showcase/shoe-mama/cover.png',
    '/images/showcase/shoe-mama/1.png',
    '/images/showcase/shoe-mama/2.png',
    '/images/showcase/shoe-mama/3.png',
    '/images/showcase/shoe-mama/4.png',
    '/images/showcase/shoe-mama/5.png',
    '/images/showcase/shoe-mama/6.png',
    '/images/showcase/shoe-mama/7.png',
    '/images/showcase/shoe-mama/8.png'
  ],
  cover_image = '/images/showcase/shoe-mama/cover.png'
WHERE title = '구두야, 엄마 데리고 가!'
  AND story_type = 'showcase';
