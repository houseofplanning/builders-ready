-- Builder <-> subcontractor review directions, reusing marketplace_reviews.
-- Added as its own migration because a new enum value cannot be used in the
-- same transaction it is created in.
alter type public.review_direction add value if not exists 'builder_to_sub';
alter type public.review_direction add value if not exists 'sub_to_builder';
