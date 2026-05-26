-- Sample "Pony Car Cruise" should use the cruise type after 016 adds the enum value.
UPDATE events
SET type = 'cruise'
WHERE slug = 'sample-60s-pony-open';
