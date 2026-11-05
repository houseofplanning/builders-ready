-- Migration 60: plant & equipment can be scheduled as a resource.
-- A plant resource (digger, scaffold, van) is booked on jobs like a person,
-- with a day/hour hire rate; its scheduled cost lands in the 'plant_hire'
-- cost category. Added as its own kind so it groups separately from people.
alter type public.resource_kind add value if not exists 'plant';
